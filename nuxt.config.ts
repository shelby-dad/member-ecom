// https://nuxt.com/docs/api/configuration/nuxt-config
// Supabase module expects SUPABASE_SERVICE_KEY; map from our preferred env name
if (process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_KEY) {
  process.env.SUPABASE_SERVICE_KEY = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY
}
if (process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_KEY) {
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
}

export default defineNuxtConfig({
  srcDir: 'app/',

  compatibilityDate: '2025-03-14',

  runtimeConfig: {
    // Server-only (never exposed to client)
    supabaseServiceRoleKey: '',
    // Public (exposed via NUXT_PUBLIC_* or SUPABASE_URL for image URLs)
    public: {
      appEnv: 'development',
      supabaseUrl: process.env.SUPABASE_URL ?? '',
      supabaseAnonKey: '',
      appUrl: '',
    },
  },

  modules: ['@nuxtjs/supabase'],

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    redirect: false,
    redirectOptions: {
      login: '/auth/login',
      callback: '/auth/callback',
      exclude: ['/', '/auth/*'],
    },
  },

  css: [
    '~/assets/scss/main.scss',
  ],

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/scss/tokens/_index.scss" as *;',
        },
      },
    },
  },

  build: {
    transpile: ['vuetify'],
  },

  typescript: {
    strict: true,
    // Disable in-dev type check to avoid vite-plugin-checker / vue-tsc path issues with pnpm; use `pnpm typecheck` instead.
    typeCheck: false,
  },

  nitro: {
    routeRules: {
      '/**': {
        headers: {
          'X-Frame-Options': 'SAMEORIGIN',
          'X-Content-Type-Options': 'nosniff',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
      },
    },
  },

  devtools: { enabled: true },
})
