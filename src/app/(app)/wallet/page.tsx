"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { Coins, ArrowUpCircle, ArrowDownCircle, Loader2, Users, Wallet as WalletIcon, ArrowRightLeft, ShoppingBag, History } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/init";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: { seconds: number; nanoseconds: number; };
}

interface Package {
    amount: number;
    price: number;
}
interface WalletSettings {
    coinToPkrRate: number;
    ucPackages: Package[];
    diamondPackages: Package[];
}

const withdrawalFormSchema = z.object({
  amount: z.coerce.number().min(100, { message: "Minimum withdrawal is 100 PKR." }),
});

const transferFormSchema = z.object({
  recipientId: z.string().min(1, { message: "Recipient ID is required." }),
  amount: z.coerce.number().min(1, { message: "Amount must be positive." }),
  currency: z.enum(['coins', 'pkr'], { required_error: "You must select a currency." }),
});


function WalletActions() {
    const { user, withdrawPkr } = useAuth();
    const { toast } = useToast();
    const [settings, setSettings] = useState<WalletSettings | null>(null);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [isPurchasing, setIsPurchasing] = useState<string | null>(null); // Use a unique key like `type-index`

    const formSchema = withdrawalFormSchema.refine(data => data.amount <= (user?.pkrBalance ?? 0), {
        message: "Amount exceeds your PKR balance.",
        path: ["amount"],
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            amount: 100,
        },
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settingsRef = doc(db, 'config', 'wallet');
                const docSnap = await getDoc(settingsRef);
                if (docSnap.exists()) {
                    setSettings(docSnap.data() as WalletSettings);
                }
            } catch (error) {
                console.error("Failed to fetch wallet settings:", error);
                toast({ variant: 'destructive', title: "Error", description: "Could not load purchase options." });
            } finally {
                setLoadingSettings(false);
            }
        };
        fetchSettings();
    }, [toast]);

    async function onWithdrawSubmit(data: z.infer<typeof formSchema>) {
        try {
            await withdrawPkr(data.amount, `${data.amount} PKR Withdrawal`);
            toast({
                title: "Withdrawal Successful",
                description: `Your request for ${data.amount} PKR has been processed.`,
            });
            form.reset();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Withdrawal Failed",
                description: error.message,
            });
        }
    }

    const handlePurchase = async (pkg: Package, type: 'UC' | 'Diamond', index: number) => {
        if (!user || (user.pkrBalance < pkg.price)) {
            toast({
                variant: "destructive",
                title: "Insufficient Balance",
                description: `You need ${pkg.price} PKR to purchase this, but you only have ${user.pkrBalance} PKR.`,
            });
            return;
        }

        const purchaseKey = `${type}-${index}`;
        setIsPurchasing(purchaseKey);
        try {
            await withdrawPkr(pkg.price, `Purchase of ${pkg.amount} ${type}`);
             toast({
                title: "Purchase Successful!",
                description: `You purchased ${pkg.amount} ${type} for ${pkg.price} PKR.`,
            });
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: "Purchase Failed",
                description: error.message,
            });
        } finally {
            setIsPurchasing(null);
        }
    };

    if (loadingSettings) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Withdrawals & Purchases</CardTitle>
                    <CardDescription>Loading options...</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }
    
    return (
         <Card>
            <CardHeader>
                <CardTitle>Withdrawals & Purchases</CardTitle>
                <CardDescription>Use your PKR balance to withdraw cash or purchase in-game currency.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="withdraw" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="withdraw">Withdraw PKR</TabsTrigger>
                        <TabsTrigger value="uc">PUBG UC</TabsTrigger>
                        <TabsTrigger value="diamonds">FreeFire Diamonds</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="withdraw" className="pt-6">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onWithdrawSubmit)} className="space-y-6 max-w-md mx-auto">
                                <h3 className="font-semibold text-lg">Withdraw Funds</h3>
                                <p className="text-sm text-muted-foreground">
                                    Withdrawals to Easypaisa/Jazzcash are simulated. The amount will be deducted from your balance.
                                </p>
                                 <FormField
                                    control={form.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Amount (PKR)</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="100" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Withdraw
                                </Button>
                            </form>
                        </Form>
                    </TabsContent>

                    <TabsContent value="uc" className="pt-6">
                         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {settings?.ucPackages && settings.ucPackages.length > 0 ? (
                                settings.ucPackages.map((pkg, index) => (
                                    <Card key={`uc-${index}`}>
                                        <CardHeader className="text-center">
                                            <CardTitle>{pkg.amount} UC</CardTitle>
                                        </CardHeader>
                                        <CardContent className="text-center">
                                            <p className="text-2xl font-bold text-primary">{pkg.price} PKR</p>
                                        </CardContent>
                                        <CardFooter>
                                            <Button 
                                                className="w-full"
                                                disabled={isPurchasing !== null}
                                                onClick={() => handlePurchase(pkg, 'UC', index)}
                                            >
                                                {isPurchasing === `UC-${index}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Purchase"}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))
                            ) : (<p className="col-span-full text-center text-muted-foreground pt-4">No UC packages available.</p>)}
                         </div>
                    </TabsContent>
                    
                    <TabsContent value="diamonds" className="pt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {settings?.diamondPackages && settings.diamondPackages.length > 0 ? (
                                settings.diamondPackages.map((pkg, index) => (
                                    <Card key={`diamond-${index}`}>
                                        <CardHeader className="text-center">
                                            <CardTitle>{pkg.amount} Diamonds</CardTitle>
                                        </CardHeader>
                                        <CardContent className="text-center">
                                            <p className="text-2xl font-bold text-primary">{pkg.price} PKR</p>
                                        </CardContent>
                                        <CardFooter>
                                            <Button 
                                                className="w-full"
                                                disabled={isPurchasing !== null}
                                                onClick={() => handlePurchase(pkg, 'Diamond', index)}
                                            >
                                                {isPurchasing === `Diamond-${index}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Purchase"}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))
                            ): (<p className="col-span-full text-center text-muted-foreground pt-4">No Diamond packages available.</p>)}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

function TransferCard() {
    const { user, transferFunds } = useAuth();
    const { toast } = useToast();

    const formSchema = transferFormSchema.refine((data) => {
        if (!user) return false;
        if (data.currency === 'coins') {
            return data.amount <= user.coins;
        }
        if (data.currency === 'pkr') {
            return data.amount <= user.pkrBalance;
        }
        return false;
    }, {
        message: "Amount exceeds your available balance.",
        path: ["amount"],
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            recipientId: "",
            amount: 1,
            currency: 'coins',
        },
    });

    async function onSubmit(data: z.infer<typeof formSchema>) {
        try {
            await transferFunds(data.recipientId, data.amount, data.currency);
            toast({
                title: "Transfer Successful",
                description: `You have successfully sent ${data.amount.toLocaleString()} ${data.currency.toUpperCase()} to ${data.recipientId}.`,
            });
            form.reset();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Transfer Failed",
                description: error.message,
            });
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users />
                    Transfer Funds
                </CardTitle>
                <CardDescription>
                    Send coins or PKR to another user. You will need their unique User ID.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                         <FormField
                            control={form.control}
                            name="recipientId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Recipient's User ID</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter the user's ID" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <div className="grid grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="100" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="currency"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>Currency</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex items-center space-x-4 pt-2"
                                            >
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value="coins" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">
                                                    Coins
                                                    </FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value="pkr" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">
                                                    PKR
                                                    </FormLabel>
                                                </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                         </div>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Funds
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export default function WalletPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    };

    const transRef = collection(db, 'users', user.uid, 'transactions');
    const q = query(transRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userTransactions: Transaction[] = [];
      snapshot.forEach(doc => {
        userTransactions.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      setTransactions(userTransactions);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching transactions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch transaction history."
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">Wallet</h1>
        <p className="text-muted-foreground">Manage your coins and view your transaction history.</p>
      </div>

       <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview"><WalletIcon className="mr-2 h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="transfer"><ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer</TabsTrigger>
          <TabsTrigger value="purchase"><ShoppingBag className="mr-2 h-4 w-4" /> Withdraw & Purchase</TabsTrigger>
          <TabsTrigger value="history"><History className="mr-2 h-4 w-4" /> History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
           <div className="grid md:grid-cols-2 gap-6">
                <Card>
                <CardHeader>
                    <CardTitle>Coin Balance</CardTitle>
                    <CardDescription>The total number of coins you own.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 text-4xl font-bold text-primary">
                    <Coins className="h-12 w-12" />
                    <span>{user?.coins.toLocaleString() ?? 0}</span>
                    </div>
                </CardContent>
                </Card>
                <Card>
                <CardHeader>
                    <CardTitle>PKR Balance</CardTitle>
                    <CardDescription>Your balance converted to PKR.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 text-4xl font-bold text-accent">
                    <span className="text-2xl font-medium">PKR</span>
                    <span>{user?.pkrBalance?.toLocaleString() ?? 0}</span>
                    </div>
                </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="transfer" className="mt-6">
            <TransferCard />
        </TabsContent>

        <TabsContent value="purchase" className="mt-6">
            <WalletActions />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
            <Card>
                <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>A log of your recent earnings and spending.</CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {loading ? (
                        <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                        </TableCell>
                        </TableRow>
                    ) : transactions.length > 0 ? (
                        transactions.map((tx) => (
                        <TableRow key={tx.id}>
                            <TableCell className="font-medium capitalize flex items-center gap-2">
                            {tx.amount < 0 ? <ArrowDownCircle className="h-4 w-4 text-red-500" /> : <ArrowUpCircle className="h-4 w-4 text-green-500" />}
                            {tx.description}
                            </TableCell>
                            <TableCell>
                            <Badge variant={tx.amount < 0 ? "destructive" : "secondary"}>
                                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                            </Badge>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                            {tx.date ? formatDistanceToNow(new Date(tx.date.seconds * 1000), { addSuffix: true }) : 'N/A'}
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                            You have no transactions yet.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
