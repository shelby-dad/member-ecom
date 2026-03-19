<template>
  <div>
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
      <h1 class="text-h4 mb-0">Admin dashboard</h1>
      <v-select
        v-model="rangeDays"
        :items="rangeItems"
        item-title="title"
        item-value="value"
        label="Range"
        density="compact"
        variant="outlined"
        hide-details
        style="max-width: 180px"
      />
    </div>

    <v-row class="mb-2">
      <v-col
        v-for="item in shortcuts"
        :key="item.to"
        cols="12"
        sm="6"
        md="4"
      >
        <v-card :to="item.to" class="app-card dashboard-shortcut pa-4" hover>
          <div class="d-flex align-center ga-3">
            <div class="shortcut-icon" :style="{ '--shortcut-color': item.color }">
              <v-icon :icon="item.icon" size="24" />
            </div>
            <div class="text-subtitle-1 font-weight-medium">
              {{ item.title }}
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-if="loading && !analytics">
      <v-col v-for="n in 6" :key="n" cols="12" md="6">
        <v-card class="app-card pa-4">
          <v-skeleton-loader type="heading, article" />
        </v-card>
      </v-col>
    </v-row>

    <v-row v-else-if="analytics">
      <v-col cols="12" md="3">
        <v-card class="app-card pa-4">
          <div class="text-caption text-medium-emphasis mb-1">Revenue</div>
          <div class="text-h5 font-weight-bold">
            {{ compactNumber(analytics.kpis.total_revenue) }}<sup v-if="priceSign" class="metric-sup">{{ priceSign }}</sup>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card class="app-card pa-4">
          <div class="text-caption text-medium-emphasis mb-1">Orders</div>
          <div class="text-h5 font-weight-bold">{{ compactNumber(analytics.kpis.total_orders) }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card class="app-card pa-4">
          <div class="text-caption text-medium-emphasis mb-1">Avg Order</div>
          <div class="text-h5 font-weight-bold">
            {{ compactNumber(analytics.kpis.average_order_value) }}<sup v-if="priceSign" class="metric-sup">{{ priceSign }}</sup>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card class="app-card pa-4">
          <div class="text-caption text-medium-emphasis mb-1">Paid Rate</div>
          <div class="text-h5 font-weight-bold">{{ analytics.kpis.paid_rate_percent.toFixed(1) }}%</div>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card class="app-card pa-4">
          <div class="text-subtitle-1 font-weight-medium mb-2">Sales Trend</div>
          <DashboardColumnChart
            :items="analytics.sales_trend.map(x => ({ label: x.label, left: x.value }))"
            left-color="#16a34a"
            :max-points="14"
          />
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card class="app-card pa-4">
          <div class="text-subtitle-1 font-weight-medium mb-3">Order Status</div>
          <DashboardBarList :items="analytics.orders_by_status" color="primary" />
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="app-card pa-4">
          <div class="text-subtitle-1 font-weight-medium mb-3">Payment Method Mix</div>
          <div class="d-flex flex-column ga-3">
            <div v-for="row in analytics.payment_method_mix" :key="row.label">
              <div class="d-flex justify-space-between text-body-2 mb-1">
                <span>{{ paymentTypeLabel(row.label) }}</span>
                <span>{{ compactNumber(row.total) }}</span>
              </div>
              <div class="d-flex ga-2">
                <v-progress-linear :model-value="toPercent(row.paid, row.total)" color="success" height="8" rounded />
                <v-progress-linear :model-value="toPercent(row.pending, row.total)" color="warning" height="8" rounded />
              </div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="app-card pa-4">
          <div class="text-subtitle-1 font-weight-medium mb-2">Source Trend</div>
          <DashboardColumnChart
            :items="analytics.source_trend.map(x => ({ label: x.label, left: x.left, right: x.right }))"
            left-color="#2563eb"
            right-color="#f97316"
            :max-points="14"
          />
          <div class="d-flex align-center ga-4 mt-2 text-caption text-medium-emphasis">
            <span class="d-flex align-center ga-1"><i class="legend-dot legend-dot--member" />Member</span>
            <span class="d-flex align-center ga-1"><i class="legend-dot legend-dot--pos" />POS</span>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="app-card pa-4">
          <div class="text-subtitle-1 font-weight-medium mb-3">Top Products</div>
          <DashboardBarList
            :items="analytics.top_products.map(row => ({ label: row.label, value: row.revenue }))"
            color="teal"
            :formatter="compactPriceText"
          />
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="app-card pa-4">
          <div class="text-subtitle-1 font-weight-medium mb-3">Top Variants</div>
          <DashboardBarList
            :items="analytics.top_variants.map(row => ({ label: row.label, value: row.revenue }))"
            color="deep-purple"
            :formatter="compactPriceText"
          />
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="app-card pa-4">
          <div class="text-subtitle-1 font-weight-medium mb-3">Inventory Risk</div>
          <div class="d-flex flex-wrap ga-2 mb-3">
            <v-chip color="primary" variant="tonal">Tracked: {{ compactNumber(analytics.inventory_risk.tracked_variants) }}</v-chip>
            <v-chip color="warning" variant="tonal">Low: {{ compactNumber(analytics.inventory_risk.low_stock) }}</v-chip>
            <v-chip color="error" variant="tonal">Out: {{ compactNumber(analytics.inventory_risk.out_of_stock) }}</v-chip>
          </div>
          <DashboardBarList
            :items="analytics.inventory_risk.rows.map(row => ({ label: row.label, value: row.quantity }))"
            color="error"
          />
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="app-card pa-4">
          <div class="text-subtitle-1 font-weight-medium mb-3">Discount Impact</div>
          <div class="text-caption text-medium-emphasis mb-2">By day</div>
          <DashboardColumnChart
            :items="analytics.discount_impact.by_day.map(x => ({ label: x.label, left: x.value }))"
            left-color="#db2777"
            :max-points="14"
          />
          <v-divider class="my-3" />
          <div class="text-caption text-medium-emphasis mb-2">By promotion</div>
          <DashboardBarList
            :items="analytics.discount_impact.by_promotion"
            color="pink"
            :formatter="compactPriceText"
          />
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card class="app-card pa-4">
          <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
            <div class="text-subtitle-1 font-weight-medium">Member Activity</div>
            <div class="text-body-2">
              Repeat buyers: <strong>{{ compactNumber(analytics.member_activity.repeat_buyers) }}</strong> / {{ compactNumber(analytics.member_activity.buyers) }}
              ({{ analytics.member_activity.repeat_ratio_percent.toFixed(1) }}%)
            </div>
          </div>
          <DashboardColumnChart
            :items="analytics.member_activity.new_members_by_day.map(x => ({ label: x.label, left: x.value }))"
            left-color="#0284c7"
            :max-points="14"
          />
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card class="app-card pa-4">
          <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
            <div class="text-subtitle-1 font-weight-medium">Chat Overview</div>
            <div class="d-flex align-center ga-2 flex-wrap">
              <v-chip color="info" variant="tonal">Open: {{ compactNumber(analytics.chat.kpis.open_conversations) }}</v-chip>
              <v-chip color="warning" variant="tonal">Unassigned: {{ compactNumber(analytics.chat.kpis.unassigned_conversations) }}</v-chip>
              <v-chip color="error" variant="tonal">Flagged: {{ compactNumber(analytics.chat.kpis.flagged_conversations) }}</v-chip>
            </div>
          </div>

          <v-row>
            <v-col cols="12" md="8">
              <div class="text-caption text-medium-emphasis mb-2">Conversations (new vs flagged)</div>
              <DashboardColumnChart
                :items="analytics.chat.conversations_trend.map(x => ({ label: x.label, left: x.left, right: x.right }))"
                left-color="#2563eb"
                right-color="#dc2626"
                :max-points="14"
              />
              <div class="d-flex align-center ga-4 mt-2 text-caption text-medium-emphasis">
                <span class="d-flex align-center ga-1"><i class="legend-dot legend-dot--member" />New</span>
                <span class="d-flex align-center ga-1"><i class="legend-dot legend-dot--flagged" />Flagged</span>
              </div>
            </v-col>

            <v-col cols="12" md="4">
              <div class="text-caption text-medium-emphasis mb-2">Queue status</div>
              <DashboardBarList :items="analytics.chat.queue_status" color="primary" />
            </v-col>

            <v-col cols="12" md="6">
              <div class="text-caption text-medium-emphasis mb-2">Response time by day (minutes)</div>
              <DashboardColumnChart
                :items="analytics.chat.response_time_by_day.map(x => ({ label: x.label, left: x.value }))"
                left-color="#16a34a"
                :max-points="14"
              />
            </v-col>

            <v-col cols="12" md="6">
              <div class="text-caption text-medium-emphasis mb-2">Operator workload (active conversations)</div>
              <DashboardBarList :items="analytics.chat.operator_workload" color="indigo" />
            </v-col>
          </v-row>

          <div class="d-flex align-center ga-2 flex-wrap mt-1">
            <v-chip color="success" variant="tonal">Avg first response: {{ analytics.chat.kpis.avg_first_response_minutes.toFixed(1) }} min</v-chip>
            <v-chip color="primary" variant="tonal">P50: {{ analytics.chat.kpis.p50_first_response_minutes.toFixed(1) }} min</v-chip>
            <v-chip color="deep-purple" variant="tonal">P90: {{ analytics.chat.kpis.p90_first_response_minutes.toFixed(1) }} min</v-chip>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-alert v-if="errorMessage" type="error" variant="tonal" class="mt-4">
      {{ errorMessage }}
    </v-alert>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'role' })

