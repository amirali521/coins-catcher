"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/firebase/init';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, getDocs, serverTimestamp, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, Users, Check, X, Search, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ChatDialog } from '@/components/chat/chat-dialog';

// Raw user data from Firestore
interface AppUser {
    uid: string;
    displayName: string;
    email: string;
    coins: number;
    admin: boolean;
    lastSeen: { seconds: number; nanoseconds: number; } | null;
}

// Friend request structure from Firestore
interface FriendRequest {
  id: string;
  from: string;
  fromName: string | null;
  fromEmail: string | null;
  to: string;
  toName: string | null;
  toEmail: string | null;
  status: 'pending' | 'accepted' | 'declined';
  participants: string[];
  createdAt: { seconds: number; nanoseconds: number };
}

// A combined type for displaying users with their friendship status
type UserWithFriendship = AppUser & {
    friendshipStatus: 'friend' | 'request_sent' | 'request_received' | 'not_friend';
    requestId?: string; // ID of the friend request document
};


const sendFriendRequest = async (currentUser: any, recipient: AppUser) => {
    if (!currentUser) throw new Error("Current user not found.");
    if (currentUser.uid === recipient.uid) throw new Error("You cannot befriend yourself.");
    
    const friendRequestRef = collection(db, 'friendRequests');
    const sortedParticipants = [currentUser.uid, recipient.uid].sort();
    const q = query(friendRequestRef, where('participants', '==', sortedParticipants));
    const existingReqSnap = await getDocs(q);
    
    if (!existingReqSnap.empty) {
        throw new Error("A friend request already exists or you are already friends.");
    }

    await addDoc(friendRequestRef, {
        from: currentUser.uid,
        fromName: currentUser.displayName,
        fromEmail: currentUser.email,
        to: recipient.uid,
        toName: recipient.displayName,
        toEmail: recipient.email,
        status: 'pending',
        participants: sortedParticipants,
        createdAt: serverTimestamp(),
    });
};

const respondToFriendRequest = async (requestId: string, response: 'accepted' | 'declined') => {
    const requestRef = doc(db, 'friendRequests', requestId);
    await updateDoc(requestRef, {
        status: response,
        updatedAt: serverTimestamp(),
    });
};

const unfriend = async (requestId: string) => {
    const requestRef = doc(db, 'friendRequests', requestId);
    await deleteDoc(requestRef);
}


function MyFriendsTab({ friends, loading }: { friends: UserWithFriendship[], loading: boolean }) {
    const { toast } = useToast();
    const [chattingWith, setChattingWith] = useState<UserWithFriendship | null>(null);

    const handleUnfriend = async (request: UserWithFriendship) => {
        if (!request.requestId) return;
        try {
            await unfriend(request.requestId);
            toast({ title: "Friend Removed", description: `You are no longer friends with ${request.displayName}.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        }
    }
    
    const sortedFriends = useMemo(() => {
        const onlineFriends: UserWithFriendship[] = [];
        const offlineFriends: UserWithFriendship[] = [];

        friends.forEach(friend => {
            const isOnline = friend.lastSeen && (new Date().getTime() - new Date(friend.lastSeen.seconds * 1000).getTime()) < 5 * 60 * 1000;
            if (isOnline) {
                onlineFriends.push(friend);
            } else {
                offlineFriends.push(friend);
            }
        });
        
        onlineFriends.sort((a, b) => a.displayName.localeCompare(b.displayName));
        offlineFriends.sort((a, b) => a.displayName.localeCompare(b.displayName));

        return [...onlineFriends, ...offlineFriends];
    }, [friends]);

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>My Friends ({friends.length})</CardTitle>
                    <CardDescription>Your connections on the platform. Sorted by online status.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : sortedFriends.length === 0 ? (
                        <p className="text-muted-foreground text-center">You haven't added any friends yet.</p>
                    ) : (
                        <ul className="space-y-3">
                            {sortedFriends.map(friend => {
                                const isOnline = friend.lastSeen && (new Date().getTime() - new Date(friend.lastSeen.seconds * 1000).getTime()) < 5 * 60 * 1000;
                                return (
                                <li key={friend.uid} className="flex items-center justify-between gap-4 p-2 rounded-lg hover:bg-muted/50">
                                <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={`https://avatar.vercel.sh/${friend.email}.png`} />
                                                <AvatarFallback>{friend.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                                            </Avatar>
                                            {isOnline && <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />}
                                        </div>
                                        <div>
                                            <p className="font-medium">{friend.displayName}</p>
                                            <p className="text-sm text-muted-foreground">{friend.email}</p>
                                        </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="secondary" onClick={() => setChattingWith(friend)}>
                                        <MessageCircle className="mr-2 h-4 w-4"/> Chat
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleUnfriend(friend)}>Unfriend</Button>
                                </div>
                                </li>
                            )})}
                        </ul>
                    )}
                </CardContent>
            </Card>
             {chattingWith && (
                <ChatDialog 
                    friend={chattingWith} 
                    onClose={() => setChattingWith(null)} 
                />
            )}
        </>
    );
}

