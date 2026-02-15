/**
 * Color Utilities for CVP Theme System
 * Handles color conversions, palette generation, and theme application
 */

import { formatCss, formatHex, oklch, converter } from 'culori'
import { getPaletteById, type PaletteColors } from './color-palettes'

export interface ColorPreset {
  name: string
  value: string // HEX color
  oklch: string // OKLCH format for CSS variables
}

/**
 * Quick color presets for custom color picker
 */
export const colorPresets: ColorPreset[] = [
  { name: 'Violet', value: '#7c3aed', oklch: 'oklch(0.541 0.281 293.009)' },
  { name: 'Blue', value: '#3b82f6', oklch: 'oklch(0.608 0.214 259.815)' },
  { name: 'Cyan', value: '#06b6d4', oklch: 'oklch(0.685 0.169 195.769)' },
  { name: 'Emerald', value: '#10b981', oklch: 'oklch(0.696 0.17 162.48)' },
  { name: 'Orange', value: '#f97316', oklch: 'oklch(0.716 0.209 41.292)' },
  { name: 'Rose', value: '#e11d48', oklch: 'oklch(0.577 0.245 27.325)' },
]

/**
 * Default primary color (Violet)
 */
export const DEFAULT_PRIMARY_COLOR = colorPresets[0].value

/**
 * Convert HEX color to OKLCH format string
 */
export function hexToOklch(hex: string): string {
  try {
    const color = oklch(hex)
    if (!color) return colorPresets[0].oklch
    return formatCss(color)
  } catch (error) {
    console.error('Error converting HEX to OKLCH:', error)
    return colorPresets[0].oklch
  }
}

/**
 * Convert OKLCH string to HEX color
 */
export function oklchToHex(oklchString: string): string {
  try {
    const color = oklch(oklchString)
    if (!color) return DEFAULT_PRIMARY_COLOR
    return formatHex(color)
  } catch (error) {
    console.error('Error converting OKLCH to HEX:', error)
    return DEFAULT_PRIMARY_COLOR
  }
}

/**
 * Calculate relative luminance of a color
 */
function getRelativeLuminance(color: ReturnType<typeof oklch>): number {
  const rgb = converter('rgb')(color)
  if (!rgb) return 0

  const { r, g, b } = rgb

  const toLinear = (val: number) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  }

  const R = toLinear(r)
  const G = toLinear(g)
  const B = toLinear(b)

  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

/**
 * Calculate WCAG contrast ratio between two colors
 */
