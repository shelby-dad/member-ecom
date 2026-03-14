<template>
  <div class="app-container app-section">
    <v-card max-width="400" class="mx-auto">
      <v-card-title class="text-h5">
        Sign in
      </v-card-title>
      <v-card-text>
        <v-btn
          color="primary"
          variant="outlined"
          block
          class="mb-3"
          :loading="loadingGoogle"
          @click="signInWithGoogle"
        >
          <v-icon start>
            mdi-google
          </v-icon>
          Continue with Google
        </v-btn>
        <v-divider class="my-4" />
        <v-form @submit.prevent="signIn">
          <v-text-field
            v-model="email"
            label="Email"
            type="email"
            variant="outlined"
            density="comfortable"
            autocomplete="email"
            class="mb-2"
          />
          <v-text-field
            v-model="password"
            label="Password"
            type="password"
            variant="outlined"
            density="comfortable"
            autocomplete="current-password"
            class="mb-2"
          />
          <v-btn
            type="submit"
            color="primary"
            block
            :loading="loading"
          >
            Sign in with email
          </v-btn>
        </v-form>
        <p v-if="error" class="text-error mt-2 text-caption">
          {{ error }}
        </p>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', auth: false })

const email = ref('')
const password = ref('')
const loading = ref(false)
const loadingGoogle = ref(false)
const error = ref('')

const supabase = useSupabaseClient()
const config = useRuntimeConfig()

const { fetchProfile } = useProfile()

function getRedirectUrl() {
  const base = config.public.appUrl || (import.meta.client ? window.location.origin : '')
  return `${base}/auth/callback`
}

async function signInWithGoogle() {
  error.value = ''
  loadingGoogle.value = true
  try {
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getRedirectUrl(),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (err)
      throw err
    // Redirect is handled by Supabase; we only get here if something went wrong
  }
  catch (e: any) {
    error.value = e?.message ?? 'Google sign in failed'
  }
  finally {
    loadingGoogle.value = false
  }
}

async function signIn() {
  error.value = ''
  loading.value = true
  try {
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value })
    if (err)
      throw err
    const profile = await fetchProfile()
    const home = profile?.role === 'superadmin' ? '/superadmin' : profile?.role === 'admin' ? '/admin' : profile?.role === 'staff' ? '/staff' : '/member'
    await navigateTo(home)
  }
  catch (e: any) {
    error.value = e?.message ?? 'Sign in failed'
  }
  finally {
    loading.value = false
  }
}
</script>
