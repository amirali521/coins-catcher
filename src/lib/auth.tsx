
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
} from 'firebase/auth';
import { auth, db } from '@/firebase/init';
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp, updateDoc, query, where, getDocs, limit, increment, collection, addDoc, runTransaction } from 'firebase/firestore';
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
  lastClaimTimestamp?: { seconds: number; nanoseconds: number; } | null; // Hourly
  dailyStreakCount: number;
  lastDailyClaim: { seconds: number; nanoseconds: number; } | null;
  lastFaucetClaimTimestamp?: { seconds: number; nanoseconds: number; } | null;
  pubgId?: string;
  pubgName?: string;
  freefireId?: string;
  freefireName?: string;
  jazzcashNumber?: string;
  jazzcashName?: string;
  easypaisaNumber?: string;
  easypaisaName?: string;
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
  withdrawPkr: (pkrAmount: number, description: string) => Promise<void>;
  giveBonus: (userId: string, amount: number, reason: string) => Promise<void>;
  updateWithdrawalDetails: (details: Partial<Pick<User, 'pubgId' | 'pubgName' | 'freefireId' | 'freefireName' | 'jazzcashNumber' | 'jazzcashName' | 'easypaisaNumber' | 'easypaisaName'>>) => Promise<void>;
  transferFunds: (recipientId: string, amount: number, currency: 'coins' | 'pkr') => Promise<void>;
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [coinToPkrRate, setCoinToPkrRate] = useState<number | null>(null);
  const { toast } = useToast();

  // Effect to fetch and listen to the wallet config for the conversion rate
  useEffect(() => {
    const configRef = doc(db, 'config', 'wallet');
    const unsubConfig = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        setCoinToPkrRate(docSnap.data().coinToPkrRate || 1);
      } else {
        setCoinToPkrRate(1); // Default value if not set
      }
    }, () => {
      setCoinToPkrRate(1); // Fallback on error
    });
    return () => unsubConfig();
  }, []);


  useEffect(() => {
    let unsubDoc: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      // First, unsubscribe from any previous user's document listener
      if (unsubDoc) {
        unsubDoc();
      }

      if (fbUser) {
        setFirebaseUser(fbUser);
        const userDocRef = doc(db, 'users', fbUser.uid);
        
        // Subscribe to the new user's document
        unsubDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists() && coinToPkrRate !== null) {
            const userData = docSnap.data();

            // Automatically calculate PKR balance based on the current rate
            const pkrBalance = Math.floor((userData.coins / 100000) * coinToPkrRate);

            setUser({
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName,
              emailVerified: fbUser.emailVerified,
              coins: userData.coins,
              pkrBalance: pkrBalance, // Dynamically calculated
              referralCode: userData.referralCode,
              admin: userData.admin || false,
              lastClaimTimestamp: userData.lastClaimTimestamp || null,
              dailyStreakCount: userData.dailyStreakCount || 0,
              lastDailyClaim: userData.lastDailyClaim || null,
              lastFaucetClaimTimestamp: userData.lastFaucetClaimTimestamp || null,
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
             // If user doc doesn't exist yet (e.g., during signup), don't show loading forever
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


  const login = async (email: string, password?: string) => {
    if (!password) throw new Error("Password is required for email/password login.");
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    await userCredential.user.reload();
    if (!userCredential.user.emailVerified) {
      await firebaseSignOut(auth);
      const error: any = new Error("Email not verified. Please check your inbox.");
      error.code = "auth/email-not-verified";
      throw error;
    }
  };
  
  const signInWithGoogle = async (referralCode?: string | null) => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const fbUser = userCredential.user;
    let referred = false;
    let referrerId: string | null = null;
    let initialCoins = 200; // Universal welcome bonus

    const userDocRef = doc(db, 'users', fbUser.uid);
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
        if (referralCode) {
            const q = query(collection(db, 'users'), where('referralCode', '==', referralCode), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const referrerDoc = querySnapshot.docs[0];
                referrerId = referrerDoc.id;
                await updateDoc(referrerDoc.ref, { coins: increment(300) });
                await addTransaction(referrerId, 'referral-bonus', 300, `Referral bonus from ${fbUser.displayName}`);
                referred = true;
            }
        }
      
        // Handle unique display name for Google Sign-In
        const usersRef = collection(db, 'users');
        let finalDisplayName = fbUser.displayName || `user_${fbUser.uid.substring(0, 6)}`;
        const qName = query(usersRef, where('displayName', '==', finalDisplayName));
        const nameQuerySnapshot = await getDocs(qName);

        if (!nameQuerySnapshot.empty) {
          // If name exists, append part of the UID to make it unique
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
        createdAt: serverTimestamp(),
        lastClaimTimestamp: null,
        dailyStreakCount: 0,
        lastDailyClaim: null,
        lastFaucetClaimTimestamp: null,
      });
      await addTransaction(fbUser.uid, 'welcome-bonus', initialCoins, 'Welcome bonus');
    }
    return { referred };
  };

  const signup = async (name: string, email: string, password?: string, referralCode?: string | null) => {
    if (!password) throw new Error("Password is required for email/password signup.");
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('displayName', '==', name));
    const nameQuerySnapshot = await getDocs(q);
    if (!nameQuerySnapshot.empty) {
      throw new Error(`Username "${name}" is already taken. Please choose another one.`);
    }

    let referred = false;
    let referrerId: string | null = null;
    const initialCoins = 200; // Universal welcome bonus

    if (referralCode) {
        const referralQuery = query(collection(db, 'users'), where('referralCode', '==', referralCode), limit(1));
        const querySnapshot = await getDocs(referralQuery);
        if (!querySnapshot.empty) {
            const referrerDoc = querySnapshot.docs[0];
            referrerId = referrerDoc.id;
            await updateDoc(referrerDoc.ref, { coins: increment(300) });
            await addTransaction(referrerId, 'referral-bonus', 300, `Referral bonus from ${name}`);
            referred = true;
        }
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;

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
      createdAt: serverTimestamp(),
      lastClaimTimestamp: null,
      dailyStreakCount: 0,
      lastDailyClaim: null,
      lastFaucetClaimTimestamp: null,
    });
    await addTransaction(fbUser.uid, 'welcome-bonus', initialCoins, 'Welcome bonus');

    await sendEmailVerification(fbUser);
    return { referred };
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Logout Failed",
            description: error.message.replace('Firebase: ', ''),
        });
    }
  };

  const claimHourlyReward = async (amount: number) => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        coins: increment(amount),
        lastClaimTimestamp: serverTimestamp(),
      });
      await addTransaction(user.uid, 'claim', amount, 'Hourly reward');
    }
  };

  const claimFaucetReward = async (amount: number) => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        coins: increment(amount),
        lastFaucetClaimTimestamp: serverTimestamp(),
      });
      await addTransaction(user.uid, 'faucet', amount, 'Faucet reward');
    }
  };

  const DAILY_REWARDS = [15, 30, 45, 60, 75, 90, 120];

  const claimDailyReward = async () => {
    if (!user) throw new Error("User not authenticated");

    const userRef = doc(db, 'users', user.uid);
    // Use the user state which is real-time
    const lastClaimDate = user.lastDailyClaim ? new Date(user.lastDailyClaim.seconds * 1000) : null;
    
    if (lastClaimDate && isToday(lastClaimDate)) {
        throw new Error("Daily reward already claimed for today.");
    }

    let currentStreak = user.dailyStreakCount || 0;
    
    if (lastClaimDate && isYesterday(lastClaimDate)) {
        // Continue streak
        currentStreak++;
    } else {
        // Reset streak if last claim wasn't yesterday (or if it's the first claim)
        currentStreak = 1;
    }
    
    // Reset after 7 days
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
  };

  const withdrawPkr = async (pkrAmount: number, description: string) => {
    if (!user) throw new Error("User not authenticated");
    if (user.pkrBalance < pkrAmount) throw new Error("Insufficient PKR balance");
    if (coinToPkrRate === null || coinToPkrRate <= 0) {
      throw new Error("Cannot process transaction: conversion rate is invalid.");
    }

    // Use ceil to make sure we deduct enough coins, even for fractions of a pkr.
    const coinsToDeduct = Math.ceil((pkrAmount / coinToPkrRate) * 100000);
    
    // Final check against actual coin balance to prevent floating point inaccuracies.
    if (user.coins < coinsToDeduct) {
        throw new Error("Insufficient coin balance for this transaction.");
    }
    
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      coins: increment(-coinsToDeduct),
    });
    await addTransaction(user.uid, 'withdraw', -coinsToDeduct, description);
  };

  const transferFunds = async (recipientId: string, amount: number, currency: 'coins' | 'pkr') => {
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
        } else { // currency === 'pkr'
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

        // Perform updates within the transaction
        transaction.update(senderRef, { coins: increment(-coinsToTransfer) });
        transaction.update(recipientRef, { coins: increment(coinsToTransfer) });

        // Create transaction logs (can't use serverTimestamp in a transaction)
        const now = new Date();
        const senderLog = { type: 'transfer-sent', amount: -coinsToTransfer, description: `Sent ${description} to ${recipientData.displayName || recipientId}`, date: now };
        const recipientLog = { type: 'transfer-received', amount: coinsToTransfer, description: `Received ${description} from ${senderData.displayName || user.uid}`, date: now };
        
        transaction.set(doc(collection(db, 'users', user.uid, 'transactions')), senderLog);
        transaction.set(doc(collection(db, 'users', recipientId, 'transactions')), recipientLog);
      });
    } catch(e: any) {
        // The transaction function automatically throws on failure, so we catch it here.
        // We re-throw so the UI can catch it and display a message.
        throw new Error(e.message || "Transfer failed. Please try again.");
    }
  };
  
  const sendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    } else {
      throw new Error("No user is currently signed in to send a verification email.");
    }
  };

  const sendPasswordResetEmail = async (email: string) => {
    await firebaseSendPasswordResetEmail(auth, email);
  };
  
  const giveBonus = async (userId: string, amount: number, reason: string) => {
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
              
              // Perform the coin update
              t.update(userRef, { coins: increment(amount) });

              // Create the transaction log
              const transactionRef = doc(collection(db, 'users', userId, 'transactions'));
              t.set(transactionRef, {
                  type: 'bonus',
                  amount,
                  description: `Admin Bonus: ${reason}`,
                  date: new Date(), // Using new Date() because serverTimestamp is not allowed in transactions
              });
          });
      } catch (e: any) {
          // Re-throw for the UI to handle
          throw new Error(e.message || "Bonus transaction failed.");
      }
  };

  const updateWithdrawalDetails = async (details: Partial<Pick<User, 'pubgId' | 'pubgName' | 'freefireId' | 'freefireName' | 'jazzcashNumber' | 'jazzcashName' | 'easypaisaNumber' | 'easypaisaName'>>) => {
    if (!user) throw new Error("User not authenticated.");
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, details);
  };

  const value = { user, firebaseUser, loading, login, signup, logout, signInWithGoogle, sendVerificationEmail, sendPasswordResetEmail, claimHourlyReward, claimFaucetReward, claimDailyReward, withdrawPkr, giveBonus, updateWithdrawalDetails, transferFunds };

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
