<template>
  <v-app>
    <v-app-bar color="primary" density="comfortable">
      <v-app-bar-title>
        <NuxtLink to="/member" class="text-white text-decoration-none">
          Shop
        </NuxtLink>
      </v-app-bar-title>
      <v-spacer />
      <v-btn variant="text" color="white" to="/member/catalog">
        Catalog
      </v-btn>
      <v-btn variant="text" color="white" to="/member/orders">
        My orders
      </v-btn>
      <v-btn variant="text" color="white" to="/member/addresses">
        Addresses
      </v-btn>
      <v-btn variant="text" color="white" to="/member/checkout">
        Checkout
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
