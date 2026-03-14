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

const user = useSupabaseUser()
if (!user.value) {
  await navigateTo('/auth/login', { replace: true })
} else {
  const { fetchProfile } = useProfile()
  const profile = await fetchProfile()
  const home = profile?.role === 'superadmin' ? '/superadmin' : profile?.role === 'admin' ? '/admin' : profile?.role === 'staff' ? '/staff' : '/member'
  await navigateTo(home, { replace: true })
}
</script>
