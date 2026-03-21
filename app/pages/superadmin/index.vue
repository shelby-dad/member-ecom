<template>
  <div>
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
      <div>
        <h1 class="text-h4 mb-1">
          Superadmin
        </h1>
        <p class="text-body-1 text-medium-emphasis">
          Full tenant oversight. Access admin and POS areas.
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-cog" @click="openSettings">
        Feature settings
      </v-btn>
    </div>

    <v-row class="mb-4">
      <template v-if="platformLoading && !platformOverview">
        <v-col v-for="n in 8" :key="`platform-skeleton-${n}`" cols="12" md="3">
          <v-card class="app-card pa-4">
            <v-skeleton-loader type="heading, article" />
          </v-card>
        </v-col>
      </template>

      <template v-else>
        <v-col cols="12" md="3">
          <v-card class="app-card pa-4">
            <div class="text-caption text-medium-emphasis mb-1">Plan</div>
            <div class="text-h6 font-weight-bold">{{ platformOverview?.plan_name || '-' }}</div>
            <div class="text-caption text-medium-emphasis mt-1">Status: {{ platformOverview?.status || '-' }}</div>
            <v-chip size="x-small" class="mt-2" :color="isLikelyFreePlan ? 'warning' : 'success'" variant="tonal">
              {{ isLikelyFreePlan ? 'Free Plan' : 'Pro/paid plan' }}
            </v-chip>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card class="app-card pa-4">
            <div class="text-caption text-medium-emphasis mb-1">Estimated Monthly Cost</div>
            <div class="text-h6 font-weight-bold">{{ platformCostText }}</div>
            <div class="text-caption text-medium-emphasis mt-1">
              Project: {{ platformOverview?.project_ref || '-' }}
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card class="app-card pa-4">
            <div class="text-caption text-medium-emphasis mb-1">Organization</div>
            <div class="text-body-1 font-weight-medium text-truncate">{{ platformOverview?.organization_id || '-' }}</div>
            <v-chip
              class="mt-2"
              size="small"
              :color="platformOverview?.configured ? 'success' : 'warning'"
              variant="tonal"
            >
              {{ platformOverview?.configured ? 'Configured' : 'Not configured' }}
            </v-chip>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card class="app-card pa-4">
            <div class="text-caption text-medium-emphasis mb-1">Traffic Trend</div>
            <div
              class="text-h6 font-weight-bold"
              :class="{
                'text-success': filteredTrafficKpis.trend_percent > 0,
                'text-error': filteredTrafficKpis.trend_percent < 0,
              }"
            >
              {{ signedPercent(filteredTrafficKpis.trend_percent) }}
            </div>
            <div class="text-caption text-medium-emphasis mt-1">Latest vs first visible day</div>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card class="app-card pa-4">
            <div class="text-caption text-medium-emphasis mb-1">Total Requests</div>
            <div class="text-h6 font-weight-bold">{{ compactNumber(filteredTrafficKpis.total_requests) }}</div>
            <div class="text-caption text-medium-emphasis mt-1">Visible range</div>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card class="app-card pa-4">
            <div class="text-caption text-medium-emphasis mb-1">Average / Day</div>
            <div class="text-h6 font-weight-bold">{{ compactNumber(filteredTrafficKpis.average_requests_per_day) }}</div>
            <div class="text-caption text-medium-emphasis mt-1">API requests per day</div>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card class="app-card pa-4">
            <div class="text-caption text-medium-emphasis mb-1">Peak Day</div>
            <div class="text-h6 font-weight-bold">{{ compactNumber(filteredTrafficKpis.peak_day_requests) }}</div>
            <div class="text-caption text-medium-emphasis mt-1">{{ filteredTrafficKpis.peak_day_label }}</div>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card class="app-card pa-4">
            <div class="text-caption text-medium-emphasis mb-1">Latest Day</div>
            <div class="text-h6 font-weight-bold">{{ compactNumber(filteredTrafficKpis.latest_day_requests) }}</div>
            <div class="text-caption text-medium-emphasis mt-1">{{ filteredTrafficKpis.latest_day_label }}</div>
          </v-card>
        </v-col>

        <v-col cols="12" md="8">
          <v-card class="app-card pa-4">
            <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-2">
              <div class="text-subtitle-1 font-weight-medium">Traffic (API Requests)</div>
              <v-select
                v-if="!isTrafficSeriesLimited"
                v-model="trafficRangeDays"
                :items="trafficRangeItems"
                item-title="title"
                item-value="value"
                density="compact"
                variant="outlined"
                hide-details
                style="max-width: 150px"
              />
            </div>
            <template v-if="!isTrafficSeriesLimited">
              <DashboardColumnChart
                :items="filteredApiRequests.map(x => ({ label: x.label, left: x.value }))"
                left-color="#0284c7"
                :max-points="20"
              />
            </template>
            <template v-else>
              <div class="py-6 text-center">
                <div class="text-caption text-medium-emphasis mb-1">Current API Requests</div>
                <div class="text-h5 font-weight-bold">{{ compactNumber(filteredTrafficKpis.latest_day_requests) }}</div>
              </div>
            </template>
            <p class="text-caption text-medium-emphasis mt-3 mb-0">{{ platformOverview?.note || '-' }}</p>
            <v-alert
              v-if="isTrafficSeriesLimited"
              type="info"
              variant="tonal"
              density="comfortable"
              class="mt-3"
            >
              Free plan or limited analytics response detected. Historical daily buckets are not available from the API right now.
            </v-alert>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card class="app-card pa-4">
            <div class="text-subtitle-1 font-weight-medium mb-2">Top Traffic Days</div>
            <DashboardBarList v-if="!isTrafficSeriesLimited" :items="topTrafficDays" color="info" :formatter="compactNumber" />
            <div v-else class="text-caption text-medium-emphasis">
              Historical ranking appears when multiple day buckets are available.
            </div>
          </v-card>
        </v-col>
      </template>
    </v-row>

    <v-dialog v-model="showSettings" max-width="920" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          App feature settings
          <v-spacer />
          <v-btn icon variant="text" @click="showSettings = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text class="settings-card-text">
          <v-tabs v-model="activeTab" density="comfortable" class="settings-tabs">
            <v-tab value="site">Site</v-tab>
            <v-tab value="pricing">Pricing</v-tab>
            <v-tab value="shop">Shop</v-tab>
            <v-tab value="barcode">Barcode</v-tab>
            <v-tab value="smtp">SMTP</v-tab>
          </v-tabs>

          <v-window v-model="activeTab" class="settings-window">
            <v-window-item value="site" class="settings-pane">
              <div class="settings-pane-body settings-pane-body--spaced">
                <v-text-field
                  v-model="form.site_name"
                  label="Site name"
                  variant="outlined"
                  class="mb-3"
                  hint="If set, this name replaces Single Tenant Shop in document title."
                  persistent-hint
                />

                <div class="d-flex align-center ga-3 flex-wrap">
                  <v-btn
                    size="small"
                    variant="outlined"
                    :loading="uploadingSiteFavicon"
                    prepend-icon="mdi-image-outline"
                    @click="siteFaviconInput?.click()"
                  >
                    Upload Favicon
                  </v-btn>
                  <v-btn
                    v-if="form.site_favicon_84 || form.site_favicon_64 || form.site_favicon_512"
                    size="small"
                    variant="text"
                    color="error"
                    @click="clearSiteFavicon"
                  >
                    Remove
                  </v-btn>
                  <span class="text-caption text-medium-emphasis">
                    Allowed: PNG or ICO, exactly 512x512.
                  </span>
                </div>

                <input
                  ref="siteFaviconInput"
                  type="file"
                  accept=".png,.ico,image/png,image/x-icon,image/vnd.microsoft.icon"
                  class="d-none"
                  @change="onSiteFaviconSelected"
                >

                <div v-if="form.site_favicon_84 || form.site_favicon_64 || form.site_favicon_512" class="mt-3">
                  <div class="text-caption text-medium-emphasis mb-2">Preview</div>
                  <v-img
                    :src="storageImageUrl(form.site_favicon_84 || form.site_favicon_64 || form.site_favicon_512 || '')"
                    width="84"
                    height="84"
                    contain
                    class="rounded"
                  />
                </div>
              </div>
            </v-window-item>

            <v-window-item value="pricing" class="settings-pane">
              <div class="settings-pane-body">
                <v-row>
                  <v-col cols="12" md="4">
                    <v-text-field v-model="form.pricing_symbol" label="Currency symbol" variant="outlined" />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field v-model="form.pricing_sign" label="Pricing sign" variant="outlined" hint="Optional prefix shown before all prices" persistent-hint />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field v-model="form.pricing_label" label="Pricing label" variant="outlined" />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field v-model.number="form.pricing_decimals" type="number" min="0" max="4" label="Decimal places" variant="outlined" />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-select
                      v-model="form.pricing_symbol_position"
                      :items="symbolPositions"
                      item-title="title"
                      item-value="value"
                      label="Symbol position"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="4" class="d-flex align-center">
                    <div class="text-body-2">
                      <span class="text-medium-emphasis d-block mb-1">Preview</span>
                      <strong>{{ previewPrice }}</strong>
                    </div>
                  </v-col>
                </v-row>
              </div>
            </v-window-item>

            <v-window-item value="shop" class="settings-pane">
              <div class="settings-pane-body settings-pane-body--spaced">
                <div class="mb-3">
                  <div class="d-flex align-center ga-2 mb-2">
                    <v-btn size="small" variant="outlined" @click="showShopLogoPicker = true">
                      Choose Shop Logo
                    </v-btn>
                    <v-btn
                      v-if="form.shop_logo"
                      size="small"
                      variant="text"
                      color="error"
                      @click="form.shop_logo = ''"
                    >
                      Remove
                    </v-btn>
                  </div>
                  <v-img
                    v-if="form.shop_logo"
                    :src="storageImageUrl(form.shop_logo)"
                    width="120"
                    height="120"
                    cover
                    class="rounded border"
                  />
                </div>
                <v-text-field v-model="form.shop_name" label="Shop name" variant="outlined" class="mb-3" />
                <v-text-field v-model="form.shop_email" label="Shop email" variant="outlined" class="mb-3" />
                <v-text-field v-model="form.mobile_number" label="Mobile number" variant="outlined" class="mb-3" />
                <v-textarea v-model="form.shop_address" label="Shop address" variant="outlined" rows="3" />
              </div>
            </v-window-item>

            <v-window-item value="barcode" class="settings-pane">
              <div class="settings-pane-body settings-pane-body--spaced">
                <v-select
                  v-model="form.barcode_type"
                  :items="barcodeTypes"
                  item-title="title"
                  item-value="value"
                  label="Default barcode type"
                  variant="outlined"
                  class="mb-3"
                />
                <p class="text-medium-emphasis text-body-2">
                  New products use this barcode type for random auto-generation. Product form also supports one-click Shuffle.
                </p>
              </div>
            </v-window-item>

            <v-window-item value="smtp" class="settings-pane">
              <div class="settings-pane-body">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field v-model="form.smtp_host" label="SMTP host" variant="outlined" class="mb-3" />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-text-field v-model.number="form.smtp_port" type="number" min="1" max="65535" label="SMTP port" variant="outlined" class="mb-3" />
                  </v-col>
                  <v-col cols="12" md="3" class="d-flex align-center">
                    <v-switch v-model="form.smtp_secure" label="Secure" color="primary" />
                  </v-col>
                </v-row>
                <v-text-field v-model="form.smtp_user" label="SMTP username" variant="outlined" class="mb-3" />
                <v-text-field
                  v-model="form.smtp_password"
                  label="SMTP password"
                  variant="outlined"
                  :type="smtpPasswordVisible ? 'text' : 'password'"
                  :append-inner-icon="smtpPasswordVisible ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                  @click:append-inner="smtpPasswordVisible = !smtpPasswordVisible"
                  :placeholder="smtpPasswordSet ? 'Password is already set. Leave blank to keep.' : ''"
                  class="mb-3"
                />
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field v-model="form.smtp_from_email" label="From email" variant="outlined" />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field v-model="form.smtp_from_name" label="From name" variant="outlined" />
                  </v-col>
                </v-row>
              </div>
            </v-window-item>
          </v-window>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showSettings = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="saveSettings">Save settings</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snack" :color="snackColor">
      {{ snackMsg }}
    </v-snackbar>

    <StorageImagePickerDialog
      v-model="showShopLogoPicker"
      :selected-path="form.shop_logo || ''"
      @selected="onShopLogoSelected"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'superadmin', middleware: 'role' })

