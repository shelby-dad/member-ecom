<template>
  <v-card class="app-filter-card" :class="cardClass">
    <v-card-text class="app-filter-card__content">
      <slot />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
const props = defineProps<{
  cardClass?: string
}>()
</script>

<style scoped>
.app-filter-card__content {
  padding-block: 12px;
}
</style>
