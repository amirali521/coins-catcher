
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Gift, Settings, Wallet, Shield, UserPlus, History } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const links = [
  { href: '/app/dashboard', label: 'Dashboard', icon: Gift },
  { href: '/app/wallet', label: 'Wallet', icon: Wallet },
  { href: '/app/history', label: 'History', icon: History },
  { href: '/app/referrals', label: 'Referrals', icon: UserPlus },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

const adminLink = { href: '/app/admin', label: 'Admin', icon: Shield };

export function MainNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <SidebarMenu>
      {links.map((link) => (
        <SidebarMenuItem key={link.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(link.href)}
            tooltip={link.label}
          >
            <Link href={link.href}>
              <link.icon />
              <span>{link.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
      {user?.admin && (
        <SidebarMenuItem key={adminLink.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(adminLink.href)}
            tooltip={adminLink.label}
          >
            <Link href={adminLink.href}>
              <adminLink.icon />
              <span>{adminLink.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
    </SidebarMenu>
  );
}