const { refreshPricingSettings } = usePricingFormat()
const { refreshSiteSettings } = useSiteSettings()
const config = useRuntimeConfig()

const showSettings = ref(false)
const showShopLogoPicker = ref(false)
const activeTab = ref<'site' | 'pricing' | 'shop' | 'barcode' | 'smtp'>('site')
const saving = ref(false)
const loading = ref(false)
const platformLoading = ref(false)
const trafficRangeDays = ref(30)
const uploadingSiteFavicon = ref(false)
const snack = ref(false)
const snackMsg = ref('')
const snackColor = ref<'success' | 'error'>('success')
const smtpPasswordSet = ref(false)
const smtpPasswordVisible = ref(false)
const siteFaviconInput = ref<HTMLInputElement | null>(null)
const platformOverview = ref<{
  configured: boolean
  available: boolean
  project_ref: string | null
  organization_id: string | null
  plan_name: string
  status: string
  estimated_monthly_cost_usd: number | null
  api_requests: Array<{ label: string; value: number }>
  traffic_kpis: {
    total_requests: number
    average_requests_per_day: number
    peak_day_label: string
    peak_day_requests: number
    latest_day_label: string
    latest_day_requests: number
    trend_percent: number
  }
  note: string
} | null>(null)

const symbolPositions = [
  { title: 'Before amount', value: 'before' },
  { title: 'After amount', value: 'after' },
]