function RequestsTab({ requests, loading }: { requests: FriendRequest[], loading: boolean }) {
    const { toast } = useToast();

    const handleResponse = async (id: string, response: 'accepted' | 'declined') => {
        try {
            await respondToFriendRequest(id, response);
            toast({ title: `Request ${response}`, description: `You have ${response} the friend request.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Friend Requests ({requests.length})</CardTitle>
                <CardDescription>Accept or decline requests from other users.</CardDescription>
            </CardHeader>
            <CardContent>
                 {loading ? (
                    <div className="flex justify-center items-center h-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : requests.length === 0 ? (
                    <p className="text-muted-foreground text-center">You have no incoming friend requests.</p>
                ) : (
                    <ul className="space-y-3">
                        {requests.map(req => (
                            <li key={req.id} className="flex items-center justify-between gap-4 p-2 rounded-lg hover:bg-muted/50">
                               <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={`https://avatar.vercel.sh/${req.fromEmail}.png`} />
                                        <AvatarFallback>{req.fromName?.charAt(0) ?? 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{req.fromName}</p>
                                        <p className="text-sm text-muted-foreground">{req.fromEmail}</p>
                                    </div>
                               </div>
                               <div className="flex items-center gap-2">
                                   <Button size="sm" onClick={() => handleResponse(req.id, 'accepted')}>
                                       <Check className="h-4 w-4" />
                                   </Button>
                                   <Button size="sm" variant="destructive" onClick={() => handleResponse(req.id, 'declined')}>
                                       <X className="h-4 w-4" />
                                   </Button>
                               </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

function FindPeopleTab({ users, loading }: { users: UserWithFriendship[], loading: boolean }) {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    
    const handleAddFriend = async (recipient: AppUser) => {
        try {
            if (!currentUser) throw new Error("You must be logged in.");
            await sendFriendRequest(currentUser, recipient);
            toast({ title: "Request Sent!", description: `Your friend request to ${recipient.displayName} has been sent.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        }
    };
    
    const filteredUsers = useMemo(() => 
        users.filter(u => u.displayName.toLowerCase().includes(searchTerm.toLowerCase())),
        [users, searchTerm]
    );

    const getButton = (user: UserWithFriendship) => {
        switch (user.friendshipStatus) {
            case 'friend':
                return <Button variant="ghost" disabled>Friends</Button>;
            case 'request_sent':
                return <Button variant="outline" disabled>Request Sent</Button>;
            case 'request_received':
                 return <Button variant="secondary">Respond in Requests</Button>;
            case 'not_friend':
                return (
                    <Button onClick={() => handleAddFriend(user)}>
                        <UserPlus className="mr-2 h-4 w-4" /> Add Friend
                    </Button>
                );
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Find People</CardTitle>
                <CardDescription>Search for other users and add them as friends.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Search by name..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                 {loading ? (
                    <div className="flex justify-center items-center h-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : filteredUsers.length === 0 ? (
                    <p className="text-muted-foreground text-center">No users found.</p>
                ) : (
                    <ul className="space-y-3">
                        {filteredUsers.map(user => (
                            <li key={user.uid} className="flex items-center justify-between gap-4 p-2 rounded-lg hover:bg-muted/50">
                               <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={`https://avatar.vercel.sh/${user.email}.png`} />
                                        <AvatarFallback>{user.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{user.displayName}</p>
                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                    </div>
                               </div>
                               <div>{getButton(user)}</div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

export default function FriendsPage() {
    const { user } = useAuth();
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [requestsLoading, setRequestsLoading] = useState(true);
    const loading = usersLoading || requestsLoading;

    // Listener for all users
    useEffect(() => {
        const q = query(collection(db, 'users'), orderBy('displayName'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as AppUser));
            setAllUsers(usersData);
            setUsersLoading(false);
        }, (error) => {
            console.error("Error fetching users:", error);
            setUsersLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Listener for all friend requests involving the current user
    useEffect(() => {
        if (!user?.uid) {
            setRequestsLoading(false);
            return;
        }
        const q = query(collection(db, 'friendRequests'), where('participants', 'array-contains', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const requestsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FriendRequest));
            setFriendRequests(requestsData);
            setRequestsLoading(false);
        }, (error) => {
            console.error("Error fetching friend requests:", error);
            setRequestsLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    // Memoized computations for friends, requests, and all users with status
    const { friends, incomingRequests, usersWithStatus } = useMemo(() => {
        if (!user) return { friends: [], incomingRequests: [], usersWithStatus: [] };

        const friendsList: UserWithFriendship[] = [];
        const incoming: FriendRequest[] = [];
        const requestMap = new Map<string, {status: FriendRequest['status'], from: string, id: string}>();

        for (const req of friendRequests) {
            const otherUserId = req.from === user.uid ? req.to : req.from;
            requestMap.set(otherUserId, { status: req.status, from: req.from, id: req.id });

            if (req.status === 'accepted') {
                 const friendUser = allUsers.find(u => u.uid === otherUserId);
                 if (friendUser) {
                    friendsList.push({ ...friendUser, friendshipStatus: 'friend', requestId: req.id });
                 }
            } else if (req.status === 'pending' && req.to === user.uid) {
                incoming.push(req);
            }
        }
        
        const allUsersWithStatus = allUsers
            .filter(u => u.uid !== user.uid) // Exclude self
            .map(otherUser => {
                const req = requestMap.get(otherUser.uid);
                let friendshipStatus: UserWithFriendship['friendshipStatus'] = 'not_friend';
                if (req) {
                    if (req.status === 'accepted') friendshipStatus = 'friend';
                    else if (req.status === 'pending') {
                        friendshipStatus = req.from === user.uid ? 'request_sent' : 'request_received';
                    }
                }
                return { ...otherUser, friendshipStatus, requestId: req?.id };
            });

        return { friends: friendsList, incomingRequests: incoming, usersWithStatus: allUsersWithStatus };
    }, [user, allUsers, friendRequests]);
    
    return (
        <div className="grid gap-6">
            <div>
                <h1 className="text-3xl font-bold">Friends</h1>
                <p className="text-muted-foreground">Manage your connections and find new people.</p>
            </div>
             <Tabs defaultValue="friends" className="w-full">
                <TabsList className="flex h-auto w-full flex-wrap justify-center">
                    <TabsTrigger value="friends">My Friends</TabsTrigger>
                    <TabsTrigger value="requests">Requests ({incomingRequests.length})</TabsTrigger>
                    <TabsTrigger value="find">Find People</TabsTrigger>
                </TabsList>
                <TabsContent value="friends" className="mt-6">
                    <MyFriendsTab friends={friends} loading={loading} />
                </TabsContent>
                <TabsContent value="requests" className="mt-6">
                    <RequestsTab requests={incomingRequests} loading={loading} />
                </TabsContent>
                <TabsContent value="find" className="mt-6">
                    <FindPeopleTab users={usersWithStatus} loading={loading} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
