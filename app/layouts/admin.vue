<template>
  <v-app>
    <v-app-bar color="primary" density="comfortable">
      <v-app-bar-title>
        <NuxtLink to="/admin" class="text-white text-decoration-none">
          Admin
        </NuxtLink>
      </v-app-bar-title>
      <v-spacer />
      <v-btn variant="text" color="white" to="/admin/products">
        Products
      </v-btn>
      <v-btn variant="text" color="white" to="/admin/orders">
        Orders
      </v-btn>
      <v-btn variant="text" color="white" to="/admin/payment-methods">
        Payment methods
      </v-btn>
      <v-btn variant="text" color="white" to="/member" target="_self">
        Member view
      </v-btn>
      <v-btn variant="text" color="white" @click="signOut">
        Sign out
      </v-btn>
    </v-app-bar>
    <v-main>
      <div class="app-container app-section">
        <slot />
      </div>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
useThemeMode()

async function signOut() {
  const supabase = useSupabaseClient()
  await supabase.auth.signOut()
  useProfile().clearProfile()
  await navigateTo('/auth/login', { replace: true })
}
</script>
