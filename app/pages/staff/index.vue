<template>
  <div>
    <h1 class="text-h4 mb-4">
      Staff / POS
    </h1>
    <p class="text-body-1 text-medium-emphasis mb-4">
      Run point of sale for in-store member purchases.
    </p>
    <v-card to="/staff/pos" class="app-card" hover max-width="400">
      <v-card-title>Open POS</v-card-title>
      <v-card-text>
        Create orders for members at the counter.
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'staff', middleware: 'role' })
</script>
