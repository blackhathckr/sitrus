/**
 * Application Providers
 *
 * Wraps the application with necessary providers:
 * - NextAuth SessionProvider
 * - ThemeProvider for dark/light mode
 * - ColorThemeProvider for 12 palettes + 4 depth levels
 * - FontProvider for 12 font families
 * - Sonner Toast Provider
 */

'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { ColorThemeProvider } from '@/components/providers/color-theme-provider';
import { FontProvider } from '@/components/providers/font-provider';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Providers Component
 *
 * Provides authentication, theming, and toast notifications context to the application
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <ColorThemeProvider defaultPalette="ember">
          <FontProvider>
            {children}
            <Toaster
              position="top-right"
              expand={false}
              richColors
              closeButton
              duration={4000}
            />
          </FontProvider>
        </ColorThemeProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
