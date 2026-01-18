
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
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp, updateDoc, query, where, getDocs, limit, increment, collection, addDoc } from 'firebase/firestore';
import { isToday, isYesterday } from 'date-fns';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  coins: number;
  referralCode: string;
  admin: boolean;
  lastClaimTimestamp?: { seconds: number; nanoseconds: number; } | null; // Hourly
  dailyStreakCount: number;
  lastDailyClaim: { seconds: number; nanoseconds: number; } | null;
  lastFaucetClaimTimestamp?: { seconds: number; nanoseconds: number; } | null;
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
  withdrawCoins: (amount: number, description: string) => Promise<void>;
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        const userDocRef = doc(db, 'users', fbUser.uid);
        
        const unsubDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setUser({
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName,
              emailVerified: fbUser.emailVerified,
              coins: userData.coins,
              referralCode: userData.referralCode,
              admin: userData.admin || false,
              lastClaimTimestamp: userData.lastClaimTimestamp || null,
              dailyStreakCount: userData.dailyStreakCount || 0,
              lastDailyClaim: userData.lastDailyClaim || null,
              lastFaucetClaimTimestamp: userData.lastFaucetClaimTimestamp || null,
            });
          }
          // If doc doesn't exist, it will be created on signup/google sign-in
          setLoading(false);
        }, (error) => {
            console.error("Firestore snapshot error:", error);
            setLoading(false);
        });

        return () => unsubDoc();
      } else {
        setFirebaseUser(null);
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

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
      
      await setDoc(userDocRef, {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
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
    
    let referred = false;
    let referrerId: string | null = null;
    const initialCoins = 200; // Universal welcome bonus

    if (referralCode) {
        const q = query(collection(db, 'users'), where('referralCode', '==', referralCode), limit(1));
        const querySnapshot = await getDocs(q);
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
    await firebaseSignOut(auth);
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

  const withdrawCoins = async (amount: number, description: string) => {
    if (!user) throw new Error("User not authenticated");
    if (user.coins < amount) throw new Error("Insufficient coins");
    
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      coins: increment(-amount),
    });
    await addTransaction(user.uid, 'withdraw', -amount, description);
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

  const value = { user, firebaseUser, loading, login, signup, logout, signInWithGoogle, sendVerificationEmail, sendPasswordResetEmail, claimHourlyReward, claimFaucetReward, claimDailyReward, withdrawCoins };

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
