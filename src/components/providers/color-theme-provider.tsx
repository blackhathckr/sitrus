'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useTheme } from 'next-themes'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'
import {
  applyPalette,
  applyCustomColorTheme,
  resetAllThemeColors,
  isValidHexColor,
} from '@/lib/color-utils'
import { DEFAULT_PALETTE_ID, getPaletteById } from '@/lib/color-palettes'

// Cookie keys with CVP prefix
const THEME_MODE_COOKIE = 'cvp-theme-mode'
const PALETTE_COOKIE = 'cvp-palette'
const CUSTOM_COLOR_COOKIE = 'cvp-custom-color'
const DEPTH_COOKIE = 'cvp-theme-depth'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export type ThemeMode = 'palette' | 'custom'

// Theme depth levels - controls how much of the UI is affected
export type ThemeDepth = 'subtle' | 'soft' | 'vivid' | 'immersive'

export const themeDepthOptions: {
  value: ThemeDepth
  label: string
  description: string
}[] = [
  { value: 'subtle', label: 'Subtle', description: 'Buttons & accents only' },
  { value: 'soft', label: 'Soft', description: 'Tinted borders & cards' },
  { value: 'vivid', label: 'Vivid', description: 'Rich colors throughout' },
  { value: 'immersive', label: 'Immersive', description: 'Complete transformation' },
]

const DEFAULT_DEPTH: ThemeDepth = 'immersive'

type ColorThemeProviderProps = {
  children: ReactNode
  defaultPalette?: string
}

type ColorThemeProviderState = {
  mode: ThemeMode
  paletteId: string
  defaultPaletteId: string
  customColor: string | null
  depth: ThemeDepth
  setPalette: (paletteId: string) => void
  setCustomColor: (hex: string) => void
  setDepth: (depth: ThemeDepth) => void
  resetToDefault: () => void
  isDefault: boolean
}

const initialState: ColorThemeProviderState = {
  mode: 'palette',
  paletteId: DEFAULT_PALETTE_ID,
  defaultPaletteId: DEFAULT_PALETTE_ID,
  customColor: null,
  depth: DEFAULT_DEPTH,
  setPalette: () => null,
  setCustomColor: () => null,
  setDepth: () => null,
  resetToDefault: () => null,
  isDefault: true,
}

const ColorThemeContext = createContext<ColorThemeProviderState>(initialState)

export function ColorThemeProvider({
  children,
  defaultPalette = DEFAULT_PALETTE_ID,
}: ColorThemeProviderProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Initialize state from cookies
  const [mode, setMode] = useState<ThemeMode>('palette')
  const [paletteId, setPaletteIdState] = useState<string>(defaultPalette)
  const [customColor, setCustomColorState] = useState<string | null>(null)
  const [depth, setDepthState] = useState<ThemeDepth>(DEFAULT_DEPTH)

  // Load from cookies on mount
  useEffect(() => {
    const savedMode = getCookie(THEME_MODE_COOKIE) as ThemeMode | null
    const savedPalette = getCookie(PALETTE_COOKIE)
    const savedColor = getCookie(CUSTOM_COLOR_COOKIE)
    const savedDepth = getCookie(DEPTH_COOKIE) as ThemeDepth | null

    if (savedMode === 'custom') setMode('custom')
    if (savedPalette && getPaletteById(savedPalette)) setPaletteIdState(savedPalette)
    if (savedColor && isValidHexColor(savedColor)) setCustomColorState(savedColor)

    const validDepths: ThemeDepth[] = ['subtle', 'soft', 'vivid', 'immersive']
    if (savedDepth && validDepths.includes(savedDepth)) setDepthState(savedDepth)

    setMounted(true)
  }, [])

  // Apply data-depth and data-palette attributes
  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    root.setAttribute('data-depth', depth)
    if (mode === 'palette') {
      root.setAttribute('data-palette', paletteId)
    } else {
      root.removeAttribute('data-palette')
    }
  }, [depth, mode, paletteId, mounted])

  // Apply theme when mode, palette, custom color, or light/dark mode changes
  useEffect(() => {
    if (!mounted) return
    const isDark = resolvedTheme === 'dark'

    if (mode === 'palette') {
      applyPalette(paletteId, isDark)
    } else if (mode === 'custom' && customColor) {
      applyCustomColorTheme(customColor, isDark)
    }
  }, [mode, paletteId, customColor, resolvedTheme, mounted])

  const setPalette = (newPaletteId: string) => {
    if (!getPaletteById(newPaletteId)) {
      console.error('Invalid palette ID:', newPaletteId)
      return
    }

    setMode('palette')
    setPaletteIdState(newPaletteId)

    setCookie(THEME_MODE_COOKIE, 'palette', COOKIE_MAX_AGE)
    setCookie(PALETTE_COOKIE, newPaletteId, COOKIE_MAX_AGE)
  }

  const setCustomColor = (hex: string) => {
    if (!isValidHexColor(hex)) {
      console.error('Invalid HEX color:', hex)
      return
    }

    setMode('custom')
    setCustomColorState(hex)

    setCookie(THEME_MODE_COOKIE, 'custom', COOKIE_MAX_AGE)
    setCookie(CUSTOM_COLOR_COOKIE, hex, COOKIE_MAX_AGE)
  }

  const setDepth = (newDepth: ThemeDepth) => {
    setDepthState(newDepth)
    setCookie(DEPTH_COOKIE, newDepth, COOKIE_MAX_AGE)
  }

  const resetToDefault = () => {
    setMode('palette')
    setPaletteIdState(defaultPalette)
    setCustomColorState(null)
    setDepthState(DEFAULT_DEPTH)

    removeCookie(THEME_MODE_COOKIE)
    removeCookie(PALETTE_COOKIE)
    removeCookie(CUSTOM_COLOR_COOKIE)
    removeCookie(DEPTH_COOKIE)

    resetAllThemeColors()

    const isDark = resolvedTheme === 'dark'
    applyPalette(defaultPalette, isDark)
  }

  const isDefault = mode === 'palette' && paletteId === defaultPalette && depth === DEFAULT_DEPTH

  const contextValue: ColorThemeProviderState = {
    mode,
    paletteId,
    defaultPaletteId: defaultPalette,
    customColor,
    depth,
    setPalette,
    setCustomColor,
    setDepth,
    resetToDefault,
    isDefault,
  }

  return (
    <ColorThemeContext.Provider value={contextValue}>
      {children}
    </ColorThemeContext.Provider>
  )
}

export const useColorTheme = () => {
  const context = useContext(ColorThemeContext)

  if (!context)
    throw new Error('useColorTheme must be used within a ColorThemeProvider')

  return context
}
