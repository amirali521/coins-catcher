"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { db } from '@/firebase/init';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  orderBy,
  updateDoc,
  getDocs,
} from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2, Send, ArrowLeft, MessageSquare, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// Types
interface ChatParticipant {
    displayName: string | null;
    email: string | null;
}
interface Chat {
    id: string;
    participants: string[];
    participantDetails: { [uid: string]: ChatParticipant };
    lastMessage?: {
        text: string;
        senderId: string;
        timestamp: { seconds: number; nanoseconds: number };
    };
}
interface Message {
    id: string;
    chatId: string;
    senderId: string;
    text: string;
    timestamp: { seconds: number; nanoseconds: number } | null;
}
interface Friend {
    uid: string;
    displayName: string;
    email: string;
}

// Helper to generate a consistent chat ID
const getChatId = (uid1: string, uid2: string) => [uid1, uid2].sort().join('_');

function ChatWindow({ chat, friend, onBack }: { chat: Chat | null, friend: Friend, onBack: () => void }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const chatId = useMemo(() => user ? getChatId(user.uid, friend.uid) : null, [user, friend]);

    useEffect(() => {
        if (!chatId) return;
        const messagesQuery = query(collection(db, `chats/${chatId}/messages`), orderBy('timestamp', 'asc'));
        
        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(msgs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [chatId]);
    
    useEffect(() => {
        // Auto-scroll to bottom
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight });
        }
    }, [messages]);


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !chatId) return;

        const currentMessage = newMessage;
        setNewMessage('');

        const chatRef = doc(db, 'chats', chatId);
        const messagesRef = collection(db, 'chats', chatId, 'messages');

        try {
            // If the chat doesn't exist yet, create it
            if (!chat) {
                const currentUserDetails = { displayName: user.displayName, email: user.email };
                const friendUserDetails = { displayName: friend.displayName, email: friend.email };
                
                await setDoc(chatRef, {
                    participants: [user.uid, friend.uid],
                    participantDetails: {
                        [user.uid]: currentUserDetails,
                        [friend.uid]: friendUserDetails,
                    }
                });
            }

            // Add the new message
            const messageDoc = await addDoc(messagesRef, {
                chatId,
                senderId: user.uid,
                text: currentMessage,
                timestamp: serverTimestamp(),
            });

            // Update the last message on the chat document
            await updateDoc(chatRef, {
                lastMessage: {
                    text: currentMessage,
                    senderId: user.uid,
                    timestamp: new Date(), // Use client-side date for immediate update
                }
            });

        } catch (error) {
            console.error("Error sending message:", error);
            // Optionally, handle the error (e.g., show a toast) and restore the message input
            setNewMessage(currentMessage);
        }
    };

    return (
        <div className="flex h-full flex-col">
            <CardHeader className="flex flex-row items-center gap-4 border-b">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                 <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://avatar.vercel.sh/${friend.email}.png`} />
                    <AvatarFallback>{friend.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <p className="font-semibold">{friend.displayName}</p>
                    <p className="text-sm text-muted-foreground">Online</p>
                </div>
            </CardHeader>
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                 {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                     <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mb-4" />
                        <p className="text-lg font-medium">No messages yet</p>
                        <p>Start the conversation with {friend.displayName}!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map(msg => (
                            <div key={msg.id} className={cn("flex items-end gap-2", msg.senderId === user?.uid ? "justify-end" : "justify-start")}>
                                {msg.senderId !== user?.uid && (
                                    <Avatar className="h-7 w-7">
                                        <AvatarImage src={`https://avatar.vercel.sh/${friend.email}.png`} />
                                        <AvatarFallback>{friend.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={cn(
                                    "max-w-xs rounded-lg px-3 py-2 md:max-w-md",
                                    msg.senderId === user?.uid ? "bg-primary text-primary-foreground" : "bg-muted"
                                )}>
                                    <p className="text-sm">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                 )}
            </ScrollArea>
             <div className="border-t p-4">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        autoComplete="off"
                    />
                    <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                        <Send className="h-5 w-5" />
                    </Button>
                </form>
            </div>
        </div>
    );
}

function ConversationList({ onSelectChat, activeChatId }: { onSelectChat: (friend: Friend) => void; activeChatId: string | null }) {
    const { user } = useAuth();
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        // The orderBy was causing a composite index requirement.
        // We'll remove it and sort on the client.
        const chatsQuery = query(
            collection(db, 'chats'), 
            where('participants', 'array-contains', user.uid)
        );

        const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
            const chatData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
            
            // Sort chats by the timestamp of the last message, newest first.
            chatData.sort((a, b) => {
                const timeA = a.lastMessage?.timestamp?.seconds ?? 0;
                const timeB = b.lastMessage?.timestamp?.seconds ?? 0;
                return timeB - timeA;
            });

            setChats(chatData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching recent chats:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        )
    }

    if (chats.length === 0) {
        return (
             <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground p-4">
                <Users className="h-12 w-12 mb-4" />
                <p className="text-lg font-medium">No Conversations</p>
                <p>Go to the Friends page to start chatting.</p>
            </div>
        )
    }
    
    return (
        <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
                {chats.map(chat => {
                    const friendId = chat.participants.find(p => p !== user?.uid);
                    if (!friendId) return null;
                    
                    const friendDetails = chat.participantDetails[friendId];
                    const friend: Friend = { uid: friendId, displayName: friendDetails?.displayName ?? 'Friend', email: friendDetails?.email ?? ''};
                    const chatId = getChatId(user!.uid, friendId);

                    return (
                        <button
                            key={chat.id}
                            onClick={() => onSelectChat(friend)}
                            className={cn(
                                "flex w-full items-center gap-3 rounded-md p-3 text-left transition-colors hover:bg-muted",
                                activeChatId === chatId && "bg-muted"
                            )}
                        >
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={`https://avatar.vercel.sh/${friend.email}.png`} />
                                <AvatarFallback>{friend.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                            </Avatar>
                             <div className="flex-1 overflow-hidden">
                                <p className="font-semibold truncate">{friend.displayName}</p>
                                <p className="text-sm text-muted-foreground truncate">
                                    {chat.lastMessage?.senderId === user?.uid && "You: "}
                                    {chat.lastMessage?.text ?? "No messages yet"}
                                </p>
                            </div>
                            {chat.lastMessage?.timestamp && (
                                <p className="text-xs text-muted-foreground self-start">
                                    {formatDistanceToNow(new Date(chat.lastMessage.timestamp.seconds * 1000), { addSuffix: true })}
                                </p>
                            )}
                        </button>
                    )
                })}
            </div>
        </ScrollArea>
    );
}


export function ChatLayout() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeFriend, setActiveFriend] = useState<Friend | null>(null);
  const [allFriends, setAllFriends] = useState<Friend[]>([]);
  const [allChats, setAllChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all friends and all chats initially
  useEffect(() => {
    if (!user) return;
    const friendsQuery = query(collection(db, 'friendRequests'), where('participants', 'array-contains', user.uid), where('status', '==', 'accepted'));
    const chatsQuery = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));

    const unsubFriends = onSnapshot(friendsQuery, async (snapshot) => {
        const friendIds = snapshot.docs.map(doc => doc.data().participants.find((p: string) => p !== user.uid)).filter(Boolean);
        if (friendIds.length > 0) {
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', friendIds));
            const usersSnapshot = await getDocs(usersQuery);
            const friendsData = usersSnapshot.docs.map(doc => doc.data() as Friend);
            setAllFriends(friendsData);
        } else {
            setAllFriends([]);
        }
        setLoading(false);
    });
    
    const unsubChats = onSnapshot(chatsQuery, (snapshot) => {
        const chatData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
        setAllChats(chatData);
    });

    return () => {
        unsubFriends();
        unsubChats();
    };
  }, [user]);

  // Effect to set active friend from search param
  useEffect(() => {
    if (loading || allFriends.length === 0) return;
    const friendId = searchParams.get('friend');
    if (friendId) {
      const friend = allFriends.find(f => f.uid === friendId);
      if (friend) {
        setActiveFriend(friend);
        // Clean the URL
        router.replace('/chat', { scroll: false });
      }
    }
  }, [searchParams, allFriends, loading, router]);


  const handleSelectChat = (friend: Friend) => {
    setActiveFriend(friend);
  };

  const activeChatId = useMemo(() => (user && activeFriend) ? getChatId(user.uid, activeFriend.uid) : null, [user, activeFriend]);
  const activeChatDoc = useMemo(() => activeChatId ? allChats.find(c => c.id === activeChatId) : null, [activeChatId, allChats]);
  
  if (loading) {
     return <Card className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></Card>;
  }

  return (
    <Card className="h-full w-full overflow-hidden">
        <div className="grid h-full grid-cols-1 md:grid-cols-[300px_1fr]">
            <div className={cn("h-full border-r", activeFriend ? "hidden md:flex flex-col" : "flex flex-col")}>
                 <CardHeader>
                    <h2 className="text-xl font-bold">Recent Chats</h2>
                </CardHeader>
                <ConversationList onSelectChat={handleSelectChat} activeChatId={activeChatId} />
            </div>
            <div className={cn("h-full", activeFriend ? "flex flex-col" : "hidden md:flex")}>
                {activeFriend ? (
                    <ChatWindow chat={activeChatDoc ?? null} friend={activeFriend} onBack={() => setActiveFriend(null)} />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                        <MessageSquare className="h-16 w-16 mb-4" />
                        <h2 className="text-2xl font-bold">Select a conversation</h2>
                        <p>Choose a friend from the list to start chatting.</p>
                    </div>
                )}
            </div>
        </div>
    </Card>
  );
}
