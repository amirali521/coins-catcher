
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Copy, Gift, UserPlus, Loader2, Link as LinkIcon } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/init";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ReferredUser {
    uid: string;
    displayName: string;
    email: string;
    createdAt: { seconds: number; nanoseconds: number; } | null;
}

export default function ReferralsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [loading, setLoading] = useState(true);

  const referralLink = `https://coincatcher.app/signup?ref=${user?.referralCode}`;

  useEffect(() => {
    if (!user?.uid) {
        setLoading(false);
        return;
    }

    const fetchReferredUsers = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, "users"), 
                where("referredBy", "==", user.uid)
            );
            
            const querySnapshot = await getDocs(q);
            const users: ReferredUser[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                users.push({
                    uid: doc.id,
                    displayName: data.displayName,
                    email: data.email,
                    createdAt: data.createdAt || null,
                });
            });
            
            users.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
            setReferredUsers(users);
        } catch (error) {
            console.error("Error fetching referred users:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not fetch your referrals.",
            });
        } finally {
            setLoading(false);
        }
    };

    fetchReferredUsers();
  }, [user, toast]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Copied to Clipboard!",
      description: "Your referral link is ready to be shared.",
    });
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("");
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">Referral Program</h1>
        <p className="text-muted-foreground">Invite friends and earn more coins together!</p>
      </div>

      <Tabs defaultValue="link" className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-center">
          <TabsTrigger value="link">
            <LinkIcon className="mr-2 h-4 w-4" />
            Your Link
          </TabsTrigger>
          <TabsTrigger value="referrals">
            <UserPlus className="mr-2 h-4 w-4" />
            Your Referrals ({referredUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="link" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Referral Link</CardTitle>
              <CardDescription>
                Share this link with your friends. When they sign up using your code, you'll earn a 300 coin bonus, and they'll get a 200 coin welcome bonus to start!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex w-full items-center space-x-2">
                <Input value={referralLink} readOnly />
                <Button onClick={handleCopy} size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
            <CardFooter>
                <div className="flex items-center text-sm text-muted-foreground">
                    <Gift className="mr-2 h-4 w-4 text-primary" />
                    <span>You'll receive <strong>300 coins</strong> and your friend will receive a <strong>200 coin</strong> welcome bonus.</span>
                </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="mt-6">
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UserPlus />
                    Your Referrals ({referredUsers.length})
                </CardTitle>
                <CardDescription>
                    Here's a list of users who have signed up using your referral code.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead className="text-right">User ID</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={2} className="h-24 text-center">
                                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                                </TableCell>
                            </TableRow>
                        ) : referredUsers.length > 0 ? (
                            referredUsers.map((refUser) => (
                                <TableRow key={refUser.uid}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={`https://avatar.vercel.sh/${refUser.email}.png`} alt={refUser.displayName} />
                                                <AvatarFallback>{getInitials(refUser.displayName)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{refUser.displayName || 'N/A'}</p>
                                                <p className="text-sm text-muted-foreground">{refUser.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs text-muted-foreground">{refUser.uid}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                                    You haven't referred any users yet. Share your link to get started!
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

    