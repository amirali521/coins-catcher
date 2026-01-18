"use client";

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
import { Copy, Gift } from "lucide-react";

export default function ReferralsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const referralLink = `https://coincatcher.app/signup?ref=${user?.referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Copied to Clipboard!",
      description: "Your referral link is ready to be shared.",
    });
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">Referral Program</h1>
        <p className="text-muted-foreground">Invite friends and earn more coins together!</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
          <CardDescription>
            Share this link with your friends. When they sign up, you both get a bonus of 500 coins!
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
                <span>You and your friend will each receive <strong>500 coins</strong> as a bonus.</span>
            </div>
        </CardFooter>
      </Card>
      
    </div>
  );
}
