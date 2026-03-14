<template>
  <div>
    <h1 class="text-h4 mb-4">
      Superadmin
    </h1>
    <p class="text-body-1 text-medium-emphasis mb-4">
      Full tenant oversight. Access admin and POS areas.
    </p>
    <v-row>
      <v-col cols="12" sm="6" md="4">
        <v-card to="/admin" class="app-card" hover>
          <v-card-title>Admin</v-card-title>
          <v-card-text>
            Products, orders, payment methods.
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-card to="/staff/pos" class="app-card" hover>
          <v-card-title>POS</v-card-title>
          <v-card-text>
            Point of sale for staff.
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'superadmin', middleware: 'role' })
</script>
