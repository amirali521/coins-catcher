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
import { Coins, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

const mockTransactions = [
  { id: 1, type: 'claim', amount: 100, date: '2023-10-27 10:00 AM' },
  { id: 2, type: 'referral', amount: 500, date: '2023-10-26 04:30 PM' },
  { id: 3, type: 'claim', amount: 100, date: '2023-10-26 01:00 PM' },
  { id: 4, type: 'withdraw', amount: -1000, date: '2023-10-25 09:00 AM' },
  { id: 5, type: 'claim', amount: 100, date: '2023-10-25 08:00 AM' },
];

export default function WalletPage() {
  const { user } = useAuth();

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
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>A log of your recent earnings and spending.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium capitalize flex items-center gap-2">
                    {tx.amount > 0 ? <ArrowUpCircle className="h-4 w-4 text-green-500" /> : <ArrowDownCircle className="h-4 w-4 text-red-500" />}
                    {tx.type}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tx.amount > 0 ? "secondary" : "destructive"}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{tx.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
