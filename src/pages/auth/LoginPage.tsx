import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, setError } = useAuthStore();

  const successMessage = (location.state as { message?: string })?.message;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      await login(data);
      navigate('/onboarding', { replace: true });
    } catch {
      // Error state is captured and preserved in useAuthStore
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 md:p-8 bg-bone">
      <Card className="max-w-md w-full shadow-none border-borderLine">
        <div className="mb-8">
          <Badge variant="olive" className="mb-3">
            Authentication
          </Badge>
          <h1 className="text-3xl font-bold tracking-tighter uppercase font-sans text-graphite mb-2">
            Welcome Back
          </h1>
          <p className="text-sm text-charcoal font-sans">
            Access your personalized FitMind AI coaching portal.
          </p>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 border border-olive bg-olive/5 text-olive font-mono text-xs uppercase tracking-wider">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 border border-error bg-error/5 text-error font-mono text-xs uppercase tracking-wider" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            error={errors.email?.message}
            disabled={isLoading}
            {...register('email')}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            error={errors.password?.message}
            disabled={isLoading}
            {...register('password')}
          />

          <Button type="submit" isLoading={isLoading} fullWidth className="mt-2">
            Sign In
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-borderLine text-center">
          <p className="font-mono text-xs text-faded uppercase tracking-wider">
            Don&apos;t have an account?{' '}
            <Link
              to="/signup"
              className="text-graphite font-bold underline hover:text-olive transition-colors focus:outline-none focus:ring-1 focus:ring-olive"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};
