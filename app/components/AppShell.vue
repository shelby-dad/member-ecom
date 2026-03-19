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
          <template v-if="siteFaviconUrl || !showBrandText">
            <v-img v-if="siteFaviconUrl" :src="siteFaviconUrl" width="28" height="28" contain />
            <span v-else class="app-shell-brand-fallback">App</span>
          </template>
          <span v-if="showBrandText" class="app-shell-brand-name">{{ siteDisplayName }}</span>
        </NuxtLink>
      </div>

      <v-divider />

      <v-list nav density="comfortable" class="px-2 py-3 app-shell-nav">
      <v-list-item
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          rounded="lg"
          :active="isActiveItem(item.to)"
          class="mb-1"
          @click="handleNavClick"
        >
          <template #prepend>
            <v-icon :icon="item.icon" />
          </template>
          <v-list-item-title>{{ item.label }}</v-list-item-title>
          <template #append>
            <v-badge
              v-if="navItemBadgeCount(item) > 0"
              :content="navItemBadgeCount(item)"
              color="success"
              class="app-shell-nav-badge"
              inline
            />
          </template>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar flat class="app-shell-bar px-2 px-sm-4">
      <v-btn icon variant="text" :aria-label="mdAndUp ? 'Toggle sidebar width' : 'Open sidebar menu'" @click="toggleDrawer">
        <v-icon>{{ drawerIcon }}</v-icon>
      </v-btn>

      <v-spacer />

      <v-menu v-if="showRoleSwitch" location="bottom end">
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

      <v-menu location="bottom end">
        <template #activator="{ props: menuProps }">
          <v-btn icon variant="text" v-bind="menuProps" aria-label="Open account menu">
            <v-avatar size="32" color="grey-lighten-3">
              <v-img v-if="profileAvatarUrl" :src="profileAvatarUrl" cover />
              <v-icon v-else size="18">mdi-account</v-icon>
            </v-avatar>
          </v-btn>
        </template>
        <v-list density="comfortable" min-width="180">
          <v-list-item prepend-icon="mdi-account-circle-outline" @click="openProfile">
            <v-list-item-title>Profile</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-logout" @click="signOut">
            <v-list-item-title>Logout</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-main class="app-shell-main">
      <div class="app-shell-glow" />
      <div v-if="isOnBehalf" class="app-on-behalf-banner d-flex align-center justify-space-between flex-wrap ga-2 px-4 py-2">
        <span class="text-body-2">
          You are seeing this because on behalf of user {{ onBehalfEmail }}.
        </span>
        <v-btn size="small" variant="tonal" color="warning" :loading="exitingOnBehalf" @click="exitOnBehalf">
          Exit
        </v-btn>
      </div>
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
}>()

const route = useRoute()
const config = useRuntimeConfig()
const { mdAndUp } = useDisplay()
const railCookie = useCookie<string | null>('app-shell-rail', { sameSite: 'lax', path: '/' })
const railStorageKey = 'app-shell-rail'
const drawer = ref(false)
const rail = ref(railCookie.value === '1')
const baseRole = ref<AppRole | null>(null)
const switchingRole = ref(false)
const exitingOnBehalf = ref(false)
const onBehalfUserId = useCookie<string | null>('on-behalf-user-id', { sameSite: 'lax', path: '/' })
const onBehalfEmail = useCookie<string | null>('on-behalf-user-email', { sameSite: 'lax', path: '/' })
let presenceTimer: ReturnType<typeof setInterval> | null = null
let lastPresencePingAt = 0

const { activeRole, availableRoles, syncActiveRole, setActiveRole } = useActiveRole(baseRole)
const shellRole = computed(() => activeRole.value ?? props.role)
const isOnBehalf = computed(() => Boolean(onBehalfUserId.value))
const { items, home } = useAppNavigation(shellRole)
const { colorMode, setMode, resolvedTheme } = useThemeMode()
const { profile, ensureProfile } = useProfile()
const memberCart = useMemberCart()
const { siteSettings } = useSiteSettings()

const roleLabelMap: Record<AppRole, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  staff: 'Staff',
  member: 'Member',
}

