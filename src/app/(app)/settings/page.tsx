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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { LogOut, Loader2, Save, Copy, User, Settings as SettingsIcon, CreditCard } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const withdrawalSchema = z.object({
  pubgId: z.string().optional(),
  pubgName: z.string().optional(),
  freefireId: z.string().optional(),
  freefireName: z.string().optional(),
  jazzcashNumber: z.string().optional(),
  easypaisaNumber: z.string().optional(),
});

type WithdrawalFormValues = z.infer<typeof withdrawalSchema>;

function WithdrawalSettings() {
  const { user, updateWithdrawalDetails } = useAuth();
  const { toast } = useToast();

  const form = useForm<WithdrawalFormValues>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      pubgId: "",
      pubgName: "",
      freefireId: "",
      freefireName: "",
      jazzcashNumber: "",
      easypaisaNumber: "",
    },
  });

  React.useEffect(() => {
    if (user) {
      form.reset({
        pubgId: user.pubgId || "",
        pubgName: user.pubgName || "",
        freefireId: user.freefireId || "",
        freefireName: user.freefireName || "",
        jazzcashNumber: user.jazzcashNumber || "",
        easypaisaNumber: user.easypaisaNumber || "",
      });
    }
  }, [user, form]);

  const onSubmit = async (data: WithdrawalFormValues) => {
    try {
      await updateWithdrawalDetails(data);
      toast({
        title: "Settings Saved",
        description: "Your withdrawal information has been updated.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };
  
  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Withdrawal Information</CardTitle>
            <CardDescription>
              Provide your details to receive withdrawals. This information is kept private and secure.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="font-semibold">Game IDs</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pubgId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PUBG Mobile ID</FormLabel>
                      <FormControl><Input placeholder="Your PUBG ID" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pubgName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PUBG Mobile Name</FormLabel>
                      <FormControl><Input placeholder="Your PUBG Name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="freefireId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FreeFire ID</FormLabel>
                      <FormControl><Input placeholder="Your FreeFire ID" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="freefireName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FreeFire Name</FormLabel>
                      <FormControl><Input placeholder="Your FreeFire Name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="font-semibold">Payment Details</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="jazzcashNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jazzcash Number</FormLabel>
                      <FormControl><Input placeholder="03xxxxxxxxx" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="easypaisaNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Easypaisa Number</FormLabel>
                      <FormControl><Input placeholder="03xxxxxxxxx" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Withdrawal Info
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}


export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleCopyId = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      toast({
        title: "User ID Copied",
        description: "Your user ID has been copied to your clipboard.",
      });
    }
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4"/> Profile
          </TabsTrigger>
          <TabsTrigger value="withdrawal">
            <CreditCard className="mr-2 h-4 w-4"/> Withdrawal
          </TabsTrigger>
          <TabsTrigger value="account">
            <SettingsIcon className="mr-2 h-4 w-4"/> Account
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-6">
            <Card>
                <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Your personal information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={user?.displayName || ''} readOnly />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user?.email || ''} readOnly />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="uid">Your User ID</Label>
                    <div className="flex items-center space-x-2">
                    <Input id="uid" value={user?.uid || ''} readOnly />
                    <Button onClick={handleCopyId} size="icon" variant="outline">
                        <Copy className="h-4 w-4" />
                    </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Share this ID to receive funds from other users.</p>
                </div>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="withdrawal" className="mt-6">
             <WithdrawalSettings />
        </TabsContent>
        <TabsContent value="account" className="mt-6">
            <Card>
                <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>Manage your session.</CardDescription>
                </CardHeader>
                <CardContent>
                <Button variant="destructive" onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                </Button>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
