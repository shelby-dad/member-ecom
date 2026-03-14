<template>
  <div class="app-container app-section">
    <h1 class="text-h4 mb-4">
      Single-Tenant Shop
    </h1>
    <p class="text-body-1 text-medium-emphasis">
      Enterprise commerce MVP — Nuxt, Vuetify, Supabase.
    </p>
    <div class="mt-4">
      <NuxtLink to="/auth/login">
        <v-btn color="primary" variant="flat">
          Sign in
        </v-btn>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', auth: false })
</script>
