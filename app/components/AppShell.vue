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
              :color="navItemBadgeColor(item)"
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

      <v-menu
        v-if="!isMobileNotifications"
        v-model="notificationMenuOpen"
        location="bottom end"
        :close-on-content-click="false"
      >
        <template #activator="{ props: menuProps }">
          <v-btn icon variant="text" aria-label="Open notifications" v-bind="menuProps">
            <v-badge
              :model-value="notificationUnreadCount > 0"
              :content="notificationUnreadCount"
              color="warning"
              location="top end"
              offset-x="2"
              offset-y="2"
              class="app-notification-badge"
            >
              <v-icon>mdi-bell-outline</v-icon>
            </v-badge>
          </v-btn>
        </template>
          <v-card
            min-width="360"
            max-width="420"
            :style="{ height: notificationPanelHeight }"
            class="d-flex flex-column"
          >
            <v-card-title class="text-subtitle-1 py-3">
              Notifications
            </v-card-title>
            <v-divider />
            <div
              ref="notificationScrollRef"
              class="app-notification-scroll flex-grow-1"
              @scroll.passive="handleNotificationScroll"
            >
              <div v-if="notificationLoading && notificationItems.length === 0" class="pa-3">
                <v-skeleton-loader type="list-item-two-line" class="mb-2" />
                <v-skeleton-loader type="list-item-two-line" class="mb-2" />
                <v-skeleton-loader type="list-item-two-line" />
              </div>

              <v-list v-else density="comfortable" class="py-0">
                <template v-for="(item, index) in notificationItems" :key="item.id">
                  <v-list-item
                    class="app-notification-item"
                    :class="{ 'app-notification-item--unread': !item.is_read }"
                    link
                    @click.stop="openNotification(item)"
                  >
                    <template #prepend>
                      <v-icon :color="item.is_read ? 'medium-emphasis' : 'warning'">
                        {{ notificationIconByKind(item.kind) }}
                      </v-icon>
                    </template>
                    <v-list-item-title class="text-body-2 font-weight-medium app-notification-title">
                      {{ item.title }}
                    </v-list-item-title>
                    <v-list-item-subtitle class="text-body-2 app-notification-message">
                      {{ item.message }}
                    </v-list-item-subtitle>
                    <template #append>
                      <span class="text-caption text-medium-emphasis">{{ formatNotificationRelativeTime(item.created_at) }}</span>
                    </template>
                  </v-list-item>
                  <v-divider v-if="index < notificationItems.length - 1" class="mx-3 my-1" />
                </template>
              </v-list>

              <div v-if="!notificationLoading && notificationItems.length === 0" class="pa-4 text-body-2 text-medium-emphasis text-center">
                No notifications yet.
              </div>
              <div v-if="notificationLoadingMore" class="pa-2">
                <v-progress-linear indeterminate color="primary" rounded />
              </div>
            </div>
            <v-divider />
            <div class="app-notification-footer pa-3">
              <v-btn
                block
                color="primary"
                variant="tonal"
                :disabled="notificationUnreadCount <= 0 || notificationMarkingAllRead"
                :loading="notificationMarkingAllRead"
                @click="markAllNotificationsAsRead"
              >
                Mark as Read All
              </v-btn>
            </div>
          </v-card>
      </v-menu>

      <v-btn
        v-else
        icon
        variant="text"
        aria-label="Open notifications"
        @click="notificationDialogOpen = true"
      >
        <v-badge
          :model-value="notificationUnreadCount > 0"
          :content="notificationUnreadCount"
          color="warning"
          location="top end"
          offset-x="2"
          offset-y="2"
          class="app-notification-badge"
        >
          <v-icon>mdi-bell-outline</v-icon>
        </v-badge>
      </v-btn>

      <v-dialog
        v-model="notificationDialogOpen"
        fullscreen
        transition="dialog-bottom-transition"
      >
        <v-card class="d-flex flex-column">
          <v-card-title class="d-flex align-center">
            <span>Notifications</span>
            <v-spacer />
            <v-btn icon="mdi-close" variant="text" @click="notificationDialogOpen = false" />
          </v-card-title>
          <v-divider />
          <div
            ref="notificationScrollRef"
            class="app-notification-scroll flex-grow-1"
            @scroll.passive="handleNotificationScroll"
          >
            <div v-if="notificationLoading && notificationItems.length === 0" class="pa-3">
              <v-skeleton-loader type="list-item-two-line" class="mb-2" />
              <v-skeleton-loader type="list-item-two-line" class="mb-2" />
              <v-skeleton-loader type="list-item-two-line" />
            </div>

            <v-list v-else density="comfortable" class="py-0">
              <template v-for="(item, index) in notificationItems" :key="item.id">
                <v-list-item
                  class="app-notification-item"
                  :class="{ 'app-notification-item--unread': !item.is_read }"
                  link
                  @click.stop="openNotification(item)"
                >
                  <template #prepend>
                    <v-icon :color="item.is_read ? 'medium-emphasis' : 'warning'">
                      {{ notificationIconByKind(item.kind) }}
                    </v-icon>
                  </template>
                  <v-list-item-title class="text-body-2 font-weight-medium app-notification-title">
                    {{ item.title }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-body-2 app-notification-message">
                    {{ item.message }}
                  </v-list-item-subtitle>
                  <template #append>
                    <span class="text-caption text-medium-emphasis">{{ formatNotificationRelativeTime(item.created_at) }}</span>
                  </template>
                </v-list-item>
                <v-divider v-if="index < notificationItems.length - 1" class="mx-3 my-1" />
              </template>
            </v-list>

            <div v-if="!notificationLoading && notificationItems.length === 0" class="pa-4 text-body-2 text-medium-emphasis text-center">
              No notifications yet.
            </div>
            <div v-if="notificationLoadingMore" class="pa-2">
              <v-progress-linear indeterminate color="primary" rounded />
            </div>
          </div>
          <v-divider />
          <div class="app-notification-footer pa-3">
            <v-btn
              block
              color="primary"
              variant="tonal"
              :disabled="notificationUnreadCount <= 0 || notificationMarkingAllRead"
              :loading="notificationMarkingAllRead"
              @click="markAllNotificationsAsRead"
            >
              Mark as Read All
            </v-btn>
          </div>
        </v-card>
      </v-dialog>

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
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useDisplay } from 'vuetify'
import { getRoleHome } from '~/composables/useAppNavigation'
import type { AppRole } from '~/utils/role-switch'

