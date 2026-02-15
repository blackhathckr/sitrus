/**
 * Creator Dashboard Sidebar
 *
 * Main navigation sidebar for authenticated creators.
 * Displays Sitrus branding, creator nav items, and user menu.
 *
 * @module components/layout/app-sidebar
 */

"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Link2,
  ShoppingBag,
  Store,
  IndianRupee,
  UserCircle,
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

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    id: string
    email: string
    name: string
    image?: string | null
    role: string
    slug?: string | null
  }
}

// =============================================================================
// Navigation Configuration
// =============================================================================

/** Creator dashboard navigation items */
const creatorNav = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "SitLinks",
    url: "/dashboard/links",
    icon: Link2,
  },
  {
    title: "Products",
    url: "/dashboard/products",
    icon: ShoppingBag,
  },
  {
    title: "Storefront",
    url: "/dashboard/storefront",
    icon: Store,
  },
  {
    title: "Earnings",
    url: "/dashboard/earnings",
    icon: IndianRupee,
  },
  {
    title: "Profile",
    url: "/dashboard/profile",
    icon: UserCircle,
  },
]

// =============================================================================
// Component
// =============================================================================

/**
 * AppSidebar - Creator dashboard sidebar navigation.
 *
 * Features:
 * - Sitrus brand logo and title in header
 * - Main nav items for creator workflows
 * - Active state based on current route
 * - User profile dropdown in footer
 */
export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname()

  const userData = user
    ? {
        name: user.name,
        email: user.email,
        avatar: user.image || undefined,
        role: user.role as "ADMIN" | "CREATOR",
      }
    : {
        name: "Guest",
        email: "guest@sitrus.in",
        avatar: undefined,
      }

  const navWithActive = creatorNav.map((item) => ({
    ...item,
    isActive:
      pathname === item.url ||
      (item.url !== "/dashboard" && pathname?.startsWith(`${item.url}/`)),
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
              <Link href="/dashboard">
                <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg text-sm font-bold">
                  S
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Sitrus</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Creator Dashboard
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
