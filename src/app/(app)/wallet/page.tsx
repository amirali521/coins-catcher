
"use client";

import {
  Card,
  CardContent,
  CardDescription,
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
import { Coins, ArrowUpCircle, ArrowDownCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase/init";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { calculateWithdrawalOptions } from "./actions";
import { PkrOption, UcOption, DiamondOption } from "@/ai/flows/wallet-flow";
import { useToast } from "@/hooks/use-toast";


interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: { seconds: number; nanoseconds: number; };
}

export default function WalletPage() {
  const { user, withdrawCoins } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [calculating, setCalculating] = useState<string | null>(null);
  const [pkrOptions, setPkrOptions] = useState<PkrOption[]>([]);
  const [ucOptions, setUcOptions] = useState<UcOption[]>([]);
  const [diamondOptions, setDiamondOptions] = useState<DiamondOption[]>([]);


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

  const handleCalculate = async (type: 'pkr' | 'uc' | 'ff_diamond') => {
    if (!user) return;
    setCalculating(type);
    setPkrOptions([]);
    setUcOptions([]);
    setDiamondOptions([]);

    try {
      const result = await calculateWithdrawalOptions(type, user.coins);
      if (result.pkrOptions) setPkrOptions(result.pkrOptions);
      if (result.ucOptions) setUcOptions(result.ucOptions);
      if (result.diamondOptions) setDiamondOptions(result.diamondOptions);
      if (result.insufficientFunds) {
        toast({
          variant: "destructive",
          title: "Insufficient Coins",
          description: result.message
        });
      }
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Calculation Failed",
        description: error.message || "An error occurred while calculating options."
      });
    } finally {
      setCalculating(null);
    }
  };
  
  const handleWithdraw = async (coinCost: number, description: string) => {
      try {
        await withdrawCoins(coinCost, description);
        toast({
            title: "Withdrawal Successful",
            description: "Your withdrawal is being processed. It may take up to 24 hours.",
        });
      } catch (error: any) {
          toast({
            variant: "destructive",
            title: "Withdrawal Failed",
            description: error.message || "An unexpected error occurred.",
        });
      }
  }


  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">Wallet</h1>
        <p className="text-muted-foreground">Manage your coins and view your transaction history.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Balance</CardTitle>
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
          <CardTitle>Withdrawal Calculator</CardTitle>
          <CardDescription>Use the Gemini API to calculate withdrawal options. 100,000 Coins = 1 USD.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pkr">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pkr" onClick={() => handleCalculate('pkr')}>PKR (Cash)</TabsTrigger>
              <TabsTrigger value="uc" onClick={() => handleCalculate('uc')}>PUBG UC</TabsTrigger>
              <TabsTrigger value="ff" onClick={() => handleCalculate('ff_diamond')}>FreeFire Diamonds</TabsTrigger>
            </TabsList>
            <TabsContent value="pkr" className="mt-4">
              {calculating === 'pkr' && <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />}
              {pkrOptions.length > 0 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Select a withdrawal amount. You will be asked for account details upon withdrawal.</p>
                  {pkrOptions.map(option => (
                     <div key={option.usd} className="flex items-center justify-between rounded-lg border p-3">
                       <div>
                          <p className="font-bold text-lg">{option.pkr.toLocaleString()} PKR</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1"><Coins className="h-4 w-4"/> {option.coinCost.toLocaleString()} coins (~${option.usd})</p>
                       </div>
                       <Button onClick={() => handleWithdraw(option.coinCost, `${option.pkr} PKR withdrawal`)} disabled={!user || user.coins < option.coinCost}>
                         Withdraw
                       </Button>
                     </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="uc" className="mt-4">
              {calculating === 'uc' && <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />}
               {ucOptions.length > 0 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Select a UC package. You will be asked for your Player ID upon withdrawal.</p>
                  {ucOptions.map(option => (
                     <div key={option.uc} className="flex items-center justify-between rounded-lg border p-3">
                       <div>
                          <p className="font-bold text-lg">{option.uc} UC</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1"><Coins className="h-4 w-4"/> {option.coinCost.toLocaleString()} coins</p>
                       </div>
                       <Button onClick={() => handleWithdraw(option.coinCost, `${option.uc} UC withdrawal`)} disabled={!user || user.coins < option.coinCost}>
                         Withdraw
                       </Button>
                     </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="ff" className="mt-4">
              {calculating === 'ff' && <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />}
               {diamondOptions.length > 0 && (
                <div className="space-y-4">
                   <p className="text-sm text-muted-foreground">Select a Diamond package. You will be asked for your Player ID upon withdrawal.</p>
                  {diamondOptions.map(option => (
                     <div key={option.diamonds} className="flex items-center justify-between rounded-lg border p-3">
                       <div>
                          <p className="font-bold text-lg">{option.diamonds} Diamonds</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1"><Coins className="h-4 w-4"/> {option.coinCost.toLocaleString()} coins</p>
                       </div>
                       <Button onClick={() => handleWithdraw(option.coinCost, `${option.diamonds} Diamond withdrawal`)} disabled={!user || user.coins < option.coinCost}>
                         Withdraw
                       </Button>
                     </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>


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
                      {tx.amount > 0 ? <ArrowUpCircle className="h-4 w-4 text-green-500" /> : <ArrowDownCircle className="h-4 w-4 text-red-500" />}
                      {tx.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.amount > 0 ? "secondary" : "destructive"}>
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
    </div>
  );
}
