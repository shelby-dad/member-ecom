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

  sourcemap: {
    server: false,
    client: false,
  },

  compatibilityDate: '2025-03-14',

  runtimeConfig: {
    // Server-only (never exposed to client)
    supabaseServiceRoleKey: '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? '',
    vapidSubject: process.env.VAPID_SUBJECT ?? '',
    cryptoKey: process.env.CRYPTO_KEY ?? '',
    supabaseManagementPat: process.env.SUPABASE_MANAGEMENT_PAT ?? '',
    supabaseOrgId: process.env.SUPABASE_ORG_ID ?? '',
    supabaseProjectRef: process.env.SUPABASE_PROJECT_REF ?? '',
    // Public (exposed via NUXT_PUBLIC_* or SUPABASE_URL for image URLs)
    public: {
      appEnv: 'development',
      supabaseUrl: process.env.SUPABASE_URL ?? '',
      supabaseAnonKey: '',
      appUrl: '',
      vapidPublicKey: process.env.NUXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? '',
    },
  },

  modules: ['@nuxtjs/supabase'],

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    useSsrCookies: true,
    cookieOptions: {
      sameSite: 'lax',
      secure: false,
      maxAge: 60 * 60 * 24 * 7,
    },
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
          'Cross-Origin-Resource-Policy': 'same-origin',
          'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
        },
      },
    },
  },

  devtools: { enabled: true },
})
