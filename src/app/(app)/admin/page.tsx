'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, doc, getDoc, setDoc, getDocs, limit } from 'firebase/firestore';
import { db } from '@/firebase/init';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, PlusCircle, Save, Trash2, Gift, Award, Users as UsersIcon, Settings, LayoutDashboard, UserCog, Ban } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatLargeNumber } from '@/lib/utils';


interface AppUser {
    uid: string;
    displayName: string;
    email: string;
    coins: number;
    admin: boolean;
    blocked?: boolean;
    createdAt: { seconds: number; nanoseconds: number; } | null;
    referredBy?: string;
}

const packageSchema = z.object({
    amount: z.number().min(1, "Amount must be positive"),
    price: z.number().min(1, "Price must be positive"),
});

const walletSettingsSchema = z.object({
  coinToPkrRate: z.number().min(1, "Rate must be positive"),
  ucPackages: z.array(packageSchema),
  diamondPackages: z.array(packageSchema),
});

type WalletSettingsForm = z.infer<typeof walletSettingsSchema>;

const bonusFormSchema = z.object({
    amount: z.coerce.number().min(1, "Bonus amount must be positive."),
    reason: z.string().min(3, "Please provide a reason.").max(100),
});
type BonusForm = z.infer<typeof bonusFormSchema>;

function BonusDialog({ user, isOpen, onClose }: { user: AppUser | null, isOpen: boolean, onClose: () => void }) {
    const { toast } = useToast();
    const { giveBonus } = useAuth();

    const form = useForm<BonusForm>({
        resolver: zodResolver(bonusFormSchema),
        defaultValues: { amount: 100, reason: '' },
    });

    const onSubmit = async (data: BonusForm) => {
        if (!user) return;
        try {
            await giveBonus(user.uid, data.amount, data.reason);
            toast({
                title: "Bonus Sent!",
                description: `${user.displayName} received ${data.amount} coins.`
            });
            form.reset();
            onClose();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Failed to Send Bonus',
                description: error.message
            });
        }
    };
    
    if (!user) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Give Bonus to {user.displayName}</DialogTitle>
                    <DialogDescription>
                        This will add coins directly to the user's balance and create a transaction record.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Coin Amount</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 500" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reason</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="e.g., Contest winner" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Bonus
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

