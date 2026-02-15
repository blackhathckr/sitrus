'use client'

/**
 * Theme Switcher Components
 *
 * Simple dark/light mode toggle. For full theme customization,
 * use the ThemeDrawer component instead.
 */

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'

/**
 * ColorModeToggle - Quick dark/light mode toggle button
 *
 * This is the only theme switcher component needed in headers.
 * For full palette/depth/font customization, use ThemeDrawer.
 */
export function ColorModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="size-9">
        <Sun className="size-4" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

// Re-export as ThemeSwitcher for backwards compatibility
// But this now only toggles dark/light mode
export const ThemeSwitcher = ColorModeToggle
