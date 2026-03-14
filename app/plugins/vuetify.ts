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
            primary: '#1976d2',
            secondary: '#424242',
            accent: '#82b1ff',
            error: '#ff5252',
            info: '#2196f3',
            success: '#4caf50',
            warning: '#ffc107',
          },
        },
        dark: {
          dark: true,
          colors: {
            primary: '#90caf9',
            secondary: '#b0bec5',
            accent: '#82b1ff',
            error: '#ff5252',
            info: '#2196f3',
            success: '#4caf50',
            warning: '#ffc107',
          },
        },
      },
    },
  })
  nuxtApp.vueApp.use(vuetify)
})
