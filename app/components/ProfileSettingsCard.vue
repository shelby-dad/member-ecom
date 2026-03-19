<template>
  <v-card class="app-card">
    <v-card-text>
      <v-form @submit.prevent="saveProfile">
        <div class="profile-avatar-picker mb-4">
          <v-avatar size="84" color="grey-lighten-3" class="mb-2">
            <v-img v-if="form.avatar_url" :src="storageImageUrl(form.avatar_url)" cover />
            <v-icon v-else size="34" color="grey">mdi-account-outline</v-icon>
          </v-avatar>
          <div class="d-flex align-center justify-center ga-2">
            <v-btn size="small" variant="outlined" :loading="uploadingAvatar" @click="avatarInput?.click()">
              Upload Profile Image
            </v-btn>
            <v-btn
              v-if="form.avatar_url"
              size="small"
              variant="text"
              color="error"
              @click="form.avatar_url = ''"
            >
              Clear
            </v-btn>
          </div>
          <input
            ref="avatarInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="d-none"
            @change="onAvatarSelected"
          >
        </div>

        <v-row>
          <v-col cols="12">
            <v-text-field
              v-model="form.full_name"
              label="Full Name *"
              variant="outlined"
              :error-messages="errors.full_name"
              required
            />
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="form.email"
              label="Email *"
              variant="outlined"
              type="email"
              :error-messages="errors.email"
              required
            />
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="form.mobile_number"
              label="Mobile (optional)"
              variant="outlined"
              :error-messages="errors.mobile_number"
            />
          </v-col>
        </v-row>

        <v-divider class="my-2" />

        <v-row>
          <v-col cols="12">
            <v-text-field
              v-model="form.password"
              label="New Password"
              variant="outlined"
              type="password"
              hint="Leave blank to keep current password."
              persistent-hint
              :error-messages="errors.password"
            />
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="form.confirmPassword"
              label="Confirm New Password"
              variant="outlined"
              type="password"
              :error-messages="errors.confirmPassword"
            />
          </v-col>
        </v-row>

        <div class="d-flex justify-end mt-2">
          <v-btn color="primary" :loading="saving" type="submit">Update Profile</v-btn>
        </div>
      </v-form>
    </v-card-text>
  </v-card>

  <v-snackbar v-model="snackbar.open" :color="snackbar.color">
    {{ snackbar.message }}
  </v-snackbar>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const { profile, ensureProfile, fetchProfile } = useProfile()

const saving = ref(false)
const uploadingAvatar = ref(false)
const avatarInput = ref<HTMLInputElement | null>(null)
const form = reactive({
  avatar_url: '',
  full_name: '',
  email: '',
  mobile_number: '',
  password: '',
  confirmPassword: '',
})

const errors = reactive({
  full_name: '',
  email: '',
  mobile_number: '',
  password: '',
  confirmPassword: '',
})

const snackbar = reactive({
  open: false,
  message: '',
  color: 'success' as 'success' | 'error',
})

function resetErrors() {
  errors.full_name = ''
  errors.email = ''
  errors.mobile_number = ''
  errors.password = ''
  errors.confirmPassword = ''
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validateForm() {
  resetErrors()
  let valid = true

  if (!form.full_name.trim()) {
    errors.full_name = 'Full name is required.'
    valid = false
  }

  if (!form.email.trim()) {
    errors.email = 'Email is required.'
    valid = false
  } else if (!isValidEmail(form.email.trim())) {
    errors.email = 'Please enter a valid email.'
    valid = false
  }

  if (form.password && form.password.trim().length < 6) {
    errors.password = 'Password must be at least 6 characters.'
    valid = false
  }

  if (form.password && form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Password confirmation does not match.'
    valid = false
  }

  return valid
}

function hydrateFromProfile() {
  form.avatar_url = profile.value?.avatar_url ?? ''
  form.full_name = profile.value?.full_name ?? ''
  form.email = profile.value?.email ?? ''
  form.mobile_number = profile.value?.mobile_number ?? ''
}

function storageImageUrl(path: string) {
  const value = String(path ?? '').trim()
  if (!value)
    return ''
  if (value.startsWith('http://') || value.startsWith('https://'))
    return value
  const base = String(config.public.supabaseUrl || '').trim()
  return base ? `${base}/storage/v1/object/public/product-images/${value}` : value
}

async function onAvatarSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file)
    return

  const body = new FormData()
  body.append('file', file)
  uploadingAvatar.value = true
  try {
    const data = await $fetch<{ path: string }>('/api/profile/avatar', {
      method: 'POST',
      body,
    })
    form.avatar_url = String(data?.path || '').trim()
  }
  catch (error: any) {
    snackbar.color = 'error'
    snackbar.message = error?.data?.message || error?.message || 'Failed to upload profile image.'
    snackbar.open = true
  }
  finally {
    uploadingAvatar.value = false
    input.value = ''
  }
}

async function saveProfile() {
  if (!validateForm())
    return

  saving.value = true
  try {
    await $fetch('/api/profile', {
      method: 'PUT',
      body: {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        mobile_number: form.mobile_number.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
        password: form.password.trim() || undefined,
      },
    })

    form.password = ''
    form.confirmPassword = ''
    await fetchProfile()
    snackbar.color = 'success'
    snackbar.message = 'Profile updated successfully.'
    snackbar.open = true
  }
  catch (error: any) {
    const message = error?.data?.message || error?.message || 'Failed to update profile.'
    if (String(message).toLowerCase().includes('mobile')) {
      errors.mobile_number = message
    } else if (String(message).toLowerCase().includes('email')) {
      errors.email = message
    }
    snackbar.color = 'error'
    snackbar.message = message
    snackbar.open = true
  }
  finally {
    saving.value = false
  }
}

onMounted(async () => {
  await ensureProfile()
  hydrateFromProfile()
})
</script>

<style scoped>
.profile-avatar-picker {
  display: grid;
  place-items: center;
}
</style>
