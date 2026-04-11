/**
 * Site Header
 *
 * Top header bar for dashboard layouts.
 * Features sidebar toggle, breadcrumbs, and theme controls.
 *
 * @module components/layout/site-header
 */

"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ColorModeToggle } from "@/components/theme-switcher";
import { ThemeDrawer, ThemeDrawerTrigger } from "@/components/theme-drawer";

// =============================================================================
// Route Title Mapping
// =============================================================================

const routeTitles: Record<string, string> = {
  // Creator routes
  "/dashboard": "Dashboard",
  "/dashboard/links": "SitLinks",
  "/dashboard/links/new": "Create SitLink",
  "/dashboard/products": "Products",
  "/dashboard/storefront": "Storefront",
  "/dashboard/earnings": "Earnings",
  "/dashboard/profile": "Profile",
  // Admin routes
  "/admin": "Overview",
  "/admin/creators": "Creators",
  "/admin/products": "Products",
  "/admin/brands": "Brands",
  "/admin/integrations": "Integrations",
  "/admin/brand-orders": "Brand Orders",
  "/admin/analytics": "Analytics",
  "/admin/earnings": "Earnings",
  "/admin/payouts": "Payouts",
};

// =============================================================================
// Helpers
// =============================================================================

/** Gets the page title from the current pathname. */
function getPageTitle(pathname: string | null): string {
  if (!pathname) return "Dashboard";
  return routeTitles[pathname] || "Dashboard";
}

/** Generates breadcrumb items from the pathname. */
function getBreadcrumbs(
  pathname: string | null
): { label: string; href: string }[] {
  if (!pathname) return [];

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const title =
      routeTitles[currentPath] ||
      segment.charAt(0).toUpperCase() + segment.slice(1);
    breadcrumbs.push({ label: title, href: currentPath });
  }

  return breadcrumbs;
}

// =============================================================================
// Component
// =============================================================================

/**
 * SiteHeader - Top header for dashboard layouts.
 *
 * Features:
 * - Sidebar toggle trigger
 * - Dynamic breadcrumb navigation
 * - Theme customization drawer
 * - Quick dark/light mode toggle
 */
export function SiteHeader() {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const breadcrumbs = getBreadcrumbs(pathname);
  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />

          {/* Breadcrumbs */}
          <Breadcrumb className="hidden sm:flex">
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.href}>
                  <BreadcrumbItem>
                    {index === breadcrumbs.length - 1 ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          {/* Mobile Title */}
          <h1 className="text-base font-medium sm:hidden">{pageTitle}</h1>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-2">
            <ThemeDrawerTrigger onClick={() => setThemeDrawerOpen(true)} />
            <ColorModeToggle />
          </div>
        </div>
      </header>

      <ThemeDrawer
        open={themeDrawerOpen}
        onClose={() => setThemeDrawerOpen(false)}
      />
    </>
  );
}

export default SiteHeader;
