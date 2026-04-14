'use client';

import { ChevronRight } from 'lucide-react';
import loginImage from '@/public/images/safeflow-bg.png';
import Image from 'next/image';
import { useState } from 'react';
import logo from '@/public/images/safeguard1.png';
import LoginForm from '@/components/login-form';
import RoleSelection from '@/components/role-selection';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

const taglines = [
  {
    title: 'Digitalizing HSE Compliance',
    subtitle:
      'Transforming HIRA, JSA, and PTW verification into a seamless digital workflow.',
    top: 'top-[10%]',
  },
  {
    title: 'Rigorous Safety Verification',
    subtitle:
      'Ensuring every High-Risk Activity is backed by validated safety documents.',
    top: 'top-[25%]',
  },
  {
    title: 'Streamlined Vendor Assessment',
    subtitle:
      'Centralized platform for 3rd party certification and vendor safety assessments.',
    top: 'top-[40%]',
  },
  {
    title: 'Empowering Safety Excellence',
    subtitle:
      'Real-time insights and analytics to maintain the highest HSE standards.',
    top: 'top-[55%]',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup' | 'role-selection'>(
    'signin',
  );

  const handleRoleSelect = (role: string) => {
    console.log('Selected role:', role);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-svh bg-background overflow-x-hidden">
      <AnimatePresence mode="wait">
        {mode !== 'role-selection' ? (
          <motion.div
            key="auth-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
            className="grid lg:grid-cols-3 min-h-svh"
          >
            {/* Left Section: Login Form */}
            <div className="flex flex-col justify-between px-6 py-10 sm:px-12 lg:px-16 bg-card/50 backdrop-blur-sm z-10 border-r border-border/50">
              <div className="space-y-12">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex items-center gap-4"
                >
                  <div className="p-2 bg-primary/10 rounded-2xl">
                    <Image
                      src={logo}
                      alt="SafeFlow Logo"
                      className="h-10 w-auto object-contain"
                      priority
                    />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-primary">
                      SafeFlow
                    </h1>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                      Unified HSE Systems
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="space-y-4"
                >
                  <div className="space-y-2 text-left">
                    <h2 className="text-3xl font-extrabold tracking-tight">
                      {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                      Access WIKA's integrated system for managing HIRA, JSA,
                      PTW, and safety certifications.
                    </p>
                  </div>
                </motion.div>
              </div>

              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="my-auto py-12"
              >
                <LoginForm
                  onSwitch={() => setMode('signup')}
                  onSuccess={() => setMode('role-selection')}
                />
              </motion.div>

              <div className="space-y-4">
                <div className="h-px bg-border w-full" />
                <p className="text-xs text-muted-foreground text-center">
                  © {new Date().getFullYear()} PT Wijaya Karya (Persero) Tbk.
                  All rights reserved.
                </p>
              </div>
            </div>

            {/* Right Section: Hero & Taglines */}
            <div className="relative hidden lg:block lg:col-span-2 overflow-hidden bg-slate-900">
              <motion.div
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.5 }}
                className="absolute inset-0"
              >
                <Image
                  src={loginImage}
                  alt="Safety Dashboard"
                  fill
                  priority
                  className="object-cover brightness-[0.7] saturate-[0.8]"
                />
              </motion.div>

              {/* Dynamic Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/30" />

              <div className="absolute inset-0 p-12 flex flex-col items-end justify-start pointer-events-none">
                <div className="space-y-6 w-full max-w-md">
                  {taglines.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.6 + index * 0.15,
                        duration: 0.6,
                        ease: 'easeOut',
                      }}
                      className="group pointer-events-auto"
                    >
                      <div className="relative p-5 rounded-2xl bg-white/[0.08] backdrop-blur-md border border-white/10 hover:bg-white/[0.12] transition-all duration-300 shadow-2xl overflow-hidden group-hover:border-primary/50 text-right">
                        <div className="absolute -right-4 -top-4 w-12 h-12 bg-primary/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="flex items-start gap-4 justify-end">
                          <div className="space-y-1">
                            <h3 className="text-lg font-bold text-white tracking-tight leading-tight">
                              {item.title}
                            </h3>
                            <p className="text-sm text-white/70 leading-relaxed max-w-[280px]">
                              {item.subtitle}
                            </p>
                          </div>
                          <div className="mt-1 flex items-center justify-center rounded-xl bg-primary/20 p-2 border border-primary/30 group-hover:bg-primary transition-colors">
                            <ChevronRight className="h-4 w-4 text-primary group-hover:text-primary-foreground" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5, duration: 0.8 }}
                  className="mt-auto text-right pointer-events-auto"
                >
                  <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-sm mb-4">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground/90">
                      Safety Priority System
                    </span>
                  </div>
                  <h2 className="text-5xl font-black text-white italic tracking-tighter uppercase drop-shadow-2xl">
                    Safety First,{' '}
                    <span className="text-primary not-italic">Always.</span>
                  </h2>
                  <p className="mt-4 text-lg text-white/60 font-medium max-w-sm ml-auto">
                    Building a sustainable future through rigorous safety
                    verification and trusted partnerships.
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="role-selection"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="flex items-center justify-center min-h-svh bg-background p-6"
          >
            <RoleSelection onSelect={handleRoleSelect} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
