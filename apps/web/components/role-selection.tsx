'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { AuthState } from '@/types/auth-state';

const roles = [
  {
    id: 'training',
    title: 'Training',
    image: '/images/role-training.png',
    description: 'Menu untuk mengakses modul pelatihan',
    url: '/training',
  },
  {
    id: 'hse',
    title: 'HSE Verification',
    image: '/images/role-hse.png',
    description: 'Menu untuk mengakses verifikasi HSE',
    url: '/hse',
  },
  {
    id: 'admin',
    title: 'Admin',
    image: '/images/role-admin.png',
    description: 'Menu untuk mengakses admin dan user',
    url: '/admin',
  },
];

interface RoleSelectionProps {
  onSelect: (role: string) => void;
}

export default function RoleSelection({ onSelect }: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const authData = queryClient.getQueryData<AuthState>(['auth']);
  const userRole = authData?.role;

  const filteredRoles = roles.filter((role) => {
    if (userRole === 'ADMIN') return true;
    return role.id !== 'admin';
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex flex-col items-center justify-center w-full max-w-5xl px-4 py-12 mx-auto space-y-12"
    >
      <div className="space-y-4 text-center">
        <motion.h1
          variants={itemVariants}
          className="text-4xl font-bold tracking-tight text-foreground"
        >
          Selamat Datang
        </motion.h1>
        <motion.p
          variants={itemVariants}
          className="text-muted-foreground max-w-md mx-auto"
        >
          Silahkan pilih menu yang ingin diakses
        </motion.p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {filteredRoles.map((role) => (
          <Link href={role.url} key={role.id}>
            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedRole(role.id)}
              className={cn(
                'relative cursor-pointer group rounded-3xl border-1 p-8 transition-all duration-300 flex flex-col items-center space-y-6 bg-card h-full',
                selectedRole === role.id
                  ? 'border-primary ring-2 ring-primary/20 shadow-xl shadow-primary/10 scale-105'
                  : 'border-border hover:border-border/80 shadow-md',
              )}
            >
              <div className="relative w-48 h-48">
                <Image
                  src={role.image}
                  alt={role.title}
                  fill
                  className="object-contain"
                  loading="lazy"
                />
              </div>
              <div className="flex flex-col items-center space-y-2">
                <h3
                  className={cn(
                    'text-lg font-bold transition-colors',
                    selectedRole === role.id
                      ? 'text-primary'
                      : 'text-foreground',
                  )}
                >
                  {role.title}
                </h3>
                <p className="text-muted-foreground text-center text-sm">
                  {role.description}
                </p>
              </div>

              {/* Selection Checkmark Indicator (Visual Polish) */}
              <AnimatePresence>
                {selectedRole === role.id && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute p-1 rounded-full -top-3 -right-3 bg-primary text-primary-foreground"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
