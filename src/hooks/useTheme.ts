import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("app-theme") as Theme;
    return saved || "system";
  });

  useEffect(() => {
    localStorage.setItem("app-theme", theme);

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const listener = (e: MediaQueryListEvent) => {
        // Frozen: ignore OS theme changes
      };
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
    
    // Forced Light Mode (Dark mode frozen during redesign)
    root.classList.add("light");
  }, [theme]);

  return { theme, setTheme };
}
