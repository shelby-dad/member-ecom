import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'

export default defineNuxtPlugin((nuxtApp) => {
  const themeCookie = useCookie<string>('app-theme')
  const cookieTheme = themeCookie.value
  const defaultTheme = (cookieTheme === 'dark' || cookieTheme === 'light') ? cookieTheme : 'light'

  const vuetify = createVuetify({
    ssr: true,
    components,
    directives,
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: {
        mdi,
      },
    },
    theme: {
      defaultTheme,
      themes: {
        light: {
          dark: false,
          colors: {
            primary: '#0f6fff',
            secondary: '#0e7490',
            accent: '#0ea5e9',
            error: '#dc2626',
            info: '#2563eb',
            success: '#15803d',
            warning: '#d97706',
            background: '#f3f6fb',
            surface: '#ffffff',
          },
        },
        dark: {
          dark: true,
          colors: {
            primary: '#60a5fa',
            secondary: '#22d3ee',
            accent: '#38bdf8',
            error: '#f87171',
            info: '#60a5fa',
            success: '#4ade80',
            warning: '#fbbf24',
            background: '#090f1f',
            surface: '#101a2e',
          },
        },
      },
    },
  })
  nuxtApp.vueApp.use(vuetify)
})
