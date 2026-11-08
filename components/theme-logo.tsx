"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const MQ = "(prefers-color-scheme: dark)";

function resolved(): Theme {
  if (typeof window === "undefined") return "light";
  const attr = document.documentElement.dataset.theme;
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia(MQ).matches ? "dark" : "light";
}

/** Tracks the effective theme: explicit data-theme wins, otherwise the system setting. */
export function useResolvedTheme(): Theme {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(resolved());
    const mq = window.matchMedia(MQ);
    const onMedia = () => setTheme(resolved());
    const observer = new MutationObserver(() => setTheme(resolved()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    mq.addEventListener("change", onMedia);
    return () => {
      observer.disconnect();
      mq.removeEventListener("change", onMedia);
    };
  }, []);

  return theme;
}

/**
 * Brand lockup. The delivered assets carry the exact page background
 * (#F4F1EA light / #0D111E dark) rather than transparency, so the correct
 * variant must be used per theme or a seam shows.
 */
export default function ThemeLogo({
  variant = "full",
  className = "",
  priority = false,
}: {
  variant?: "symbol" | "full";
  className?: string;
  priority?: boolean;
}) {
  const theme = useResolvedTheme();
  // Delivered files are named napkin-logo-*-bg.png (full lockup) and
  // napkin-symbol-*-bg.png (mark only).
  const fileBase = variant === "full" ? "logo" : "symbol";
  const src = `/brand/napkin-${fileBase}-${theme === "dark" ? "dark" : "light"}-bg.png`;
  const width = variant === "full" ? 911 : 1536;
  const height = variant === "full" ? 374 : 1536;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={width}
      height={height}
      alt="Napkin"
      className={className}
      decoding="async"
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );
}
