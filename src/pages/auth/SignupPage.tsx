import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

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
      await registerUser(data);
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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 md:p-8 bg-bone">
      <Card className="max-w-md w-full shadow-none border-borderLine">
        <div className="mb-8">
          <Badge variant="olive" className="mb-3">
            Account Setup
          </Badge>
          <h1 className="text-3xl font-bold tracking-tighter uppercase font-sans text-graphite mb-2">
            Create Account
          </h1>
          <p className="text-sm text-charcoal font-sans">
            Start your persistent AI-driven fitness transformation.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 border border-error bg-error/5 text-error font-mono text-xs uppercase tracking-wider" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
          <Input
            label="Full Name"
            type="text"
            placeholder="John Doe"
            autoComplete="name"
            required
            error={errors.full_name?.message}
            disabled={isLoading}
            {...register('full_name')}
          />

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
            helperText="Minimum 8 characters"
            autoComplete="new-password"
            required
            error={errors.password?.message}
            disabled={isLoading}
            {...register('password')}
          />

          <Button type="submit" isLoading={isLoading} fullWidth className="mt-2">
            Create Account
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-borderLine text-center">
          <p className="font-mono text-xs text-faded uppercase tracking-wider">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-graphite font-bold underline hover:text-olive transition-colors focus:outline-none focus:ring-1 focus:ring-olive"
            >
              Sign In
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};
