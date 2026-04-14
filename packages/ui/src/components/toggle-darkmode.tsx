import { MoonIcon, SunIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'framer-motion';

export default function ToggleDarkMode() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(true);
  }, []);

  if (!isDark) {
    return null;
  }

  const darkTheme = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      onClick={() => setTheme(darkTheme ? 'light' : 'dark')}
      className={cn(
        'relative overflow-hidden',
        darkTheme
          ? 'text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-500'
          : 'text-primary hover:text-primary',
      )}
    >
      <AnimatePresence mode="wait">
        {darkTheme ? (
          <motion.div
            key="moon"
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <MoonIcon className="h-4 w-4" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: 90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <SunIcon className="h-4 w-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
}
