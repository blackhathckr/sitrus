"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  LogOut,
  User,
  MoreVertical,
  Shield,
  Palette,
  Sun,
  Moon,
} from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useColorTheme } from "@/components/providers/color-theme-provider";
import { colorPalettes } from "@/lib/color-palettes";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { getRoleLabel, getRoleColor, UserRole } from "@/lib/constants/roles";
import { ThemeDrawer } from "@/components/theme-drawer";

// ============================================================================
// Types
// ============================================================================

interface NavUserProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
    role?: UserRole | string;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates initials from a name string.
 * @example getInitials("John Doe") => "JD"
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ============================================================================
// NavUser Component
// ============================================================================

/**
 * NavUser - User profile dropdown component for the sidebar footer.
 *
 * Features:
 * - Displays user avatar, name, email, and role
 * - Dropdown menu with account options
 * - Links to profile, settings, and notifications
 * - Sign out functionality via NextAuth
 * - Opens full theme customization drawer
 */
export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar();
  const { paletteId } = useColorTheme();
  const { theme: colorMode, setTheme: setColorMode } = useTheme();
  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  const roleLabel = user.role ? getRoleLabel(user.role) : undefined;
  const roleColor = user.role ? getRoleColor(user.role) : undefined;
  const currentPalette = colorPalettes.find((p) => p.id === paletteId) || colorPalettes[0];

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
                </div>
                <MoreVertical className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              {/* User Info Header */}
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {user.email}
                    </span>
                  </div>
                </div>
                {roleLabel && (
                  <div className="px-2 pb-2">
                    <Badge
                      variant="secondary"
                      className={cn("text-xs border", roleColor)}
                    >
                      <Shield className="mr-1 size-3" />
                      {roleLabel}
                    </Badge>
                  </div>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Account Options */}
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="flex w-full cursor-pointer items-center">
                    <User className="mr-2 size-4" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />

              {/* Theme Settings */}
              <DropdownMenuGroup>
                {/* Open Full Theme Drawer */}
                <DropdownMenuItem
                  onClick={() => setThemeDrawerOpen(true)}
                  className="cursor-pointer"
                >
                  <Palette className="mr-2 size-4" />
                  <span>Customize Theme</span>
                  <div className="ml-auto flex items-center gap-1">
                    <span className="text-xs">{currentPalette.emoji}</span>
                    <div className="flex -space-x-1">
                      <div
                        className="size-3 rounded-full border border-background"
                        style={{ backgroundColor: currentPalette.light.primary }}
                      />
                      <div
                        className="size-3 rounded-full border border-background"
                        style={{ backgroundColor: currentPalette.light.accent }}
                      />
                    </div>
                  </div>
                </DropdownMenuItem>

                {/* Quick Light/Dark Toggle */}
                <DropdownMenuItem
                  onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
                  className="cursor-pointer"
                >
                  {colorMode === 'dark' ? (
                    <Sun className="mr-2 size-4" />
                  ) : (
                    <Moon className="mr-2 size-4" />
                  )}
                  <span>{colorMode === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />

              {/* Sign Out */}
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                <LogOut className="mr-2 size-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Theme Drawer - Full Customization Panel */}
      <ThemeDrawer
        open={themeDrawerOpen}
        onClose={() => setThemeDrawerOpen(false)}
      />
    </>
  );
}

export default NavUser;
