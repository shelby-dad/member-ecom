<template>
  <div>
    <div class="mb-4">
      <h1 class="text-h4 mb-1">Inbox</h1>
      <p class="text-body-1 text-medium-emphasis">Conversations assigned to your account.</p>
    </div>
    <ChatWorkspace mode="operator" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'staff', middleware: 'role' })
</script>
