<template>
  <v-app class="app-shell">
    <v-navigation-drawer
      v-model="drawer"
      :permanent="mdAndUp"
      :temporary="!mdAndUp"
      :rail="mdAndUp ? rail : false"
      class="app-shell-drawer"
      border="0"
    >
      <div class="app-shell-brand pa-4">
        <NuxtLink :to="home" class="app-shell-brand-link">
          {{ brand }}
        </NuxtLink>
        <p v-if="!mdAndUp || !rail" class="text-caption text-medium-emphasis mt-1 mb-0 text-uppercase">
          {{ roleLabel }}
        </p>
      </div>

      <v-divider />

      <v-list nav density="comfortable" class="px-2 py-3 app-shell-nav">
        <v-list-item
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          rounded="lg"
          :active="isActive(item.to)"
          class="mb-1"
          @click="handleNavClick"
        >
          <template #prepend>
            <v-icon :icon="item.icon" />
          </template>
          <v-list-item-title>{{ item.label }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar flat class="app-shell-bar px-2 px-sm-4">
      <v-btn icon variant="text" :aria-label="mdAndUp ? 'Toggle sidebar width' : 'Open sidebar menu'" @click="toggleDrawer">
        <v-icon>{{ drawerIcon }}</v-icon>
      </v-btn>

      <v-app-bar-title class="ms-2">
        <div class="d-flex flex-column">
          <span class="text-subtitle-1 text-sm-h6 font-weight-medium">{{ currentPageTitle }}</span>
          <span class="text-caption text-medium-emphasis">{{ brand }}</span>
        </div>
      </v-app-bar-title>

      <v-menu location="bottom end">
        <template #activator="{ props: menuProps }">
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            class="mr-1 text-capitalize"
            :loading="switchingRole"
            v-bind="menuProps"
            prepend-icon="mdi-account-switch-outline"
          >
            {{ roleLabel }}
          </v-btn>
        </template>
        <v-list density="comfortable" min-width="210">
          <v-list-subheader>Switch Role</v-list-subheader>
          <v-list-item
            v-for="role in availableRoles"
            :key="role"
            :active="role === shellRole"
            class="text-capitalize"
            @click="switchRole(role)"
          >
            <template #prepend>
              <v-icon :icon="roleIcon(role)" />
            </template>
            <v-list-item-title>{{ role }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-menu location="bottom end">
        <template #activator="{ props: menuProps }">
          <v-btn icon variant="text" v-bind="menuProps" aria-label="Select color theme">
            <v-icon>{{ themeIcon }}</v-icon>
          </v-btn>
        </template>
        <v-list density="comfortable" min-width="180">
          <v-list-subheader>Theme</v-list-subheader>
          <v-list-item
            v-for="option in themeOptions"
            :key="option.value"
            :active="colorMode === option.value"
            @click="setMode(option.value)"
          >
            <template #prepend>
              <v-icon :icon="option.icon" />
            </template>
            <v-list-item-title>{{ option.label }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-btn icon variant="text" aria-label="Sign out" @click="signOut">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main class="app-shell-main">
      <div class="app-shell-glow" />
      <div class="app-container app-section">
        <slot />
      </div>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'
import { getRoleHome } from '~/composables/useAppNavigation'
import type { AppRole } from '~/utils/role-switch'

const props = defineProps<{
  role: AppRole
  brand: string
}>()

const route = useRoute()
const { mdAndUp } = useDisplay()
const drawer = ref(false)
const rail = ref(false)
const baseRole = ref<AppRole | null>(null)
const switchingRole = ref(false)

const { activeRole, availableRoles, syncActiveRole, setActiveRole } = useActiveRole(baseRole)
const shellRole = computed(() => activeRole.value ?? props.role)
const { items, home } = useAppNavigation(shellRole)
const { colorMode, setMode, resolvedTheme } = useThemeMode()
const { ensureProfile } = useProfile()

const roleLabelMap: Record<AppRole, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  staff: 'Staff',
  member: 'Member',
}

const roleLabel = computed(() => roleLabelMap[shellRole.value])

const themeOptions = [
  { label: 'Light', value: 'light' as const, icon: 'mdi-weather-sunny' },
  { label: 'Dark', value: 'dark' as const, icon: 'mdi-weather-night' },
  { label: 'System', value: 'system' as const, icon: 'mdi-monitor' },
]

const drawerIcon = computed(() => {
  if (!mdAndUp.value)
    return 'mdi-menu'
  return rail.value ? 'mdi-menu-open' : 'mdi-menu'
})

const themeIcon = computed(() => {
  if (colorMode.value === 'system')
    return 'mdi-monitor'
  return resolvedTheme.value === 'dark' ? 'mdi-weather-night' : 'mdi-weather-sunny'
})

const currentPageTitle = computed(() => {
  const match = [...items.value]
    .sort((a, b) => b.to.length - a.to.length)
    .find(item => route.path === item.to || route.path.startsWith(`${item.to}/`))
  return match?.label ?? props.brand
})

function isActive(path: string) {
  return route.path === path || route.path.startsWith(`${path}/`)
}

function toggleDrawer() {
  if (mdAndUp.value) {
    rail.value = !rail.value
    drawer.value = true
    return
  }
  drawer.value = !drawer.value
}

function handleNavClick() {
  if (!mdAndUp.value)
    drawer.value = false
}

function roleIcon(role: AppRole) {
  if (role === 'superadmin') return 'mdi-shield-crown-outline'
  if (role === 'admin') return 'mdi-view-dashboard-outline'
  if (role === 'staff') return 'mdi-account-tie-outline'
  return 'mdi-account-outline'
}

async function switchRole(role: AppRole) {
  if (!baseRole.value || role === shellRole.value)
    return

  switchingRole.value = true
  try {
    const response = await $fetch<{ role: AppRole }>('/api/auth/active-role', { method: 'PUT', body: { role } })
    const resolved = setActiveRole(response.role)
    if (resolved)
      await navigateTo(getRoleHome(resolved), { replace: true })
  }
  finally {
    switchingRole.value = false
  }
}

watch(
  mdAndUp,
  (isDesktop) => {
    drawer.value = isDesktop
  },
  { immediate: true },
)

onMounted(async () => {
  const profile = await ensureProfile()
  baseRole.value = (profile?.role as AppRole) ?? null
  syncActiveRole()
})

async function signOut() {
  const supabase = useSupabaseClient()
  await supabase.auth.signOut()
  useCookie('active-role').value = null
  useProfile().clearProfile()
  await navigateTo('/auth/login', { replace: true })
}
</script>