function WalletSettings() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);

    const form = useForm<WalletSettingsForm>({
        resolver: zodResolver(walletSettingsSchema),
        defaultValues: {
            coinToPkrRate: 1,
            ucPackages: [],
            diamondPackages: [],
        },
    });

    const { fields: ucFields, append: appendUc, remove: removeUc } = useFieldArray({
        control: form.control,
        name: "ucPackages",
    });
     const { fields: diamondFields, append: appendDiamond, remove: removeDiamond } = useFieldArray({
        control: form.control,
        name: "diamondPackages",
    });

    useEffect(() => {
        const fetchSettings = async () => {
            const settingsRef = doc(db, 'config', 'wallet');
            const docSnap = await getDoc(settingsRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as WalletSettingsForm;
                form.reset({
                    coinToPkrRate: data.coinToPkrRate,
                    ucPackages: data.ucPackages || [],
                    diamondPackages: data.diamondPackages || [],
                });
            }
            setLoading(false);
        };
        fetchSettings();
    }, [form]);
    
    const onSubmit = async (data: WalletSettingsForm) => {
        try {
            const settingsRef = doc(db, 'config', 'wallet');
            await setDoc(settingsRef, data);
            toast({
                title: "Settings Saved",
                description: "Wallet configuration has been updated.",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error Saving Settings",
                description: error.message,
            });
        }
    };

    if (loading) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Wallet Settings</CardTitle>
                    <CardDescription>Manage conversion rates and withdrawal packages.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardHeader>
                        <CardTitle>Wallet Settings</CardTitle>
                        <CardDescription>Manage conversion rates and withdrawal packages.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="space-y-4 rounded-lg border p-4">
                             <h3 className="font-semibold">Coin Conversion</h3>
                             <FormField
                                control={form.control}
                                name="coinToPkrRate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>PKR per 100,000 Coins</FormLabel>
                                         <FormControl>
                                            <Input 
                                                type="number" 
                                                placeholder="e.g., 300"
                                                {...field}
                                                onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                         <div className="space-y-4 rounded-lg border p-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">PUBG UC Packages</h3>
                                <Button type="button" size="sm" variant="ghost" onClick={() => appendUc({ amount: 0, price: 0 })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Package
                                </Button>
                            </div>
                            <div className="space-y-4">
                                {ucFields.map((field, index) => (
                                    <div key={field.id} className="flex items-center gap-4">
                                        <FormField
                                            control={form.control}
                                            name={`ucPackages.${index}.amount`}
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormLabel>UC Amount</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="e.g., 60" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`ucPackages.${index}.price`}
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormLabel>PKR Price</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="e.g., 260" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="button" size="icon" variant="destructive" onClick={() => removeUc(index)} className="self-end">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {ucFields.length === 0 && <p className="text-sm text-muted-foreground text-center">No UC packages defined.</p>}
                            </div>
                        </div>

                        <div className="space-y-4 rounded-lg border p-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">FreeFire Diamond Packages</h3>
                                <Button type="button" size="sm" variant="ghost" onClick={() => appendDiamond({ amount: 0, price: 0 })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Package
                                </Button>
                            </div>
                             <div className="space-y-4">
                                {diamondFields.map((field, index) => (
                                    <div key={field.id} className="flex items-center gap-4">
                                        <FormField
                                            control={form.control}
                                            name={`diamondPackages.${index}.amount`}
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormLabel>Diamonds</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="e.g., 100" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`diamondPackages.${index}.price`}
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormLabel>PKR Price</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="e.g., 200" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="button" size="icon" variant="destructive" onClick={() => removeDiamond(index)} className="self-end">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {diamondFields.length === 0 && <p className="text-sm text-muted-foreground text-center">No Diamond packages defined.</p>}
                            </div>
                        </div>

                    </CardContent>
                    <CardFooter>
                         <Button type="submit" disabled={form.formState.isSubmitting}>
                           {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Settings
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}

function TopEarnersCard() {
    const [topEarners, setTopEarners] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTopEarners = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, 'users'), orderBy('coins', 'desc'), limit(5));
                const snapshot = await getDocs(q);
                const usersData: AppUser[] = [];
                snapshot.forEach(doc => usersData.push({ ...doc.data(), uid: doc.id } as AppUser));
                setTopEarners(usersData);
            } catch (error) {
                console.error("Error fetching top earners:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTopEarners();
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Award className="text-yellow-500" /> Top Earners</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-24"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                    <ul className="space-y-3">
                        {topEarners.map((user, index) => (
                            <li key={user.uid} className="flex items-center justify-between gap-4">
                               <div className="flex items-center gap-3">
                                    <span className="font-bold text-lg text-muted-foreground">{index + 1}</span>
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={`https://avatar.vercel.sh/${user.email}.png`} />
                                        <AvatarFallback>{user.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium truncate">{user.displayName}</span>
                               </div>
                               <Badge variant="secondary">{formatLargeNumber(user.coins)} Coins</Badge>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

function TopReferrersCard({ allUsers, loading: loadingUsers }: { allUsers: AppUser[], loading: boolean }) {
    const [topReferrers, setTopReferrers] = useState<(AppUser & { referralCount: number })[]>([]);

    useEffect(() => {
        if (!loadingUsers && allUsers.length > 0) {
            const counts = allUsers.reduce((acc, user) => {
                if (user.referredBy) {
                    acc[user.referredBy] = (acc[user.referredBy] || 0) + 1;
                }
                return acc;
            }, {} as Record<string, number>);

            const sorted = Object.entries(counts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([uid, count]) => {
                    const user = allUsers.find(u => u.uid === uid);
                    return { ...user, uid, referralCount: count } as AppUser & { referralCount: number };
                }).filter(u => u.displayName); 
            setTopReferrers(sorted);
        }
    }, [allUsers, loadingUsers]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><UsersIcon className="text-blue-500" /> Top Referrers</CardTitle>
            </CardHeader>
            <CardContent>
                {loadingUsers ? (
                     <div className="flex justify-center items-center h-24"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                    <ul className="space-y-3">
                        {topReferrers.map((user, index) => (
                            <li key={user.uid} className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-lg text-muted-foreground">{index + 1}</span>
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={`https://avatar.vercel.sh/${user.email}.png`} />
                                        <AvatarFallback>{user.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium truncate">{user.displayName}</span>
                                </div>
                                <Badge variant="secondary">{user.referralCount} Referrals</Badge>
                            </li>
                        ))}
                         {topReferrers.length === 0 && <p className="text-sm text-center text-muted-foreground">No referrals recorded yet.</p>}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

export default function AdminPage() {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [bonusUser, setBonusUser] = useState<AppUser | null>(null);
    const router = useRouter();
    const { updateUserBlockStatus } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(usersQuery);
                const usersData: AppUser[] = [];
                querySnapshot.forEach((doc) => {
                    usersData.push({ ...doc.data(), uid: doc.id } as AppUser);
                });
                setUsers(usersData);
            } catch (error) {
                console.error("Error fetching users:", error);
                toast({
                    variant: "destructive",
                    title: "Failed to load users",
                    description: "There was an error fetching the user list.",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [toast]);

    const getInitials = (name: string | null) => {
        if (!name) return "U";
        return name.split(" ").map((n) => n[0]).join("");
    };

    const handleToggleBlock = async (user: AppUser) => {
        try {
            await updateUserBlockStatus(user.uid, !user.blocked);
            toast({
                title: `User ${!user.blocked ? 'Blocked' : 'Unblocked'}`,
                description: `${user.displayName} has been ${!user.blocked ? 'blocked' : 'unblocked'}.`,
            });
            // Manually update the user state to reflect the change
            setUsers(prevUsers => prevUsers.map(u => u.uid === user.uid ? { ...u, blocked: !u.blocked } : u));
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    }

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="text-3xl font-bold">Admin Panel</h1>
                <p className="text-muted-foreground">Manage users and application data.</p>
            </div>
            
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="flex h-auto w-full flex-wrap justify-center">
                <TabsTrigger value="overview"><LayoutDashboard className="mr-2 h-4 w-4"/> Overview</TabsTrigger>
                <TabsTrigger value="users"><UserCog className="mr-2 h-4 w-4"/> User Management</TabsTrigger>
                <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4"/> Wallet Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                 <div className="grid md:grid-cols-2 gap-6">
                    <TopEarnersCard />
                    <TopReferrersCard allUsers={users} loading={loading} />
                </div>
              </TabsContent>

              <TabsContent value="users" className="mt-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Users</CardTitle>
                        <CardDescription>A list of all registered users.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Coins</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                                        </TableCell>
                                    </TableRow>
                                ) : users.map((user) => (
                                    <TableRow key={user.uid}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={`https://avatar.vercel.sh/${user.email}.png`} alt={user.displayName} />
                                                    <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium flex items-center gap-2">
                                                        {user.displayName || 'N/A'}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {user.blocked ? (
                                                <Badge variant="destructive">Blocked</Badge>
                                            ) : user.admin ? (
                                                <Badge>Admin</Badge>
                                            ) : (
                                                <Badge variant="secondary">User</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>{formatLargeNumber(user.coins)}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {user.createdAt ? formatDistanceToNow(new Date(user.createdAt.seconds * 1000), { addSuffix: true }) : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="ghost" size="sm" onClick={() => setBonusUser(user)}>
                                                <Gift className="mr-2 h-4 w-4" />
                                                Bonus
                                            </Button>
                                            <Button variant={user.blocked ? 'secondary' : 'destructive'} size="sm" onClick={() => handleToggleBlock(user)}>
                                                <Ban className="mr-2 h-4 w-4" />
                                                {user.blocked ? 'Unblock' : 'Block'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="settings" className="mt-6">
                <WalletSettings />
              </TabsContent>
            </Tabs>
            
            <BonusDialog user={bonusUser} isOpen={!!bonusUser} onClose={() => setBonusUser(null)} />
        </div>
    );
}

    

    
