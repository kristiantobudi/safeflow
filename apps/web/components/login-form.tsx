'use client';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import * as Yup from 'yup';
import useAuthMutation from '../store/auth/auth-mutation';
import { toast } from 'sonner';
import { CSSProperties, useState, useEffect } from 'react';
import { getCookie, setCookie, deleteCookie } from 'cookies-next';
import { KeyRound, User } from 'lucide-react';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@repo/ui/components/ui/field';
import { Input } from '@repo/ui/components/ui/input';
import { Checkbox } from '@repo/ui/components/ui/checkbox';
import { Label } from '@repo/ui/components/ui/label';
import { Button } from '@repo/ui/components/ui/button';
import { Spinner } from '@repo/ui/components/ui/spinner';
import { cn } from '@repo/ui/lib/utils';

const loginSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email').required('Email required'),
  password: Yup.string().required(
    'Password must be at least 8 characters, contain at least one uppercase letter, one lowercase letter, and one number',
  ),
});

export default function LoginForm({
  className,
  onSwitch,
  onSuccess,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  onSwitch: () => void;
  onSuccess?: () => void;
}) {
  const { loginMutation } = useAuthMutation();
  const [rememberMe, setRememberMe] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    const savedEmail = getCookie('remembered_email');
    if (savedEmail) {
      reset({ email: savedEmail as string, password: '' });
      setRememberMe(true);
    }
  }, [reset]);

  const onSubmit = (values: Yup.InferType<typeof loginSchema>) => {
    if (rememberMe) {
      setCookie('remembered_email', values.email, {
        maxAge: 60 * 60 * 24 * 30,
      });
    } else {
      deleteCookie('remembered_email');
    }

    loginMutation.mutate(values, {
      onSuccess: () => {
        onSuccess?.();
      },
      onError: () => {
        toast('❌ Login Failed', {
          description: 'Email atau password salah',
          duration: 2000,
          closeButton: true,
          style: {
            '--normal-bg':
              'color-mix(in oklab, #ef4444 10%, var(--background))',
            '--normal-text': '#ef4444',
            '--normal-border': '#ef4444',
          } as CSSProperties,
        });
      },
    });
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup className="gap-5">
          <Field className="gap-1">
            <FieldLabel className="gap-1">
              <User className="w-4 h-4" /> Email
              <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              {...register('email')}
              placeholder="email@example.com"
              type="email"
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </Field>

          <Field className="gap-1">
            <FieldLabel className="gap-1">
              <KeyRound className="w-4 h-4" /> Password
              <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              type="password"
              {...register('password')}
              placeholder="********"
            />
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
          </Field>

          <div className="flex items-center justify-end gap-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="rememberMe"
                className="size-4"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(!!checked)}
              />
              <Label
                htmlFor="rememberMe"
                className="text-muted-foreground text-sm"
              >
                Remember Me
              </Label>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loginMutation.isPending}
            size="lg"
            className="w-full font-bold tracking-tight shadow-lg shadow-primary/20"
          >
            {loginMutation.isPending ? (
              <>
                <Spinner data-icon="inline-start" />
                Authenticating...
              </>
            ) : (
              'Sign In to SafeFlow'
            )}
          </Button>
          <FieldSeparator className="my-2">Or continue with</FieldSeparator>
          <Button
            variant="outline"
            className="border-primary text-primary hover:bg-primary/5 hover:text-primary"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                fill="currentColor"
              />
            </svg>
            Continue with Google
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
