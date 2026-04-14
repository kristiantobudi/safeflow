'use client';

import * as React from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileBadge,
  ShieldCheck,
  ClipboardCheck,
  GraduationCap,
  HardHat,
  MonitorCheck,
  History,
  Settings,
} from 'lucide-react';

import { NavMain } from '@/components/sidebar/nav-main';
import { NavUser } from '@/components/sidebar/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@repo/ui/components/ui/sidebar';
import Image from 'next/image';
import logo from '@/public/images/safeguard1.png';
import { useQueryClient } from '@tanstack/react-query';
import { AuthState } from '@/types/auth-state';
import { ModuleSwitcher } from './sidebar/module-switcher';

const moduleMenus = {
  modules: [
    {
      title: 'Admin',
      url: '/admin',
      icon: LayoutDashboard,
      isActive: true,
      description: 'Admin Module',
    },
    {
      title: 'HSE',
      url: '/hse',
      icon: ShieldCheck,
      isActive: true,
      description: 'HSE Module',
    },
    {
      title: 'Training',
      url: '/training',
      icon: GraduationCap,
      isActive: true,
      description: 'Training Module',
    },
  ],
  admin: [
    {
      title: 'Dashboard',
      url: '/admin',
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: 'User Management',
      url: '/admin/user-management',
      icon: Users,
    },
    {
      title: 'Vendor Registry',
      url: '/admin/vendor-registry',
      icon: Building2,
    },
    {
      title: 'Worker Management',
      url: '/admin/worker-management',
      icon: HardHat,
    },
    {
      title: 'System Logs',
      url: '/admin/logs',
      icon: History,
    },
    {
      title: 'Settings',
      url: '/admin/settings',
      icon: Settings,
    },
  ],
  hse: [
    {
      title: 'HSE Overview',
      url: '/hse',
      icon: LayoutDashboard,
      isActive: true,
    },

    {
      title: 'Safety Projects',
      url: '/hse/projects',
      icon: HardHat,
    },
    {
      title: 'PTW Verification',
      url: '/hse/verification',
      icon: ClipboardCheck,
    },
    {
      title: 'HIRA / JSA',
      url: '/hse/hirac',
      icon: ShieldCheck,
    },
    {
      title: 'Worker Management',
      url: '/hse/worker-management',
      icon: HardHat,
    },
  ],
  training: [
    {
      title: 'Training Hub',
      url: '/training',
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: 'Course Catalog',
      url: '/training/courses',
      icon: GraduationCap,
    },
    {
      title: 'Certifications',
      url: '/training/certificates',
      icon: FileBadge,
    },
    {
      title: 'Student Records',
      url: '/training/students',
      icon: Users,
    },
  ],
};

export function AppSidebar({
  module = 'admin',
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  module?: 'admin' | 'hse' | 'training';
}) {
  const queryClient = useQueryClient();
  const authData = queryClient.getQueryData<AuthState>(['auth']);

  const userData = {
    name: authData?.name ?? 'User',
    email: authData?.email ?? '',
    avatar: authData?.avatarUrl ?? '/images/avatar.png',
  };

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10">
                  <Image
                    src={logo}
                    alt="SafeFlow"
                    className="size-6 object-contain"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">SafeFlow</span>
                  <span className="truncate text-xs capitalize">
                    {module} Module
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <ModuleSwitcher modules={moduleMenus.modules} />
        <NavMain items={moduleMenus[module]} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