const props = defineProps<{
  role: AppRole
}>()

const route = useRoute()
const config = useRuntimeConfig()
const { mdAndUp, xs, lgAndUp } = useDisplay()
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
let chatUnreadPollTimer: ReturnType<typeof setInterval> | null = null
let chatUnreadDebounceTimer: ReturnType<typeof setTimeout> | null = null
let chatUnreadChannel: RealtimeChannel | null = null
let notificationChannel: RealtimeChannel | null = null
let notificationDebounceTimer: ReturnType<typeof setTimeout> | null = null

const { activeRole, availableRoles, syncActiveRole, setActiveRole } = useActiveRole(baseRole)
const shellRole = computed(() => activeRole.value ?? props.role)
const isOnBehalf = computed(() => Boolean(onBehalfUserId.value))
const { items, home } = useAppNavigation(shellRole)
const { colorMode, setMode, resolvedTheme } = useThemeMode()
const { profile, ensureProfile } = useProfile()
const memberCart = useMemberCart()
const { siteSettings } = useSiteSettings()
const supabase = useSupabaseClient()
const { notifyMessage, prepareSound } = useChatNotifications()
const { registerPushSubscription } = useChatPush()
const chatUnreadCount = ref(0)
const chatPushReady = ref(false)
const notificationMenuOpen = ref(false)
const notificationDialogOpen = ref(false)
const notificationScrollRef = ref<HTMLElement | null>(null)
const notificationItems = ref<Array<{
  id: string
  kind: string
  title: string
  message: string
  target_url?: string | null
  created_at: string
  is_read: boolean
}>>([])
const notificationUnreadCount = ref(0)
const notificationPage = ref(1)
const notificationPerPage = ref(20)
const notificationTotal = ref(0)
const notificationHasMore = ref(true)
const notificationLoading = ref(false)
const notificationLoadingMore = ref(false)
const notificationMarkingAllRead = ref(false)

const isMobileNotifications = computed(() => xs.value)
const notificationPanelHeight = computed(() => (lgAndUp.value ? '75vh' : '95vh'))

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
  if (shellRole.value === 'member') {
    if (item.to === '/member/checkout')
      return Number(memberCart.items.value.length ?? 0)
    if (item.to === '/member/chat')
      return Number(chatUnreadCount.value ?? 0)
    return 0
  }

  if (shellRole.value === 'staff' && item.to === '/staff/inbox')
    return Number(chatUnreadCount.value ?? 0)
  if (shellRole.value === 'admin' && item.to === '/admin/inbox')
    return Number(chatUnreadCount.value ?? 0)
  if (shellRole.value === 'superadmin' && item.to === '/superadmin/inbox')
    return Number(chatUnreadCount.value ?? 0)

  return 0
}

