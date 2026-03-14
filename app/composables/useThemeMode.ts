import { useTheme } from 'vuetify'

type ThemeMode = 'light' | 'dark' | 'system'

const COOKIE_NAME = 'app-theme'

export function useThemeMode() {
  const themeCookie = useCookie<ThemeMode>(COOKIE_NAME, { default: () => 'light' })
  const colorMode = useState<ThemeMode>('theme-mode', () => themeCookie.value ?? 'light')
  const hasMounted = useState('theme-mounted', () => false)
  const vuetifyTheme = useTheme()

  function getSystemTheme(): 'light' | 'dark' {
    if (import.meta.client && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      return 'dark'
    return 'light'
  }

  function resolveTheme(): string {
    const mode = colorMode.value
    if (mode === 'dark') return 'dark'
    if (mode === 'light') return 'light'
    if (!hasMounted.value)
      return 'light'
    return getSystemTheme()
  }

  function applyTheme(theme: string) {
    vuetifyTheme.change(theme)
  }

  function setMode(mode: ThemeMode) {
    colorMode.value = mode
    themeCookie.value = mode
    applyTheme(resolveTheme())
  }

  if (import.meta.client) {
    onMounted(() => {
      hasMounted.value = true
      applyTheme(resolveTheme())
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (colorMode.value === 'system')
          applyTheme(getSystemTheme())
      })
    })
  }

  watch(() => resolveTheme(), (name) => applyTheme(name), { immediate: true })

  return {
    colorMode: readonly(colorMode),
    setMode,
    resolvedTheme: computed(() => resolveTheme()),
  }
}
