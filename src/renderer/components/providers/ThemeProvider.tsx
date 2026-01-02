import React, { createContext, useContext, useEffect, useState } from "react"

export type Theme = "dark" | "light" | "system"
export type AccentColor = "violet" | "blue" | "green" | "orange" | "pink" | "red"

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  defaultAccentColor?: AccentColor
  initialAccentColor?: AccentColor
  storageKey?: string
}

interface ThemeProviderState {
  theme: Theme
  accentColor: AccentColor
  setTheme: (theme: Theme) => void
  setAccentColor: (color: AccentColor) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  accentColor: "violet",
  setTheme: () => null,
  setAccentColor: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

// HSL values for accent colors
const ACCENT_COLOR_HSL: Record<AccentColor, string> = {
  violet: "258 90% 66%",  // #8B5CF6
  blue: "221 83% 53%",    // #3B82F6
  green: "142 71% 45%",   // #22C55E
  orange: "25 95% 53%",   // #F97316
  pink: "330 81% 60%",    // #EC4899
  red: "0 84% 60%",       // #EF4444
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = "system",
  defaultAccentColor = "violet",
  storageKey = "easyscribe-ui-theme",
  ...props
}) => {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )
  const [accentColor, setAccentColor] = useState<AccentColor>(defaultAccentColor)

  // Read accent color from settings storage
  useEffect(() => {
    const settingsData = localStorage.getItem('easyscribe-settings-storage')
    if (settingsData) {
      try {
        const parsed = JSON.parse(settingsData)
        const savedAccentColor = parsed.state?.settings?.accentColor
        if (savedAccentColor && savedAccentColor !== accentColor) {
          setAccentColor(savedAccentColor)
        }
      } catch {
        // Ignore errors
      }
    }
  }, [])

  // Apply theme to DOM
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  // Apply accent color to DOM
  useEffect(() => {
    const root = window.document.documentElement
    const hslValue = ACCENT_COLOR_HSL[accentColor]
    root.style.setProperty("--primary", hslValue)
    root.style.setProperty("--ring", hslValue)
  }, [accentColor])

  const value = {
    theme,
    accentColor,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
    setAccentColor: (color: AccentColor) => {
      setAccentColor(color)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
