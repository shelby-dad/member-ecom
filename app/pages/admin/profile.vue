<template>
  <div>
    <div class="mb-4">
      <h1 class="text-h4 mb-1">Profile</h1>
      <p class="text-body-1 text-medium-emphasis">Manage your account details and password.</p>
    </div>
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8" xl="7">
        <ProfileSettingsCard />
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'role' })
</script>