const barcodeTypes = [
  { title: 'CODE128', value: 'code128' },
  { title: 'EAN-13', value: 'ean13' },
  { title: 'UPC-A', value: 'upca' },
]
const trafficRangeItems = [
  { title: 'Last 7 days', value: 7 },
  { title: 'Last 30 days', value: 30 },
  { title: 'Last 90 days', value: 90 },
]
const trafficRangeStorageKey = 'superadmin-platform-traffic-range-days'

const form = reactive({
  site_name: '',
  site_favicon_original: '',
  site_favicon_64: '',
  site_favicon_84: '',
  site_favicon_512: '',
  pricing_sign: '',
  pricing_symbol: '฿',
  pricing_label: 'Price',
  pricing_decimals: 2,
  pricing_symbol_position: 'before' as 'before' | 'after',
  shop_logo: '',
  shop_name: '',
  shop_address: '',
  shop_email: '',
  mobile_number: '',
  barcode_type: 'code128' as 'code128' | 'ean13' | 'upca',
  smtp_host: '',
  smtp_port: 587,
  smtp_user: '',
  smtp_password: '',
  smtp_from_email: '',
  smtp_from_name: '',
  smtp_secure: false,
})

const previewPrice = computed(() => {
  const decimals = Math.max(0, Math.min(4, Number(form.pricing_decimals || 0)))
  const num = new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(1234.56)
  const symbol = form.pricing_symbol || '฿'
  const positioned = form.pricing_symbol_position === 'after' ? `${num}${symbol}` : `${symbol}${num}`
  return `${form.pricing_sign || ''}${positioned}`
})
const platformCostText = computed(() => {
  const amount = platformOverview.value?.estimated_monthly_cost_usd
  if (amount == null || Number.isNaN(Number(amount)))
    return '-'
  return `$${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
})
const filteredApiRequests = computed(() => {
  const list = platformOverview.value?.api_requests || []
  const range = Number(trafficRangeDays.value || 30)
  if (list.length <= range)
    return list
  return list.slice(list.length - range)
})
const filteredTrafficKpis = computed(() => {
  const series = filteredApiRequests.value
  if (!series.length) {
    return {
      total_requests: 0,
      average_requests_per_day: 0,
      peak_day_label: '-',
      peak_day_requests: 0,
      latest_day_label: '-',
      latest_day_requests: 0,
      trend_percent: 0,
    }
  }
  const total = series.reduce((sum, row) => sum + Number(row.value || 0), 0)
  const average = total / series.length
  const peak = series.reduce((best, row) => Number(row.value || 0) > Number(best.value || 0) ? row : best, series[0])
  const latest = series[series.length - 1]
  const first = series[0]
  const trendBase = Math.max(1, Number(first.value || 0))
  const trendPercent = ((Number(latest.value || 0) - Number(first.value || 0)) / trendBase) * 100
  return {
    total_requests: Math.round(total),
    average_requests_per_day: Math.round(average),
    peak_day_label: String(peak.label || '-'),
    peak_day_requests: Math.round(Number(peak.value || 0)),
    latest_day_label: String(latest.label || '-'),
    latest_day_requests: Math.round(Number(latest.value || 0)),
    trend_percent: Number.isFinite(trendPercent) ? Math.round(trendPercent * 10) / 10 : 0,
  }
})
const topTrafficDays = computed(() => {
  return [...filteredApiRequests.value]
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
    .map(item => ({ label: item.label, value: item.value }))
})
const isTrafficSeriesLimited = computed(() => filteredApiRequests.value.length <= 1)
const isLikelyFreePlan = computed(() => /free/i.test(String(platformOverview.value?.plan_name ?? '')))

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

function signedPercent(value: number) {
  const n = Number(value || 0)
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`
}

function assignForm(data: any) {
  form.site_name = data?.site_name ?? ''
  form.site_favicon_original = data?.site_favicon_original ?? ''
  form.site_favicon_64 = data?.site_favicon_64 ?? ''
  form.site_favicon_84 = data?.site_favicon_84 ?? ''
  form.site_favicon_512 = data?.site_favicon_512 ?? ''
  form.pricing_sign = data?.pricing_sign ?? ''
  form.pricing_symbol = data?.pricing_symbol ?? '฿'
  form.pricing_label = data?.pricing_label ?? 'Price'
  form.pricing_decimals = Number(data?.pricing_decimals ?? 2)
  form.pricing_symbol_position = data?.pricing_symbol_position === 'after' ? 'after' : 'before'
  form.shop_logo = data?.shop_logo ?? ''
  form.shop_name = data?.shop_name ?? ''
  form.shop_address = data?.shop_address ?? ''
  form.shop_email = data?.shop_email ?? ''
  form.mobile_number = data?.mobile_number ?? ''
  form.barcode_type = ['code128', 'ean13', 'upca'].includes(data?.barcode_type) ? data.barcode_type : 'code128'
  form.smtp_host = data?.smtp_host ?? ''
  form.smtp_port = Number(data?.smtp_port ?? 587)
  form.smtp_user = data?.smtp_user ?? ''
  form.smtp_password = ''
  smtpPasswordVisible.value = false
  form.smtp_from_email = data?.smtp_from_email ?? ''
  form.smtp_from_name = data?.smtp_from_name ?? ''
  form.smtp_secure = !!data?.smtp_secure
  smtpPasswordSet.value = !!data?.smtp_password_set
}

function storageImageUrl(path: string) {
  const value = String(path ?? '').trim()
  if (!value)
    return ''
  if (value.startsWith('http://') || value.startsWith('https://'))
    return value
  const base = config.public.supabaseUrl as string
  return base ? `${base}/storage/v1/object/public/product-images/${value}` : value
}

function onShopLogoSelected(path: string) {
  form.shop_logo = path
  showShopLogoPicker.value = false
}

function clearSiteFavicon() {
  form.site_favicon_original = ''
  form.site_favicon_64 = ''
  form.site_favicon_84 = ''
  form.site_favicon_512 = ''
}

async function onSiteFaviconSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file)
    return

  const formData = new FormData()
  formData.append('file', file)

  uploadingSiteFavicon.value = true
  try {
    const data = await $fetch<any>('/api/superadmin/settings/favicon', {
      method: 'POST',
      body: formData,
    })
    form.site_favicon_original = String(data?.site_favicon_original ?? '')
    form.site_favicon_64 = String(data?.site_favicon_64 ?? '')
    form.site_favicon_84 = String(data?.site_favicon_84 ?? '')
    form.site_favicon_512 = String(data?.site_favicon_512 ?? '')
    await refreshSiteSettings()
    snackColor.value = 'success'
    snackMsg.value = 'Favicon uploaded successfully.'
    snack.value = true
  }
  catch (error: any) {
    snackColor.value = 'error'
    snackMsg.value = error?.data?.message || error?.message || 'Failed to upload favicon.'
    snack.value = true
  }
  finally {
    uploadingSiteFavicon.value = false
    input.value = ''
  }
}

