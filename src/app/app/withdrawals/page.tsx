
"use client";

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/init';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Banknote, Gamepad2, PackageCheck, PackageX, AlertTriangle, ListFilter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WithdrawalRequest {
  id: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  type: 'pkr' | 'uc' | 'diamond';
  status: 'pending' | 'approved' | 'rejected';
  pkrAmount: number;
  coinAmount: number;
  details: {
    packageAmount?: number;
    gameId?: string;
    gameName?: string;
    accountName?: string;
    accountNumber?: string;
    withdrawalMethod?: 'Jazzcash' | 'Easypaisa' | 'PUBG' | 'FreeFire';
  };
  rejectionReason?: string;
  createdAt: { seconds: number; nanoseconds: number; };
  processedAt?: { seconds: number; nanoseconds: number; };
}

export default function WithdrawalsPage() {
    const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<'all'| 'pending' | 'approved' | 'rejected'>('all');

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'withdrawalRequests'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest));
            setRequests(allRequests);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching withdrawal requests:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch withdrawal history.' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);
    
    const filteredRequests = requests.filter(r => {
        if (activeTab === 'all') return true;
        return r.status === activeTab;
    });

    const getRequestTitle = (req: WithdrawalRequest) => {
        if (req.type === 'pkr') return `Withdraw ${req.pkrAmount} PKR`;
        return `Purchase ${req.details.packageAmount} ${req.type.toUpperCase()}`;
    };

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="text-3xl font-bold">Withdrawal History</h1>
                <p className="text-muted-foreground">A public log of all withdrawal and purchase requests.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ListFilter /> Global Requests</CardTitle>
                    <CardDescription>Review the status of all user withdrawal and purchase requests.</CardDescription>
                     <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full pt-4">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="pending">Pending</TabsTrigger>
                            <TabsTrigger value="approved">Approved</TabsTrigger>
                            <TabsTrigger value="rejected">Rejected</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[calc(100vh-22rem)]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Request</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /></TableCell></TableRow>
                                ) : filteredRequests.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="h-24 text-center">No {activeTab} requests found.</TableCell></TableRow>
                                ) : (
                                    filteredRequests.map(req => (
                                        <TableRow key={req.id}>
                                            <TableCell>
                                                <div className="font-medium">{req.userDisplayName}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className={cn("font-semibold flex items-center gap-2", {
                                                    'text-green-500': req.type === 'pkr',
                                                    'text-blue-400': req.type !== 'pkr'
                                                })}>
                                                    {req.type === 'pkr' ? <Banknote /> : <Gamepad2 />}
                                                    {getRequestTitle(req)}
                                                </div>
                                                <div className="text-sm text-muted-foreground">{req.coinAmount.toLocaleString()} coins</div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {formatDistanceToNow(req.createdAt.seconds * 1000, { addSuffix: true })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                 <Badge variant={req.status === 'approved' ? 'secondary' : req.status === 'rejected' ? 'destructive' : 'outline'} className="capitalize flex gap-2">
                                                    {req.status === 'approved' && <PackageCheck className="h-4 w-4"/>}
                                                    {req.status === 'rejected' && <PackageX className="h-4 w-4"/>}
                                                    {req.status}
                                                 </Badge>
                                                 {req.status === 'rejected' && req.rejectionReason && (
                                                    <p className="text-xs text-destructive mt-1 flex items-start justify-end gap-1 text-right">
                                                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                                        {req.rejectionReason}
                                                    </p>
                                                 )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
