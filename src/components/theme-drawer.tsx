'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  X,
  Sun,
  Moon,
  Monitor,
  Palette,
  Type,
  Layers,
  RotateCcw,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useColorTheme, themeDepthOptions, type ThemeDepth } from '@/components/providers/color-theme-provider'
import { useFont } from '@/components/providers/font-provider'
import { colorPalettes, type ColorPalette } from '@/lib/color-palettes'
import { fontConfigs, type FontConfig } from '@/config/fonts'

interface ThemeDrawerProps {
  open: boolean
  onClose: () => void
}

/**
 * ThemeDrawer
 *
 * Full-page slide-out drawer for comprehensive theme customization.
 * Provides access to palettes, depth levels, fonts, and light/dark mode.
 */
export function ThemeDrawer({ open, onClose }: ThemeDrawerProps) {
  const { theme, setTheme } = useTheme()
  const { paletteId, depth, setPalette, setDepth, resetToDefault, isDefault } = useColorTheme()
  const { fontId, setFont, resetFont, isDefault: isFontDefault } = useFont()
  const [activeTab, setActiveTab] = useState<'palette' | 'depth' | 'font'>('palette')

  const tabs = [
    { id: 'palette' as const, label: 'Color', icon: Palette },
    { id: 'depth' as const, label: 'Depth', icon: Layers },
    { id: 'font' as const, label: 'Font', icon: Type },
  ]

  const handleReset = () => {
    resetToDefault()
    resetFont()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-border bg-background shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Customize Theme</h2>
                <p className="text-sm text-muted-foreground">
                  Personalize your experience
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="shrink-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Light/Dark Mode Toggle */}
            <div className="border-b border-border px-6 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Appearance</span>
                <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
                  <button
                    onClick={() => setTheme('light')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                      theme === 'light'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                      theme === 'dark'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </button>
                  <button
                    onClick={() => setTheme('system')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                      theme === 'system'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Monitor className="h-4 w-4" />
                    Auto
                  </button>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-border">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content - Scrollable area */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-6" style={{ maxHeight: 'calc(100vh - 280px)' }}>
              {activeTab === 'palette' && (
                <PaletteSelector
                  selectedId={paletteId}
                  onSelect={setPalette}
                />
              )}
              {activeTab === 'depth' && (
                <DepthSelector
                  selectedDepth={depth}
                  onSelect={setDepth}
                />
              )}
              {activeTab === 'font' && (
                <FontSelector
                  selectedId={fontId}
                  onSelect={setFont}
                />
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-6 py-4">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isDefault && isFontDefault}
                className="w-full gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to Defaults
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * PaletteSelector
 */
function PaletteSelector({
  selectedId,
  onSelect,
}: {
  selectedId: string
  onSelect: (id: string) => void
}) {
  // Group palettes by category
  const categories = [
    { id: 'vibrant', label: 'Vibrant' },
    { id: 'warm', label: 'Warm' },
    { id: 'cool', label: 'Cool' },
    { id: 'neutral', label: 'Neutral' },
  ] as const

  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const palettes = colorPalettes.filter((p) => p.category === category.id)
        if (palettes.length === 0) return null

        return (
          <div key={category.id}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {category.label}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {palettes.map((palette) => (
                <PaletteCard
                  key={palette.id}
                  palette={palette}
                  selected={selectedId === palette.id}
                  onSelect={() => onSelect(palette.id)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * PaletteCard
 */
function PaletteCard({
  palette,
  selected,
  onSelect,
}: {
  palette: ColorPalette
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'group relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all',
        selected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      )}
    >
      {/* Color Preview */}
      <div className="flex w-full gap-1">
        <div
          className="h-8 flex-1 rounded-l-md"
          style={{ backgroundColor: palette.light.primary }}
        />
        <div
          className="h-8 flex-1"
          style={{ backgroundColor: palette.light.accent }}
        />
        <div
          className="h-8 flex-1 rounded-r-md"
          style={{ backgroundColor: palette.light.secondary }}
        />
      </div>

      {/* Info */}
      <div className="flex w-full items-center gap-2">
        <span className="text-lg">{palette.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">
            {palette.name}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {palette.description}
          </div>
        </div>
        {selected && (
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-3 w-3" />
          </div>
        )}
      </div>
    </button>
  )
}

/**
 * DepthSelector
 */
function DepthSelector({
  selectedDepth,
  onSelect,
}: {
  selectedDepth: ThemeDepth
  onSelect: (depth: ThemeDepth) => void
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Control how much of the interface is affected by your color theme.
      </p>
      <div className="space-y-3">
        {themeDepthOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={cn(
              'flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all',
              selectedDepth === option.value
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            )}
          >
            <div className="flex-1">
              <div className="font-medium text-foreground">{option.label}</div>
              <div className="text-sm text-muted-foreground">
                {option.description}
              </div>
            </div>
            {selectedDepth === option.value && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-4 w-4" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * FontSelector
 */
function FontSelector({
  selectedId,
  onSelect,
}: {
  selectedId: string
  onSelect: (id: string) => void
}) {
  // Group fonts by category
  const categories = [
    { id: 'sans', label: 'Sans Serif' },
    { id: 'mono', label: 'Monospace' },
    { id: 'system', label: 'System' },
  ] as const

  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const fonts = fontConfigs.filter((f) => f.category === category.id)
        if (fonts.length === 0) return null

        return (
          <div key={category.id}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {category.label}
            </h3>
            <div className="space-y-2">
              {fonts.map((font) => (
                <FontCard
                  key={font.id}
                  font={font}
                  selected={selectedId === font.id}
                  onSelect={() => onSelect(font.id)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * FontCard
 */
function FontCard({
  font,
  selected,
  onSelect,
}: {
  font: FontConfig
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all',
        selected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      )}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-lg font-bold text-foreground"
        style={{ fontFamily: font.name }}
      >
        Aa
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground">{font.name}</div>
        <div className="text-sm text-muted-foreground">{font.description}</div>
      </div>
      {selected && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-4 w-4" />
        </div>
      )}
    </button>
  )
}

/**
 * ThemeDrawerTrigger
 *
 * Button to open the theme drawer
 */
export function ThemeDrawerTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      className="h-9 w-9"
      title="Customize Theme"
    >
      <Palette className="h-4 w-4" />
    </Button>
  )
}
