<template>
  <div>
    <h1 class="text-h4 mb-4">
      Add product
    </h1>
    <v-card class="mb-4">
      <v-card-title>Details</v-card-title>
      <v-card-text>
        <v-text-field v-model="form.name" label="Name" variant="outlined" class="mb-2" />
        <v-text-field v-model="form.slug" label="Slug (optional, auto from name)" variant="outlined" class="mb-2" />
        <RichTextField v-model="form.description" label="Description" class="product-description-editor" />
        <v-text-field
          v-model="form.barcode"
          label="Barcode"
          variant="outlined"
          class="mb-2"
          hint="Auto-generated on create. You can reshuffle once if needed."
          persistent-hint
        >
          <template #append-inner>
            <div class="d-flex align-center ga-1">
              <v-btn
                size="small"
                variant="text"
                icon="mdi-shuffle-variant"
                :loading="generatingBarcode"
                @click="shuffleBarcode"
              />
              <v-btn
                size="small"
                variant="text"
                icon="mdi-camera-outline"
                @click="openScanDialog"
              />
            </div>
          </template>
        </v-text-field>
        <v-select
          v-model="form.brand_id"
          :items="brands"
          item-title="name"
          item-value="id"
          label="Brand model (optional)"
          variant="outlined"
          clearable
          class="mb-2"
        >
          <template #append>
            <v-btn size="x-small" variant="text" icon @click="showBrandDialog = true">
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </template>
        </v-select>
        <v-autocomplete
          v-model="form.category_ids"
          :items="categories"
          item-title="name"
          item-value="id"
          label="Categories (optional)"
          variant="outlined"
          chips
          multiple
          clearable
          class="mb-2"
        >
          <template #append>
            <v-btn size="x-small" variant="text" icon @click="showCategoryDialog = true">
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </template>
        </v-autocomplete>
        <v-autocomplete
          v-model="form.tag_ids"
          :items="tags"
          item-title="name"
          item-value="id"
          label="Tags (optional)"
          variant="outlined"
          chips
          multiple
          clearable
          class="mb-2"
        >
          <template #append>
            <v-btn size="x-small" variant="text" icon @click="showTagDialog = true">
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </template>
        </v-autocomplete>
        <v-checkbox v-model="form.is_active" label="Active" />
        <v-checkbox
          v-model="form.track_stock"
          :label="form.has_variants ? 'Default track stock for variants' : 'Track stock for this product'"
        />
      </v-card-text>
    </v-card>
    <v-card class="mb-4">
      <v-card-title>Variant mode</v-card-title>
      <v-card-text>
        <v-radio-group v-model="form.has_variants" hide-details>
          <v-radio :value="false" label="Single product (one price, one stock)" />
          <v-radio :value="true" label="Product with variants (option sets: Size, Color, etc.)" />
        </v-radio-group>
        <template v-if="!form.has_variants">
          <v-divider class="my-3" />
          <div class="text-subtitle-2 mb-2">
            Default variant
          </div>
          <v-text-field v-model="form.default_variant.name" label="Variant name (optional)" variant="outlined" class="mb-2" placeholder="Default" />
          <v-text-field v-model.number="form.default_variant.price" label="Price" type="number" min="0" step="0.01" variant="outlined" class="mb-2" />
          <v-text-field v-model.number="form.default_variant.stock" label="Initial stock" type="number" min="0" variant="outlined" />
        </template>
        <template v-else>
          <v-divider class="my-3" />
          <div class="text-subtitle-2 mb-2">
            Option sets (Text separator / Image array / Color picker array)
          </div>
          <div v-for="(opt, idx) in form.option_sets" :key="idx" class="mb-3 pa-3 border rounded">
            <div class="d-flex align-center gap-2 mb-2">
              <v-text-field v-model="opt.name" label="Option name" variant="outlined" density="comfortable" hide-details style="max-width: 180px" placeholder="Size / Color / Pattern" />
              <v-select
                v-model="opt.type"
                :items="optionTypeItems"
                item-title="title"
                item-value="value"
                label="Type"
                variant="outlined"
                density="comfortable"
                hide-details
                style="max-width: 220px"
              />
              <v-spacer />
              <v-btn icon variant="text" size="small" @click="removeOption(idx)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </div>
            <v-text-field
              v-if="opt.type === 'text'"
              v-model="opt.valuesText"
              label="Text values (comma-separated)"
              variant="outlined"
              density="comfortable"
              hide-details
              placeholder="S, M, L or Cotton, Linen"
            />
            <div v-else>
              <div v-for="(entry, eIdx) in opt.entries" :key="eIdx" class="d-flex align-center ga-2 mb-2">
                <v-text-field v-model="entry.label" label="Label *" variant="outlined" density="comfortable" hide-details />
                <div
                  v-if="opt.type === 'image'"
                  class="d-flex flex-column flex-grow-1"
                >
                  <div class="d-flex align-center ga-2">
                    <v-btn
                      v-if="!entry.value"
                      variant="outlined"
                      height="48"
                      class="justify-start text-none"
                      prepend-icon="mdi-image-search-outline"
                      @click="openImagePicker(idx, eIdx)"
                    >
                      Choose Image
                    </v-btn>
                    <button
                      v-else
                      type="button"
                      class="image-preview-btn"
                      @click="openImagePicker(idx, eIdx)"
                    >
                      <v-img :src="optionImageUrl(entry.value)" width="84" height="48" cover />
                    </button>
                  </div>
                </div>
                <v-text-field
                  v-else
                  v-model="entry.value"
                  label="Color value *"
                  type="color"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  style="max-width: 120px"
                />
                <v-btn icon variant="text" size="small" @click="opt.entries.splice(eIdx, 1)">
                  <v-icon>mdi-close</v-icon>
                </v-btn>
              </div>
              <v-btn size="small" variant="outlined" @click="opt.entries.push({ label: '', value: opt.type === 'color' ? '#000000' : '' })">
                Add {{ opt.type === 'image' ? 'image' : 'color' }} value
              </v-btn>
            </div>
          </div>
          <div class="d-flex ga-2">
            <v-btn variant="outlined" size="small" class="mt-2" @click="addOption('text')">
              Add text option
            </v-btn>
            <v-btn variant="outlined" size="small" class="mt-2" @click="addOption('image')">
              Add image option
            </v-btn>
            <v-btn variant="outlined" size="small" class="mt-2" @click="addOption('color')">
              Add color option
            </v-btn>
          </div>
          <p v-if="combinationPreview.length > 0" class="text-caption text-medium-emphasis mt-2">
            {{ combinationPreview.length }} variant(s): {{ combinationPreview.slice(0, 5).join(', ') }}{{ combinationPreview.length > 5 ? '…' : '' }}
          </p>
        </template>
      </v-card-text>
    </v-card>
    <div class="d-flex gap-2">
      <v-btn color="primary" :loading="creating" @click="createProduct">
        Create product
      </v-btn>
      <v-btn variant="text" :to="'/admin/products'">
        Cancel
      </v-btn>
    </div>
  </div>
  <StorageImagePickerDialog
    v-model="showImagePicker"
    :selected-path="currentPickerSelectedPath"
    @selected="onImageSelected"
  />
  <ProductMetadataCreateDialog
    v-model="showBrandDialog"
    type="brand"
    :categories="categories"
    @created="onBrandCreated"
  />
  <ProductMetadataCreateDialog
    v-model="showCategoryDialog"
    type="category"
    :categories="categories"
    @created="onCategoryCreated"
  />
  <ProductMetadataCreateDialog
    v-model="showTagDialog"
    type="tag"
    :categories="categories"
    @created="onTagCreated"
  />
  <v-dialog v-model="showScannerDialog" max-width="640" persistent>
    <v-card>
      <v-card-title>Scan product barcode</v-card-title>
      <v-card-text>
        <p class="text-caption text-medium-emphasis mb-2">
          Allow camera access and point the camera at the barcode.
        </p>
        <div class="scanner-stage">
          <video ref="scannerVideoRef" class="scanner-video" autoplay muted playsinline />
          <div class="scanner-guide">
            <div class="scanner-line" />
          </div>
        </div>
        <p class="text-caption text-medium-emphasis mt-2 mb-0">
          Place barcode inside the frame.
        </p>
        <p v-if="scannerError" class="text-caption text-error mt-2 mb-0">
          {{ scannerError }}
        </p>
        <div class="d-flex align-center ga-2 mt-3">
          <input
            ref="scannerImageInputRef"
            type="file"
            accept="image/*"
            class="d-none"
            @change="onBarcodeImageSelected"
          >
          <v-btn variant="outlined" prepend-icon="mdi-image-search-outline" :loading="scannerImageLoading" @click="scannerImageInputRef?.click()">
            Scan from image
          </v-btn>
          <span class="text-caption text-medium-emphasis">
            You can also upload a barcode photo.
          </span>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="closeScanDialog">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'role' })
