<template>
  <div>
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
      <div>
        <h1 class="text-h4 mb-1">
          Email Templates
        </h1>
        <p class="text-body-1 text-medium-emphasis">
          Manage system notification templates used by the server notification queue.
        </p>
      </div>
    </div>

    <v-row>
      <template v-if="loading && !templates.length">
        <v-col v-for="n in 3" :key="`tmpl-skeleton-${n}`" cols="12" md="6" lg="4">
          <v-card class="app-card pa-4">
            <v-skeleton-loader type="heading, article, actions" />
          </v-card>
        </v-col>
      </template>

      <template v-else>
        <v-col v-for="item in templates" :key="item.template_key" cols="12" md="6" lg="4">
          <v-card class="app-card pa-4 d-flex flex-column ga-3 h-100">
            <div class="d-flex align-center justify-space-between ga-2">
              <div class="text-subtitle-1 font-weight-medium">
                {{ item.name }}
              </div>
              <v-chip size="x-small" :color="item.is_active ? 'success' : 'warning'" variant="tonal">
                {{ item.is_active ? 'Active' : 'Inactive' }}
              </v-chip>
            </div>
            <div class="text-caption text-medium-emphasis">
              Key: <code>{{ item.template_key }}</code>
            </div>

            <div>
              <div class="text-caption text-medium-emphasis mb-1">Subject</div>
              <div class="text-body-2 text-truncate">{{ item.subject || '-' }}</div>
            </div>

            <div class="text-caption text-medium-emphasis mt-auto">
              Updated: {{ formatDateTime(item.updated_at) }}
            </div>

            <v-btn color="primary" variant="outlined" prepend-icon="mdi-pencil" @click="openEdit(item)">
              Edit template
            </v-btn>
          </v-card>
        </v-col>
      </template>
    </v-row>

    <v-dialog v-model="showEdit" max-width="960" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          Edit template
          <v-spacer />
          <v-btn icon variant="text" @click="showEdit = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <v-row>
            <v-col cols="12" md="8">
              <v-text-field
                ref="subjectFieldRef"
                v-model="form.subject"
                label="Subject"
                variant="outlined"
                density="comfortable"
                class="mb-3"
                @focus="insertTarget = 'subject'"
              />
              <EmailTemplateEditor
                ref="bodyEditorRef"
                v-model="form.body_html"
                label="Email body"
                placeholder="Write email content..."
                @focus="insertTarget = 'body'"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 mb-3">
                <div class="text-subtitle-2 mb-2">Available variables</div>
                <div class="text-caption text-medium-emphasis mb-2">
                  Click token to insert at current cursor position in selected target.
                </div>
                <v-chip-group v-model="insertTarget" mandatory>
                  <v-chip value="subject" size="small" variant="outlined">Subject</v-chip>
                  <v-chip value="body" size="small" variant="outlined">Body</v-chip>
                </v-chip-group>
                <div class="d-flex flex-wrap ga-2 mt-3">
                  <v-chip
                    v-for="variable in selectedTemplateVariables"
                    :key="`insert-${variable.key}`"
                    size="small"
                    color="primary"
                    variant="tonal"
                    @click="insertVariable(variable.placeholder)"
                  >
                    {{ variable.placeholder }}
                  </v-chip>
                </div>
              </v-card>
              <v-switch
                v-model="form.is_active"
                color="success"
                label="Active"
                hide-details
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showEdit = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="saveTemplate">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="2600">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'superadmin', middleware: 'role' })

useSeoMeta({
  title: 'Email Templates',
  description: 'Manage superadmin email templates for server queue notification workflows.',
})

interface TemplateVariable {
  key: string
  label: string
  placeholder: string
}

interface EmailTemplateItem {
  template_key: string
  name: string
  subject: string
  body_html: string
  variables: TemplateVariable[]
  is_active: boolean
  is_system: boolean
  updated_at: string | null
}

const loading = ref(false)
const saving = ref(false)
const templates = ref<EmailTemplateItem[]>([])
const selectedTemplate = ref<EmailTemplateItem | null>(null)
const showEdit = ref(false)
const insertTarget = ref<'subject' | 'body'>('subject')
const subjectFieldRef = ref<any>(null)
const bodyEditorRef = ref<any>(null)
const snackbar = reactive<{ show: boolean, message: string, color: 'success' | 'error' }>({
  show: false,
  message: '',
  color: 'success',
})

const form = reactive({
  subject: '',
  body_html: '',
  is_active: true,
})

const selectedTemplateVariables = computed(() => selectedTemplate.value?.variables ?? [])

function showToast(message: string, color: 'success' | 'error') {
  snackbar.show = true
  snackbar.message = message
  snackbar.color = color
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

function openEdit(item: EmailTemplateItem) {
  selectedTemplate.value = item
  form.subject = item.subject
  form.body_html = item.body_html
  form.is_active = item.is_active
  insertTarget.value = 'body'
  showEdit.value = true
}

function getSubjectInputEl() {
  const host = subjectFieldRef.value?.$el as HTMLElement | undefined
  if (!host) return null
  return host.querySelector('input') as HTMLInputElement | null
}

function insertVariable(placeholder: string) {
  if (insertTarget.value === 'subject') {
    const input = getSubjectInputEl()
    if (!input) {
      form.subject = `${form.subject}${placeholder}`
      return
    }
    const start = input.selectionStart ?? input.value.length
    const end = input.selectionEnd ?? input.value.length
    const value = input.value
    form.subject = `${value.slice(0, start)}${placeholder}${value.slice(end)}`
    nextTick(() => {
      input.focus()
      const caret = start + placeholder.length
      input.setSelectionRange(caret, caret)
    })
    return
  }
  bodyEditorRef.value?.insertTokenAtCursor?.(placeholder)
}

async function fetchTemplates() {
  loading.value = true
  try {
    const response = await $fetch<{ items: EmailTemplateItem[] }>('/api/superadmin/email-templates')
    templates.value = Array.isArray(response?.items) ? response.items : []
  }
  catch (error: any) {
    showToast(error?.data?.message || error?.message || 'Failed to load templates.', 'error')
  }
  finally {
    loading.value = false
  }
}

async function saveTemplate() {
  const key = selectedTemplate.value?.template_key
  if (!key) return
  saving.value = true
  try {
    const response = await $fetch<{ item: EmailTemplateItem }>(`/api/superadmin/email-templates/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: {
        subject: form.subject,
        body_html: form.body_html,
        is_active: form.is_active,
      },
    })
    const updated = response?.item
    if (updated) {
      templates.value = templates.value.map(item => item.template_key === updated.template_key ? updated : item)
      selectedTemplate.value = updated
    }
    showToast('Template updated.', 'success')
    showEdit.value = false
  }
  catch (error: any) {
    showToast(error?.data?.message || error?.message || 'Failed to update template.', 'error')
  }
  finally {
    saving.value = false
  }
}

onMounted(fetchTemplates)
</script>