function navItemBadgeColor(item: { to: string }) {
  if (
    item.to === '/member/chat'
    || item.to === '/staff/inbox'
    || item.to === '/admin/inbox'
    || item.to === '/superadmin/inbox'
  )
    return 'warning'

  return 'success'
}

function canUseRealtimeUnread() {
  if (!import.meta.client || typeof Notification === 'undefined')
    return false
  return Notification.permission === 'granted'
}

function hasWebPushSupport() {
  if (!import.meta.client)
    return false
  return 'serviceWorker' in navigator
    && 'PushManager' in window
    && window.isSecureContext
}

function isChatRoute(path: string) {
  return path.startsWith('/member/chat')
    || path.startsWith('/staff/inbox')
    || path.startsWith('/admin/inbox')
    || path.startsWith('/superadmin/inbox')
}

function trimNotificationText(message: string, max = 100) {
  const text = String(message ?? '').trim()
  if (text.length <= max)
    return text
  return `${text.slice(0, max)}...`
}

function notificationBodyFromMessage(message: string, hasAttachment: boolean) {
  const trimmed = trimNotificationText(message, 100)
  if (!hasAttachment)
    return trimmed
  if (trimmed && trimmed !== 'sent a file')
    return `${trimmed} (received image)`
  return 'received image'
}

function notificationIconByKind(kind?: string | null) {
  const value = String(kind ?? '').trim()
  if (value.includes('wallet'))
    return 'mdi-wallet-outline'
  if (value.includes('chat'))
    return 'mdi-chat-processing-outline'
  if (value.includes('payment'))
    return 'mdi-credit-card-check-outline'
  if (value.includes('order'))
    return 'mdi-receipt-text-outline'
  return 'mdi-bell-outline'
}

function notificationTargetPath(threadId?: string | null) {
  const normalizedThreadId = String(threadId ?? '').trim()
  if (shellRole.value === 'member')
    return '/member/chat'
  if (shellRole.value === 'staff')
    return normalizedThreadId ? `/staff/inbox/${normalizedThreadId}` : '/staff/inbox'
  if (shellRole.value === 'superadmin')
    return normalizedThreadId ? `/superadmin/inbox/${normalizedThreadId}` : '/superadmin/inbox'
  return normalizedThreadId ? `/admin/inbox/${normalizedThreadId}` : '/admin/inbox'
}

function formatNotificationRelativeTime(value?: string | null) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime()))
    return ''
  const diffMs = Math.max(0, Date.now() - date.getTime())
  const sec = Math.floor(diffMs / 1000)
  if (sec < 10)
    return 'just now'
  if (sec < 60)
    return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60)
    return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24)
    return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

function scheduleNotificationUnreadRefresh() {
  if (notificationDebounceTimer)
    clearTimeout(notificationDebounceTimer)
  notificationDebounceTimer = setTimeout(() => {
    refreshNotificationUnreadCount()
  }, 120)
}

async function refreshNotificationUnreadCount() {
  try {
    const data = await $fetch<{ unread: number }>('/api/notifications/unread-count')
    notificationUnreadCount.value = Math.max(0, Number(data?.unread ?? 0))
  }
  catch {
    // Best effort for badge state.
  }
}

async function loadNotifications(options?: { reset?: boolean }) {
  const reset = Boolean(options?.reset)
  if (notificationLoading.value || notificationLoadingMore.value)
    return

  if (reset) {
    notificationPage.value = 1
    notificationHasMore.value = true
  }
  if (!notificationHasMore.value && !reset)
    return

  if (notificationItems.value.length === 0 || reset)
    notificationLoading.value = true
  else
    notificationLoadingMore.value = true

  try {
    const data = await $fetch<{
      items: Array<any>
      total: number
      page: number
      per_page: number
      has_more: boolean
    }>('/api/notifications', {
      query: {
        page: notificationPage.value,
        per_page: notificationPerPage.value,
      },
    })

    const nextItems = (data?.items ?? []).map(item => ({
      id: String(item.id),
      kind: String(item.kind ?? ''),
      title: String(item.title ?? ''),
      message: String(item.message ?? ''),
      target_url: String(item.target_url ?? '').trim() || null,
      created_at: String(item.created_at ?? ''),
      is_read: Boolean(item.is_read),
    }))

    if (reset) {
      notificationItems.value = nextItems
    } else {
      const merged = [...notificationItems.value]
      const existingIds = new Set(merged.map(item => item.id))
      for (const item of nextItems) {
        if (!existingIds.has(item.id))
          merged.push(item)
      }
      notificationItems.value = merged
    }

    notificationTotal.value = Number(data?.total ?? 0)
    notificationHasMore.value = Boolean(data?.has_more)
    notificationPage.value += 1
  }
  catch {
    // Best effort for dropdown list.
  }
  finally {
    notificationLoading.value = false
    notificationLoadingMore.value = false
  }
}

