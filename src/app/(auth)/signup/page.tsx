
"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Loader2, Gift } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  referralCode: z.string().optional(),
});

export default function SignupPage() {
  const { signup, signInWithGoogle, user, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      referralCode: refCode || "",
    },
  });

  useEffect(() => {
    if (loading) return;
    if (user) {
        if(user.emailVerified) {
            router.replace('/dashboard');
        } else {
            router.replace('/verify-email');
        }
    }
  }, [user, loading, router]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const { referred } = await signup(values.name, values.email, values.password, values.referralCode);
      toast({
          title: "Account Created!",
          description: referred 
            ? "Welcome! You received a 200 coin bonus, and your friend got 300 coins! A verification email has also been sent."
            : "Welcome! You received a 200 coin bonus. A verification email has been sent.",
      });
      router.push('/verify-email');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: error.message.replace('Firebase: ', ''),
      });
    }
  }
  
  const handleGoogleSignIn = async () => {
    // For Google Sign-in, we only use the referral code from the URL, as it's a one-click action.
    try {
      const { referred } = await signInWithGoogle(refCode);
      if (referred) {
        toast({
          title: "Welcome!",
          description: "You have received a 200 coin bonus, and your friend has received 300 coins!",
        });
      } else {
         toast({
          title: "Welcome!",
          description: "You have received a 200 coin welcome bonus!",
        });
      }
      router.push('/dashboard');
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Google Sign-in failed",
        description: error.message.replace('Firebase: ', ''),
      });
    }
  };

  if (loading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <Logo className="justify-center mb-2"/>
        <CardTitle className="text-2xl">Create an Account</CardTitle>
        <CardDescription>
          Join now to start earning coins! All new users get a 200 coin welcome bonus.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="referralCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referral Code (Optional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Enter referral code" {...field} disabled={!!refCode} className="pl-9" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </Form>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
          <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
            <path
              fill="currentColor"
              d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.9 2.04-5.07 2.04-4.37 0-7.92-3.5-7.92-7.82s3.55-7.82 7.92-7.82c2.27 0 4.03.88 4.93 1.76l2.5-2.5C18.13 1.9 15.47 1 12.48 1 7.02 1 3 5.02 3 9.98s4.02 8.98 9.48 8.98c2.9 0 5.4-1 7.1-2.72 1.76-1.76 2.5-4.22 2.5-6.82 0-.57-.05-.96-.12-1.32H12.48z"
            ></path>
          </svg>
          Google
        </Button>
        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="underline text-primary">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