const roleLabel = computed(() => roleLabelMap[shellRole.value])
const showBrandText = computed(() => !mdAndUp.value || !rail.value)
const siteDisplayName = computed(() => String(siteSettings.value.site_name || '').trim() || 'App')
const siteFaviconUrl = computed(() => {
  const path = String(
    siteSettings.value.site_favicon_84
      || siteSettings.value.site_favicon_64
      || siteSettings.value.site_favicon_512
      || '',
  ).trim()
  if (!path)
    return ''
  if (path.startsWith('http://') || path.startsWith('https://'))
    return path
  const base = String(config.public.supabaseUrl || '').trim()
  return base ? `${base}/storage/v1/object/public/product-images/${path}` : path
})
const showRoleSwitch = computed(() => {
  if (!baseRole.value)
    return shellRole.value !== 'member'
  return baseRole.value !== 'member'
})
const profileRoute = computed(() => {
  if (shellRole.value === 'superadmin')
    return '/superadmin/profile'
  if (shellRole.value === 'admin')
    return '/admin/profile'
  if (shellRole.value === 'staff')
    return '/staff/profile'
  return '/member/profile'
})
const profileAvatarUrl = computed(() => {
  const path = String(profile.value?.avatar_url || '').trim()
  if (!path)
    return ''
  if (path.startsWith('http://') || path.startsWith('https://'))
    return path
  const base = String(config.public.supabaseUrl || '').trim()
  return base ? `${base}/storage/v1/object/public/product-images/${path}` : path
})

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

const activeNavItem = computed(() => {
  return [...items.value]
    .sort((a, b) => b.to.length - a.to.length)
    .find(item => route.path === item.to || route.path.startsWith(`${item.to}/`)) ?? null
})

function isActiveItem(path: string) {
  return activeNavItem.value?.to === path
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

function navItemBadgeCount(item: { to: string }) {
  if (shellRole.value !== 'member')
    return 0
  if (item.to !== '/member/checkout')
    return 0
  return Number(memberCart.items.value.length ?? 0)
}

async function pingPresence(force = false) {
  const now = Date.now()
  if (!force && now - lastPresencePingAt < 9000)
    return
  lastPresencePingAt = now
  try {
    await $fetch('/api/chat/presence/ping', { method: 'POST' })
  } catch {
    // Presence heartbeat is best-effort.
  }
}

function handlePresenceVisibility() {
  if (!import.meta.client)
    return
  if (document.visibilityState === 'visible')
    pingPresence(true)
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

watch(rail, (value) => {
  railCookie.value = value ? '1' : '0'
  if (import.meta.client)
    localStorage.setItem(railStorageKey, value ? '1' : '0')
})

onMounted(async () => {
  const persistedRail = localStorage.getItem(railStorageKey)
  if (persistedRail === '1' || persistedRail === '0')
    rail.value = persistedRail === '1'

  const currentProfile = await ensureProfile()
  baseRole.value = (currentProfile?.role as AppRole) ?? null
  syncActiveRole()
  if ((currentProfile?.role as AppRole) === 'member')
    await memberCart.ensureLoaded()

  await pingPresence(true)
  if (import.meta.client) {
    presenceTimer = setInterval(() => {
      if (document.visibilityState === 'visible')
        pingPresence()
    }, 10000)
    window.addEventListener('focus', handlePresenceVisibility)
    document.addEventListener('visibilitychange', handlePresenceVisibility)
  }
})

onBeforeUnmount(() => {
  if (presenceTimer)
    clearInterval(presenceTimer)
  if (import.meta.client) {
    window.removeEventListener('focus', handlePresenceVisibility)
    document.removeEventListener('visibilitychange', handlePresenceVisibility)
  }
})

async function signOut() {
  const supabase = useSupabaseClient()
  try {
    await $fetch('/api/chat/presence/offline', { method: 'POST' })
  } catch {
    // Best-effort before sign out.
  }
  await supabase.auth.signOut()
  useCookie('active-role').value = null
  useCookie('on-behalf-user-id').value = null
  useCookie('on-behalf-user-email').value = null
  useCookie('on-behalf-user-role').value = null
  useProfile().clearProfile()
  await navigateTo('/auth/login', { replace: true })
}

async function openProfile() {
  await navigateTo(profileRoute.value)
}

async function exitOnBehalf() {
  if (!isOnBehalf.value)
    return
  exitingOnBehalf.value = true
  try {
    await $fetch('/api/auth/on-behalf', { method: 'DELETE' })
    onBehalfUserId.value = null
    onBehalfEmail.value = null
    useCookie('on-behalf-user-role').value = null
    const resolved = setActiveRole('superadmin')
    await navigateTo(getRoleHome(resolved ?? 'superadmin'), { replace: true })
  }
  finally {
    exitingOnBehalf.value = false
  }
}
</script>

<style scoped>
.app-on-behalf-banner {
  background: rgba(245, 158, 11, 0.16);
  border-bottom: 1px solid rgba(245, 158, 11, 0.35);
}

.app-shell-nav-badge :deep(.v-badge__badge) {
  font-weight: 700;
  min-width: 20px;
  height: 20px;
  border-radius: 999px;
}
</style>
