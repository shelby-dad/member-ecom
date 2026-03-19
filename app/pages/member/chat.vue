<template>
  <div>
    <div class="mb-4">
      <h1 class="text-h4 mb-1">Chat to Shop</h1>
      <p class="text-body-1 text-medium-emphasis">Talk with our team for support and order help.</p>
    </div>
    <ChatWorkspace mode="member" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'member', middleware: 'role' })
</script>
