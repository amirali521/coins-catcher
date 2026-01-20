"use client";

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/init';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, formatDistanceToNow } from 'date-fns';
import { Loader2, Banknote, Gamepad2, ListFilter, CheckCircle, XCircle, User as UserIcon, Calendar, Hash, Coins, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';


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

function RequestDetailsDialog({ request, isOpen, onClose }: { request: WithdrawalRequest | null; isOpen: boolean; onClose: () => void; }) {
    if (!request) return null;

    const getRequestTitle = (req: WithdrawalRequest) => {
        if (req.type === 'pkr') return `Withdraw ${req.pkrAmount} PKR`;
        return `Purchase ${req.details.packageAmount} ${req.type.toUpperCase()}`;
    };
    
    const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
        switch (status) {
            case 'approved': return <Badge variant="secondary" className="bg-green-500/20 text-green-500">Approved</Badge>;
            case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
            case 'pending': return <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">Pending</Badge>;
        }
    }

    return (
         <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Request Details</DialogTitle>
                    <DialogDescription>
                        Complete details for the selected transaction.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 pt-4">
                    <h3 className="font-semibold text-lg">{getRequestTitle(request)}</h3>
                     <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground"><UserIcon className="h-4 w-4"/><span>User</span></div>
                        <div className="font-medium text-right">{request.userDisplayName}</div>
                        
                        <div className="flex items-center gap-2 text-muted-foreground"><Coins className="h-4 w-4"/><span>Cost</span></div>
                        <div className="font-medium text-right">{request.coinAmount.toLocaleString()} coins</div>
                        
                        <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4"/><span>Date</span></div>
                        <div className="font-medium text-right">{format(request.createdAt.seconds * 1000, 'PPpp')}</div>
                        
                         <div className="flex items-center gap-2 text-muted-foreground"><Hash className="h-4 w-4"/><span>Status</span></div>
                        <div className="font-medium text-right">{getStatusBadge(request.status)}</div>
                     </div>
                     
                     <hr className="my-2"/>

                     <h4 className="font-semibold">Request Information</h4>
                     <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        {request.type === 'pkr' && (
                            <>
                                <div className="text-muted-foreground">Method</div>
                                <div className="font-medium text-right">{request.details.withdrawalMethod}</div>
                                <div className="text-muted-foreground">Account Name</div>
                                <div className="font-medium text-right">{request.details.accountName}</div>
                                <div className="text-muted-foreground">Account Number</div>
                                <div className="font-medium text-right">{request.details.accountNumber}</div>
                            </>
                        )}
                        {(request.type === 'uc' || request.type === 'diamond') && (
                             <>
                                <div className="text-muted-foreground">Game</div>
                                <div className="font-medium text-right">{request.details.withdrawalMethod}</div>
                                <div className="text-muted-foreground">Game Name</div>
                                <div className="font-medium text-right">{request.details.gameName || 'N/A'}</div>
                                <div className="text-muted-foreground">Game ID</div>
                                <div className="font-medium text-right">{request.details.gameId}</div>
                            </>
                        )}
                     </div>

                    {request.status === 'rejected' && request.rejectionReason && (
                         <>
                            <hr className="my-2"/>
                            <div className="space-y-1">
                                <h4 className="font-semibold flex items-center gap-2 text-destructive"><MessageSquare className="h-4 w-4"/>Rejection Reason</h4>
                                <p className="text-sm text-destructive/80 p-2 bg-destructive/10 rounded-md">{request.rejectionReason}</p>
                            </div>
                         </>
                     )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default function WithdrawalsPage() {
    const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<'all'| 'pending' | 'approved' | 'rejected'>('all');
    const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);

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
                    <CardDescription>Review the status of all user withdrawal and purchase requests. Click a row for more details.</CardDescription>
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
                                    <TableHead className="text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={3} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /></TableCell></TableRow>
                                ) : filteredRequests.length === 0 ? (
                                    <TableRow><TableCell colSpan={3} className="h-24 text-center">No {activeTab} requests found.</TableCell></TableRow>
                                ) : (
                                    filteredRequests.map(req => (
                                        <TableRow key={req.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedRequest(req)}>
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
                                            </TableCell>
                                            <TableCell className="text-center">
                                                 {req.status === 'approved' && <CheckCircle className="h-6 w-6 text-green-500 mx-auto" />}
                                                 {req.status === 'rejected' && <XCircle className="h-6 w-6 text-red-500 mx-auto" />}
                                                 {req.status === 'pending' && <Loader2 className="h-6 w-6 animate-spin text-yellow-500 mx-auto" />}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
            <RequestDetailsDialog isOpen={!!selectedRequest} onClose={() => setSelectedRequest(null)} request={selectedRequest} />
        </div>
    );
}
