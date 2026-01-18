
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Coins, Gift, Settings, Users, Wallet, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: Gift },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/referrals', label: 'Referrals', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const adminLink = { href: '/admin', label: 'Admin', icon: Shield };

export function MainNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <SidebarMenu>
      {links.map((link) => (
        <SidebarMenuItem key={link.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === link.href}
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
            isActive={pathname === adminLink.href}
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
