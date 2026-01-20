
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
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { ArrowUpCircle, ArrowDownCircle, Loader2, History as HistoryIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase/init";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatLargeNumber } from "@/lib/utils";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: { seconds: number; nanoseconds: number; };
}

export default function HistoryPage() {
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
        <h1 className="text-3xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground">A log of all your earnings and spending.</p>
      </div>
      <Card>
          <CardHeader>
          <CardTitle className="flex items-center gap-2"><HistoryIcon /> History</CardTitle>
          <CardDescription>A log of your recent earnings and spending.</CardDescription>
          </CardHeader>
          <CardContent>
          <ScrollArea className="h-[calc(100vh-20rem)]">
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
                            {tx.amount > 0 ? '+' : ''}{formatLargeNumber(tx.amount)}
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
          </ScrollArea>
          </CardContent>
      </Card>
    </div>
  );
}
