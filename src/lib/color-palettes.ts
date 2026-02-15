/**
 * Premium Color Palettes for CVP Theme System
 * 12 unique, creative palettes with light and dark mode variants
 * Uses OKLCH color space for perceptual uniformity
 */

export type PaletteCategory = 'warm' | 'cool' | 'neutral' | 'vibrant'

export interface ColorPalette {
  id: string
  name: string
  emoji: string
  description: string
  category: PaletteCategory
  light: PaletteColors
  dark: PaletteColors
}

export interface PaletteColors {
  primary: string
  primaryForeground: string
  accent: string
  accentForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  ring: string
  chart: [string, string, string, string, string]
}

/**
 * 12 Premium Color Palettes
 */
export const colorPalettes: ColorPalette[] = [
  // 1. Aurora - Magical northern lights (DEFAULT)
  {
    id: 'aurora',
    name: 'Aurora',
    emoji: '✨',
    description: 'Magical & Futuristic',
    category: 'vibrant',
    light: {
      primary: 'oklch(0.541 0.281 293.009)',
      primaryForeground: 'oklch(0.984 0.003 247.858)',
      accent: 'oklch(0.685 0.169 195.769)',
      accentForeground: 'oklch(0.984 0.003 247.858)',
      secondary: 'oklch(0.951 0.026 293.009)',
      secondaryForeground: 'oklch(0.541 0.281 293.009)',
      muted: 'oklch(0.951 0.026 293.009)',
      mutedForeground: 'oklch(0.552 0.016 286.375)',
      ring: 'oklch(0.641 0.281 293.009)',
      chart: [
        'oklch(0.541 0.281 293.009)',
        'oklch(0.685 0.169 195.769)',
        'oklch(0.656 0.241 354.308)',
        'oklch(0.627 0.265 303.9)',
        'oklch(0.723 0.219 149.579)',
      ],
    },
    dark: {
      primary: 'oklch(0.746 0.183 293.541)',
      primaryForeground: 'oklch(0.208 0.042 265.755)',
      accent: 'oklch(0.777 0.152 194.769)',
      accentForeground: 'oklch(0.208 0.042 265.755)',
      secondary: 'oklch(0.279 0.041 293.009)',
      secondaryForeground: 'oklch(0.984 0.003 247.858)',
      muted: 'oklch(0.279 0.041 293.009)',
      mutedForeground: 'oklch(0.704 0.04 293.009)',
      ring: 'oklch(0.746 0.183 293.541)',
      chart: [
        'oklch(0.746 0.183 293.541)',
        'oklch(0.777 0.152 194.769)',
        'oklch(0.756 0.177 354.308)',
        'oklch(0.727 0.183 303.9)',
        'oklch(0.823 0.159 149.579)',
      ],
    },
  },

  // 2. Ember - Warm campfire glow
  {
    id: 'ember',
    name: 'Ember',
    emoji: '🔥',
    description: 'Warm & Bold',
    category: 'warm',
    light: {
      primary: 'oklch(0.577 0.245 27.325)',
      primaryForeground: 'oklch(0.984 0.003 247.858)',
      accent: 'oklch(0.769 0.188 70.08)',
      accentForeground: 'oklch(0.208 0.042 265.755)',
      secondary: 'oklch(0.951 0.026 27.325)',
      secondaryForeground: 'oklch(0.577 0.245 27.325)',
      muted: 'oklch(0.951 0.026 27.325)',
      mutedForeground: 'oklch(0.552 0.016 27.325)',
      ring: 'oklch(0.677 0.245 27.325)',
      chart: [
        'oklch(0.577 0.245 27.325)',
        'oklch(0.769 0.188 70.08)',
        'oklch(0.695 0.217 50.745)',
        'oklch(0.476 0.114 37.568)',
        'oklch(0.627 0.258 27.325)',
      ],
    },
    dark: {
      primary: 'oklch(0.704 0.191 22.216)',
      primaryForeground: 'oklch(0.208 0.042 265.755)',
      accent: 'oklch(0.828 0.189 84.429)',
      accentForeground: 'oklch(0.208 0.042 265.755)',
      secondary: 'oklch(0.279 0.041 27.325)',
      secondaryForeground: 'oklch(0.984 0.003 247.858)',
      muted: 'oklch(0.279 0.041 27.325)',
      mutedForeground: 'oklch(0.704 0.04 27.325)',
      ring: 'oklch(0.704 0.191 22.216)',
      chart: [
        'oklch(0.704 0.191 22.216)',
        'oklch(0.828 0.189 84.429)',
        'oklch(0.795 0.177 50.745)',
        'oklch(0.676 0.114 37.568)',
        'oklch(0.727 0.198 27.325)',
      ],
    },
  },

  // 3. Glacier - Crystal clear ice
  {
    id: 'glacier',
    name: 'Glacier',
    emoji: '🧊',
    description: 'Clean & Fresh',
    category: 'cool',
    light: {
      primary: 'oklch(0.606 0.166 254.604)',
      primaryForeground: 'oklch(0.984 0.003 247.858)',
      accent: 'oklch(0.929 0.013 255.508)',
      accentForeground: 'oklch(0.208 0.042 265.755)',
      secondary: 'oklch(0.951 0.026 254.604)',
      secondaryForeground: 'oklch(0.606 0.166 254.604)',
      muted: 'oklch(0.951 0.026 254.604)',
      mutedForeground: 'oklch(0.552 0.016 254.604)',
      ring: 'oklch(0.706 0.166 254.604)',
      chart: [
        'oklch(0.606 0.166 254.604)',
        'oklch(0.685 0.169 195.769)',
        'oklch(0.541 0.158 254.604)',
        'oklch(0.777 0.152 194.769)',
        'oklch(0.648 0.182 244.604)',
      ],
    },
    dark: {
      primary: 'oklch(0.746 0.160 237.323)',
      primaryForeground: 'oklch(0.208 0.042 265.755)',
      accent: 'oklch(0.809 0.105 230.318)',
      accentForeground: 'oklch(0.208 0.042 265.755)',
      secondary: 'oklch(0.279 0.041 254.604)',
      secondaryForeground: 'oklch(0.984 0.003 247.858)',
      muted: 'oklch(0.279 0.041 254.604)',
      mutedForeground: 'oklch(0.704 0.04 254.604)',
      ring: 'oklch(0.746 0.160 237.323)',
      chart: [
        'oklch(0.746 0.160 237.323)',
        'oklch(0.777 0.152 194.769)',
        'oklch(0.641 0.158 254.604)',
        'oklch(0.877 0.102 194.769)',
        'oklch(0.748 0.142 244.604)',
      ],
    },
  },

  // 4. Sakura - Japanese cherry blossom
  {
    id: 'sakura',
    name: 'Sakura',
    emoji: '🌸',
    description: 'Elegant & Soft',
    category: 'warm',
    light: {
      primary: 'oklch(0.597 0.237 354.308)',
      primaryForeground: 'oklch(0.984 0.003 247.858)',
      accent: 'oklch(0.948 0.044 352.308)',
      accentForeground: 'oklch(0.208 0.042 265.755)',
      secondary: 'oklch(0.951 0.026 354.308)',
      secondaryForeground: 'oklch(0.597 0.237 354.308)',
      muted: 'oklch(0.951 0.026 354.308)',
      mutedForeground: 'oklch(0.552 0.016 354.308)',
      ring: 'oklch(0.697 0.237 354.308)',
      chart: [
        'oklch(0.597 0.237 354.308)',
        'oklch(0.648 0.249 349.705)',
        'oklch(0.723 0.219 149.579)',
        'oklch(0.746 0.177 354.308)',
        'oklch(0.541 0.281 293.009)',
      ],
    },
    dark: {
      primary: 'oklch(0.756 0.177 354.308)',
      primaryForeground: 'oklch(0.208 0.042 265.755)',
      accent: 'oklch(0.898 0.082 352.308)',
      accentForeground: 'oklch(0.208 0.042 265.755)',
      secondary: 'oklch(0.279 0.041 354.308)',
      secondaryForeground: 'oklch(0.984 0.003 247.858)',
      muted: 'oklch(0.279 0.041 354.308)',
      mutedForeground: 'oklch(0.704 0.04 354.308)',
      ring: 'oklch(0.756 0.177 354.308)',
      chart: [
        'oklch(0.756 0.177 354.308)',
        'oklch(0.748 0.189 349.705)',
        'oklch(0.823 0.159 149.579)',
        'oklch(0.846 0.117 354.308)',
        'oklch(0.641 0.221 293.009)',
      ],
    },
  },

  // 5. Obsidian - Volcanic glass with gold
  {
    id: 'obsidian',
    name: 'Obsidian',
    emoji: '🖤',
    description: 'Luxurious & Premium',
    category: 'neutral',
    light: {
      primary: 'oklch(0.279 0.041 260.031)',
      primaryForeground: 'oklch(0.984 0.003 247.858)',
      accent: 'oklch(0.695 0.165 85.587)',
      accentForeground: 'oklch(0.208 0.042 265.755)',
      secondary: 'oklch(0.928 0.006 264.695)',
      secondaryForeground: 'oklch(0.279 0.041 260.031)',
      muted: 'oklch(0.928 0.006 264.695)',
      mutedForeground: 'oklch(0.554 0.046 257.417)',
      ring: 'oklch(0.695 0.165 85.587)',
      chart: [
        'oklch(0.279 0.041 260.031)',
        'oklch(0.695 0.165 85.587)',
        'oklch(0.446 0.043 257.417)',
        'oklch(0.769 0.188 70.08)',
        'oklch(0.554 0.046 257.417)',
      ],
    },
    dark: {
      primary: 'oklch(0.554 0.046 257.417)',
      primaryForeground: 'oklch(0.984 0.003 247.858)',
      accent: 'oklch(0.795 0.184 86.047)',
      accentForeground: 'oklch(0.208 0.042 265.755)',
      secondary: 'oklch(0.279 0.041 260.031)',
      secondaryForeground: 'oklch(0.984 0.003 247.858)',
      muted: 'oklch(0.279 0.041 260.031)',
      mutedForeground: 'oklch(0.704 0.04 256.788)',
      ring: 'oklch(0.795 0.184 86.047)',
      chart: [
        'oklch(0.554 0.046 257.417)',
        'oklch(0.795 0.184 86.047)',
        'oklch(0.646 0.043 257.417)',
        'oklch(0.869 0.148 70.08)',
        'oklch(0.754 0.046 257.417)',
      ],
    },
  },

  // 6. Jade - Ancient Chinese jade
  {
    id: 'jade',
    name: 'Jade',
    emoji: '💎',
    description: 'Wise & Balanced',
    category: 'cool',
    light: {
      primary: 'oklch(0.527 0.154 163.225)',
      primaryForeground: 'oklch(0.984 0.003 247.858)',
      accent: 'oklch(0.695 0.217 50.745)',
      accentForeground: 'oklch(0.984 0.003 247.858)',
      secondary: 'oklch(0.951 0.026 163.225)',
      secondaryForeground: 'oklch(0.527 0.154 163.225)',
      muted: 'oklch(0.951 0.026 163.225)',
      mutedForeground: 'oklch(0.552 0.016 163.225)',
      ring: 'oklch(0.627 0.154 163.225)',
      chart: [
        'oklch(0.527 0.154 163.225)',
        'oklch(0.695 0.217 50.745)',
        'oklch(0.663 0.190 162.945)',
        'oklch(0.769 0.188 70.08)',
        'oklch(0.696 0.17 162.48)',
      ],
    },
    dark: {
      primary: 'oklch(0.696 0.17 162.48)',
      primaryForeground: 'oklch(0.208 0.042 265.755)',
      accent: 'oklch(0.769 0.188 70.08)',
      accentForeground: 'oklch(0.208 0.042 265.755)',
      secondary: 'oklch(0.279 0.041 163.225)',
      secondaryForeground: 'oklch(0.984 0.003 247.858)',
      muted: 'oklch(0.279 0.041 163.225)',
      mutedForeground: 'oklch(0.704 0.04 163.225)',
      ring: 'oklch(0.696 0.17 162.48)',
      chart: [
        'oklch(0.696 0.17 162.48)',
        'oklch(0.869 0.148 70.08)',
        'oklch(0.763 0.150 162.945)',
        'oklch(0.869 0.148 70.08)',
        'oklch(0.796 0.13 162.48)',
      ],
    },
  },

  // 7. Dusk - Twilight between day and night
  {
    id: 'dusk',
    name: 'Dusk',
    emoji: '🌅',
    description: 'Dreamy & Creative',
    category: 'vibrant',
    light: {
      primary: 'oklch(0.541 0.281 293.009)',
      primaryForeground: 'oklch(0.984 0.003 247.858)',
      accent: 'oklch(0.716 0.209 41.292)',
      accentForeground: 'oklch(0.984 0.003 247.858)',
      secondary: 'oklch(0.951 0.026 293.009)',
      secondaryForeground: 'oklch(0.541 0.281 293.009)',
      muted: 'oklch(0.951 0.026 293.009)',
      mutedForeground: 'oklch(0.552 0.016 293.009)',
      ring: 'oklch(0.641 0.281 293.009)',
      chart: [
        'oklch(0.541 0.281 293.009)',
        'oklch(0.716 0.209 41.292)',
        'oklch(0.550 0.240 280.321)',
        'oklch(0.769 0.188 70.08)',
        'oklch(0.627 0.265 303.9)',
      ],
    },
    dark: {
      primary: 'oklch(0.746 0.183 293.541)',
      primaryForeground: 'oklch(0.208 0.042 265.755)',
      accent: 'oklch(0.802 0.174 49.746)',
      accentForeground: 'oklch(0.208 0.042 265.755)',
      secondary: 'oklch(0.279 0.041 293.009)',
      secondaryForeground: 'oklch(0.984 0.003 247.858)',
      muted: 'oklch(0.279 0.041 293.009)',
      mutedForeground: 'oklch(0.704 0.04 293.009)',
      ring: 'oklch(0.746 0.183 293.541)',
      chart: [
        'oklch(0.746 0.183 293.541)',
        'oklch(0.802 0.174 49.746)',
        'oklch(0.650 0.200 280.321)',
        'oklch(0.869 0.148 70.08)',
        'oklch(0.727 0.205 303.9)',
      ],
    },
  },

  // 8. Copper - Industrial steampunk
  {
    id: 'copper',
    name: 'Copper',
    emoji: '⚙️',
    description: 'Industrial & Authentic',
    category: 'warm',
    light: {
      primary: 'oklch(0.577 0.195 38.404)',
      primaryForeground: 'oklch(0.984 0.003 247.858)',
      accent: 'oklch(0.553 0.013 257.417)',
      accentForeground: 'oklch(0.984 0.003 247.858)',
      secondary: 'oklch(0.951 0.026 38.404)',
      secondaryForeground: 'oklch(0.577 0.195 38.404)',
      muted: 'oklch(0.951 0.026 38.404)',
      mutedForeground: 'oklch(0.552 0.016 38.404)',
      ring: 'oklch(0.677 0.195 38.404)',
      chart: [
        'oklch(0.577 0.195 38.404)',
        'oklch(0.553 0.013 257.417)',
        'oklch(0.695 0.217 50.745)',
        'oklch(0.653 0.013 257.417)',
        'oklch(0.716 0.209 41.292)',
      ],
    },
    dark: {
      primary: 'oklch(0.802 0.174 49.746)',
      primaryForeground: 'oklch(0.208 0.042 265.755)',
      accent: 'oklch(0.716 0.013 257.417)',
      accentForeground: 'oklch(0.208 0.042 265.755)',
      secondary: 'oklch(0.279 0.041 38.404)',
      secondaryForeground: 'oklch(0.984 0.003 247.858)',
      muted: 'oklch(0.279 0.041 38.404)',
      mutedForeground: 'oklch(0.704 0.04 38.404)',
      ring: 'oklch(0.802 0.174 49.746)',
      chart: [
        'oklch(0.802 0.174 49.746)',
        'oklch(0.716 0.013 257.417)',
        'oklch(0.795 0.177 50.745)',
        'oklch(0.816 0.013 257.417)',
        'oklch(0.876 0.139 49.746)',
      ],
    },
  },

  // 9. Mint - Fresh morning dew
  {
    id: 'mint',
    name: 'Mint',
    emoji: '🌿',
    description: 'Fresh & Natural',
    category: 'cool',
    light: {
      primary: 'oklch(0.585 0.166 163.225)',
      primaryForeground: 'oklch(0.984 0.003 247.858)',
      accent: 'oklch(0.676 0.155 192.456)',
      accentForeground: 'oklch(0.984 0.003 247.858)',
      secondary: 'oklch(0.951 0.026 163.225)',
      secondaryForeground: 'oklch(0.585 0.166 163.225)',
      muted: 'oklch(0.951 0.026 163.225)',
      mutedForeground: 'oklch(0.552 0.016 163.225)',
      ring: 'oklch(0.685 0.166 163.225)',
      chart: [
        'oklch(0.585 0.166 163.225)',
        'oklch(0.676 0.155 192.456)',
        'oklch(0.696 0.17 162.48)',
        'oklch(0.777 0.152 194.769)',
        'oklch(0.763 0.150 162.945)',
      ],
    },
    dark: {
      primary: 'oklch(0.765 0.166 163.225)',
      primaryForeground: 'oklch(0.208 0.042 265.755)',
      accent: 'oklch(0.809 0.128 192.456)',
      accentForeground: 'oklch(0.208 0.042 265.755)',
      secondary: 'oklch(0.279 0.041 163.225)',
      secondaryForeground: 'oklch(0.984 0.003 247.858)',
      muted: 'oklch(0.279 0.041 163.225)',
      mutedForeground: 'oklch(0.704 0.04 163.225)',
      ring: 'oklch(0.765 0.166 163.225)',
      chart: [
        'oklch(0.765 0.166 163.225)',
        'oklch(0.809 0.128 192.456)',
        'oklch(0.796 0.13 162.48)',
        'oklch(0.877 0.102 194.769)',
        'oklch(0.863 0.110 162.945)',
      ],
    },
  },

  // 10. Cosmos - Deep space galaxies
  {
    id: 'cosmos',
    name: 'Cosmos',
    emoji: '🌌',
    description: 'Mysterious & Tech',
    category: 'vibrant',
    light: {
      primary: 'oklch(0.550 0.240 280.321)',
      primaryForeground: 'oklch(0.984 0.003 247.858)',
      accent: 'oklch(0.541 0.281 293.009)',
      accentForeground: 'oklch(0.984 0.003 247.858)',
      secondary: 'oklch(0.951 0.026 280.321)',
      secondaryForeground: 'oklch(0.550 0.240 280.321)',
      muted: 'oklch(0.951 0.026 280.321)',
      mutedForeground: 'oklch(0.552 0.016 280.321)',
      ring: 'oklch(0.650 0.240 280.321)',
      chart: [
        'oklch(0.550 0.240 280.321)',
        'oklch(0.541 0.281 293.009)',
        'oklch(0.608 0.214 259.815)',
        'oklch(0.627 0.265 303.9)',
        'oklch(0.488 0.243 264.376)',
      ],
    },
    dark: {
      primary: 'oklch(0.707 0.165 278.321)',
      primaryForeground: 'oklch(0.208 0.042 265.755)',
      accent: 'oklch(0.746 0.183 293.541)',
      accentForeground: 'oklch(0.208 0.042 265.755)',
      secondary: 'oklch(0.279 0.041 280.321)',
      secondaryForeground: 'oklch(0.984 0.003 247.858)',
      muted: 'oklch(0.279 0.041 280.321)',
      mutedForeground: 'oklch(0.704 0.04 280.321)',
      ring: 'oklch(0.707 0.165 278.321)',
      chart: [
        'oklch(0.707 0.165 278.321)',
        'oklch(0.746 0.183 293.541)',
        'oklch(0.708 0.174 259.815)',
        'oklch(0.827 0.165 303.9)',
        'oklch(0.688 0.183 264.376)',
      ],
    },
  },

  // 11. Sand - Desert dunes at golden hour
  {
    id: 'sand',
    name: 'Sand',
    emoji: '🏜️',
    description: 'Warm & Timeless',
    category: 'warm',
    light: {
      primary: 'oklch(0.629 0.151 78.604)',
      primaryForeground: 'oklch(0.984 0.003 247.858)',
      accent: 'oklch(0.531 0.126 78.604)',
      accentForeground: 'oklch(0.984 0.003 247.858)',
      secondary: 'oklch(0.951 0.026 78.604)',
      secondaryForeground: 'oklch(0.629 0.151 78.604)',
      muted: 'oklch(0.951 0.026 78.604)',
      mutedForeground: 'oklch(0.552 0.016 78.604)',
      ring: 'oklch(0.729 0.151 78.604)',
      chart: [
        'oklch(0.629 0.151 78.604)',
        'oklch(0.531 0.126 78.604)',
        'oklch(0.695 0.165 85.587)',
        'oklch(0.769 0.188 70.08)',
        'oklch(0.695 0.217 50.745)',
      ],
    },
    dark: {
      primary: 'oklch(0.828 0.189 84.429)',
      primaryForeground: 'oklch(0.208 0.042 265.755)',
      accent: 'oklch(0.731 0.177 55.746)',
      accentForeground: 'oklch(0.208 0.042 265.755)',
      secondary: 'oklch(0.279 0.041 78.604)',
      secondaryForeground: 'oklch(0.984 0.003 247.858)',
      muted: 'oklch(0.279 0.041 78.604)',
      mutedForeground: 'oklch(0.704 0.04 78.604)',
      ring: 'oklch(0.828 0.189 84.429)',
      chart: [
        'oklch(0.828 0.189 84.429)',
        'oklch(0.731 0.177 55.746)',
        'oklch(0.795 0.135 85.587)',
        'oklch(0.869 0.148 70.08)',
        'oklch(0.795 0.177 50.745)',
      ],
    },
  },

  // 12. Graphite - Minimal architect sketch
  {
    id: 'graphite',
    name: 'Graphite',
    emoji: '✏️',
    description: 'Minimal & Focused',
    category: 'neutral',
    light: {
      primary: 'oklch(0.446 0.043 257.417)',
      primaryForeground: 'oklch(0.984 0.003 247.858)',
      accent: 'oklch(0.554 0.046 257.417)',
      accentForeground: 'oklch(0.984 0.003 247.858)',
      secondary: 'oklch(0.928 0.006 264.695)',
      secondaryForeground: 'oklch(0.446 0.043 257.417)',
      muted: 'oklch(0.928 0.006 264.695)',
      mutedForeground: 'oklch(0.554 0.046 257.417)',
      ring: 'oklch(0.554 0.046 257.417)',
      chart: [
        'oklch(0.446 0.043 257.417)',
        'oklch(0.554 0.046 257.417)',
        'oklch(0.279 0.041 260.031)',
        'oklch(0.646 0.043 257.417)',
        'oklch(0.370 0.043 257.417)',
      ],
    },
    dark: {
      primary: 'oklch(0.704 0.04 256.788)',
      primaryForeground: 'oklch(0.208 0.042 265.755)',
      accent: 'oklch(0.869 0.022 264.695)',
      accentForeground: 'oklch(0.208 0.042 265.755)',
      secondary: 'oklch(0.279 0.041 260.031)',
      secondaryForeground: 'oklch(0.984 0.003 247.858)',
      muted: 'oklch(0.279 0.041 260.031)',
      mutedForeground: 'oklch(0.704 0.04 256.788)',
      ring: 'oklch(0.704 0.04 256.788)',
      chart: [
        'oklch(0.704 0.04 256.788)',
        'oklch(0.869 0.022 264.695)',
        'oklch(0.479 0.041 260.031)',
        'oklch(0.929 0.013 264.695)',
        'oklch(0.570 0.04 256.788)',
      ],
    },
  },
]

/**
 * Default palette ID
 */
export const DEFAULT_PALETTE_ID = 'ember'

/**
 * Get palette by ID
 */
export function getPaletteById(id: string): ColorPalette | undefined {
  return colorPalettes.find((p) => p.id === id)
}

/**
 * Get palettes by category
 */
export function getPalettesByCategory(category: PaletteCategory): ColorPalette[] {
  return colorPalettes.filter((p) => p.category === category)
}

/**
 * Get palette categories with counts
 */
export function getPaletteCategories(): { category: PaletteCategory; count: number }[] {
  const categories: PaletteCategory[] = ['vibrant', 'warm', 'cool', 'neutral']
  return categories.map((category) => ({
    category,
    count: colorPalettes.filter((p) => p.category === category).length,
  }))
}