const config = useRuntimeConfig()

const form = reactive({
  name: '',
  slug: '',
  description: '',
  barcode: '',
  brand_id: null as string | null,
  category_ids: [] as string[],
  tag_ids: [] as string[],
  is_active: true,
  has_variants: false,
  track_stock: true,
  option_sets: [] as Array<{
    name: string
    type: 'text' | 'image' | 'color'
    valuesText: string
    entries: Array<{ label: string; value: string }>
  }>,
  default_variant: { name: '', price: 0, stock: 0, track_stock: true },
})

const creating = ref(false)
const brands = ref<any[]>([])
const categories = ref<any[]>([])
const tags = ref<any[]>([])
const showBrandDialog = ref(false)
const showCategoryDialog = ref(false)
const showTagDialog = ref(false)
const showImagePicker = ref(false)
const generatingBarcode = ref(false)
const showScannerDialog = ref(false)
const scannerError = ref('')
const scannerImageLoading = ref(false)
const scannerVideoRef = ref<HTMLVideoElement | null>(null)
const scannerImageInputRef = ref<HTMLInputElement | null>(null)
let scannerControls: { stop: () => void } | null = null
let scannerReader: any = null
const pickerTarget = ref<{ optionIdx: number; entryIdx: number } | null>(null)
const currentPickerSelectedPath = computed(() => {
  if (!pickerTarget.value) return ''
  const target = form.option_sets[pickerTarget.value.optionIdx]
  if (!target) return ''
  return target.entries[pickerTarget.value.entryIdx]?.value ?? ''
})
const optionTypeItems = [
  { title: 'Text', value: 'text' },
  { title: 'Image', value: 'image' },
  { title: 'Color', value: 'color' },
]

