"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const handleClick = () => {
    console.log("Theme toggle clicked, current:", theme);
    toggleTheme();
  };

  return (
    <button
      onClick={handleClick}
      className="p-2 rounded-md hover:bg-accent transition-colors"
      aria-label="Toggle theme"
      title={`Current theme: ${theme}. Click to toggle.`}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-foreground" />
      ) : (
        <Moon className="h-5 w-5 text-foreground" />
      )}
    </button>
  );
}