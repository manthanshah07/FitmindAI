import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { IconButton } from '../../components/ui/IconButton';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, setError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const successMessage = (location.state as { message?: string })?.message;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  React.useEffect(() => {
    reset({
      email: '',
      password: '',
    });
  }, [reset]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      await login(data);
      navigate('/dashboard', { replace: true });
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
            Welcome Back
          </h1>
          <p className="text-sm text-text-2">
            Sign in to your personalized fitness and coaching dashboard.
          </p>
        </div>

        {successMessage && (
          <div
            role="status"
            className="mb-6 p-3.5 rounded-lg border border-accent/30 bg-accent-soft text-accent-soft-text text-sm"
          >
            {successMessage}
          </div>
        )}

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
              autoComplete="current-password"
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
            Sign In
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-border text-center">
          <p className="text-xs text-text-3">
            Don&apos;t have an account?{' '}
            <Link
              to="/signup"
              className="text-accent font-semibold hover:underline focus:outline-none focus:ring-2 focus:ring-accent rounded-sm"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};