async function markNotificationAsRead(id: string) {
  const normalized = String(id ?? '').trim()
  if (!normalized)
    return
  try {
    await $fetch(`/api/notifications/${normalized}/read`, { method: 'PUT' })
    notificationItems.value = notificationItems.value.map(item =>
      item.id === normalized
        ? { ...item, is_read: true }
        : item,
    )
    notificationUnreadCount.value = Math.max(
      0,
      notificationItems.value.filter(item => !item.is_read).length,
    )
  }
  catch {
    // Best effort.
  }
}

async function markAllNotificationsAsRead() {
  if (notificationMarkingAllRead.value || notificationUnreadCount.value <= 0)
    return
  notificationMarkingAllRead.value = true
  try {
    await $fetch('/api/notifications/read-all', { method: 'PUT' })
    notificationItems.value = notificationItems.value.map(item => ({ ...item, is_read: true }))
    notificationUnreadCount.value = 0
  }
  catch {
    // Best effort.
  }
  finally {
    notificationMarkingAllRead.value = false
  }
}

function openNotification(item: {
  id: string
  is_read: boolean
  target_url?: string | null
}) {
  notificationMenuOpen.value = false
  notificationDialogOpen.value = false
  if (!item.is_read)
    void markNotificationAsRead(item.id)
  const target = String(item.target_url ?? '').trim()
  if (target)
    void navigateTo(target)
}

function handleNotificationScroll() {
  const el = notificationScrollRef.value
  if (!el || notificationLoading.value || notificationLoadingMore.value || !notificationHasMore.value)
    return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 56)
    loadNotifications()
}

async function refreshChatUnreadCount() {
  if (!['member', 'staff', 'admin', 'superadmin'].includes(shellRole.value))
    return
  try {
    const data = await $fetch<{ unread: number }>('/api/chat/unread-count')
    chatUnreadCount.value = Math.max(0, Number(data?.unread ?? 0))
  } catch {
    // Sidebar unread badge is best-effort.
  }
}

function scheduleUnreadRefresh() {
  if (chatUnreadDebounceTimer)
    clearTimeout(chatUnreadDebounceTimer)
  chatUnreadDebounceTimer = setTimeout(() => {
    refreshChatUnreadCount()
  }, 120)
}

function clearUnreadWatchers() {
  if (chatUnreadPollTimer) {
    clearInterval(chatUnreadPollTimer)
    chatUnreadPollTimer = null
  }
  if (chatUnreadDebounceTimer) {
    clearTimeout(chatUnreadDebounceTimer)
    chatUnreadDebounceTimer = null
  }
  chatUnreadChannel?.unsubscribe()
  chatUnreadChannel = null
}

function clearNotificationWatchers() {
  if (notificationDebounceTimer) {
    clearTimeout(notificationDebounceTimer)
    notificationDebounceTimer = null
  }
  notificationChannel?.unsubscribe()
  notificationChannel = null
}

