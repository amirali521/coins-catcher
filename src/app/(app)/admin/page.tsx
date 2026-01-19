
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/init';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, PlusCircle, Save, Trash2 } from 'lucide-react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

interface AppUser {
    uid: string;
    displayName: string;
    email: string;
    coins: number;
    admin: boolean;
    createdAt: { seconds: number; nanoseconds: number; } | null;
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
                    // Ensure arrays are not undefined
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

export default function AdminPage() {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const usersData: AppUser[] = [];
            querySnapshot.forEach((doc) => {
                usersData.push({ ...doc.data(), uid: doc.id } as AppUser);
            });
            setUsers(usersData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching users:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const getInitials = (name: string | null) => {
        if (!name) return "U";
        return name.split(" ").map((n) => n[0]).join("");
    };

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="text-3xl font-bold">Admin Panel</h1>
                <p className="text-muted-foreground">Manage users and application data.</p>
            </div>
            <WalletSettings />
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
                                <TableHead>Coins</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead className="text-right">Joined</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
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
                                                <p className="font-medium">{user.displayName || 'N/A'}</p>
                                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{user.coins?.toLocaleString()}</TableCell>
                                    <TableCell>
                                        {user.admin ? (
                                            <Badge>Admin</Badge>
                                        ) : (
                                            <Badge variant="secondary">User</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {user.createdAt ? formatDistanceToNow(new Date(user.createdAt.seconds * 1000), { addSuffix: true }) : 'N/A'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
