"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

// ============================================================================
// Types
// ============================================================================

interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
}

interface NavMainProps {
  items: NavItem[];
}

// ============================================================================
// NavMain Component
// ============================================================================

/**
 * NavMain - Main navigation component for the sidebar.
 *
 * Features:
 * - Renders navigation items with icons
 * - Supports active state highlighting
 * - Collapsible icon mode support
 * - Tooltips when collapsed
 * - Auto-closes sidebar on mobile after navigation
 */
export function NavMain({ items }: NavMainProps) {
  const router = useRouter();
  const { setOpenMobile, isMobile } = useSidebar();

  const handleNavClick = (url: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    // Close mobile sidebar when navigating
    if (isMobile) {
      setOpenMobile(false);
    }
    router.push(url);
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={item.isActive}
              >
                <Link href={item.url} onClick={handleNavClick(item.url)}>
                  {item.icon && <item.icon className="size-4" />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export default NavMain;
