
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  User as FirebaseUser,
  deleteUser,
} from 'firebase/auth';
import { auth, db } from '@/firebase/init';
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp, updateDoc, query, where, getDocs, limit, increment, collection, addDoc, runTransaction, writeBatch } from 'firebase/firestore';
import { isToday, isYesterday } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  coins: number;
  pkrBalance: number;
  referralCode: string;
  admin: boolean;
  blocked?: boolean;
  logoutDisabled?: boolean;
  lastClaimTimestamp?: { seconds: number; nanoseconds: number; } | null; // Hourly
  dailyStreakCount: number;
  lastDailyClaim: { seconds: number; nanoseconds: number; } | null;
  lastFaucetClaimTimestamp?: { seconds: number; nanoseconds: number; } | null;
  taptapClaimsToday: number;
  lastTapTapClaimDate: { seconds: number; nanoseconds: number; } | null;
  pubgId?: string;
  pubgName?: string;
  freefireId?: string;
  freefireName?: string;
  jazzcashNumber?: string;
  jazzcashName?: string;
  easypaisaNumber?: string;
  easypaisaName?: string;
}

export type WithdrawalRequestType = 'pkr' | 'uc' | 'diamond';

export interface WithdrawalRequestPayload {
    type: WithdrawalRequestType;
    pkrAmount: number;
    details: {
        packageAmount?: number;
        withdrawalMethod?: 'Jazzcash' | 'Easypaisa' | 'PUBG' | 'FreeFire';
    }
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  signup: (name: string, email: string, password?: string, referralCode?: string | null) => Promise<{ referred: boolean }>;
  logout: () => void;
  signInWithGoogle: (referralCode?: string | null) => Promise<{ referred: boolean }>;
  sendVerificationEmail: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  claimHourlyReward: (amount: number) => Promise<void>;
  claimFaucetReward: (amount: number) => Promise<void>;
  claimDailyReward: () => Promise<{ amount: number; newStreak: number }>;
  claimTapTapReward: (amount: number) => Promise<{ claimedAmount: number }>;
  claimGameReward: (amount: number, source: 'Glow Tapper' | 'Coin Catcher') => Promise<void>;
  requestWithdrawal: (payload: WithdrawalRequestPayload) => Promise<void>;
  giveBonus: (userId: string, amount: number, reason: string) => Promise<void>;
  deductCoins: (userId: string, amount: number, reason: string) => Promise<void>;
  updateWithdrawalDetails: (details: Partial<Pick<User, 'pubgId' | 'pubgName' | 'freefireId' | 'freefireName' | 'jazzcashNumber' | 'jazzcashName' | 'easypaisaNumber' | 'easypaisaName'>>) => Promise<void>;
  transferFunds: (recipientId: string, amount: number, currency: 'coins' | 'pkr') => Promise<void>;
  updateUserBlockStatus: (userId: string, blocked: boolean) => Promise<void>;
  updateUserLogoutStatus: (userId: string, disabled: boolean) => Promise<void>;
  updateAllUsersLogoutStatus: (disabled: boolean) => Promise<void>;
  approveWithdrawal: (requestId: string, userId: string, description: string) => Promise<void>;
  rejectWithdrawal: (requestId: string, userId: string, reason: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const addTransaction = async (userId: string, type: string, amount: number, description: string) => {
    const transactionsRef = collection(db, 'users', userId, 'transactions');
    await addDoc(transactionsRef, {
        type,
        amount,
        description,
        date: serverTimestamp(),
    });
};

const addNotification = async (userId: string, title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    await addDoc(notificationsRef, {
        title,
        message,
        type,
        read: false,
        createdAt: serverTimestamp(),
    });
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [coinToPkrRate, setCoinToPkrRate] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRate = async () => {
        try {
            const configRef = doc(db, 'config', 'wallet');
            const docSnap = await getDoc(configRef);
            if (docSnap.exists() && docSnap.data().coinToPkrRate) {
                setCoinToPkrRate(docSnap.data().coinToPkrRate);
            } else {
                setCoinToPkrRate(300); // Default if not set
            }
        } catch (error) {
            console.error("Failed to fetch conversion rate:", error);
            setCoinToPkrRate(300); // Default on error
        }
    };
    fetchRate();
  }, []);


