import { Toaster as Sonner, ToasterProps } from "sonner"

import { useThemeContext } from "@/contexts/ThemeContext"

const Toaster = ({ ...props }: ToasterProps) => {
  // Follows the app's own theme, not next-themes — this project never mounts one.
  const { theme } = useThemeContext()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
