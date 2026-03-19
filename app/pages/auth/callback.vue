<template>
  <div class="app-container app-section text-center">
    <v-progress-circular indeterminate color="primary" size="48" />
    <p class="mt-4">
      Completing sign in…
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', auth: false })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

onMounted(async () => {
  let resolvedUserId = user.value?.id ?? ''

  for (let attempt = 0; attempt < 20 && !resolvedUserId; attempt++) {
    const { data } = await supabase.auth.getSession()
    const sessionUser = data.session?.user ?? null
    if (sessionUser?.id) {
      resolvedUserId = sessionUser.id
      user.value = sessionUser
      break
    }
    await wait(100)
  }

  if (!resolvedUserId) {
    await navigateTo('/auth/login?error=session', { replace: true })
    return
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', resolvedUserId)
    .returns<{ role: string }[]>()
    .maybeSingle()

  const role = String(profile?.role ?? 'member')
  const home = role === 'superadmin' ? '/superadmin' : role === 'admin' ? '/admin' : role === 'staff' ? '/staff' : '/member'
  await navigateTo(home, { replace: true })
})
</script>
