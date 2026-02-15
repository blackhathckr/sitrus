/**
 * Admin Dashboard Layout
 *
 * Protected layout for admin panel pages.
 * Includes admin sidebar navigation and header.
 * Requires ADMIN role — creators are redirected to /dashboard.
 *
 * @module app/(admin)/layout
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth-options';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { SiteHeader } from '@/components/layout/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Only admins can access the admin panel
  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <SidebarProvider>
      <AdminSidebar user={session.user} />
      <SidebarInset>
        <SiteHeader />
        <main className="flex-1 overflow-auto">
          <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
