'use client';

import * as React from 'react';
import { ChevronsUpDown, Plus } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@repo/ui/components/ui/sidebar';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

export function ModuleSwitcher({
  modules,
}: {
  modules: {
    title: string;
    url: string;
    icon: React.ElementType;
    isActive: boolean;
    description: string;
  }[];
}) {
  const { isMobile } = useSidebar();
  const pathname = usePathname();

  const activeModule =
    modules.find((m) => pathname.startsWith(m.url)) || modules[0];

  if (!activeModule) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <activeModule.icon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {activeModule.title}
                </span>
                <span className="truncate text-xs">
                  {activeModule.description}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg border border-none"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Modules
            </DropdownMenuLabel>
            {modules.map((module) => (
              <motion.div
                key={module.title}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <DropdownMenuItem
                  asChild
                  className="gap-2 p-2 hover:bg-primary/30 hover:text-primary cursor-pointer "
                >
                  <Link href={module.url}>
                    <div className="flex size-6 items-center justify-center rounded-md border border-muted hover:border-primary">
                      <module.icon className="size-3.5 shrink-0 hover:border-primary hover:bg-primary hover:text-primary-foreground" />
                    </div>
                    {module.title}
                  </Link>
                </DropdownMenuItem>
              </motion.div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
