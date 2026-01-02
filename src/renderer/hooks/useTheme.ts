import { useTheme as useThemeContext } from "@/components/providers/ThemeProvider"

export { useTheme as useThemeContext }
export type { Theme, AccentColor } from "@/components/providers/ThemeProvider"

export const useTheme = () => {
  const { theme, accentColor, setTheme, setAccentColor } = useThemeContext()

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark")
    } else if (theme === "dark") {
      setTheme("system")
    } else {
      setTheme("light")
    }
  }

  return {
    theme,
    accentColor,
    setTheme,
    setAccentColor,
    toggleTheme,
  }
}