function addOption(type: 'text' | 'image' | 'color' = 'text') {
  form.option_sets.push({
    name: '',
    type,
    valuesText: '',
    entries: type === 'text' ? [] : [{ label: '', value: type === 'color' ? '#000000' : '' }],
  })
}

function removeOption(idx: number) {
  form.option_sets.splice(idx, 1)
}

function openImagePicker(optionIdx: number, entryIdx: number) {
  pickerTarget.value = { optionIdx, entryIdx }
  showImagePicker.value = true
}

function onImageSelected(path: string) {
  if (!pickerTarget.value) return
  const target = form.option_sets[pickerTarget.value.optionIdx]
  if (!target) return
  const entry = target.entries[pickerTarget.value.entryIdx]
  if (!entry) return
  entry.value = path
  pickerTarget.value = null
  showImagePicker.value = false
}

function optionImageUrl(path: string) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://'))
    return path
  const base = config.public.supabaseUrl as string
  return base ? `${base}/storage/v1/object/public/product-images/${path}` : path
}

const combinationPreview = computed(() => {
  if (!form.has_variants || form.option_sets.length === 0) return []
  const sets = buildOptionSetsPayload().map((s: any) => ({
    name: s.name,
    values: (s.values ?? []).map((v: any) => v.label).filter(Boolean),
  }))
  if (sets.length === 0) return []
  function combos(sets: { name: string; values: string[] }[]): Record<string, string>[] {
    if (sets.length === 0) return [{}]
    const [first, ...rest] = sets
    const restCombos = combos(rest)
    const result: Record<string, string>[] = []
    for (const v of first.values) {
      for (const c of restCombos) {
        result.push({ [first.name]: v, ...c })
      }
    }
    return result
  }
  return combos(sets).map(c => Object.values(c).join(' / '))
})

