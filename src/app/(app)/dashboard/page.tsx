"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Gift, Clock, Coins, CheckCircle } from "lucide-react";
import { BannerAd } from "@/components/ads/banner-ad";
import FaucetBannerAd from "@/components/ads/faucet-banner-ad";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isToday } from "date-fns";
import { cn, formatLargeNumber } from "@/lib/utils";

const HOURLY_CLAIM_COOLDOWN_HOURS = 3;
const HOURLY_CLAIM_AMOUNT = 100;
const FAUCET_CLAIM_COOLDOWN_HOURS = 3;
const FAUCET_CLAIM_AMOUNT = 50;
const DAILY_REWARDS = [15, 30, 45, 60, 75, 90, 120];


export default function DashboardPage() {
  const { user, claimHourlyReward, claimFaucetReward, claimDailyReward } = useAuth();
  const { toast } = useToast();
  const [faucetPopoverOpen, setFaucetPopoverOpen] = useState(false);
  const [faucetAdClicked, setFaucetAdClicked] = useState(false);

  const [hourlyTimeLeft, setHourlyTimeLeft] = useState<number | null>(null);
  const [canClaimHourly, setCanClaimHourly] = useState(false);
  const [hourlyAdLinkClicked, setHourlyAdLinkClicked] = useState(false);
  const [faucetTimeLeft, setFaucetTimeLeft] = useState<number | null>(null);
  const [canClaimFaucet, setCanClaimFaucet] = useState(false);
  const [canClaimDaily, setCanClaimDaily] = useState(false);


  const calculateCooldowns = useCallback(() => {
    if (!user) return;
    const now = new Date().getTime();

    // Hourly Reward
    if (user.lastClaimTimestamp) {
        const lastClaimTime = new Date(user.lastClaimTimestamp.seconds * 1000).getTime();
        const cooldownMs = HOURLY_CLAIM_COOLDOWN_HOURS * 60 * 60 * 1000;
        const nextClaimTime = lastClaimTime + cooldownMs;
        if (now >= nextClaimTime) {
            setCanClaimHourly(true);
            setHourlyTimeLeft(0);
        } else {
            setCanClaimHourly(false);
            setHourlyTimeLeft(nextClaimTime - now);
            if (hourlyAdLinkClicked) {
              setHourlyAdLinkClicked(false);
            }
        }
    } else {
        setCanClaimHourly(true);
        setHourlyTimeLeft(0);
    }

    // Faucet Reward
    if (user.lastFaucetClaimTimestamp) {
        const lastClaimTime = new Date(user.lastFaucetClaimTimestamp.seconds * 1000).getTime();
        const cooldownMs = FAUCET_CLAIM_COOLDOWN_HOURS * 60 * 60 * 1000;
        const nextClaimTime = lastClaimTime + cooldownMs;
        if (now >= nextClaimTime) {
            setCanClaimFaucet(true);
            setFaucetTimeLeft(0);
        } else {
            setCanClaimFaucet(false);
            setFaucetTimeLeft(nextClaimTime - now);
        }
    } else {
        setCanClaimFaucet(true);
        setFaucetTimeLeft(0);
    }
    
    // Daily Reward
    if (user.lastDailyClaim) {
        const lastClaimDate = new Date(user.lastDailyClaim.seconds * 1000);
        setCanClaimDaily(!isToday(lastClaimDate));
    } else {
        setCanClaimDaily(true);
    }
  }, [user, hourlyAdLinkClicked]);

  useEffect(() => {
    calculateCooldowns();
    const timer = setInterval(calculateCooldowns, 1000);
    return () => clearInterval(timer);
  }, [calculateCooldowns]);

  // New logic to detect ad click via window blur
  useEffect(() => {
    const handleBlur = () => {
        if (faucetPopoverOpen) {
            setFaucetAdClicked(true);
        }
    };

    if (faucetPopoverOpen) {
        window.addEventListener('blur', handleBlur);
    }

    return () => {
        window.removeEventListener('blur', handleBlur);
    };
  }, [faucetPopoverOpen]);

  const formatTime = (ms: number | null) => {
    if (ms === null || ms <= 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const handleHourlyClaim = async () => {
    if (canClaimHourly && user) {
      if (!hourlyAdLinkClicked) {
        window.open('https://www.effectivegatecpm.com/rjxuuya9?key=0ca0a474faa38ad1b07174333d291e37', '_blank');
        setHourlyAdLinkClicked(true);
        return;
      }

      try {
        await claimHourlyReward(HOURLY_CLAIM_AMOUNT);
        toast({
          title: "🎉 Reward Claimed!",
          description: `You have received ${HOURLY_CLAIM_AMOUNT} coins.`,
        });
        setHourlyAdLinkClicked(false); // Reset after successful claim
      } catch (error) {
        console.error("Failed to claim reward:", error);
        toast({
            variant: "destructive",
            title: "Claim Failed",
            description: "There was an issue claiming your reward. Please try again later.",
        });
      }
    }
  };

  const handleFaucetClaim = async () => {
    if (user && faucetAdClicked && canClaimFaucet) {
      try {
        await claimFaucetReward(FAUCET_CLAIM_AMOUNT);
        toast({
          title: "🎉 Faucet Reward Claimed!",
          description: `You have received ${FAUCET_CLAIM_AMOUNT} coins.`,
        });
        setFaucetPopoverOpen(false);
         // Reset for next time after a short delay
        setTimeout(() => {
          setFaucetAdClicked(false);
        }, 100);
      } catch (error: any) {
        console.error("Failed to claim faucet reward:", error);
        toast({
            variant: "destructive",
            title: "Claim Failed",
            description: error.message || "There was an issue claiming your reward. Please try again later.",
        });
      }
    }
  };

  const handleDailyClaim = async () => {
      if(user && canClaimDaily) {
          try {
              const { amount, newStreak } = await claimDailyReward();
              toast({
                  title: `🎉 Day ${newStreak} Reward Claimed!`,
                  description: `You received ${amount} coins. Keep up the streak!`,
              });
          } catch(error: any) {
              toast({
                variant: "destructive",
                title: "Claim Failed",
                description: error.message || "Could not claim daily reward.",
              });
          }
      }
  }

  const currentStreak = user?.dailyStreakCount || 0;
  const lastDailyClaimDate = user?.lastDailyClaim ? new Date(user.lastDailyClaim.seconds * 1000) : null;
  const isClaimedToday = lastDailyClaimDate ? isToday(lastDailyClaimDate) : false;
  
  // This logic determines which day is the next to be claimed for the UI
  let nextClaimDay;
  if (isClaimedToday) {
      nextClaimDay = (currentStreak % 7) + 1;
  } else {
      nextClaimDay = currentStreak + 1;
  }


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
            Claim your free coins every {HOURLY_CLAIM_COOLDOWN_HOURS} hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 items-center justify-center gap-6 text-center">
          <div>
            {canClaimHourly ? (
              <>
                <p className="text-lg text-muted-foreground">Your reward is ready!</p>
                <p className="text-5xl font-bold text-primary flex items-center justify-center gap-2">
                  <Coins className="h-10 w-10"/> {HOURLY_CLAIM_AMOUNT}
                </p>
              </>
            ) : (
              <>
                <p className="text-lg text-muted-foreground">Next claim in:</p>
                <p className="text-5xl font-bold font-mono text-foreground flex items-center justify-center gap-2">
                  <Clock className="h-10 w-10"/> {formatTime(hourlyTimeLeft)}
                </p>
              </>
            )}
          </div>
          <BannerAd />
          <Button
            size="lg"
            className="w-full max-w-xs text-lg py-6 transition-transform duration-200 hover:scale-105"
            onClick={handleHourlyClaim}
            disabled={!canClaimHourly}
          >
            {canClaimHourly ? (hourlyAdLinkClicked ? 'Confirm Claim' : 'Claim Now') : "Come Back Later"}
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Your Balance</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center text-6xl font-bold text-primary gap-4">
          <Coins className="h-16 w-16" />
          <span>{formatLargeNumber(user?.coins)}</span>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
            <CardTitle>Weekly Streak</CardTitle>
            <CardDescription>Claim a reward every day. The more you claim in a row, the bigger the reward!</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-2 md:gap-4 text-center">
                {DAILY_REWARDS.map((reward, index) => {
                    const dayNumber = index + 1;
                    const isCompleted = isClaimedToday ? dayNumber <= currentStreak : dayNumber <= currentStreak;
                    const isTodayToClaim = !isClaimedToday && dayNumber === nextClaimDay;

                    return (
                        <div key={dayNumber} className={cn(
                            "rounded-lg p-3 flex flex-col items-center justify-center border",
                             isCompleted && dayNumber !== nextClaimDay ? "bg-primary/20 border-primary/50" : "bg-muted/50",
                             isTodayToClaim && "border-primary ring-2 ring-primary/50"
                        )}>
                            <p className="text-xs text-muted-foreground">Day {dayNumber}</p>
                             <div className="flex items-center gap-1 font-bold text-xl my-1">
                                <Coins className="h-5 w-5 text-yellow-400" />
                                <span>{reward}</span>
                            </div>
                            {isCompleted && dayNumber !== nextClaimDay && <CheckCircle className="h-5 w-5 text-primary" />}
                        </div>
                    )
                })}
            </div>
             <Button
                size="lg"
                className="w-full mt-6"
                onClick={handleDailyClaim}
                disabled={!canClaimDaily}
            >
                {canClaimDaily ? `Claim Day ${nextClaimDay} Reward` : "Come back tomorrow"}
            </Button>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
            <CardTitle>Faucet Reward</CardTitle>
            <CardDescription>Complete a simple task to earn a special reward. Cooldown is separate from the hourly reward.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center pt-4">
            <Popover open={faucetPopoverOpen} onOpenChange={(open) => {
              setFaucetPopoverOpen(open);
              // Reset ad click state when popover is closed manually
              if (!open) {
                setFaucetAdClicked(false);
              }
            }}>
                <PopoverTrigger asChild>
                    <Button
                        size="lg"
                        variant="outline"
                        className="w-full max-w-xs text-lg py-6 transition-transform duration-200 hover:scale-105 border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
                    >
                        <Coins className="mr-2 h-6 w-6"/>
                        Claim {FAUCET_CLAIM_AMOUNT} Coins Faucet
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto" align="center">
                    <div className="grid gap-4">
                        <div className="space-y-1">
                            <h4 className="font-medium leading-none">Click the ad to claim</h4>
                            <p className="text-sm text-muted-foreground">
                            Click the banner below, then you can claim your reward.
                            </p>
                        </div>
                        <div 
                            className="flex justify-center"
                        >
                            <FaucetBannerAd />
                        </div>
                        <Button onClick={handleFaucetClaim} disabled={!faucetAdClicked || !canClaimFaucet}>
                            <Gift className="mr-2 h-4 w-4" />
                            {!canClaimFaucet
                                ? `Claim in ${formatTime(faucetTimeLeft)}`
                                : faucetAdClicked 
                                    ? `Claim ${FAUCET_CLAIM_AMOUNT} Coins`
                                    : "Waiting for ad click..."
                            }
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </CardContent>
      </Card>

      <div className="md:col-span-2 flex justify-center">
        <BannerAd />
      </div>
    </div>
  );
}
