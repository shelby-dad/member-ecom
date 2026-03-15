import { useTheme } from 'vuetify'
import { resolveThemeName, type ThemeMode } from '~/composables/themeMode'

const COOKIE_NAME = 'app-theme'

export function useThemeMode() {
  const themeCookie = useCookie<ThemeMode>(COOKIE_NAME, { default: () => 'light' })
  const colorMode = useState<ThemeMode>('theme-mode', () => themeCookie.value ?? 'light')
  const hasMounted = useState('theme-mounted', () => false)
  const vuetifyTheme = useTheme()

  function prefersDark(): boolean {
    if (import.meta.client && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      return true
    return false
  }

  function resolveTheme(): 'light' | 'dark' {
    return resolveThemeName(colorMode.value, hasMounted.value, prefersDark())
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
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      const onChange = () => {
        if (colorMode.value === 'system')
          applyTheme(resolveTheme())
      }
      media.addEventListener('change', onChange)
      onBeforeUnmount(() => media.removeEventListener('change', onChange))
    })
  }

  watch(() => resolveTheme(), (name) => applyTheme(name), { immediate: true })

  return {
    colorMode: readonly(colorMode),
    setMode,
    resolvedTheme: computed(() => resolveTheme()),
  }
}