function buildOptionSetsPayload() {
  return form.option_sets
    .map((o) => {
      const name = o.name.trim()
      if (!name) return null
      if (o.type === 'text') {
        const values = o.valuesText.split(',').map(v => v.trim()).filter(Boolean)
        if (!values.length) return null
        return {
          name,
          type: 'text' as const,
          values: values.map(v => ({ label: v, value: v })),
        }
      }

      const entries = o.entries
        .map(e => ({ label: e.label.trim(), value: e.value.trim() }))
        .filter(e => e.label && e.value)
      if (!entries.length) return null
      return {
        name,
        type: o.type,
        values: entries,
      }
    })
    .filter(Boolean)
}

async function createProduct() {
  if (!form.name.trim()) return
  creating.value = true
  try {
    const body: any = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: isRichTextEmpty(form.description) ? undefined : form.description,
      barcode: form.barcode.trim() || undefined,
      brand_id: form.brand_id ?? null,
      category_ids: form.category_ids,
      tag_ids: form.tag_ids,
      is_active: form.is_active,
      track_stock: form.track_stock,
      has_variants: form.has_variants,
    }
    if (!form.has_variants) {
      body.default_variant = {
        name: form.default_variant.name.trim() || undefined,
        price: Number(form.default_variant.price) || 0,
        stock: Number(form.default_variant.stock) || 0,
        track_stock: form.track_stock,
      }
    } else {
      const sets = buildOptionSetsPayload()
      body.option_sets = sets
      if (sets.length === 0) {
        body.variants = []
      }
    }
    const result = await $fetch<any>('/api/admin/products', { method: 'POST', body })
    await navigateTo(`/admin/products/${result.id}`)
  }
  finally {
    creating.value = false
  }
}

async function loadMetadata() {
  const data = await $fetch<any>('/api/admin/product-metadata')
  brands.value = data?.brands ?? []
  categories.value = data?.categories ?? []
  tags.value = data?.tags ?? []
}

async function shuffleBarcode() {
  generatingBarcode.value = true
  try {
    const result = await $fetch<{ barcode: string }>('/api/admin/products/barcode/generate')
    form.barcode = result.barcode
  }
  finally {
    generatingBarcode.value = false
  }
}

async function openScanDialog() {
  showScannerDialog.value = true
  await nextTick()
  await startScanner()
}

function stopScanner() {
  if (!scannerControls) return
  try {
    scannerControls.stop()
  }
  finally {
    scannerControls = null
  }
}

async function startScanner() {
  if (!import.meta.client) return
  scannerError.value = ''
  stopScanner()
  if (!scannerVideoRef.value) return
  try {
    const { BrowserMultiFormatReader } = await import('@zxing/browser')
    const { BarcodeFormat, DecodeHintType } = await import('@zxing/library')
    if (!scannerReader) {
      const hints = new Map<any, any>()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_39,
        BarcodeFormat.ITF,
      ])
      hints.set(DecodeHintType.TRY_HARDER, true)
      scannerReader = new BrowserMultiFormatReader(hints)
    }
    scannerControls = await scannerReader.decodeFromConstraints(
      {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      },
      scannerVideoRef.value,
      (result: any, error: any) => {
        if (result?.getText) {
          form.barcode = String(result.getText()).trim()
          closeScanDialog()
          return
        }
        const errName = String(error?.name ?? '')
        if (error && errName && !['NotFoundException', 'ChecksumException', 'FormatException'].includes(errName))
          scannerError.value = error?.message || 'Camera scanning failed.'
      },
    )
  }
  catch (e: any) {
    scannerError.value = humanizeScannerError(e)
  }
}

