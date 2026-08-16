import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { LoginPage } from '../pages/auth/LoginPage';
import { SignupPage } from '../pages/auth/SignupPage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import * as authApi from '../lib/api/auth';

vi.mock('../lib/api/auth', () => ({
  registerApi: vi.fn(),
  loginApi: vi.fn(),
  refreshApi: vi.fn(),
  logoutApi: vi.fn(),
}));

describe('UI Primitives', () => {
  it('renders Button with variants and loading state', () => {
    const { rerender } = render(<Button variant="primary">Primary Action</Button>);
    expect(screen.getByRole('button', { name: /Primary Action/i })).toBeInTheDocument();

    rerender(<Button isLoading>Primary Action</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText(/Processing.../i)).toBeInTheDocument();
  });

  it('renders Input with label and error state', () => {
    render(<Input label="Email Address" error="Email is required" id="test-email" />);
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Email is required');
  });

  it('renders Card and Badge', () => {
    render(
      <Card variant="default">
        <Badge variant="olive">Active Status</Badge>
        <p>Card Content</p>
      </Card>,
    );
    expect(screen.getByText(/Active Status/i)).toBeInTheDocument();
    expect(screen.getByText(/Card Content/i)).toBeInTheDocument();
  });
});

describe('LoginPage Component', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('renders login form correctly', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('validates required fields and invalid email format', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'invalid-email' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid email address/i)).toBeInTheDocument();
    });
  });

  it('handles successful login and redirects to /dashboard', async () => {
    vi.mocked(authApi.loginApi).mockResolvedValueOnce({
      access_token: 'valid_access_token',
      refresh_token: 'valid_refresh_token',
      token_type: 'bearer',
      user: {
        id: 'uuid-123',
        email: 'user@example.com',
        is_active: true,
        is_verified: false,
        created_at: new Date().toISOString(),
      },
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<div>Dashboard Target Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByText(/Dashboard Target Page/i)).toBeInTheDocument();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('displays authentication error on login failure', async () => {
    useAuthStore.setState({ error: 'Invalid email or password' });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/Invalid email or password/i);
  });
});

describe('SignupPage Component', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('renders signup form correctly', () => {
    render(
      <MemoryRouter initialEntries={['/signup']}>
        <Routes>
          <Route path="/signup" element={<SignupPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Create Account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
  });

  it('validates password length under 8 characters', async () => {
    render(
      <MemoryRouter initialEntries={['/signup']}>
        <Routes>
          <Route path="/signup" element={<SignupPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'john@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'short' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('handles successful registration and automatic login', async () => {
    const mockUser = {
      id: 'uuid-456',
      email: 'newuser@example.com',
      full_name: 'Jane Doe',
      is_active: true,
      is_verified: false,
      created_at: new Date().toISOString(),
    };

    vi.mocked(authApi.registerApi).mockResolvedValueOnce(mockUser);
    vi.mocked(authApi.loginApi).mockResolvedValueOnce({
      access_token: 'new_access_token',
      refresh_token: 'new_refresh_token',
      token_type: 'bearer',
      user: mockUser,
    });

    render(
      <MemoryRouter initialEntries={['/signup']}>
        <Routes>
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<div>Dashboard Target Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'Jane Doe' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'newuser@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'StrongPassword123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Dashboard Target Page/i)).toBeInTheDocument();
    });

    expect(authApi.registerApi).toHaveBeenCalledWith({
      full_name: 'Jane Doe',
      email: 'newuser@example.com',
      password: 'StrongPassword123!',
    });
  });
});

describe('Auth Navigation', () => {
  it('navigates between Login and Signup pages', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: /Sign Up/i }));

    expect(screen.getByRole('heading', { name: /Create Account/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: /Sign In/i }));

    expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeInTheDocument();
  });
});

describe('Navbar Auth Awareness', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
  });

  it('renders unauthenticated CTAs (Log In & Start Your Journey) when logged out', async () => {
    const NavbarComponent = (await import('../components/Navbar')).default;
    render(
      <MemoryRouter initialEntries={['/']}>
        <NavbarComponent />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('link', { name: /Log In/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Start Your Journey/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: /Go To Dashboard/i })).not.toBeInTheDocument();
  });

  it('renders authenticated CTA (Go To Dashboard) when logged in', async () => {
    useAuthStore.setState({
      user: {
        id: 'u-1',
        email: 'loggeduser@example.com',
        full_name: 'Logged User',
        is_active: true,
        is_verified: false,
        created_at: new Date().toISOString(),
      },
      accessToken: 'mock_token',
      isAuthenticated: true,
    });

    const NavbarComponent = (await import('../components/Navbar')).default;
    render(
      <MemoryRouter initialEntries={['/']}>
        <NavbarComponent />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: /Start Your Journey/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Go To Dashboard/i }).length).toBeGreaterThan(0);
  });
});
