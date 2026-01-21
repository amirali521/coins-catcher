"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Gift, Clock, Coins, CheckCircle, Gamepad2, Star, Bomb } from "lucide-react";
import { BannerAd } from "@/components/ads/banner-ad";
import FaucetBannerAd from "@/components/ads/faucet-banner-ad";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isToday } from "date-fns";
import { cn, formatLargeNumber } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const HOURLY_CLAIM_COOLDOWN_HOURS = 3;
const HOURLY_CLAIM_AMOUNT = 100;
const FAUCET_CLAIM_COOLDOWN_HOURS = 3;
const FAUCET_CLAIM_AMOUNT = 50;
const DAILY_REWARDS = [15, 30, 45, 60, 75, 90, 120];

// Game Types
type GameButtonType = 'gold' | 'silver' | 'blast';
interface GameButton {
  id: number;
  type: GameButtonType;
  x: number;
  y: number;
}
interface ClickEffect {
  id: number;
  x: number;
  y: number;
  type: GameButtonType;
}


export default function DashboardPage() {
  const { user, claimHourlyReward, claimFaucetReward, claimDailyReward, claimTapTapReward } = useAuth();
  const { toast } = useToast();
  const [faucetPopoverOpen, setFaucetPopoverOpen] = useState(false);
  const [faucetAdClicked, setFaucetAdClicked] = useState(false);

  // Core reward states
  const [hourlyTimeLeft, setHourlyTimeLeft] = useState<number | null>(null);
  const [canClaimHourly, setCanClaimHourly] = useState(false);
  const [hourlyAdLinkClicked, setHourlyAdLinkClicked] = useState(false);
  const [faucetTimeLeft, setFaucetTimeLeft] = useState<number | null>(null);
  const [canClaimFaucet, setCanClaimFaucet] = useState(false);
  const [canClaimDaily, setCanClaimDaily] = useState(false);

  // New Game states
  const [gamePoints, setGamePoints] = useState(0);
  const [gameButtons, setGameButtons] = useState<GameButton[]>([]);
  const [gameAdClicked, setGameAdClicked] = useState(false);
  const [clickEffects, setClickEffects] = useState<ClickEffect[]>([]);
  const gameBoardRef = useRef<HTMLDivElement>(null);


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

  // Ad click detection for faucet
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

  // Game Loop
  useEffect(() => {
    const gameInterval = setInterval(() => {
        if (gameButtons.length > 11) return; // Max 12 buttons on screen

        const buttonType: GameButtonType = (['gold', 'silver', 'silver', 'silver', 'blast'] as GameButtonType[])[Math.floor(Math.random() * 5)];
        
        const newButton: GameButton = {
            id: Date.now(),
            type: buttonType,
            x: Math.random() * 85,
            y: Math.random() * 85,
        };

        setGameButtons(current => [...current, newButton]);

        // Auto-remove button after 2.5 seconds
        setTimeout(() => {
            setGameButtons(current => current.filter(b => b.id !== newButton.id));
        }, 2500);

    }, 600); // New button every 0.6 seconds

    return () => clearInterval(gameInterval);
  }, [gameButtons.length]);


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
        setHourlyAdLinkClicked(false);
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

  // New Game Logic
  const handleGameButtonClick = (button: GameButton) => {
    setGameButtons(current => current.filter(b => b.id !== button.id));

    const newEffect: ClickEffect = {
      id: Date.now(),
      x: button.x,
      y: button.y,
      type: button.type,
    };
    setClickEffects(current => [...current, newEffect]);
    setTimeout(() => {
      setClickEffects(current => current.filter(e => e.id !== newEffect.id));
    }, 500);

    if (button.type === 'gold') {
        setGamePoints(p => p + 2);
    } else if (button.type === 'silver') {
        setGamePoints(p => p + 1);
    } else if (button.type === 'blast') {
        toast({
            variant: 'destructive',
            title: '💥 Ouch!',
            description: 'You lost 2 points.'
        });
        setGamePoints(p => Math.max(0, p - 2));
    }
  }

  const handleGameClaim = async () => {
    const mainCoinsToAdd = Math.floor(gamePoints / 10);
    
    if (!gameAdClicked) {
      toast({ variant: 'destructive', title: 'Task not completed', description: 'Please click the link in Step 1 first.' });
      return;
    }
    if (mainCoinsToAdd <= 0) {
      toast({ variant: 'destructive', title: 'Not enough points', description: 'You need at least 10 points to claim.' });
      return;
    }

    try {
      await claimTapTapReward(mainCoinsToAdd); 
      toast({
        title: '🎉 Game Reward Claimed!',
        description: `You converted ${mainCoinsToAdd * 10} points into ${mainCoinsToAdd} main coins.`,
      });
      setGamePoints(prev => prev % 10); // Keep the remainder
      setGameAdClicked(false);
    } catch (error: any) {
      console.error("Failed to claim game reward:", error);
      toast({
        variant: "destructive",
        title: "Claim Failed",
        description: error.message || "There was an issue claiming your reward.",
      });
    }
  };


  const currentStreak = user?.dailyStreakCount || 0;
  const lastDailyClaimDate = user?.lastDailyClaim ? new Date(user.lastDailyClaim.seconds * 1000) : null;
  const isClaimedToday = lastDailyClaimDate ? isToday(lastDailyClaimDate) : false;
  
  let nextClaimDay;
  if (isClaimedToday) {
      nextClaimDay = (currentStreak % 7) + 1;
  } else {
      nextClaimDay = currentStreak + 1;
  }

  return (
    <div className="grid gap-6">
       <div className="col-span-full">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.displayName}! Here are your earnings.</p>
      </div>

      <Tabs defaultValue="rewards" className="w-full col-span-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rewards"><Gift className="mr-2 h-4 w-4" />Main Rewards</TabsTrigger>
            <TabsTrigger value="game"><Gamepad2 className="mr-2 h-4 w-4" />Coin Catcher</TabsTrigger>
        </TabsList>
        
        <TabsContent value="rewards" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
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
                  <CardDescription>Your total coins and their estimated PKR value.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center gap-1 pt-2">
                    <div className="flex items-center justify-center text-6xl font-bold text-primary gap-4">
                      <Coins className="h-16 w-16" />
                      <span>{formatLargeNumber(user?.coins)}</span>
                    </div>
                    <div className="w-full flex justify-between items-baseline text-sm px-4">
                        <span className="text-muted-foreground">{user?.coins?.toLocaleString() ?? '0'} coins</span>
                        <span className="font-semibold text-green-500">~ {user?.pkrBalance?.toLocaleString() ?? '0'} PKR</span>
                    </div>
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
                                <div className="flex justify-center">
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
        </TabsContent>
        
        <TabsContent value="game" className="mt-6">
            <Card className="flex flex-col items-center justify-center text-center">
                <CardHeader>
                    <CardTitle>Coin Catcher</CardTitle>
                    <CardDescription>Click the gold and silver stars to earn points. Watch out for bombs!</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4 w-full">
                    <div className="text-center">
                        <p className="text-7xl font-bold text-primary flex items-center justify-center gap-2">
                            {formatLargeNumber(gamePoints)}
                        </p>
                        <p className="text-muted-foreground">Points Mined</p>
                    </div>

                    <div ref={gameBoardRef} className="relative h-96 w-full max-w-lg bg-muted/20 rounded-lg border-2 border-dashed overflow-hidden">
                       {gameButtons.map(button => (
                            <Button 
                                key={button.id}
                                variant="outline"
                                size="icon"
                                className={cn(
                                    "absolute transition-all duration-300 transform-gpu animate-in fade-in zoom-in-50 hover:scale-110 active:scale-95 hover:z-10 h-10 w-10",
                                    {
                                        'border-yellow-400/50 hover:bg-yellow-400/10': button.type === 'gold',
                                        'border-gray-400/50 hover:bg-gray-400/10': button.type === 'silver',
                                        'border-destructive/50 hover:bg-destructive/10': button.type === 'blast',
                                    }
                                )}
                                style={{
                                    top: `${button.y}%`,
                                    left: `${button.x}%`,
                                }}
                                onClick={() => handleGameButtonClick(button)}
                            >
                                {button.type === 'gold' && <Star className="h-6 w-6 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.7)]" />}
                                {button.type === 'silver' && <Star className="h-5 w-5 text-gray-400 fill-gray-400 drop-shadow-[0_0_5px_rgba(156,163,175,0.7)]" />}
                                {button.type === 'blast' && <Bomb className="h-6 w-6 text-destructive" />}
                            </Button>
                       ))}
                       {clickEffects.map(effect => (
                          <div
                              key={effect.id}
                              className={effect.type === 'blast' ? 'blast-effect' : 'sparkle-effect'}
                              style={{
                                  top: `calc(${effect.y}% + 20px)`,
                                  left: `calc(${effect.x}% + 20px)`,
                                  transform: 'translate(-50%, -50%)',
                              }}
                          />
                      ))}
                    </div>
                </CardContent>
                <CardFooter className="flex-col gap-4 w-full max-w-sm border-t pt-6">
                     <div className="text-sm text-muted-foreground font-semibold">
                        Gold Star = 2 points. Silver Star = 1 point.
                    </div>
                    <div className="text-sm text-muted-foreground font-semibold">
                        10 Points = 1 Main Coin
                    </div>
                    <Button
                        className="w-full"
                        variant={!gameAdClicked ? "outline" : "default"}
                        onClick={() => {
                            if (!gameAdClicked) {
                                window.open('https://www.effectivegatecpm.com/rjxuuya9?key=0ca0a474faa38ad1b07174333d291e37', '_blank');
                                setGameAdClicked(true);
                            } else {
                                handleGameClaim();
                            }
                        }}
                        disabled={gameAdClicked && gamePoints < 10}
                    >
                        {!gameAdClicked
                            ? "Step 1: Open Link to Enable Claim"
                            : `Step 2: Claim ${Math.floor(gamePoints / 10)} Main Coins`
                        }
                    </Button>
                </CardFooter>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

    