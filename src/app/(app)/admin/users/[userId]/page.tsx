
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/init';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, Shield, ShieldOff, LogOut, Ban } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AppUser {
    uid: string;
    displayName: string;
    email: string;
    coins: number;
    pkrBalance: number;
    admin: boolean;
    blocked?: boolean;
    disableLogout?: boolean;
    createdAt: { seconds: number; nanoseconds: number; } | null;
}

interface Activity {
    id: string;
    type: 'login' | 'logout';
    timestamp: { seconds: number; nanoseconds: number; };
}

export default function UserDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { updateUserBlockStatus, updateUserLogoutStatus } = useAuth();
    const userId = params.userId as string;

    const [user, setUser] = useState<AppUser | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!userId) return;

        const userRef = doc(db, 'users', userId);
        const unsubUser = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                setUser({ ...docSnap.data(), uid: docSnap.id } as AppUser);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'User not found.' });
                router.push('/admin');
            }
            setLoading(false);
        });

        const activityRef = collection(db, 'users', userId, 'activity');
        const q = query(activityRef, orderBy('timestamp', 'desc'));
        const unsubActivities = onSnapshot(q, (snapshot) => {
            const activityData: Activity[] = [];
            snapshot.forEach(doc => activityData.push({ ...doc.data(), id: doc.id } as Activity));
            setActivities(activityData);
        });


        return () => {
            unsubUser();
            unsubActivities();
        };
    }, [userId, router, toast]);

    const handleToggleBlock = async () => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            await updateUserBlockStatus(user.uid, !user.blocked);
            toast({
                title: `User ${!user.blocked ? 'Blocked' : 'Unblocked'}`,
                description: `${user.displayName} has been ${!user.blocked ? 'blocked' : 'unblocked'}.`,
            });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleLogout = async () => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            await updateUserLogoutStatus(user.uid, !user.disableLogout);
            toast({
                title: `Logout ${!user.disableLogout ? 'Disabled' : 'Enabled'}`,
                description: `Logout for ${user.displayName} has been ${!user.disableLogout ? 'disabled' : 'enabled'}.`,
            });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return null; // Or a not found component
    }
    
    const getInitials = (name: string | null) => {
        if (!name) return "U";
        return name.split(" ").map((n) => n[0]).join("");
    };

    return (
        <div className="grid gap-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">User Details</h1>
                    <p className="text-muted-foreground">Manage and review user activity.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-1 space-y-6">
                    <Card>
                        <CardHeader className="items-center">
                             <Avatar className="h-24 w-24">
                                <AvatarImage src={`https://avatar.vercel.sh/${user.email}.png`} alt={user.displayName} />
                                <AvatarFallback className="text-4xl">{getInitials(user.displayName)}</AvatarFallback>
                            </Avatar>
                        </CardHeader>
                        <CardContent className="text-center">
                            <CardTitle>{user.displayName}</CardTitle>
                            <CardDescription>{user.email}</CardDescription>
                            <div className="flex justify-center gap-2 mt-2">
                                {user.blocked ? (
                                    <Badge variant="destructive">Blocked</Badge>
                                ) : user.admin ? (
                                    <Badge>Admin</Badge>
                                ) : (
                                    <Badge variant="secondary">User</Badge>
                                )}
                                 {user.disableLogout && (
                                    <Badge variant="outline">Logout Disabled</Badge>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Account Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">User ID:</span>
                                <span className="font-mono">{user.uid}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Joined:</span>
                                <span>{user.createdAt ? format(new Date(user.createdAt.seconds * 1000), 'PPP') : 'N/A'}</span>
                            </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Coins:</span>
                                <span className="font-semibold">{user.coins.toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Admin Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            <Button variant={user.blocked ? 'secondary' : 'destructive'} onClick={handleToggleBlock} disabled={isSubmitting}>
                                {user.blocked ? <ShieldOff className="mr-2" /> : <Shield className="mr-2" />}
                                {user.blocked ? 'Unblock User' : 'Block User'}
                            </Button>
                             <Button variant="outline" onClick={handleToggleLogout} disabled={isSubmitting}>
                                {user.disableLogout ? <LogOut className="mr-2" /> : <Ban className="mr-2" />}
                                {user.disableLogout ? 'Enable Logout' : 'Disable Logout'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-2">
                     <Card>
                        <CardHeader>
                            <CardTitle>User Activity</CardTitle>
                            <CardDescription>A log of recent login and logout events.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Event</TableHead>
                                            <TableHead className="text-right">Time</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activities.length > 0 ? activities.map(activity => (
                                            <TableRow key={activity.id}>
                                                <TableCell>
                                                    <span className="capitalize font-medium">{activity.type}</span>
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                     {formatDistanceToNow(new Date(activity.timestamp.seconds * 1000), { addSuffix: true })}
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={2} className="h-24 text-center">
                                                    No activity recorded yet.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