  useEffect(() => {
    if (coinToPkrRate === null) {
      setLoading(true);
      return; 
    }

    let unsubDoc: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      if (unsubDoc) {
        unsubDoc();
      }

      if (fbUser) {
        setFirebaseUser(fbUser);
        const userDocRef = doc(db, 'users', fbUser.uid);
        
        unsubDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const pkrBalance = Math.floor((userData.coins / 100000) * coinToPkrRate);
            
            if (userData.blocked) {
              firebaseSignOut(auth);
              toast({
                variant: 'destructive',
                title: 'Account Blocked',
                description: 'Your account has been blocked by an administrator.',
                duration: Infinity,
              });
              setUser(null);
              setLoading(false);
              return;
            }

            setUser({
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName,
              emailVerified: fbUser.emailVerified,
              coins: userData.coins,
              pkrBalance: pkrBalance,
              referralCode: userData.referralCode,
              admin: userData.admin || false,
              blocked: userData.blocked,
              logoutDisabled: userData.logoutDisabled || false,
              lastClaimTimestamp: userData.lastClaimTimestamp || null,
              dailyStreakCount: userData.dailyStreakCount || 0,
              lastDailyClaim: userData.lastDailyClaim || null,
              lastFaucetClaimTimestamp: userData.lastFaucetClaimTimestamp || null,
              taptapClaimsToday: userData.taptapClaimsToday || 0,
              lastTapTapClaimDate: userData.lastTapTapClaimDate || null,
              pubgId: userData.pubgId,
              pubgName: userData.pubgName,
              freefireId: userData.freefireId,
              freefireName: userData.freefireName,
              jazzcashNumber: userData.jazzcashNumber,
              jazzcashName: userData.jazzcashName,
              easypaisaNumber: userData.easypaisaNumber,
              easypaisaName: userData.easypaisaName,
            });
             setLoading(false);
          } else if (!docSnap.exists()){
             setLoading(false);
          }
        }, (error) => {
            console.error("Firestore snapshot error:", error);
            toast({
              variant: "destructive",
              title: "Data Sync Error",
              description: "Could not sync user data. Please try again."
            })
            setLoading(false);
        });
      } else {
        setFirebaseUser(null);
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubDoc();
    };
  }, [coinToPkrRate, toast]);


  const login = useCallback(async (email: string, password?: string) => {
    if (!password) throw new Error("Password is required for email/password login.");
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;

    const userDocRef = doc(db, 'users', fbUser.uid);
    const userDoc = await getDoc(userDocRef);
    if(userDoc.exists() && userDoc.data().blocked) {
      await firebaseSignOut(auth);
      throw new Error("This account has been blocked by an administrator.");
    }

    await fbUser.reload();
    if (!fbUser.emailVerified) {
      await firebaseSignOut(auth);
      const error: any = new Error("Email not verified. Please check your inbox.");
      error.code = "auth/email-not-verified";
      throw error;
    }
  }, []);
  
  const signInWithGoogle = useCallback(async (referralCode?: string | null) => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const fbUser = userCredential.user;
    let referred = false;
    let referrerId: string | null = null;
    let initialCoins = 200;

    const userDocRef = doc(db, 'users', fbUser.uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists() && docSnap.data().blocked) {
        await firebaseSignOut(auth);
        throw new Error("This account has been blocked by an administrator.");
    }

    if (!docSnap.exists()) {
        if (referralCode) {
            const q = query(collection(db, 'users'), where('referralCode', '==', referralCode), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const referrerDoc = querySnapshot.docs[0];
                referrerId = referrerDoc.id;
                await updateDoc(referrerDoc.ref, { coins: increment(300) });
                await addTransaction(referrerId, 'referral-bonus', 300, `Referral bonus from ${fbUser.displayName || 'a new user'}`);
                referred = true;
            }
        }
      
        const usersRef = collection(db, 'users');
        let finalDisplayName = fbUser.displayName || `user_${fbUser.uid.substring(0, 6)}`;
        const qName = query(usersRef, where('displayName', '==', finalDisplayName));
        const nameQuerySnapshot = await getDocs(qName);

        if (!nameQuerySnapshot.empty) {
          finalDisplayName = `${finalDisplayName}_${fbUser.uid.substring(0, 4)}`;
        }

      await setDoc(userDocRef, {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: finalDisplayName,
        coins: initialCoins,
        referralCode: `REF${fbUser.uid.substring(0, 6).toUpperCase()}`,
        referredBy: referrerId,
        admin: false,
        blocked: false,
        logoutDisabled: false,
        createdAt: serverTimestamp(),
        lastClaimTimestamp: null,
        dailyStreakCount: 0,
        lastDailyClaim: null,
        lastFaucetClaimTimestamp: null,
        taptapClaimsToday: 0,
        lastTapTapClaimDate: null,
      });
      await addTransaction(fbUser.uid, 'welcome-bonus', initialCoins, 'Welcome bonus');
    }
    return { referred };
  }, []);

  const signup = useCallback(async (name: string, email: string, password?: string, referralCode?: string | null) => {
    if (!password) throw new Error("Password is required for email/password signup.");
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;

    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('displayName', '==', name));
        const nameQuerySnapshot = await getDocs(q);
        if (!nameQuerySnapshot.empty) {
          throw new Error(`Username "${name}" is already taken. Please choose another one.`);
        }

        let referred = false;
        let referrerId: string | null = null;
        const initialCoins = 200;

        if (referralCode) {
            const referralQuery = query(collection(db, 'users'), where('referralCode', '==', referralCode), limit(1));
            const querySnapshot = await getDocs(referralQuery);
            if (!querySnapshot.empty) {
                const referrerDoc = querySnapshot.docs[0];
                referrerId = referrerDoc.id;

                if (referrerId !== fbUser.uid) {
                    await updateDoc(referrerDoc.ref, { coins: increment(300) });
                    await addTransaction(referrerId, 'referral-bonus', 300, `Referral bonus from ${name}`);
                    referred = true;
                }
            }
        }

        await updateProfile(fbUser, { displayName: name });
        
        const userDocRef = doc(db, 'users', fbUser.uid);
        await setDoc(userDocRef, {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: name,
          coins: initialCoins,
          referralCode: `REF${fbUser.uid.substring(0, 6).toUpperCase()}`,
          referredBy: referrerId,
          admin: false,
          blocked: false,
          logoutDisabled: false,
          createdAt: serverTimestamp(),
          lastClaimTimestamp: null,
          dailyStreakCount: 0,
          lastDailyClaim: null,
          lastFaucetClaimTimestamp: null,
          taptapClaimsToday: 0,
          lastTapTapClaimDate: null,
        });
        await addTransaction(fbUser.uid, 'welcome-bonus', initialCoins, 'Welcome bonus');

        await sendEmailVerification(fbUser);
        return { referred };
    } catch(e) {
        await deleteUser(fbUser);
        throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    if (user?.logoutDisabled) {
        toast({
            variant: "destructive",
            title: "Logout Disabled",
            description: "Your ability to log out has been disabled by an administrator.",
        });
        return;
    }
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Logout Failed",
            description: error.message.replace('Firebase: ', ''),
        });
    }
  }, [user, toast]);

  const claimHourlyReward = useCallback(async (amount: number) => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        coins: increment(amount),
        lastClaimTimestamp: serverTimestamp(),
      });
      await addTransaction(user.uid, 'claim', amount, 'Hourly reward');
    }
  }, [user]);

  const claimFaucetReward = useCallback(async (amount: number) => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        coins: increment(amount),
        lastFaucetClaimTimestamp: serverTimestamp(),
      });
      await addTransaction(user.uid, 'faucet', amount, 'Faucet reward');
    }
  }, [user]);

  const claimGameReward = useCallback(async (amount: number, source: 'Glow Tapper' | 'Coin Catcher') => {
      if (!user) throw new Error("User not authenticated.");
      if (amount <= 0) throw new Error("Claim amount must be positive.");

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
          coins: increment(amount),
      });
      await addTransaction(user.uid, 'claim', amount, `${source} reward`);
  }, [user]);

  const claimTapTapReward = useCallback(async (amount: number) => {
      if (!user) throw new Error("User not authenticated.");
      if (amount <= 0) {
          throw new Error("Claim amount must be positive.");
      }

      let claimedAmount = 0;

      await runTransaction(db, async (transaction) => {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists()) throw new Error("User data not found.");

          const userData = userDoc.data();
          let claimsToday = userData.taptapClaimsToday || 0;
          const lastClaimDate = userData.lastTapTapClaimDate ? new Date(userData.lastTapTapClaimDate.seconds * 1000) : null;

          if (lastClaimDate && !isToday(lastClaimDate)) {
              claimsToday = 0;
          }
          
          const DAILY_LIMIT = 1000;
          if (claimsToday >= DAILY_LIMIT) {
              throw new Error(`You have reached your daily TapTap claim limit of ${DAILY_LIMIT} coins.`);
          }

          claimedAmount = Math.min(amount, DAILY_LIMIT - claimsToday);
          
          if (claimedAmount <= 0) {
               throw new Error(`You have reached your daily TapTap claim limit of ${DAILY_LIMIT} coins.`);
          }

          transaction.update(userRef, {
              coins: increment(claimedAmount),
              taptapClaimsToday: claimsToday + claimedAmount,
              lastTapTapClaimDate: serverTimestamp(),
          });

          const transRef = doc(collection(db, 'users', user.uid, 'transactions'));
          transaction.set(transRef, {
              type: 'claim',
              amount: claimedAmount,
              description: 'TapTap Miner reward',
              date: serverTimestamp(),
          });
      });
      
      return { claimedAmount };

  }, [user]);

  const DAILY_REWARDS = [15, 30, 45, 60, 75, 90, 120];

  const claimDailyReward = useCallback(async () => {
    if (!user) throw new Error("User not authenticated");

    const userRef = doc(db, 'users', user.uid);
    const lastClaimDate = user.lastDailyClaim ? new Date(user.lastDailyClaim.seconds * 1000) : null;
    
    if (lastClaimDate && isToday(lastClaimDate)) {
        throw new Error("Daily reward already claimed for today.");
    }

    let currentStreak = user.dailyStreakCount || 0;
    
    if (lastClaimDate && isYesterday(lastClaimDate)) {
        currentStreak++;
    } else {
        currentStreak = 1;
    }
    
    if (currentStreak > 7) {
        currentStreak = 1;
    }
    
    const rewardAmount = DAILY_REWARDS[currentStreak - 1];

    await updateDoc(userRef, {
        coins: increment(rewardAmount),
        dailyStreakCount: currentStreak,
        lastDailyClaim: serverTimestamp(),
    });
    
    await addTransaction(user.uid, 'daily-reward', rewardAmount, `Day ${currentStreak} streak bonus`);
    
    return { amount: rewardAmount, newStreak: currentStreak };
  }, [user]);

  const requestWithdrawal = useCallback(async (payload: WithdrawalRequestPayload) => {
    if (!user) throw new Error("User not authenticated");
    if (coinToPkrRate === null || coinToPkrRate <= 0) {
      throw new Error("Cannot process transaction: conversion rate is invalid.");
    }

    const coinsToDeduct = Math.ceil((payload.pkrAmount / coinToPkrRate) * 100000);

    await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists() || userDoc.data().coins < coinsToDeduct) {
            throw new Error("Insufficient coin balance.");
        }
        
        let requestDetails: any = {};
        let transactionDescription = "";

        if (payload.type === 'pkr') {
            if (!user.easypaisaNumber && !user.jazzcashNumber) throw new Error("Please set up a withdrawal method in your settings.");
            requestDetails = {
                withdrawalMethod: payload.details.withdrawalMethod,
                accountName: payload.details.withdrawalMethod === 'Easypaisa' ? user.easypaisaName : user.jazzcashName,
                accountNumber: payload.details.withdrawalMethod === 'Easypaisa' ? user.easypaisaNumber : user.jazzcashNumber,
            };
            transactionDescription = `${payload.pkrAmount} PKR Withdrawal Request`;
        } else if (payload.type === 'uc') {
            if (!user.pubgId) throw new Error("Please add your PUBG ID in your settings.");
            requestDetails = {
                packageAmount: payload.details.packageAmount,
                withdrawalMethod: 'PUBG',
                gameId: user.pubgId,
                gameName: user.pubgName,
            };
            transactionDescription = `Purchase Request for ${payload.details.packageAmount} UC`;
        } else if (payload.type === 'diamond') {
             if (!user.freefireId) throw new Error("Please add your FreeFire ID in your settings.");
             requestDetails = {
                packageAmount: payload.details.packageAmount,
                withdrawalMethod: 'FreeFire',
                gameId: user.freefireId,
                gameName: user.freefireName,
            };
            transactionDescription = `Purchase Request for ${payload.details.packageAmount} Diamonds`;
        } else {
            throw new Error("Invalid withdrawal type.");
        }
        
        transaction.update(userRef, { coins: increment(-coinsToDeduct) });

        const withdrawalRef = doc(collection(db, 'withdrawalRequests'));
        transaction.set(withdrawalRef, {
            userId: user.uid,
            userDisplayName: user.displayName,
            userEmail: user.email,
            status: 'pending',
            type: payload.type,
            pkrAmount: payload.pkrAmount,
            coinAmount: coinsToDeduct,
            details: requestDetails,
            createdAt: serverTimestamp(),
        });

        const transactionsRef = doc(collection(db, 'users', user.uid, 'transactions'));
        transaction.set(transactionsRef, {
            type: 'withdrawal-request',
            amount: -coinsToDeduct,
            description: transactionDescription,
            date: serverTimestamp(),
        });
    });
  }, [user, coinToPkrRate]);
  

  const transferFunds = useCallback(async (recipientId: string, amount: number, currency: 'coins' | 'pkr') => {
    if (!user) throw new Error("User not authenticated.");
    if (user.uid === recipientId) throw new Error("You cannot transfer funds to yourself.");

    if (amount <= 0) {
      throw new Error("Transfer amount must be positive.");
    }

    try {
      await runTransaction(db, async (transaction) => {
        const senderRef = doc(db, 'users', user.uid);
        const recipientRef = doc(db, 'users', recipientId);

        const [senderDoc, recipientDoc] = await Promise.all([
          transaction.get(senderRef),
          transaction.get(recipientRef),
        ]);

        if (!senderDoc.exists()) {
          throw new Error("Sender document not found.");
        }
        if (!recipientDoc.exists()) {
          throw new Error("Recipient User ID not found.");
        }
        
        const senderData = senderDoc.data();
        const recipientData = recipientDoc.data();
        let coinsToTransfer = 0;
        let description = "";

        if (currency === 'coins') {
          coinsToTransfer = amount;
          if (senderData.coins < coinsToTransfer) {
            throw new Error("Insufficient coin balance.");
          }
          description = `${amount.toLocaleString()} coins`;
        } else { 
          if (coinToPkrRate === null || coinToPkrRate <= 0) {
            throw new Error("Cannot process transaction: conversion rate is invalid.");
          }
          const senderPkrBalance = Math.floor((senderData.coins / 100000) * coinToPkrRate);
          if (senderPkrBalance < amount) {
            throw new Error("Insufficient PKR balance.");
          }
          coinsToTransfer = Math.ceil((amount / coinToPkrRate) * 100000);
          if (senderData.coins < coinsToTransfer) {
            throw new Error("Insufficient coin balance for this PKR amount.");
          }
          description = `${amount.toLocaleString()} PKR`;
        }

        transaction.update(senderRef, { coins: increment(-coinsToTransfer) });
        transaction.update(recipientRef, { coins: increment(coinsToTransfer) });

        const now = new Date();
        const senderLog = { type: 'transfer-sent', amount: -coinsToTransfer, description: `Sent ${description} to ${recipientData.displayName || recipientId}`, date: now };
        const recipientLog = { type: 'transfer-received', amount: coinsToTransfer, description: `Received ${description} from ${senderData.displayName || user.uid}`, date: now };
        
        transaction.set(doc(collection(db, 'users', user.uid, 'transactions')), senderLog);
        transaction.set(doc(collection(db, 'users', recipientId, 'transactions')), recipientLog);
      });
    } catch(e: any) {
        throw new Error(e.message || "Transfer failed. Please try again.");
    }
  }, [user, coinToPkrRate]);
  
  const sendVerificationEmail = useCallback(async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    } else {
      throw new Error("No user is currently signed in to send a verification email.");
    }
  }, []);

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    await firebaseSendPasswordResetEmail(auth, email);
  }, []);
  
  const giveBonus = useCallback(async (userId: string, amount: number, reason: string) => {
      if (!user?.admin) {
          throw new Error("You must be an admin to perform this action.");
      }
      if (amount <= 0) {
          throw new Error("Bonus amount must be positive.");
      }
      try {
          await runTransaction(db, async (t) => {
              const userRef = doc(db, 'users', userId);
              const userDoc = await t.get(userRef);
              if (!userDoc.exists()) {
                  throw new Error("User not found.");
              }
              
              t.update(userRef, { coins: increment(amount) });

              const transactionRef = doc(collection(db, 'users', userId, 'transactions'));
              t.set(transactionRef, {
                  type: 'bonus',
                  amount,
                  description: `Admin Bonus: ${reason}`,
                  date: new Date(), 
              });
          });
      } catch (e: any) {
          throw new Error(e.message || "Bonus transaction failed.");
      }
  }, [user]);

  const deductCoins = useCallback(async (userId: string, amount: number, reason: string) => {
    if (!user?.admin) {
        throw new Error("You must be an admin to perform this action.");
    }
    if (amount <= 0) {
        throw new Error("Deduction amount must be positive.");
    }
    try {
        await runTransaction(db, async (t) => {
            const userRef = doc(db, 'users', userId);
            const userDoc = await t.get(userRef);
            if (!userDoc.exists()) {
                throw new Error("User not found.");
            }

            if (userDoc.data().coins < amount) {
              throw new Error("User does not have enough coins for this deduction.");
            }
            
            t.update(userRef, { coins: increment(-amount) });

            const transactionRef = doc(collection(db, 'users', userId, 'transactions'));
            t.set(transactionRef, {
                type: 'deduction',
                amount: -amount,
                description: `Admin Deduction: ${reason}`,
                date: new Date(), 
            });
        });
    } catch (e: any) {
        throw new Error(e.message || "Deduction transaction failed.");
    }
  }, [user]);

  const updateWithdrawalDetails = useCallback(async (details: Partial<Pick<User, 'pubgId' | 'pubgName' | 'freefireId' | 'freefireName' | 'jazzcashNumber' | 'jazzcashName' | 'easypaisaNumber' | 'easypaisaName'>>) => {
    if (!user) throw new Error("User not authenticated.");
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, details);
  }, [user]);

  const updateUserBlockStatus = useCallback(async (userId: string, blocked: boolean) => {
    if (!user?.admin) throw new Error("You are not authorized to perform this action.");
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { blocked });
  }, [user]);

  const updateUserLogoutStatus = useCallback(async (userId: string, disabled: boolean) => {
    if (!user?.admin) throw new Error("You are not authorized to perform this action.");
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { logoutDisabled: disabled });
  }, [user]);
  
  const updateAllUsersLogoutStatus = useCallback(async (disabled: boolean) => {
    if (!user?.admin) throw new Error("You are not authorized to perform this action.");
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("admin", "==", false));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        toast({ title: "No users to update."});
        return;
    }

    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { logoutDisabled: disabled });
    });

    await batch.commit();
  }, [user, toast]);

    const approveWithdrawal = useCallback(async (requestId: string, userId: string, description: string) => {
        if (!user?.admin) throw new Error("Unauthorized");
        const requestRef = doc(db, 'withdrawalRequests', requestId);
        await updateDoc(requestRef, {
            status: 'approved',
            processedAt: serverTimestamp(),
        });
        await addNotification(userId, "Request Approved", `Your request for "${description}" has been approved.`);
    }, [user]);

    const rejectWithdrawal = useCallback(async (requestId: string, userId: string, reason: string) => {
        if (!user?.admin) throw new Error("Unauthorized");

        await runTransaction(db, async (transaction) => {
            const requestRef = doc(db, 'withdrawalRequests', requestId);
            const userRef = doc(db, 'users', userId);
            
            const requestDoc = await transaction.get(requestRef);
            if (!requestDoc.exists()) throw new Error("Request not found.");

            const { coinAmount } = requestDoc.data();

            // Refund coins
            transaction.update(userRef, { coins: increment(coinAmount) });

            // Update request status
            transaction.update(requestRef, {
                status: 'rejected',
                rejectionReason: reason,
                processedAt: serverTimestamp(),
            });
        });

        await addNotification(userId, "Request Rejected", `Your withdrawal request was rejected. Reason: ${reason}`, 'error');

    }, [user]);

  const value = { user, firebaseUser, loading, login, signup, logout, signInWithGoogle, sendVerificationEmail, sendPasswordResetEmail, claimHourlyReward, claimFaucetReward, claimDailyReward, claimTapTapReward, claimGameReward, requestWithdrawal, giveBonus, deductCoins, updateWithdrawalDetails, transferFunds, updateUserBlockStatus, updateUserLogoutStatus, updateAllUsersLogoutStatus, approveWithdrawal, rejectWithdrawal };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