async function loadSettings() {
  loading.value = true
  try {
    const data = await $fetch<any>('/api/superadmin/settings')
    assignForm(data)
  }
  finally {
    loading.value = false
  }
}

async function openSettings() {
  await loadSettings()
  showSettings.value = true
}

async function loadPlatformOverview() {
  platformLoading.value = true
  try {
    platformOverview.value = await $fetch<any>('/api/superadmin/overview/platform')
  } catch (error: any) {
    platformOverview.value = {
      configured: false,
      available: false,
      project_ref: null,
      organization_id: null,
      plan_name: '-',
      status: '-',
      estimated_monthly_cost_usd: null,
      api_requests: [],
      traffic_kpis: {
        total_requests: 0,
        average_requests_per_day: 0,
        peak_day_label: '-',
        peak_day_requests: 0,
        latest_day_label: '-',
        latest_day_requests: 0,
        trend_percent: 0,
      },
      note: error?.data?.message || error?.message || 'Failed to load Supabase platform overview.',
    }
  } finally {
    platformLoading.value = false
  }
}

async function saveSettings() {
  const smtpHost = form.smtp_host.trim()
  const smtpUser = form.smtp_user.trim()
  const smtpFromEmail = form.smtp_from_email.trim()
  const smtpFromName = form.smtp_from_name.trim()
  const smtpPassword = form.smtp_password.trim()
  const smtpPort = Number(form.smtp_port || 0) || 0

  saving.value = true
  try {
    const payload = {
      site_name: form.site_name || null,
      site_favicon_original: form.site_favicon_original || null,
      site_favicon_64: form.site_favicon_64 || null,
      site_favicon_84: form.site_favicon_84 || null,
      site_favicon_512: form.site_favicon_512 || null,
      pricing_sign: form.pricing_sign,
      pricing_symbol: form.pricing_symbol,
      pricing_label: form.pricing_label,
      pricing_decimals: Number(form.pricing_decimals || 0),
      pricing_symbol_position: form.pricing_symbol_position,
      shop_logo: form.shop_logo || null,
      shop_name: form.shop_name || null,
      shop_address: form.shop_address || null,
      shop_email: form.shop_email || null,
      mobile_number: form.mobile_number || null,
      barcode_type: form.barcode_type,
      smtp_host: smtpHost || null,
      smtp_port: smtpPort || null,
      smtp_user: smtpUser || null,
      smtp_password: smtpPassword || '',
      smtp_from_email: smtpFromEmail || null,
      smtp_from_name: smtpFromName || null,
      smtp_secure: form.smtp_secure,
    }
    const data = await $fetch<any>('/api/superadmin/settings', { method: 'PUT', body: payload })
    assignForm(data)
    await refreshPricingSettings()
    await refreshSiteSettings()
    snackColor.value = 'success'
    snackMsg.value = 'Settings updated successfully.'
    snack.value = true
    showSettings.value = false
  }
  catch (error: any) {
    snackColor.value = 'error'
    snackMsg.value = error?.data?.message || error?.message || 'Failed to update settings.'
    snack.value = true
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  if (import.meta.client) {
    const raw = window.localStorage.getItem(trafficRangeStorageKey)
    const parsed = Number(raw || 30)
    if ([7, 30, 90].includes(parsed))
      trafficRangeDays.value = parsed
  }
  loadPlatformOverview()
})

watch(trafficRangeDays, (value) => {
  if (!import.meta.client)
    return
  window.localStorage.setItem(trafficRangeStorageKey, String(value))
})
</script>

<style scoped>
.settings-card-text {
  padding-top: 10px !important;
}

.settings-tabs {
  margin-bottom: 10px;
}

.settings-window :deep(.v-window-item) {
  padding-top: 2px;
}

.settings-window :deep(.v-row) {
  margin-top: 0 !important;
}

.settings-window :deep(.v-input) {
  margin-top: 0 !important;
}

.settings-pane-body {
  margin-top: 0 !important;
  padding-top: 0 !important;
}

.settings-pane-body--spaced {
  margin-top: 10px !important;
}
</style>