async function setupUnreadWatchers() {
  clearUnreadWatchers()
  await refreshChatUnreadCount()

  if (canUseRealtimeUnread()) {
    chatUnreadChannel = supabase
      .channel(`app-shell-unread-${shellRole.value}-${String(profile.value?.id ?? '')}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, async (payload: any) => {
        scheduleUnreadRefresh()
        if (String(payload?.eventType ?? '') !== 'INSERT')
          return

        const senderId = String(payload?.new?.sender_id ?? '')
        const actorId = String(profile.value?.id ?? '')
        if (!senderId || !actorId || senderId === actorId)
          return

        if (isChatRoute(route.path))
          return

        // Avoid duplicate notifications (Safari especially):
        // when web-push is active, service worker push will notify.
        if (chatPushReady.value)
          return

        const incomingMessage = String(payload?.new?.message ?? '')
        const hasAttachment = Boolean(payload?.new?.attachment_path)
        const incomingThreadId = String(payload?.new?.thread_id ?? '')
        const title = shellRole.value === 'member' ? 'Shop message' : 'New member message'
        const body = notificationBodyFromMessage(incomingMessage, hasAttachment)
        await notifyMessage(title, body, notificationTargetPath(incomingThreadId), { forcePush: true })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads' }, () => {
        scheduleUnreadRefresh()
      })
      .subscribe()
    return
  }

  chatUnreadPollTimer = setInterval(() => {
    refreshChatUnreadCount()
  }, 12000)
}

async function setupNotificationWatchers() {
  clearNotificationWatchers()
  await refreshNotificationUnreadCount()
  if (!profile.value?.id)
    return

  notificationChannel = supabase
    .channel(`app-shell-user-notifications-${String(profile.value.id)}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${String(profile.value.id)}`,
      },
      async (payload: any) => {
        const eventType = String(payload?.eventType ?? '')
        if (eventType === 'INSERT') {
          const row = payload?.new ?? {}
          const id = String(row.id ?? '')
          if (!id)
            return
          const next = {
            id,
            kind: String(row.kind ?? ''),
            title: String(row.title ?? ''),
            message: String(row.message ?? ''),
            target_url: String(row.target_url ?? '').trim() || null,
            created_at: String(row.created_at ?? ''),
            is_read: Boolean(row.is_read),
          }
          notificationItems.value = [
            next,
            ...notificationItems.value.filter(item => item.id !== id),
          ]
          scheduleNotificationUnreadRefresh()
          return
        }

        if (eventType === 'UPDATE') {
          const id = String(payload?.new?.id ?? '')
          if (!id)
            return
          notificationItems.value = notificationItems.value.map((item) => {
            if (item.id !== id)
              return item
            return {
              ...item,
              title: String(payload?.new?.title ?? item.title),
              kind: String(payload?.new?.kind ?? item.kind),
              message: String(payload?.new?.message ?? item.message),
              target_url: String(payload?.new?.target_url ?? item.target_url ?? '').trim() || null,
              created_at: String(payload?.new?.created_at ?? item.created_at),
              is_read: Boolean(payload?.new?.is_read),
            }
          })
          scheduleNotificationUnreadRefresh()
        }
      },
    )
    .subscribe()
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
    await setupUnreadWatchers()
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

watch(shellRole, () => {
  setupUnreadWatchers()
  setupNotificationWatchers()
})

watch(() => route.fullPath, () => {
  refreshChatUnreadCount()
})

watch([notificationMenuOpen, notificationDialogOpen], ([menuOpen, dialogOpen]) => {
  const open = Boolean(menuOpen || dialogOpen)
  if (!open)
    return
  if (!notificationItems.value.length) {
    loadNotifications({ reset: true })
    return
  }
  refreshNotificationUnreadCount()
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
  await setupUnreadWatchers()
  await setupNotificationWatchers()
  await prepareSound()
  if (import.meta.client && typeof Notification !== 'undefined' && Notification.permission === 'granted' && hasWebPushSupport()) {
    const ok = await registerPushSubscription(String(config.public.vapidPublicKey ?? '')).catch(() => false)
    chatPushReady.value = Boolean(ok)
  } else {
    chatPushReady.value = false
  }

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
  clearUnreadWatchers()
  clearNotificationWatchers()
})

async function signOut() {
  clearUnreadWatchers()
  clearNotificationWatchers()
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

.app-notification-badge :deep(.v-badge__badge) {
  min-width: 16px;
  height: 16px;
  font-size: 10px;
  font-weight: 700;
  padding: 0 4px;
  border-radius: 999px;
}

.app-notification-scroll {
  overflow-y: auto;
}

.app-notification-item {
  cursor: pointer;
}

.app-notification-item--unread {
  background: rgba(var(--v-theme-primary), 0.06);
}

.app-notification-title,
.app-notification-message {
  display: block !important;
  max-height: none !important;
  white-space: normal !important;
  word-break: break-word;
  overflow-wrap: anywhere;
  overflow: visible !important;
  text-overflow: initial !important;
  -webkit-line-clamp: unset !important;
  line-clamp: unset !important;
}
</style>
