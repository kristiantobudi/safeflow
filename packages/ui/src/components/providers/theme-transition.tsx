"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeTransition() {
  const { theme } = useTheme();
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
    const timeout = setTimeout(() => setShow(false), 400);
    return () => clearTimeout(timeout);
  }, [theme]);

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-50 transition-opacity duration-500
      ${show ? "opacity-100" : "opacity-0"}
      bg-background`}
    />
  );
}
