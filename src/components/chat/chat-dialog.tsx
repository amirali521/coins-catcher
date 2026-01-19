
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/firebase/init';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  orderBy,
  updateDoc,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface Friend {
    uid: string;
    displayName: string;
    email: string;
}
interface Message {
    id: string;
    senderId: string;
    text: string;
    timestamp: { seconds: number; nanoseconds: number } | null;
}

// Helper
const getChatId = (uid1: string, uid2: string) => [uid1, uid2].sort().join('_');

export function ChatDialog({ friend, onClose }: { friend: Friend; onClose: () => void }) {
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
        }, () => setLoading(false));

        return () => unsubscribe();
    }, [chatId]);
    
    useEffect(() => {
        if (scrollAreaRef.current) {
            setTimeout(() => {
                 if (scrollAreaRef.current) {
                    scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
                 }
            }, 100);
        }
    }, [messages]);


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !chatId) return;

        const currentMessage = newMessage;
        setNewMessage('');

        const batch = writeBatch(db);
        const chatRef = doc(db, 'chats', chatId);
        const newMessageRef = doc(collection(db, 'chats', chatId, 'messages'));

        try {
            const chatDoc = await getDoc(chatRef);

            const lastMessageData = {
                text: currentMessage,
                senderId: user.uid,
                timestamp: serverTimestamp(),
            };

            if (!chatDoc.exists()) {
                 const currentUserDetails = { displayName: user.displayName, email: user.email };
                 const friendUserDetails = { displayName: friend.displayName, email: friend.email };
                 batch.set(chatRef, {
                    participants: [user.uid, friend.uid],
                    participantDetails: {
                        [user.uid]: currentUserDetails,
                        [friend.uid]: friendUserDetails,
                    },
                    lastMessage: lastMessageData
                });
            } else {
                 batch.update(chatRef, {
                    lastMessage: lastMessageData
                });
            }

            batch.set(newMessageRef, {
                chatId,
                senderId: user.uid,
                text: currentMessage,
                timestamp: serverTimestamp(),
            });
            
            await batch.commit();

        } catch (error) {
            console.error("Error sending message:", error);
            setNewMessage(currentMessage);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] h-[70vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 border-b flex-row items-center gap-3 space-y-0">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={`https://avatar.vercel.sh/${friend.email}.png`} />
                        <AvatarFallback>{friend.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <DialogTitle>{friend.displayName}</DialogTitle>
                    </div>
                </DialogHeader>
                <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                 {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                     <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mb-4" />
                        <p className="text-lg font-medium">No messages yet</p>
                        <p>Start the conversation!</p>
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
                                    "max-w-xs rounded-lg px-3 py-2 md:max-w-sm",
                                    msg.senderId === user?.uid ? "bg-primary text-primary-foreground" : "bg-muted"
                                )}>
                                    <p className="text-sm break-words">{msg.text}</p>
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
            </DialogContent>
        </Dialog>
    );
}
