"use client";

import * as React from "react";
import { Moon, Sun, Monitor, Check } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================================================
// ThemeToggle Component
// ============================================================================

/**
 * ThemeToggle - Dark/Light mode toggle component.
 *
 * Features:
 * - Dropdown menu with Light, Dark, and System options
 * - Animated sun/moon icons
 * - Uses next-themes for theme management
 * - Shows current theme state with checkmark indicator
 */
export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="size-9">
        <Sun className="size-4" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9">
          <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={cn(
            "flex items-center justify-between",
            theme === "light" && "bg-accent"
          )}
        >
          <div className="flex items-center">
            <Sun className="mr-2 size-4" />
            Light
          </div>
          {theme === "light" && <Check className="size-4 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={cn(
            "flex items-center justify-between",
            theme === "dark" && "bg-accent"
          )}
        >
          <div className="flex items-center">
            <Moon className="mr-2 size-4" />
            Dark
          </div>
          {theme === "dark" && <Check className="size-4 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={cn(
            "flex items-center justify-between",
            theme === "system" && "bg-accent"
          )}
        >
          <div className="flex items-center">
            <Monitor className="mr-2 size-4" />
            System
          </div>
          {theme === "system" && <Check className="size-4 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeToggle;
