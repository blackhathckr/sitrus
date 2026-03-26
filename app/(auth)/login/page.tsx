/**
 * Login Page
 *
 * Sitrus authentication page with three login methods:
 * - Email/Password (for creators and admins)
 * - Google OAuth (for creators)
 * - Admin (dedicated admin tab)
 *
 * @module app/(auth)/login/page
 */

'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, Mail, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { PageLottie } from '@/components/ui/page-lottie';

// =============================================================================
// Component
// =============================================================================

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Creator email login form state
  const [emailForm, setEmailForm] = useState({ email: '', password: '' });

  // Admin login form state
  const [adminForm, setAdminForm] = useState({ email: '', password: '' });

  // ---------------------------------------------------------------------------
  // Google Sign-In
  // ---------------------------------------------------------------------------
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('google', { callbackUrl });
    } catch {
      toast.error('Failed to sign in with Google');
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Creator Email/Password Sign-In
  // ---------------------------------------------------------------------------
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email: emailForm.email,
        password: emailForm.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Login successful!');
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      toast.error('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Admin Email/Password Sign-In
  // ---------------------------------------------------------------------------
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email: adminForm.email,
        password: adminForm.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Admin login successful!');
        router.push('/admin');
        router.refresh();
      }
    } catch {
      toast.error('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Password visibility toggle helper
  // ---------------------------------------------------------------------------
  const PasswordToggle = ({
    show,
    onToggle,
  }: {
    show: boolean;
    onToggle: () => void;
  }) => (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      tabIndex={-1}
    >
      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Form */}
      <div className="flex flex-1 items-center justify-center bg-background p-4 lg:p-8">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-xl lg:border">
            <CardHeader className="space-y-2 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-primary text-xl font-bold text-primary-foreground">
                S
              </div>
              <CardTitle className="text-2xl font-bold">
                Welcome to Sitrus
              </CardTitle>
              <CardDescription>
                Sign in to manage your affiliate links and earnings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="email" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="email">Email</TabsTrigger>
                  <TabsTrigger value="google">Google</TabsTrigger>
                  <TabsTrigger value="admin">Admin</TabsTrigger>
                </TabsList>

                {/* Email Tab - Creator Email/Password */}
                <TabsContent value="email" className="space-y-4 pt-4">
                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-login">Email Address</Label>
                      <Input
                        id="email-login"
                        type="email"
                        required
                        value={emailForm.email}
                        onChange={(e) =>
                          setEmailForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        placeholder="you@example.com"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="email-password">Password</Label>
                        <Link
                          href="/forgot-password"
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Forgot Password?
                        </Link>
                      </div>
                      <div className="relative">
                        <Input
                          id="email-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={emailForm.password}
                          onChange={(e) =>
                            setEmailForm((prev) => ({
                              ...prev,
                              password: e.target.value,
                            }))
                          }
                          placeholder="Enter your password"
                          disabled={isLoading}
                          className="pr-10"
                        />
                        <PasswordToggle
                          show={showPassword}
                          onToggle={() => setShowPassword(!showPassword)}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="h-10 w-full"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 size-4" />
                          Sign In
                        </>
                      )}
                    </Button>
                  </form>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        New to Sitrus?
                      </span>
                    </div>
                  </div>

                  <div className="text-center text-sm">
                    <span className="text-muted-foreground">
                      Don&apos;t have an account?{' '}
                    </span>
                    <Link
                      href="/register"
                      className="font-medium text-primary hover:underline"
                    >
                      Create account
                    </Link>
                  </div>
                </TabsContent>

                {/* Google Tab - Google OAuth */}
                <TabsContent value="google" className="space-y-4 pt-4">
                  <Button
                    variant="outline"
                    className="h-11 w-full"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <svg
                        className="mr-2 size-4"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                    )}
                    Continue with Google
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        New to Sitrus?
                      </span>
                    </div>
                  </div>

                  <div className="text-center text-sm">
                    <span className="text-muted-foreground">
                      Don&apos;t have an account?{' '}
                    </span>
                    <Link
                      href="/register"
                      className="font-medium text-primary hover:underline"
                    >
                      Create account
                    </Link>
                  </div>
                </TabsContent>

                {/* Admin Tab */}
                <TabsContent value="admin" className="space-y-4 pt-4">
                  <form onSubmit={handleAdminSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-email">Admin Email</Label>
                      <Input
                        id="admin-email"
                        type="email"
                        required
                        value={adminForm.email}
                        onChange={(e) =>
                          setAdminForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        placeholder="admin@sitrus.club"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="admin-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="admin-password"
                          type={showAdminPassword ? 'text' : 'password'}
                          required
                          value={adminForm.password}
                          onChange={(e) =>
                            setAdminForm((prev) => ({
                              ...prev,
                              password: e.target.value,
                            }))
                          }
                          placeholder="Enter admin password"
                          disabled={isLoading}
                          className="pr-10"
                        />
                        <PasswordToggle
                          show={showAdminPassword}
                          onToggle={() =>
                            setShowAdminPassword(!showAdminPassword)
                          }
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="h-10 w-full"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="mr-2 size-4" />
                          Admin Sign In
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Sitrus Club Private Limited
          </p>
        </div>
      </div>

      {/* Right Side - Lottie */}
      <div className="hidden flex-1 items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-8 lg:flex">
        <div className="w-full max-w-md">
          <PageLottie name="auth" description="Monetize your influence" />
        </div>
      </div>
    </div>
  );
}
