<template>
  <div>
    <h1 class="text-h4 mb-4">
      Admin dashboard
    </h1>
    <p class="text-body-1 text-medium-emphasis mb-4">
      Manage products, stock, orders, and payment methods.
    </p>
    <v-row>
      <v-col cols="12" sm="6" md="4">
        <v-card to="/admin/users" class="app-card" hover>
          <v-card-title>Users</v-card-title>
          <v-card-text>
            Create and search staff/member/admin accounts.
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-card to="/admin/products" class="app-card" hover>
          <v-card-title>Products</v-card-title>
          <v-card-text>
            Add and edit products, variants, images, and stock.
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-card to="/admin/product-metadata" class="app-card" hover>
          <v-card-title>Product metadata</v-card-title>
          <v-card-text>
            Manage nested categories, tags, and brand model.
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-card to="/admin/orders" class="app-card" hover>
          <v-card-title>Orders</v-card-title>
          <v-card-text>
            View orders and update status.
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-card to="/admin/payment-methods" class="app-card" hover>
          <v-card-title>Payment methods</v-card-title>
          <v-card-text>
            Manage bank transfer accounts and verify payment submissions.
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-card to="/admin/promotions" class="app-card" hover>
          <v-card-title>Promotions</v-card-title>
          <v-card-text>
            Create promo packages for flexible discounts.
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'role' })
</script>
