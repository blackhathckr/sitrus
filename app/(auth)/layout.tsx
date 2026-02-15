/**
 * Auth Layout
 *
 * Layout for authentication pages (login, register).
 * Redirects already-authenticated users to their home page.
 *
 * @module app/(auth)/layout
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth-options';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const session = await auth();

  if (session?.user) {
    if (session.user.role === 'ADMIN') {
      redirect('/admin');
    }
    redirect('/dashboard');
  }

  return <>{children}</>;
}
