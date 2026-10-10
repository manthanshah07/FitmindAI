import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { IconButton } from '../../components/ui/IconButton';

const signupSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .max(100, 'Full name must be under 100 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters'),
});

type SignupFormData = z.infer<typeof signupSchema>;

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser, login, isLoading, error, setError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
    },
  });

  React.useEffect(() => {
    reset({
      full_name: '',
      email: '',
      password: '',
    });
  }, [reset]);

  const onSubmit = async (data: SignupFormData) => {
    try {
      setError(null);
      const timezone =
        typeof Intl !== 'undefined' && Intl.DateTimeFormat
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : undefined;
      await registerUser({ ...data, timezone });
      try {
        await login({ email: data.email, password: data.password });
        navigate('/dashboard', { replace: true });
      } catch {
        navigate('/login', {
          state: { message: 'Account created successfully. Please sign in.' },
          replace: true,
        });
      }
    } catch {
      // Error state is captured and preserved in useAuthStore
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 md:p-8 bg-bg">
      <Card className="max-w-md w-full p-8 shadow-sm border-border bg-surface">
        <div className="mb-6">
          <span className="text-xs font-semibold text-accent tracking-wide block mb-1">
            FitMind AI
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-text mb-1.5">
            Create Account
          </h1>
          <p className="text-sm text-text-2">
            Start your personalized fitness and coaching journey.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 p-3.5 rounded-lg border border-danger/30 bg-danger-soft text-danger text-sm font-medium"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          <TextField
            label="Full Name"
            type="text"
            placeholder="John Doe"
            autoComplete="name"
            required
            error={errors.full_name?.message}
            disabled={isLoading}
            {...register('full_name')}
          />

          <TextField
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            error={errors.email?.message}
            disabled={isLoading}
            {...register('email')}
          />

          <div className="relative">
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              helperText="Minimum 8 characters"
              autoComplete="new-password"
              required
              error={errors.password?.message}
              disabled={isLoading}
              className="pr-12"
              {...register('password')}
            />
            <div className="absolute right-1 top-[28px]">
              <IconButton
                type="button"
                variant="ghost"
                size="sm"
                icon={showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                aria-label={showPassword ? 'Mask input' : 'Reveal input'}
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-text-3 hover:text-text"
              />
            </div>
          </div>

          <Button type="submit" isLoading={isLoading} fullWidth className="mt-2" size="lg">
            Create Account
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-border text-center">
          <p className="text-xs text-text-3">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-accent font-semibold hover:underline focus:outline-none focus:ring-2 focus:ring-accent rounded-sm"
            >
              Sign In
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};
