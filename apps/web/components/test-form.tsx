'use client';

import { useForm } from 'react-hook-form';
import { loginSchema, LoginInput } from '@repo/validation';
import { Button } from '@repo/ui/components/ui/button';
import { toast } from 'sonner';
import { yupResolver } from '@hookform/resolvers/yup';

export default function TestForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: yupResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    console.log('Form Data:', data);
    toast.success('Validation Success', {
      description: `Validated data for: ${data.email}`,
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 p-4 border rounded-lg max-w-md mx-auto"
    >
      <h2 className="text-xl font-bold">Integration Test Form</h2>

      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          {...register('email')}
          className="w-full p-2 border rounded bg-background"
          placeholder="email@example.com"
        />
        {errors.email && (
          <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium">Password</label>
        <input
          {...register('password')}
          type="password"
          className="w-full p-2 border rounded bg-background"
          placeholder="******"
        />
        {errors.password && (
          <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Validating...' : 'Test Validation'}
      </Button>
    </form>
  );
}
