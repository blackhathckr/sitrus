/**
 * Admin Dashboard Sidebar
 *
 * Navigation sidebar for admin users with platform management links.
 *
 * @module components/layout/admin-sidebar
 */

"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  BarChart3,
  Wallet,
  IndianRupee,
  Tag,
  Plug,
  ShoppingCart,
} from "lucide-react"

import { NavMain } from "@/components/layout/nav-main"
import { NavUser } from "@/components/layout/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// =============================================================================
// Types
// =============================================================================

interface AdminSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    id: string
    email: string
    name: string
    image?: string | null
    role: string
  }
}

// =============================================================================
// Navigation Configuration
// =============================================================================

/** Admin panel navigation items */
const adminNav = [
  {
    title: "Overview",
    url: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Creators",
    url: "/admin/creators",
    icon: Users,
  },
  {
    title: "Products",
    url: "/admin/products",
    icon: ShoppingBag,
  },
  {
    title: "Brands",
    url: "/admin/brands",
    icon: Tag,
  },
  {
    title: "Integrations",
    url: "/admin/integrations",
    icon: Plug,
  },
  {
    title: "Brand Orders",
    url: "/admin/brand-orders",
    icon: ShoppingCart,
  },
  {
    title: "Analytics",
    url: "/admin/analytics",
    icon: BarChart3,
  },
  {
    title: "Earnings",
    url: "/admin/earnings",
    icon: IndianRupee,
  },
  {
    title: "Payouts",
    url: "/admin/payouts",
    icon: Wallet,
  },
]

// =============================================================================
// Component
// =============================================================================

/**
 * AdminSidebar - Admin panel sidebar navigation.
 *
 * Features:
 * - Sitrus brand logo with "Admin" subtitle
 * - Platform management nav items
 * - Active state based on current route
 * - User profile dropdown in footer
 */
export function AdminSidebar({ user, ...props }: AdminSidebarProps) {
  const pathname = usePathname()

  const userData = user
    ? {
        name: user.name,
        email: user.email,
        avatar: user.image || undefined,
        role: user.role as "ADMIN" | "CREATOR",
      }
    : {
        name: "Admin",
        email: "admin@sitrus.club",
        avatar: undefined,
      }

  const navWithActive = adminNav.map((item) => ({
    ...item,
    isActive:
      pathname === item.url ||
      (item.url !== "/admin" && pathname?.startsWith(`${item.url}/`)),
  }))

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/admin">
                <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg text-sm font-bold">
                  S
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Sitrus</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Admin Panel
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navWithActive} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