function closeScanDialog() {
  showScannerDialog.value = false
  stopScanner()
}

async function onBarcodeImageSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  scannerImageLoading.value = true
  scannerError.value = ''
  try {
    const { BrowserMultiFormatReader } = await import('@zxing/browser')
    if (!scannerReader)
      scannerReader = new BrowserMultiFormatReader()
    const url = URL.createObjectURL(file)
    try {
      const result = await scannerReader.decodeFromImageUrl(url)
      const code = result?.getText?.() ? String(result.getText()).trim() : ''
      if (!code)
        throw new Error('No barcode found in selected image.')
      form.barcode = code
      closeScanDialog()
    }
    finally {
      URL.revokeObjectURL(url)
    }
  }
  catch (e: any) {
    scannerError.value = humanizeScannerError(e)
  }
  finally {
    scannerImageLoading.value = false
    input.value = ''
  }
}

function humanizeScannerError(error: any) {
  const msg = String(error?.message ?? '')
  if (!msg) return 'Scanner failed. Please try again.'
  if (msg.includes('No MultiFormat Readers were able to detect the code'))
    return 'No barcode detected. Try a clearer image with better lighting and full barcode in frame.'
  if (msg.toLowerCase().includes('permission'))
    return 'Camera permission denied. Please allow camera access in browser settings.'
  if (msg.toLowerCase().includes('notfounderror'))
    return 'No camera device found.'
  if (msg.toLowerCase().includes('notreadableerror'))
    return 'Camera is busy in another app/tab. Close it and retry.'
  if (msg.toLowerCase().includes('overconstrainederror'))
    return 'Camera constraints are not supported on this device. Please try scan from image.'
  return msg
}

function onBrandCreated(item: any) {
  brands.value = [...brands.value, item]
  form.brand_id = item.id
}

function onCategoryCreated(item: any) {
  categories.value = [...categories.value, item]
  if (!form.category_ids.includes(item.id))
    form.category_ids = [...form.category_ids, item.id]
}

function onTagCreated(item: any) {
  tags.value = [...tags.value, item]
  if (!form.tag_ids.includes(item.id))
    form.tag_ids = [...form.tag_ids, item.id]
}

onMounted(async () => {
  await loadMetadata()
  await shuffleBarcode()
})

onBeforeUnmount(() => {
  stopScanner()
})
</script>

<style scoped>
.image-preview-btn {
  width: 84px;
  height: 48px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 8px;
  overflow: hidden;
  padding: 0;
  cursor: pointer;
}

.product-description-editor {
  margin-bottom: 16px;
}

.product-description-editor :deep(.rich-editor-content .rich-editor-input) {
  min-height: 256px;
}

.scanner-video {
  width: 100%;
  min-height: 260px;
  max-height: 380px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #0f172a;
  object-fit: cover;
}

.scanner-stage {
  position: relative;
}

.scanner-guide {
  pointer-events: none;
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(86%, 420px);
  height: min(54%, 180px);
  transform: translate(-50%, -50%);
  border: 2px solid rgba(34, 197, 94, 0.9);
  border-radius: 10px;
  box-shadow: 0 0 0 9999px rgba(2, 6, 23, 0.25);
  overflow: hidden;
}

.scanner-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(34, 197, 94, 0.95);
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.75);
  animation: scanner-line-move 1.8s linear infinite;
}

@keyframes scanner-line-move {
  0% { top: 0; }
  100% { top: calc(100% - 2px); }
}
</style>
