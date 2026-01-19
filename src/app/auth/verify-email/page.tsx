
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, MailCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import Link from "next/link";
import { auth } from "@/firebase/init";

export default function VerifyEmailPage() {
    const { user, firebaseUser, loading, sendVerificationEmail, logout } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (!loading && user?.emailVerified) {
            router.replace("/app/dashboard");
        }
    }, [user, loading, router]);

    const handleResend = async () => {
        setIsSending(true);
        try {
            await sendVerificationEmail();
            toast({
                title: "Email Sent!",
                description: "A new verification link has been sent to your email address.",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        } finally {
            setIsSending(false);
        }
    };
    
    const handleCheckVerification = async () => {
        if(firebaseUser) {
            await firebaseUser.reload();
            // The onAuthStateChanged listener in useAuth will handle the redirect
            // after the user is reloaded, so we just check the fresh status.
            const freshUser = auth.currentUser;
            if(freshUser?.emailVerified) {
                router.replace('/app/dashboard');
                toast({
                    title: "Success!",
                    description: "Your email has been verified. Welcome!",
                });
            } else {
                 toast({
                    variant: "destructive",
                    title: "Not Verified Yet",
                    description: "Please check your inbox for the verification link. It might take a few minutes.",
                });
            }
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!user) {
        // This can happen if the user was signed out due to failed login attempt
        // or they landed here directly.
        return (
            <Card className="w-full max-w-sm text-center">
                <CardHeader>
                    <Logo className="justify-center mb-2"/>
                    <CardTitle>Session Expired</CardTitle>
                </CardHeader>
                <CardContent>
                    <CardDescription>
                        Your session has expired. Please sign in again to continue.
                    </CardDescription>
                     <Button asChild className="mt-6 w-full">
                        <Link href="/auth/login">Back to Sign In</Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                 <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-6 w-6 text-primary" />
                </div>
            </CardHeader>
            <CardContent>
                <CardTitle className="text-2xl">Verify Your Email</CardTitle>
                <CardDescription className="mt-2">
                    We've sent a verification link to <strong>{user.email}</strong>.
                    Please click the link in the email to continue.
                </CardDescription>

                <div className="mt-6 flex w-full flex-col gap-3">
                    <Button onClick={handleCheckVerification}>
                        <MailCheck className="mr-2 h-4 w-4" />
                        I&apos;ve verified my email
                    </Button>
                    <Button variant="secondary" onClick={handleResend} disabled={isSending}>
                        {isSending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Resend Verification Email
                    </Button>
                     <Button variant="link" onClick={logout}>
                        Sign in with a different account
                    </Button>
                </div>
                
                 <p className="mt-4 text-xs text-muted-foreground">
                    Can&apos;t find the email? Check your spam folder.
                </p>
            </CardContent>
        </Card>
    );
}
