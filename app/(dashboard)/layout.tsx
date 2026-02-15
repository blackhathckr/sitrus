/**
 * Creator Dashboard Layout
 *
 * Protected layout for creator dashboard pages.
 * Includes creator sidebar navigation and header.
 * Requires CREATOR role — admins are redirected to /admin.
 *
 * @module app/(dashboard)/layout
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth-options';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SiteHeader } from '@/components/layout/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Admins should use the admin panel
  if (session.user.role === 'ADMIN') {
    redirect('/admin');
  }

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} />
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
