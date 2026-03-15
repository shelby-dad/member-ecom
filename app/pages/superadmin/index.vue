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
        <v-card-text>
          <v-tabs v-model="activeTab" density="comfortable" class="mb-4">
            <v-tab value="pricing">Pricing</v-tab>
            <v-tab value="shop">Shop</v-tab>
            <v-tab value="barcode">Barcode</v-tab>
            <v-tab value="smtp">SMTP</v-tab>
          </v-tabs>

          <v-window v-model="activeTab">
            <v-window-item value="pricing">
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
            </v-window-item>

            <v-window-item value="shop">
              <v-text-field v-model="form.shop_email" label="Shop email" variant="outlined" class="mb-3" />
              <v-text-field v-model="form.shop_location" label="Shop location" variant="outlined" class="mb-3" />
              <v-textarea v-model="form.shop_address" label="Shop address" variant="outlined" rows="3" />
            </v-window-item>

            <v-window-item value="barcode">
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
            </v-window-item>

            <v-window-item value="smtp">
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
                type="password"
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
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'superadmin', middleware: 'role' })

const { refreshPricingSettings } = usePricingFormat()

const showSettings = ref(false)
const activeTab = ref<'pricing' | 'shop' | 'barcode' | 'smtp'>('pricing')
const saving = ref(false)
const loading = ref(false)
const snack = ref(false)
const snackMsg = ref('')
const snackColor = ref<'success' | 'error'>('success')
const smtpPasswordSet = ref(false)

const symbolPositions = [
  { title: 'Before amount', value: 'before' },
  { title: 'After amount', value: 'after' },
]

const barcodeTypes = [
  { title: 'CODE128', value: 'code128' },
  { title: 'EAN-13', value: 'ean13' },
  { title: 'UPC-A', value: 'upca' },
]

const form = reactive({
  pricing_sign: '',
  pricing_symbol: '฿',
  pricing_label: 'Price',
  pricing_decimals: 2,
  pricing_symbol_position: 'before' as 'before' | 'after',
  shop_address: '',
  shop_email: '',
  shop_location: '',
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

function assignForm(data: any) {
  form.pricing_sign = data?.pricing_sign ?? ''
  form.pricing_symbol = data?.pricing_symbol ?? '฿'
  form.pricing_label = data?.pricing_label ?? 'Price'
  form.pricing_decimals = Number(data?.pricing_decimals ?? 2)
  form.pricing_symbol_position = data?.pricing_symbol_position === 'after' ? 'after' : 'before'
  form.shop_address = data?.shop_address ?? ''
  form.shop_email = data?.shop_email ?? ''
  form.shop_location = data?.shop_location ?? ''
  form.barcode_type = ['code128', 'ean13', 'upca'].includes(data?.barcode_type) ? data.barcode_type : 'code128'
  form.smtp_host = data?.smtp_host ?? ''
  form.smtp_port = Number(data?.smtp_port ?? 587)
  form.smtp_user = data?.smtp_user ?? ''
  form.smtp_password = ''
  form.smtp_from_email = data?.smtp_from_email ?? ''
  form.smtp_from_name = data?.smtp_from_name ?? ''
  form.smtp_secure = !!data?.smtp_secure
  smtpPasswordSet.value = !!data?.smtp_password_set
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
      pricing_sign: form.pricing_sign,
      pricing_symbol: form.pricing_symbol,
      pricing_label: form.pricing_label,
      pricing_decimals: Number(form.pricing_decimals || 0),
      pricing_symbol_position: form.pricing_symbol_position,
      shop_address: form.shop_address || null,
      shop_email: form.shop_email || null,
      shop_location: form.shop_location || null,
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
</script>
