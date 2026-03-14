<template>
  <div class="app-container app-section">
    <h1 class="text-h4 mb-4">
      Member area
    </h1>
    <p class="text-body-1">
      You are signed in. Catalog and orders will be available here.
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'member', middleware: 'role' })
</script>