function getContrastRatio(color1: ReturnType<typeof oklch>, color2: ReturnType<typeof oklch>): number {
  const lum1 = getRelativeLuminance(color1)
  const lum2 = getRelativeLuminance(color2)

  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Generate a contrasting foreground color for accessibility
 * Ensures WCAG AA compliance (4.5:1 contrast ratio)
 */
export function getContrastingForeground(backgroundColor: string): string {
  const bgColor = oklch(backgroundColor)
  if (!bgColor) return 'oklch(0.984 0.003 247.858)'

  const whiteColor = oklch('#ffffff')
  const darkColor = oklch('#0a0a0a')

  const contrastWithWhite = getContrastRatio(bgColor, whiteColor!)
  const contrastWithDark = getContrastRatio(bgColor, darkColor!)

  return contrastWithWhite > contrastWithDark
    ? 'oklch(0.984 0.003 247.858)' // White
    : 'oklch(0.129 0.042 264.695)' // Dark
}

/**
 * Generate focus ring color (slightly adjusted from primary)
 */
export function generateRingColor(primaryColor: string): string {
  const color = oklch(primaryColor)
  if (!color) return 'oklch(0.704 0.04 256.788)'

  const ringColor = {
    ...color,
    l: Math.min((color.l || 0) + 0.1, 0.85),
  }

  return formatCss(ringColor)
}

/**
 * Apply a predefined color palette to the document
 */
export function applyPalette(paletteId: string, isDark: boolean = false) {
  const palette = getPaletteById(paletteId)
  if (!palette) {
    console.error('Palette not found:', paletteId)
    return
  }

  const colors = isDark ? palette.dark : palette.light
  applyPaletteColors(colors)

  document.documentElement.setAttribute('data-palette', paletteId)
}

/**
 * Apply palette colors to CSS variables
 */
function applyPaletteColors(colors: PaletteColors) {
  const root = document.documentElement

  root.style.setProperty('--primary', colors.primary)
  root.style.setProperty('--primary-foreground', colors.primaryForeground)
  root.style.setProperty('--accent', colors.accent)
  root.style.setProperty('--accent-foreground', colors.accentForeground)
  root.style.setProperty('--secondary', colors.secondary)
  root.style.setProperty('--secondary-foreground', colors.secondaryForeground)
  root.style.setProperty('--muted', colors.muted)
  root.style.setProperty('--muted-foreground', colors.mutedForeground)
  root.style.setProperty('--ring', colors.ring)
  root.style.setProperty('--chart-1', colors.chart[0])
  root.style.setProperty('--chart-2', colors.chart[1])
  root.style.setProperty('--chart-3', colors.chart[2])
  root.style.setProperty('--chart-4', colors.chart[3])
  root.style.setProperty('--chart-5', colors.chart[4])
  root.style.setProperty('--sidebar-primary', 'var(--primary)')
  root.style.setProperty('--sidebar-primary-foreground', 'var(--primary-foreground)')
  root.style.setProperty('--sidebar-accent', 'var(--accent)')
  root.style.setProperty('--sidebar-accent-foreground', 'var(--accent-foreground)')
}

/**
 * Apply a custom color with full palette generation
 */
export function applyCustomColorTheme(hex: string, isDark: boolean = false) {
  const root = document.documentElement
  const color = oklch(hex)

  if (!color) {
    console.error('Invalid color:', hex)
    return
  }

  const hue = color.h || 0
  const chroma = color.c || 0

  if (isDark) {
    const lighterPrimary = { ...color, l: Math.min((color.l || 0) + 0.25, 0.85) }
    root.style.setProperty('--primary', formatCss(lighterPrimary))
    root.style.setProperty('--primary-foreground', 'oklch(0.208 0.042 265.755)')
    root.style.setProperty('--secondary', `oklch(0.279 0.041 ${hue})`)
    root.style.setProperty('--secondary-foreground', 'oklch(0.984 0.003 247.858)')

    const accentHue = (hue + 30) % 360
    root.style.setProperty('--accent', `oklch(0.75 ${Math.min(chroma, 0.2)} ${accentHue})`)
    root.style.setProperty('--accent-foreground', 'oklch(0.208 0.042 265.755)')
    root.style.setProperty('--muted', `oklch(0.279 0.041 ${hue})`)
    root.style.setProperty('--muted-foreground', `oklch(0.704 0.04 ${hue})`)
    root.style.setProperty('--ring', formatCss({ ...lighterPrimary, l: (lighterPrimary.l || 0) + 0.1 }))
  } else {
    root.style.setProperty('--primary', formatCss(color))
    root.style.setProperty('--primary-foreground', getContrastingForeground(hex))
    root.style.setProperty('--secondary', `oklch(0.951 0.026 ${hue})`)
    root.style.setProperty('--secondary-foreground', formatCss(color))

    const accentHue = (hue + 30) % 360
    root.style.setProperty('--accent', `oklch(0.65 ${Math.min(chroma, 0.2)} ${accentHue})`)
    root.style.setProperty('--accent-foreground', 'oklch(0.984 0.003 247.858)')
    root.style.setProperty('--muted', `oklch(0.951 0.026 ${hue})`)
    root.style.setProperty('--muted-foreground', `oklch(0.552 0.016 ${hue})`)
    root.style.setProperty('--ring', formatCss({ ...color, l: Math.min((color.l || 0) + 0.15, 0.85) }))
  }

  const chartColors = generateChartColors(hue, isDark)
  chartColors.forEach((c, i) => {
    root.style.setProperty(`--chart-${i + 1}`, c)
  })

  root.style.setProperty('--sidebar-primary', 'var(--primary)')
  root.style.setProperty('--sidebar-primary-foreground', 'var(--primary-foreground)')
  root.style.setProperty('--sidebar-accent', 'var(--accent)')
  root.style.setProperty('--sidebar-accent-foreground', 'var(--accent-foreground)')

  root.removeAttribute('data-palette')
}

/**
 * Generate harmonious chart colors from a base hue
 */
function generateChartColors(baseHue: number, isDark: boolean): string[] {
  const lightness = isDark ? 0.7 : 0.6
  const chroma = isDark ? 0.18 : 0.22

  return [
    `oklch(${lightness} ${chroma} ${baseHue})`,
    `oklch(${lightness} ${chroma} ${(baseHue + 72) % 360})`,
    `oklch(${lightness} ${chroma} ${(baseHue + 144) % 360})`,
    `oklch(${lightness} ${chroma} ${(baseHue + 216) % 360})`,
    `oklch(${lightness} ${chroma} ${(baseHue + 288) % 360})`,
  ]
}

/**
 * Reset all theme-related CSS variables
 */
export function resetAllThemeColors() {
  const root = document.documentElement

  const properties = [
    '--primary', '--primary-foreground',
    '--secondary', '--secondary-foreground',
    '--accent', '--accent-foreground',
    '--muted', '--muted-foreground',
    '--ring',
    '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
    '--sidebar-primary', '--sidebar-primary-foreground',
    '--sidebar-accent', '--sidebar-accent-foreground',
  ]

  properties.forEach((prop) => root.style.removeProperty(prop))
  root.removeAttribute('data-palette')
}

/**
 * Validate if a color string is valid HEX
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
}
