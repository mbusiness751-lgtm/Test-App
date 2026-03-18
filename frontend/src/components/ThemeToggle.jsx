/**
 * ThemeToggle — Ensures dark mode is always enabled.
 */

import { useEffect } from 'react';

export default function ThemeToggle() {
  useEffect(() => {
    // Ensure dark mode is always on
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }, []);

  // Component is not rendered (removed from App header)
  return null;
}
