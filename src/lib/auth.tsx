
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
import { auth } from '@/firebase/init';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  coins: number;
  referralCode: string;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  signup: (name: string, email: string, password?: string) => Promise<void>;
  logout: () => void;
  updateCoins: (newCoins: number) => void;
  signInWithGoogle: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getAdditionalUserData = async (userId: string): Promise<{ coins: number; referralCode: string }> => {
  console.log(`Fetching additional (mock) data for user ${userId}`);
  return {
    coins: 1250,
    referralCode: `REF${userId.substring(0, 6).toUpperCase()}`,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        await fbUser.reload();
        const freshFbUser = auth.currentUser;
        setFirebaseUser(freshFbUser);

        if (freshFbUser) {
            const additionalData = await getAdditionalUserData(freshFbUser.uid);
            setUser({
              uid: freshFbUser.uid,
              email: freshFbUser.email,
              displayName: freshFbUser.displayName,
              emailVerified: freshFbUser.emailVerified,
              ...additionalData,
            });
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password?: string) => {
    if (!password) throw new Error("Password is required for email/password login.");
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    if (!userCredential.user.emailVerified) {
        await firebaseSignOut(auth);
        const error: any = new Error("Email not verified. Please check your inbox.");
        error.code = "auth/email-not-verified";
        throw error;
    }
  };
  
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signup = async (name: string, email: string, password?: string) => {
    if (!password) throw new Error("Password is required for email/password signup.");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name });
        await sendEmailVerification(userCredential.user);
    }
  };

  const logout = async () => {
    await firebaseSignOut(auth);
  };

  const updateCoins = (newCoins: number) => {
    if (user) {
      setUser({ ...user, coins: newCoins });
      console.log(`(Mock) Updated coins to ${newCoins} for user ${user.uid}`);
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

  const value = { user, firebaseUser, loading, login, signup, logout, updateCoins, signInWithGoogle, sendVerificationEmail, sendPasswordResetEmail };

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
