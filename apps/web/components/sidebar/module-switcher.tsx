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

  const activeModule = modules.find((m) => pathname.startsWith(m.url)) || modules[0];

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
                <span className="truncate font-medium">{activeModule.title}</span>
                <span className="truncate text-xs">
                  {activeModule.description}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Modules
            </DropdownMenuLabel>
            {modules.map((module) => (
              <DropdownMenuItem
                key={module.title}
                asChild
                className="gap-2 p-2"
              >
                <Link href={module.url}>
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <module.icon className="size-3.5 shrink-0" />
                  </div>
                  {module.title}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
