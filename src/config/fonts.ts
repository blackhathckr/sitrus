/**
 * Font configuration for CVP Theme System
 * 12 font families for user customization
 */

export type FontConfig = {
  id: string
  name: string
  category: 'sans' | 'mono' | 'system'
  description: string
}

export const fontConfigs: FontConfig[] = [
  // Clean/Modern
  {
    id: 'inter',
    name: 'Inter',
    category: 'sans',
    description: 'Clean, modern UI font',
  },
  {
    id: 'manrope',
    name: 'Manrope',
    category: 'sans',
    description: 'Geometric, contemporary',
  },
  {
    id: 'ibm-plex-sans',
    name: 'IBM Plex Sans',
    category: 'sans',
    description: 'Scholarly, documentation',
  },
  {
    id: 'source-sans',
    name: 'Source Sans 3',
    category: 'sans',
    description: 'Adobe, research-ready',
  },
  {
    id: 'plus-jakarta',
    name: 'Plus Jakarta Sans',
    category: 'sans',
    description: 'Trendy, geometric',
  },
  {
    id: 'dm-sans',
    name: 'DM Sans',
    category: 'sans',
    description: 'Minimal, elegant',
  },
  {
    id: 'outfit',
    name: 'Outfit',
    category: 'sans',
    description: 'Fresh, modern',
  },
  {
    id: 'lato',
    name: 'Lato',
    category: 'sans',
    description: 'Warm, professional',
  },
  {
    id: 'montserrat',
    name: 'Montserrat',
    category: 'sans',
    description: 'Classic, versatile',
  },
  {
    id: 'space-grotesk',
    name: 'Space Grotesk',
    category: 'sans',
    description: 'Techy, data-friendly',
  },
  // Monospace
  {
    id: 'jetbrains-mono',
    name: 'JetBrains Mono',
    category: 'mono',
    description: 'Code, citations, DOIs',
  },
  // System
  {
    id: 'system',
    name: 'System',
    category: 'system',
    description: 'Native OS font',
  },
]

export const fonts = fontConfigs.map((f) => f.id) as readonly string[]

export const DEFAULT_FONT_ID = 'montserrat'

export const getFontById = (id: string): FontConfig | undefined =>
  fontConfigs.find((f) => f.id === id)
