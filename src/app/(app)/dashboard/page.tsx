
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Gift, Clock, Coins } from "lucide-react";
import { BannerAd } from "@/components/ads/banner-ad";

const CLAIM_COOLDOWN_HOURS = 3;
const CLAIM_AMOUNT = 100;

export default function DashboardPage() {
  const { user, updateCoins } = useAuth();
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [canClaim, setCanClaim] = useState(false);

  const calculateTimeLeft = useCallback(() => {
    const lastClaimTimestamp = localStorage.getItem('lastClaimTimestamp');
    if (lastClaimTimestamp) {
      const now = new Date().getTime();
      const lastClaimTime = parseInt(lastClaimTimestamp, 10);
      const cooldownMs = CLAIM_COOLDOWN_HOURS * 60 * 60 * 1000;
      const nextClaimTime = lastClaimTime + cooldownMs;

      if (now >= nextClaimTime) {
        setCanClaim(true);
        setTimeLeft(0);
      } else {
        setCanClaim(false);
        setTimeLeft(nextClaimTime - now);
      }
    } else {
      setCanClaim(true);
      setTimeLeft(0);
    }
  }, []);

  useEffect(() => {
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  const formatTime = (ms: number | null) => {
    if (ms === null || ms <= 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const handleClaim = async () => {
    if (canClaim && user) {
      await updateCoins(user.coins + CLAIM_AMOUNT);
      localStorage.setItem('lastClaimTimestamp', new Date().getTime().toString());
      setCanClaim(false);
      calculateTimeLeft();
      
      toast({
        title: "🎉 Reward Claimed!",
        description: `You have received ${CLAIM_AMOUNT} coins.`,
      });

      // Simulate Popunder ad
      window.open('https://adsterra.com/', '_blank');
    }
  };

  const handleBonusClaim = async (amount: number) => {
    if (user) {
      await updateCoins(user.coins + amount);
      
      toast({
        title: "🎉 Reward Claimed!",
        description: `You have received ${amount} coins.`,
      });

      // Simulate Popunder ad
      window.open('https://adsterra.com/', '_blank');
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="md:col-span-2">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.displayName}! Here are your earnings.</p>
      </div>

      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="text-primary" />
            <span>Hourly Reward</span>
          </CardTitle>
          <CardDescription>
            Claim your free coins every {CLAIM_COOLDOWN_HOURS} hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 items-center justify-center gap-6">
          <div className="text-center">
            {canClaim ? (
              <>
                <p className="text-lg text-muted-foreground">Your reward is ready!</p>
                <p className="text-5xl font-bold text-primary flex items-center justify-center gap-2">
                  <Coins className="h-10 w-10"/> {CLAIM_AMOUNT}
                </p>
              </>
            ) : (
              <>
                <p className="text-lg text-muted-foreground">Next claim in:</p>
                <p className="text-5xl font-bold font-mono text-foreground flex items-center justify-center gap-2">
                  <Clock className="h-10 w-10"/> {formatTime(timeLeft)}
                </p>
              </>
            )}
          </div>
          <Button
            size="lg"
            className="w-full max-w-xs text-lg py-6 transition-transform duration-200 hover:scale-105"
            onClick={handleClaim}
            disabled={!canClaim}
          >
            {canClaim ? "Claim Now" : "Come Back Later"}
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Your Balance</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center text-6xl font-bold text-primary gap-4">
          <Coins className="h-16 w-16" />
          <span>{user?.coins?.toLocaleString() ?? 0}</span>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Bonus Rewards</CardTitle>
          <CardDescription>Claim extra coins instantly by watching an ad.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           <Button
              size="lg"
              className="w-full text-lg py-8 flex flex-col h-auto transition-transform duration-200 hover:scale-105"
              onClick={() => handleBonusClaim(20)}
            >
              <div className="flex items-center gap-2">
                <Coins className="h-6 w-6"/>
                <span className="text-2xl font-bold">20</span>
              </div>
              <span className="text-sm font-normal mt-1">Claim Coins</span>
            </Button>
            <Button
              size="lg"
              className="w-full text-lg py-8 flex flex-col h-auto transition-transform duration-200 hover:scale-105"
              onClick={() => handleBonusClaim(30)}
            >
              <div className="flex items-center gap-2">
                <Coins className="h-6 w-6"/>
                <span className="text-2xl font-bold">30</span>
              </div>
              <span className="text-sm font-normal mt-1">Claim Coins</span>
            </Button>
            <Button
              size="lg"
              className="w-full text-lg py-8 flex flex-col h-auto transition-transform duration-200 hover:scale-105"
              onClick={() => handleBonusClaim(30)}
            >
               <div className="flex items-center gap-2">
                <Coins className="h-6 w-6"/>
                <span className="text-2xl font-bold">30</span>
              </div>
              <span className="text-sm font-normal mt-1">Claim Coins</span>
            </Button>
        </CardContent>
      </Card>

      <div className="md:col-span-2">
        <BannerAd />
      </div>
    </div>
  );
}
