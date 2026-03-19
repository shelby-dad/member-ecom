<template>
  <AppFilterCard :card-class="cardClass">
    <v-row class="app-filter-grid app-data-table-toolbar">
      <slot name="filters" />
      <slot name="actions" />
    </v-row>
  </AppFilterCard>
</template>

<script setup lang="ts">
defineProps<{
  cardClass?: string
}>()
</script>

<style scoped>
.app-data-table-toolbar {
  align-items: center;
}
</style>
