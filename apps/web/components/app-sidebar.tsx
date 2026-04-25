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
import { ModuleSwitcher } from './sidebar/module-switcher';
import { useAuthQuery } from '@/store/auth/auth-query';

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
      title: 'Vendor Management',
      url: '#',
      icon: Building2,
      items: [
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
      ],
    },
    {
      title: 'Training',
      url: '#',
      icon: GraduationCap,
      items: [
        {
          title: 'Modul Training',
          url: '/admin/training/modules',
          icon: GraduationCap,
        },
        {
          title: 'Daftar Ujian',
          url: '/admin/training/exams',
          icon: ClipboardCheck,
        },
        {
          title: 'Certification Programs',
          url: '/admin/certification-programs',
          icon: FileBadge,
        },
      ],
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
      title: 'JSA',
      url: '/hse/jsa',
      icon: ShieldCheck,
    },
    {
      title: 'PTW',
      url: '/hse/ptw',
      icon: ClipboardCheck,
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
      title: 'Sertifikasi Saya',
      url: '/training/vendor-certification',
      icon: MonitorCheck,
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
  const { data: authQueryData, isLoading } = useAuthQuery();

  const userData = {
    name: authQueryData?.name ?? 'User',
    email: authQueryData?.email ?? '',
    avatar: authQueryData?.avatarUrl ?? '/images/avatar.png',
  };

  if (isLoading) {
    return null;
  }

  // Filter admin menu items based on user role
  const isAdmin = authQueryData?.role?.toUpperCase() === 'ADMIN';
  const adminMenuItems = moduleMenus.admin.filter((item) => {
    // Only show "Modul Training" for ADMIN users
    if (item.title === 'Modul Training') {
      return isAdmin;
    }
    return true;
  });

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
        <NavMain
          items={module === 'admin' ? adminMenuItems : moduleMenus[module]}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
