import { useTheme as useThemeContext } from "@/components/providers/ThemeProvider"

export { useTheme as useThemeContext }
export type { Theme } from "@/components/providers/ThemeProvider"

export const useTheme = () => {
  const { theme, setTheme } = useThemeContext()

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
    setTheme,
    toggleTheme,
  }
}
