export type ThemeMode = 'light' | 'dark' | 'system'

export function resolveThemeName(mode: ThemeMode, hasMounted: boolean, prefersDark: boolean): 'light' | 'dark' {
  if (mode === 'dark') return 'dark'
  if (mode === 'light') return 'light'
  if (!hasMounted) return 'light'
  return prefersDark ? 'dark' : 'light'
}
