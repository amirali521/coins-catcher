
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, WithdrawalRequestPayload } from "@/lib/auth";
import { Coins, Loader2, Wallet as WalletIcon, ArrowRightLeft, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/init";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatLargeNumber } from "@/lib/utils";

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
  method: z.enum(['Jazzcash', 'Easypaisa'], { required_error: "You must select a withdrawal method." }),
});

const transferFormSchema = z.object({
  recipientId: z.string().min(1, { message: "Recipient ID is required." }),
  amount: z.coerce.number().min(1, { message: "Amount must be positive." }),
  currency: z.enum(['coins', 'pkr'], { required_error: "You must select a currency." }),
});


function WalletActions() {
    const { user, requestWithdrawal } = useAuth();
    const { toast } = useToast();
    const [settings, setSettings] = useState<WalletSettings | null>(null);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

    const pkrFormSchema = withdrawalFormSchema.refine(data => data.amount <= (user?.pkrBalance ?? 0), {
        message: "Amount exceeds your PKR balance.",
        path: ["amount"],
    });

    const pkrForm = useForm<z.infer<typeof pkrFormSchema>>({
        resolver: zodResolver(pkrFormSchema),
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

    async function onWithdrawSubmit(data: z.infer<typeof pkrFormSchema>) {
        setIsSubmitting('pkr-withdraw');
        try {
            const payload: WithdrawalRequestPayload = {
                type: 'pkr',
                pkrAmount: data.amount,
                details: {
                    withdrawalMethod: data.method,
                }
            };
            await requestWithdrawal(payload);
            toast({
                title: "Request Submitted",
                description: `Your withdrawal request for ${data.amount} PKR has been submitted for review.`,
            });
            pkrForm.reset();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Withdrawal Failed",
                description: error.message,
            });
        } finally {
            setIsSubmitting(null);
        }
    }

    const handlePurchase = async (pkg: Package, type: 'uc' | 'diamond', index: number) => {
        if (!user) {
             toast({
                variant: "destructive",
                title: "Authentication Error",
                description: `You must be logged in to make a purchase.`,
            });
            return;
        }

        if (user.pkrBalance < pkg.price) {
            toast({
                variant: "destructive",
                title: "Insufficient Balance",
                description: `You need ${pkg.price} PKR to purchase this, but you only have ${user.pkrBalance} PKR.`,
            });
            return;
        }

        const purchaseKey = `${type}-${index}`;
        setIsSubmitting(purchaseKey);
        try {
            const payload: WithdrawalRequestPayload = {
                type: type,
                pkrAmount: pkg.price,
                details: {
                   packageAmount: pkg.amount,
                   withdrawalMethod: type === 'uc' ? 'PUBG' : 'FreeFire',
                }
            };
            await requestWithdrawal(payload);
             toast({
                title: "Purchase Request Submitted!",
                description: `Your request for ${pkg.amount} ${type.toUpperCase()} has been submitted for review.`,
            });
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: "Purchase Failed",
                description: error.message,
            });
        } finally {
            setIsSubmitting(null);
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
                <CardDescription>Use your PKR balance to withdraw cash or purchase in-game currency. All requests are reviewed by an admin.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="withdraw" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="withdraw">Withdraw PKR</TabsTrigger>
                        <TabsTrigger value="uc">PUBG UC</TabsTrigger>
                        <TabsTrigger value="diamonds">FreeFire Diamonds</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="withdraw" className="pt-6">
                        <Form {...pkrForm}>
                            <form onSubmit={pkrForm.handleSubmit(onWithdrawSubmit)} className="space-y-6 max-w-md mx-auto">
                                <h3 className="font-semibold text-lg">Request a Withdrawal</h3>
                                <FormField
                                    control={pkrForm.control}
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
                                 <FormField
                                    control={pkrForm.control}
                                    name="method"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>Withdrawal Method</FormLabel>
                                            <p className="text-xs text-muted-foreground">Ensure your account details are correct in Settings.</p>
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl>
                                                            <RadioGroupItem value="Jazzcash" disabled={!user?.jazzcashNumber}/>
                                                        </FormControl>
                                                        <FormLabel className="font-normal">
                                                            Jazzcash {!user?.jazzcashNumber && '(Not Configured)'}
                                                        </FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl>
                                                            <RadioGroupItem value="Easypaisa" disabled={!user?.easypaisaNumber} />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">
                                                            Easypaisa {!user?.easypaisaNumber && '(Not Configured)'}
                                                        </FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                <Button type="submit" disabled={!!isSubmitting}>
                                    {isSubmitting === 'pkr-withdraw' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Submit Request
                                </Button>
                            </form>
                        </Form>
                    </TabsContent>

                    <TabsContent value="uc" className="pt-6">
                        <p className="text-sm text-center mb-4 text-muted-foreground">Ensure your PUBG ID is correct in Settings before purchasing.</p>
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
                                                disabled={!!isSubmitting || !user?.pubgId}
                                                onClick={() => handlePurchase(pkg, 'uc', index)}
                                            >
                                                {isSubmitting === `uc-${index}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Request Purchase"}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))
                            ) : (<p className="col-span-full text-center text-muted-foreground pt-4">No UC packages available.</p>)}
                         </div>
                    </TabsContent>
                    
                    <TabsContent value="diamonds" className="pt-6">
                        <p className="text-sm text-center mb-4 text-muted-foreground">Ensure your FreeFire ID is correct in Settings before purchasing.</p>
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
                                                disabled={!!isSubmitting || !user?.freefireId}
                                                onClick={() => handlePurchase(pkg, 'diamond', index)}
                                            >
                                                {isSubmitting === `diamond-${index}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Request Purchase"}
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
                    <ArrowRightLeft />
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

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">Wallet</h1>
        <p className="text-muted-foreground">Manage your coins and view your transaction history.</p>
      </div>

       <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-center">
          <TabsTrigger value="overview"><WalletIcon className="mr-2 h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="transfer"><ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer</TabsTrigger>
          <TabsTrigger value="purchase"><ShoppingBag className="mr-2 h-4 w-4" /> Withdraw & Purchase</TabsTrigger>
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
                    <span>{formatLargeNumber(user?.coins)}</span>
                    </div>
                </CardContent>
                </Card>
                <Card>
                <CardHeader>
                    <CardTitle>PKR Balance</CardTitle>
                    <CardDescription>Your estimated balance in PKR. This is the balance you can withdraw from.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 text-4xl font-bold text-green-500">
                    <span className="text-2xl font-medium">PKR</span>
                    <span>{formatLargeNumber(user?.pkrBalance)}</span>
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
      </Tabs>
    </div>
  );
}