interface DashboardSeriesPoint {
  label: string
  value: number
}

interface AdminDashboardAnalytics {
  range_days: number
  generated_at: string
  kpis: {
    total_revenue: number
    total_orders: number
    average_order_value: number
    paid_rate_percent: number
  }
  sales_trend: DashboardSeriesPoint[]
  orders_by_status: DashboardSeriesPoint[]
  payment_method_mix: Array<{ label: string; total: number; paid: number; pending: number }>
  source_trend: Array<{ label: string; left: number; right: number }>
  top_products: Array<{ label: string; quantity: number; revenue: number }>
  top_variants: Array<{ label: string; quantity: number; revenue: number }>
  inventory_risk: {
    tracked_variants: number
    low_stock: number
    out_of_stock: number
    rows: Array<{ label: string; quantity: number }>
  }
  discount_impact: {
    by_day: DashboardSeriesPoint[]
    by_promotion: DashboardSeriesPoint[]
  }
  member_activity: {
    new_members_by_day: DashboardSeriesPoint[]
    buyers: number
    repeat_buyers: number
    repeat_ratio_percent: number
  }
  chat: {
    kpis: {
      open_conversations: number
      unassigned_conversations: number
      flagged_conversations: number
      avg_first_response_minutes: number
      p50_first_response_minutes: number
      p90_first_response_minutes: number
    }
    conversations_trend: Array<{ label: string; left: number; right: number }>
    response_time_by_day: DashboardSeriesPoint[]
    queue_status: DashboardSeriesPoint[]
    operator_workload: DashboardSeriesPoint[]
  }
}

