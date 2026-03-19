<template>
  <div class="app-container app-section">
    <v-card max-width="400" class="mx-auto">
      <v-card-title class="text-h5">
        Sign in
      </v-card-title>
      <v-card-text>
        <v-form @submit.prevent="signIn">
          <v-text-field
            v-model="identifier"
            label="Email or Phone"
            type="text"
            variant="outlined"
            density="comfortable"
            autocomplete="username"
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

const identifier = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function getErrorMessage(e: any) {
  const direct = String(e?.data?.message ?? e?.error_description ?? e?.message ?? '').trim()
  if (direct)
    return direct
  return 'Sign in failed'
}

async function signIn() {
  error.value = ''
  loading.value = true
  try {
    const resolved = await $fetch<{ email: string }>('/api/auth/resolve-identifier', {
      method: 'POST',
      body: { identifier: identifier.value },
    })
    const { data, error: err } = await supabase.auth.signInWithPassword({ email: resolved.email, password: password.value })
    if (err)
      throw err

    let resolvedUserId = data.user?.id ?? ''
    for (let attempt = 0; attempt < 20 && !resolvedUserId; attempt++) {
      const { data: sessionData } = await supabase.auth.getSession()
      const sessionUser = sessionData.session?.user ?? null
      if (sessionUser?.id) {
        resolvedUserId = sessionUser.id
        user.value = sessionUser
        break
      }
      await wait(100)
    }

    if (!resolvedUserId)
      throw createError({ statusCode: 400, message: 'Session was not established. Please try again.' })

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', resolvedUserId)
      .returns<{ role: string }[]>()
      .maybeSingle()

    if (profileErr)
      throw profileErr

    const role = String(profile?.role ?? 'member')
    const home = role === 'superadmin' ? '/superadmin' : role === 'admin' ? '/admin' : role === 'staff' ? '/staff' : '/member'
    await navigateTo(home, { replace: true })
  }
  catch (e: any) {
    error.value = getErrorMessage(e)
  }
  finally {
    loading.value = false
  }
}
</script>
