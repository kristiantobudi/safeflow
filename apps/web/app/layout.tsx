import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ReduxProvider } from '@/store/provider';
import { ThemeTransition } from '@repo/ui/components/providers/theme-transition';
import { QueryProvider } from '@/components/providers/query-provider';
import { ThemeProvider } from 'next-themes';
import { SessionRestoration } from '@/components/providers/session-restoration';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@repo/ui/components/ui/tooltip';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Safeflow',
  description: 'Safeflow is a platform for managing your business',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground transition-colors duration-500`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Toaster position="top-right" richColors closeButton />
          <ThemeTransition />
          <ReduxProvider>
            <QueryProvider>
              <TooltipProvider>
                <SessionRestoration>{children}</SessionRestoration>
              </TooltipProvider>
            </QueryProvider>
          </ReduxProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
