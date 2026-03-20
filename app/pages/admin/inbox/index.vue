<template>
  <div>
    <div class="mb-4">
      <h1 class="text-h4 mb-1">Inbox</h1>
      <p class="text-body-1 text-medium-emphasis">Incoming member conversations.</p>
    </div>
    <ChatWorkspace mode="operator" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'role' })
</script>