const { pricing } = usePricingFormat()
const loading = ref(false)
const rangeDays = ref(30)
const analytics = ref<AdminDashboardAnalytics | null>(null)
const errorMessage = ref('')

const rangeItems = [
  { title: 'Last 7 days', value: 7 },
  { title: 'Last 30 days', value: 30 },
  { title: 'Last 90 days', value: 90 },
]

const shortcuts = [
  { title: 'Users', to: '/admin/users', icon: 'mdi-account-group-outline', color: '#2563eb' },
  { title: 'Products', to: '/admin/products', icon: 'mdi-package-variant-closed', color: '#16a34a' },
  { title: 'Metadata', to: '/admin/product-metadata', icon: 'mdi-shape-outline', color: '#0891b2' },
  { title: 'Orders', to: '/admin/orders', icon: 'mdi-receipt-text-outline', color: '#f97316' },
  { title: 'Payment Methods', to: '/admin/payment-methods', icon: 'mdi-credit-card-outline', color: '#7c3aed' },
  { title: 'Promotions', to: '/admin/promotions', icon: 'mdi-sale-outline', color: '#db2777' },
]

const priceSign = computed(() => {
  const sign = String(pricing.value.pricing_symbol || '').trim()
  return sign
})

function compactNumber(value: number) {
  const n = Number(value || 0)
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000)
    return `${(n / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1).replace(/\.0$/, '')}B`
  if (abs >= 1_000_000)
    return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`
  if (abs >= 1_000)
    return `${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1).replace(/\.0$/, '')}K`
  return n.toLocaleString('en-US')
}

function compactPriceText(value: number) {
  const sign = priceSign.value
  const compact = compactNumber(value)
  return sign ? `${compact} ${sign}` : compact
}

function toPercent(value: number, total: number) {
  const n = Number(value || 0)
  const t = Number(total || 0)
  if (!t) return 0
  return Math.max(0, Math.min(100, (n / t) * 100))
}

function paymentTypeLabel(type: string) {
  if (type === 'cash') return 'Cash'
  if (type === 'bank_transfer') return 'Bank Transfer'
  if (type === 'wallet') return 'Wallet'
  if (type === 'cod') return 'Cash on Delivery'
  return type || '-'
}

async function loadAnalytics() {
  loading.value = true
  errorMessage.value = ''
  try {
    analytics.value = await $fetch<AdminDashboardAnalytics>('/api/admin/dashboard/analytics', {
      query: { days: rangeDays.value },
    })
  }
  catch (error: any) {
    errorMessage.value = error?.data?.message || error?.message || 'Failed to load dashboard analytics.'
  }
  finally {
    loading.value = false
  }
}

watch(rangeDays, () => {
  loadAnalytics()
})

onMounted(() => {
  loadAnalytics()
})
</script>

<style scoped>
.dashboard-shortcut {
  min-height: 96px;
}

.shortcut-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--shortcut-color);
  background: color-mix(in srgb, var(--shortcut-color) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--shortcut-color) 34%, transparent);
}

.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  display: inline-block;
}

.legend-dot--member {
  background: #2563eb;
}

.legend-dot--pos {
  background: #f97316;
}

.legend-dot--flagged {
  background: #dc2626;
}

.metric-sup {
  margin-left: 4px;
  font-size: 0.58em;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
</style>
