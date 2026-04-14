import { AppSidebar } from '@/components/app-sidebar';
import DigitalClock from '@repo/ui/components/digital-clock';
import ToggleDarkMode from '@repo/ui/components/toggle-darkmode';
import { Badge } from '@repo/ui/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@repo/ui/components/ui/breadcrumb';
import { Separator } from '@repo/ui/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@repo/ui/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import React from 'react';

export default function TrainingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pathnames = pathname.split('/').filter((x) => x);

  function capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
  }
  return (
    <SidebarProvider>
      <AppSidebar module="training" />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 justify-between">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                {pathnames.map((path, index) => {
                  const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                  const isLast = index === pathnames.length - 1;

                  return (
                    <React.Fragment key={to}>
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage>
                            <Badge>{capitalize(path)}</Badge>
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={to}>
                            {capitalize(path)}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {!isLast && <BreadcrumbSeparator />}
                    </React.Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center">
            <ToggleDarkMode />
            <DigitalClock />
          </div>
        </header>
        <Separator />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="space-y-2">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
