
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/lib/auth";
import { LogOut, Settings, User as UserIcon, Bell, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from "@/firebase/init";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "./ui/card";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'error';
  read: boolean;
  createdAt: { seconds: number; nanoseconds: number; };
}

function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.read).length);
        });
        return () => unsubscribe();
    }, [user]);

    const handleMarkAsRead = async (id: string) => {
        if (!user) return;
        const notifRef = doc(db, 'users', user.uid, 'notifications', id);
        await updateDoc(notifRef, { read: true });
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <Card className="border-0 shadow-none">
                  <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {notifications.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">You have no notifications.</p>
                    ) : (
                      <ScrollArea className="h-96">
                        <div className="flex flex-col gap-4">
                          {notifications.map(n => (
                              <div key={n.id} className={cn("p-3 rounded-lg relative", n.read ? "bg-secondary/50" : "bg-primary/10")}>
                                <h4 className="font-semibold text-sm">{n.title}</h4>
                                <p className="text-xs text-muted-foreground">{n.message}</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">{formatDistanceToNow(n.createdAt.seconds * 1000, { addSuffix: true })}</p>
                                {!n.read && (
                                  <button onClick={() => handleMarkAsRead(n.id)} className="absolute top-1 right-1 p-1 rounded-full hover:bg-background">
                                    <X className="h-3 w-3" />
                                    <span className="sr-only">Mark as read</span>
                                  </button>
                                )}
                              </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
            </PopoverContent>
        </Popover>
    )
}

export function UserNav() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("");
  };

  const displayName = user.displayName || user.email?.split('@')[0] || "User";
  const avatarUrl = user.email ? `https://avatar.vercel.sh/${user.email}.png` : '';

  return (
    <div className="flex items-center gap-2">
      <NotificationBell />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-9 w-9">
              {user.firebaseUser?.photoURL && <AvatarImage src={user.firebaseUser.photoURL} alt={displayName} />}
              {!user.firebaseUser?.photoURL && avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              {user.email && (
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <UserIcon />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings />
                Settings
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} disabled={user.logoutDisabled}>
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
