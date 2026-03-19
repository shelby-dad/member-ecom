<template>
  <v-row>
    <template v-if="mode === 'operator'">
      <v-col cols="12" md="8" lg="9">
        <v-card class="app-card chat-panel">
          <v-card-title class="d-flex align-center ga-2">
            <div class="d-flex flex-column min-w-0">
              <span class="text-subtitle-1 text-truncate">{{ selectedThread ? threadTitle(selectedThread) : 'Conversation' }}</span>
              <span class="text-caption text-medium-emphasis text-truncate">{{ selectedThreadPresenceText }}</span>
            </div>
            <v-spacer />
            <v-btn
              v-if="canToggleBan && selectedThread"
              size="small"
              :color="selectedThread.status === 'banned' ? 'success' : 'error'"
              variant="tonal"
              :loading="banLoading"
              @click="toggleBan"
            >
              {{ selectedThread.status === 'banned' ? 'Unban' : 'Ban' }}
            </v-btn>
          </v-card-title>

          <v-card-text>
            <div v-if="!selectedThread" class="chat-start-wrap">
              <div class="text-center">
                <v-icon size="86" class="chat-empty-icon mb-3">mdi-chat-processing-outline</v-icon>
                <p class="text-subtitle-1 mb-0">Select conversation to assign or reply members' messages</p>
              </div>
            </div>

            <template v-else>
            <div v-if="canAssignOperator && selectedThread" class="mb-3 d-flex align-center ga-2">
              <v-select
                v-model="assignedTo"
                :items="operatorItems"
                item-title="title"
                item-value="value"
                label="Assign operator"
                density="compact"
                variant="outlined"
                hide-details
                style="max-width: 320px"
                clearable
              />
              <v-btn size="small" :loading="assignLoading" @click="saveAssignment">Assign</v-btn>
            </div>

            <div ref="messageContainerRef" class="chat-message-wrap mb-3">
              <div v-if="showMessageSkeleton" class="chat-loading-wrap">
                <v-skeleton-loader
                  v-for="index in 4"
                  :key="`msg-skeleton-${index}`"
                  type="article"
                  class="mb-2"
                />
              </div>
              <template v-else>
                <div
                  v-for="message in displayedMessages"
                  :key="message.id"
                  class="chat-message-row"
                  :class="{ 'chat-message-row--mine': message.sender_id === actorId }"
                >
                  <v-avatar
                    v-if="message.sender_id !== actorId"
                    size="32"
                    color="grey-lighten-3"
                    class="chat-avatar"
                  >
                    <v-img v-if="avatarUrl(message.sender?.avatar_url)" :src="avatarUrl(message.sender?.avatar_url)" cover />
                    <v-icon v-else size="16">mdi-account</v-icon>
                  </v-avatar>

                  <div class="chat-message-stack" :class="{ 'chat-message-stack--mine': message.sender_id === actorId }">
                    <div v-if="message.sender_id !== actorId" class="chat-name-outside">{{ senderLabel(message) }}</div>
                    <div
                      class="chat-bubble"
                      :class="{
                        'chat-bubble--pending': message._pending,
                        'chat-bubble--mine': message.sender_id === actorId,
                      }"
                    >
                      <div class="chat-bubble-text">{{ message.message }}</div>
                    </div>
                    <div class="chat-meta-row">
                      <span class="chat-meta-text">{{ formatDateTime(message.created_at) }}</span>
                      <div v-if="deliveryState(message)" class="chat-delivery">
                        <v-progress-circular v-if="deliveryState(message) === 'pending'" indeterminate size="10" width="2" color="primary" />
                        <v-icon v-else-if="deliveryState(message) === 'sent'" size="12" icon="mdi-check" />
                        <v-icon v-else size="12" icon="mdi-check-all" color="primary" />
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="!displayedMessages.length" class="text-center text-caption text-medium-emphasis py-6">
                  No messages yet
                </div>
              </template>
            </div>

            <v-alert
              v-if="sendError"
              type="error"
              variant="tonal"
              density="comfortable"
              class="mb-2"
            >
              {{ sendError }}
            </v-alert>

            <div class="chat-composer d-flex align-center ga-2 flex-wrap">
              <v-textarea
                v-model="draft"
                placeholder="Message"
                density="compact"
                rows="1"
                auto-grow
                max-rows="4"
                hide-details
                variant="outlined"
                class="flex-grow-1 chat-input"
                :disabled="!selectedThread || selectedThread.status === 'banned'"
                @keydown.enter.exact.prevent="sendMessage"
              />
              <v-btn
                color="primary"
                icon="mdi-send"
                :loading="sending"
                class="chat-send-btn"
                :disabled="!selectedThread || !draft.trim() || selectedThread.status === 'banned'"
                @click="sendMessage"
              />
            </div>
            </template>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4" lg="3">
        <v-card class="app-card chat-panel">
          <v-card-title class="d-flex align-center ga-2">
            <span>Inbox</span>
            <v-spacer />
            <v-btn
              size="small"
              variant="text"
              color="success"
              icon="mdi-bell-ring-outline"
              aria-label="Enable notifications"
              @click="enableNotifications"
            />
          </v-card-title>
          <v-card-text class="pt-0">
            <v-text-field
              v-model="search"
              density="compact"
              variant="outlined"
              prepend-inner-icon="mdi-magnify"
              label="Search"
              hide-details
              class="mb-3"
            />

            <div v-if="showThreadSkeleton" class="chat-thread-list pt-1">
              <v-skeleton-loader
                v-for="index in 6"
                :key="`thread-skeleton-${index}`"
                class="mb-2"
                type="list-item-avatar-two-line"
              />
            </div>

            <v-list v-else class="chat-thread-list" density="comfortable">
              <v-list-item
                v-for="thread in filteredThreads"
                :key="thread.id"
                :active="selectedThreadId === thread.id"
                rounded="lg"
                class="mb-1"
                @click="selectThread(thread.id)"
              >
                <template #prepend>
                  <v-avatar size="34" color="grey-lighten-3">
                    <v-img v-if="avatarUrl(threadDisplayAvatar(thread))" :src="avatarUrl(threadDisplayAvatar(thread))" cover />
                    <v-icon v-else size="18">mdi-account</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="text-body-2 font-weight-medium">
                  {{ threadTitle(thread) }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption text-truncate">
                  {{ thread.last_message_preview || 'No messages yet' }}
                </v-list-item-subtitle>
                <template #append>
                  <div class="d-flex align-center ga-1">
                    <span
                      class="chat-presence-dot"
                      :class="threadPresence(thread) ? 'chat-presence-dot--online' : 'chat-presence-dot--offline'"
                    />
                    <span
                      v-if="mode === 'operator' && getUnreadCount(thread.id) > 0"
                      class="chat-unread-badge"
                    >
                      {{ getUnreadCount(thread.id) }}
                    </span>
                    <v-chip v-if="thread.status === 'banned'" size="x-small" color="error" variant="tonal">Banned</v-chip>
                  </div>
                </template>
              </v-list-item>
              <p v-if="!filteredThreads.length" class="text-caption text-medium-emphasis mt-2 mb-0">
                No conversations
              </p>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </template>

    <v-col v-else cols="12">
      <v-card class="app-card chat-panel">
        <v-card-title class="d-flex align-center ga-2">
          <span>Chat to Shop</span>
          <v-spacer />
          <v-btn
            size="small"
            variant="text"
            color="success"
            icon="mdi-bell-ring-outline"
            aria-label="Enable notifications"
            @click="enableNotifications"
          />
        </v-card-title>
        <v-card-text>
          <v-alert
            v-if="showSafariPushHint"
            type="info"
            variant="tonal"
            density="comfortable"
            icon="mdi-apple-safari"
            class="mb-3"
          >
            Safari on iPhone/iPad needs Add to Home Screen first. Open the installed app, then enable notifications.
          </v-alert>

          <div v-if="showThreadSkeleton" class="chat-member-skeleton">
            <div class="chat-member-skeleton-head mb-3">
              <v-skeleton-loader type="list-item-avatar-two-line" />
            </div>
            <div class="chat-member-skeleton-body mb-3">
              <v-skeleton-loader type="list-item-avatar" class="mb-3" />
              <v-skeleton-loader type="list-item-two-line" class="mb-3 ml-8" />
              <v-skeleton-loader type="list-item-avatar" class="mb-3" />
              <v-skeleton-loader type="list-item-two-line" class="ml-8" />
            </div>
            <div class="chat-member-skeleton-composer d-flex align-center ga-2">
              <v-skeleton-loader class="flex-grow-1" type="text" />
              <v-skeleton-loader width="40" height="40" type="avatar" />
            </div>
          </div>

          <div v-else-if="!selectedThread && !threads.length" class="chat-start-wrap">
            <div class="text-center mb-4">
              <p class="text-subtitle-1 mb-1">Need help from the shop team?</p>
              <p class="text-body-2 text-medium-emphasis mb-0">Start your conversation and keep everything in one inbox.</p>
            </div>
            <v-btn color="primary" size="large" :loading="creatingThread" @click="startConversation">
              Start conversation
            </v-btn>
          </div>

          <template v-else-if="selectedThread">
            <div ref="messageContainerRef" class="chat-message-wrap mb-3">
              <div v-if="memberConversationStatusText" class="chat-state-separator">
                <span class="chat-state-separator__line" />
                <span class="chat-state-separator__text">{{ memberConversationStatusText }}</span>
                <span class="chat-state-separator__line" />
              </div>
              <div v-if="showMessageSkeleton" class="chat-loading-wrap">
                <v-skeleton-loader
                  v-for="index in 4"
                  :key="`member-msg-skeleton-${index}`"
                  type="article"
                  class="mb-2"
                />
              </div>
              <template v-else>
                <div
                  v-for="message in displayedMessages"
                  :key="message.id"
                  class="chat-message-row"
                  :class="{ 'chat-message-row--mine': message.sender_id === actorId }"
                >
                  <v-avatar
                    v-if="message.sender_id !== actorId"
                    size="32"
                    color="grey-lighten-3"
                    class="chat-avatar"
                  >
                    <v-img v-if="avatarUrl(message.sender?.avatar_url)" :src="avatarUrl(message.sender?.avatar_url)" cover />
                    <v-icon v-else size="16">mdi-account</v-icon>
                  </v-avatar>

                  <div class="chat-message-stack" :class="{ 'chat-message-stack--mine': message.sender_id === actorId }">
                    <div v-if="message.sender_id !== actorId" class="chat-name-outside">{{ senderLabel(message) }}</div>
                    <div
                      class="chat-bubble"
                      :class="{
                        'chat-bubble--pending': message._pending,
                        'chat-bubble--mine': message.sender_id === actorId,
                      }"
                    >
                      <div class="chat-bubble-text">{{ message.message }}</div>
                    </div>
                    <div class="chat-meta-row">
                      <span class="chat-meta-text">{{ formatDateTime(message.created_at) }}</span>
                      <div v-if="deliveryState(message)" class="chat-delivery">
                        <v-progress-circular v-if="deliveryState(message) === 'pending'" indeterminate size="10" width="2" color="primary" />
                        <v-icon v-else-if="deliveryState(message) === 'sent'" size="12" icon="mdi-check" />
                        <v-icon v-else size="12" icon="mdi-check-all" color="primary" />
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="!displayedMessages.length" class="text-center text-caption text-medium-emphasis py-6">
                  No messages yet
                </div>
              </template>
            </div>

            <v-alert
              v-if="sendError"
              type="error"
              variant="tonal"
              density="comfortable"
              class="mb-2"
            >
              {{ sendError }}
            </v-alert>

            <div class="chat-composer d-flex align-center ga-2 flex-wrap">
              <v-textarea
                v-model="draft"
                placeholder="Message"
                density="compact"
                rows="1"
                auto-grow
                max-rows="4"
                hide-details
                variant="outlined"
                class="flex-grow-1 chat-input"
                :disabled="isSendDisabled"
                @keydown.enter.exact.prevent="sendMessage"
              />
              <v-btn
                color="primary"
                icon="mdi-send"
                :loading="sending"
                class="chat-send-btn"
                :disabled="isSendDisabled || !draft.trim()"
                @click="sendMessage"
              />
            </div>
          </template>
          <div v-else class="chat-start-wrap">
            <v-skeleton-loader class="w-100" type="article" />
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import type { RealtimeChannel } from '@supabase/supabase-js'

type ChatMessage = {
  id: string
  thread_id: string
  sender_id: string
  message: string
  read_at: string | null
  created_at: string
  sender?: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
    role: string
  } | null
  _pending?: boolean
}

const props = defineProps<{
  mode: 'member' | 'operator'
}>()

const config = useRuntimeConfig()
const route = useRoute()
const supabase = useSupabaseClient()
const { profile, ensureProfile } = useProfile()
const { ensurePermission, notifyMessage, prepareSound } = useChatNotifications()
const { isSupported: isPushSupported, registerPushSubscription } = useChatPush()

const creatingThread = ref(false)
const sending = ref(false)
const sendError = ref('')
const banLoading = ref(false)
const assignLoading = ref(false)
const threadsLoading = ref(false)
const messagesLoading = ref(false)
const hasLoadedThreadsOnce = ref(false)
const hasLoadedMessagesOnce = ref(false)
const isConversationSwitching = ref(false)
const search = ref('')
const draft = ref('')
const threads = ref<any[]>([])
const messages = ref<ChatMessage[]>([])
const pendingMessages = ref<ChatMessage[]>([])
const unreadByThread = ref<Record<string, number>>({})
const selectedThreadId = ref<string | null>(null)
const operators = ref<any[]>([])
const assignedTo = ref<string | null>(null)
const messageContainerRef = ref<HTMLElement | null>(null)
const presenceNowTick = ref(Date.now())
let channel: RealtimeChannel | null = null
let presenceClockTimer: ReturnType<typeof setInterval> | null = null

const actorId = computed(() => String(profile.value?.id || ''))
const actorRole = computed(() => String(profile.value?.role || 'member'))
const canAssignOperator = computed(() => props.mode === 'operator' && (actorRole.value === 'admin' || actorRole.value === 'superadmin'))
const canToggleBan = computed(() => props.mode === 'operator' && ['staff', 'admin', 'superadmin'].includes(actorRole.value))
const selectedThread = computed(() => threads.value.find((thread: any) => thread.id === selectedThreadId.value) ?? null)
const displayedMessages = computed(() => [...messages.value, ...pendingMessages.value])
const showThreadSkeleton = computed(() => threadsLoading.value && !hasLoadedThreadsOnce.value)
const showMessageSkeleton = computed(() =>
  messagesLoading.value && (!hasLoadedMessagesOnce.value || isConversationSwitching.value),
)
const isSafariBrowser = computed(() => {
  if (!import.meta.client)
    return false
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('crios') && !ua.includes('fxios')
})
const isIOSDevice = computed(() => {
  if (!import.meta.client)
    return false
  const ua = navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(ua)
})
const showSafariPushHint = computed(() => isSafariBrowser.value && (isIOSDevice.value || !isPushSupported.value))
const filteredThreads = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q)
    return threads.value
  return threads.value.filter((thread: any) => {
    const memberName = String(thread?.member?.full_name ?? thread?.member?.email ?? '').toLowerCase()
    const assignedName = String(thread?.assigned?.full_name ?? thread?.assigned?.email ?? '').toLowerCase()
    const preview = String(thread?.last_message_preview ?? '').toLowerCase()
    return memberName.includes(q) || assignedName.includes(q) || preview.includes(q)
  })
})
const selectedThreadPresenceText = computed(() => {
  if (!selectedThread.value)
    return ''
  return threadPresence(selectedThread.value) ? 'Online' : 'Offline'
})
const memberUnassignedLocked = computed(() =>
  props.mode === 'member'
  && Boolean(selectedThread.value)
  && !selectedThread.value?.assigned_to
  && selectedThread.value?.member_can_send === false,
)
const isSendDisabled = computed(() =>
  !selectedThread.value || selectedThread.value.status === 'banned' || memberUnassignedLocked.value,
)
const memberConversationStatusText = computed(() => {
  if (props.mode !== 'member' || !selectedThread.value)
    return ''
  if (selectedThread.value.assigned_to)
    return 'conversation was assigned'
  return 'conversation was unassigned'
})

const operatorItems = computed(() => [
  { title: 'Unassigned', value: null },
  ...operators.value.map((item: any) => ({
    title: `${item.full_name || item.email} (${item.role})`,
    value: item.id,
  })),
])

function avatarUrl(path?: string | null) {
  const value = String(path ?? '').trim()
  if (!value)
    return ''
  if (value.startsWith('http://') || value.startsWith('https://'))
    return value
  const base = String(config.public.supabaseUrl || '').trim()
  return base ? `${base}/storage/v1/object/public/product-images/${value}` : value
}

function threadDisplayAvatar(thread: any) {
  if (props.mode === 'member')
    return thread?.assigned?.avatar_url ?? null
  return thread?.member?.avatar_url ?? null
}

function threadTitle(thread: any) {
  if (props.mode === 'member') {
    if (thread?.assigned)
      return thread.assigned.full_name || thread.assigned.email || 'Shop'
    return 'Shop support'
  }
  return thread?.member?.full_name || thread?.member?.email || 'Member'
}

function threadPresence(thread: any) {
  const subject = props.mode === 'operator' ? thread?.member : thread?.assigned
  const lastSeen = String(subject?.presence_last_seen_at ?? '').trim()
  if (lastSeen) {
    const ageMs = presenceNowTick.value - new Date(lastSeen).getTime()
    return Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= 60_000
  }
  return Boolean(subject?.is_online)
}

function senderLabel(message: ChatMessage) {
  if (message?._pending)
    return 'Sending...'
  if (message?.sender?.full_name)
    return message.sender.full_name
  if (message?.sender?.email)
    return message.sender.email
  return 'User'
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function deliveryState(message: ChatMessage) {
  if (message.sender_id !== actorId.value)
    return null
  if (message._pending)
    return 'pending'
  if (message.read_at)
    return 'seen'
  return 'sent'
}

async function scrollToBottom() {
  await nextTick()
  if (!messageContainerRef.value)
    return
  messageContainerRef.value.scrollTop = messageContainerRef.value.scrollHeight
}

function reconcilePendingMessages(serverItems: ChatMessage[]) {
  if (!pendingMessages.value.length)
    return
  const serverOwn = serverItems.filter(item => item.sender_id === actorId.value)
  pendingMessages.value = pendingMessages.value.filter((pending) => {
    const pendingAt = new Date(pending.created_at).getTime()
    return !serverOwn.some((item) => {
      const sameMessage = item.message.trim() === pending.message.trim()
      const itemAt = new Date(item.created_at).getTime()
      const closeTimestamp = Math.abs(itemAt - pendingAt) <= 15000
      return sameMessage && closeTimestamp
    })
  })
}

function getUnreadCount(threadId: string) {
  return Number(unreadByThread.value[threadId] ?? 0)
}

function clearUnread(threadId?: string | null) {
  const id = String(threadId ?? '')
  if (!id)
    return
  if (!unreadByThread.value[id])
    return
  delete unreadByThread.value[id]
  unreadByThread.value = { ...unreadByThread.value }
}

function incrementUnread(threadId?: string | null) {
  const id = String(threadId ?? '')
  if (!id)
    return
  unreadByThread.value = {
    ...unreadByThread.value,
    [id]: getUnreadCount(id) + 1,
  }
}

function moveThreadToTop(threadId?: string | null, patch?: { last_message_at?: string | null; last_message_preview?: string | null }) {
  const id = String(threadId ?? '')
  if (!id)
    return
  const index = threads.value.findIndex((thread: any) => thread.id === id)
  if (index < 0)
    return
  const [target] = threads.value.splice(index, 1)
  if (patch) {
    if (patch.last_message_at !== undefined)
      target.last_message_at = patch.last_message_at
    if (patch.last_message_preview !== undefined)
      target.last_message_preview = patch.last_message_preview
  }
  threads.value.unshift(target)
}

function applyThreadPatchFromRealtime(payloadThread: any) {
  const threadId = String(payloadThread?.id ?? '')
  if (!threadId)
    return
  const index = threads.value.findIndex((thread: any) => String(thread.id) === threadId)
  if (index >= 0) {
    threads.value[index] = {
      ...threads.value[index],
      ...payloadThread,
    }
    threads.value = [...threads.value]
    if (payloadThread?.last_message_at || payloadThread?.last_message_preview)
      moveThreadToTop(threadId, {
        last_message_at: payloadThread?.last_message_at ?? undefined,
        last_message_preview: payloadThread?.last_message_preview ?? undefined,
      })
  } else if (props.mode === 'member' && String(payloadThread?.member_id ?? '') === actorId.value) {
    // Fallback for member when thread appears for the first time in realtime.
    loadThreads()
  }
}

async function loadThreads() {
  threadsLoading.value = true
  try {
    const data = await $fetch<{ items: any[] }>('/api/chat/threads')
    const nextThreads = data?.items ?? []
    const nextIds = new Set(nextThreads.map((thread: any) => String(thread.id)))
    const preservedUnread: Record<string, number> = {}
    for (const [threadId, count] of Object.entries(unreadByThread.value)) {
      if (nextIds.has(threadId) && count > 0)
        preservedUnread[threadId] = count
    }
    unreadByThread.value = preservedUnread
    threads.value = nextThreads

    if (props.mode === 'member' && !selectedThreadId.value && threads.value.length)
      selectedThreadId.value = threads.value[0].id

    if (selectedThreadId.value && !threads.value.some((thread: any) => thread.id === selectedThreadId.value))
      selectedThreadId.value = null

    if (selectedThread.value)
      assignedTo.value = selectedThread.value.assigned_to
  }
  finally {
    threadsLoading.value = false
    hasLoadedThreadsOnce.value = true
  }
}

async function loadMessages() {
  if (!selectedThreadId.value) {
    messages.value = []
    pendingMessages.value = []
    return
  }
  messagesLoading.value = true
  try {
    const data = await $fetch<{ items: ChatMessage[] }>(`/api/chat/threads/${selectedThreadId.value}/messages`)
    const serverItems = data?.items ?? []
    messages.value = serverItems
    reconcilePendingMessages(serverItems)
    clearUnread(selectedThreadId.value)
    assignedTo.value = selectedThread.value?.assigned_to ?? null
    await scrollToBottom()
  }
  finally {
    messagesLoading.value = false
    hasLoadedMessagesOnce.value = true
    isConversationSwitching.value = false
  }
}

async function selectThread(threadId: string) {
  isConversationSwitching.value = true
  clearUnread(threadId)
  selectedThreadId.value = threadId
}

async function startConversation() {
  creatingThread.value = true
  try {
    const data = await $fetch<{ thread: any }>('/api/chat/threads', { method: 'POST' })
    await loadThreads()
    selectedThreadId.value = data?.thread?.id ?? selectedThreadId.value
    await loadMessages()
  }
  finally {
    creatingThread.value = false
  }
}

async function sendMessage() {
  if (!selectedThreadId.value || !draft.value.trim())
    return

  sendError.value = ''
  const text = draft.value.trim()
  draft.value = ''
  const tempId = `tmp-${Date.now()}-${Math.round(Math.random() * 100000)}`

  pendingMessages.value.push({
    id: tempId,
    thread_id: selectedThreadId.value,
    sender_id: actorId.value,
    message: text,
    read_at: null,
    created_at: new Date().toISOString(),
    sender: {
      id: actorId.value,
      full_name: profile.value?.full_name ?? null,
      email: profile.value?.email ?? null,
      avatar_url: profile.value?.avatar_url ?? null,
      role: actorRole.value,
    },
    _pending: true,
  })
  await scrollToBottom()

  sending.value = true
  try {
    const endpoint = `/api/chat/threads/${selectedThreadId.value}/messages`
    let response: { item: ChatMessage } | null = null
    try {
      response = await $fetch<{ item: ChatMessage }>(endpoint, {
        method: 'POST',
        credentials: 'include',
        body: { message: text },
      })
    } catch (error: any) {
      const status = Number(error?.statusCode ?? error?.status ?? error?.data?.statusCode ?? 0)
      if (import.meta.client && status === 401) {
        try {
          await supabase.auth.getSession()
          response = await $fetch<{ item: ChatMessage }>(endpoint, {
            method: 'POST',
            credentials: 'include',
            body: { message: text },
          })
        } catch {
          throw error
        }
      } else {
        throw error
      }
    }

    pendingMessages.value = pendingMessages.value.filter(message => message.id !== tempId)
    if (response?.item && !messages.value.some(message => message.id === response.item.id)) {
      messages.value.push({
        ...response.item,
        sender: {
          id: actorId.value,
          full_name: profile.value?.full_name ?? null,
          email: profile.value?.email ?? null,
          avatar_url: profile.value?.avatar_url ?? null,
          role: actorRole.value,
        },
      })
      await scrollToBottom()
    }

    if (props.mode === 'member' && selectedThread.value && !selectedThread.value.assigned_to) {
      selectedThread.value.member_can_send = false
      selectedThread.value.member_message_count = Number(selectedThread.value.member_message_count ?? 0) + 1
      threads.value = [...threads.value]
    }

    await loadThreads()
  }
  catch (error) {
    pendingMessages.value = pendingMessages.value.filter(message => message.id !== tempId)
    draft.value = text
    sendError.value = String((error as any)?.data?.message ?? (error as any)?.message ?? 'Failed to send message.')
  }
  finally {
    sending.value = false
  }
}

async function toggleBan() {
  if (!selectedThread.value)
    return
  banLoading.value = true
  try {
    const status = selectedThread.value.status === 'banned' ? 'open' : 'banned'
    await $fetch(`/api/chat/threads/${selectedThread.value.id}/ban`, {
      method: 'PUT',
      body: { status },
    })
    await loadThreads()
    await loadMessages()
  }
  finally {
    banLoading.value = false
  }
}

async function loadOperators() {
  if (!canAssignOperator.value)
    return
  const data = await $fetch<{ items: any[] }>('/api/chat/operators')
  operators.value = data?.items ?? []
}

async function saveAssignment() {
  if (!canAssignOperator.value || !selectedThread.value)
    return
  assignLoading.value = true
  try {
    await $fetch(`/api/chat/threads/${selectedThread.value.id}/assign`, {
      method: 'PUT',
      body: { assigned_to: assignedTo.value || null },
    })
    await loadThreads()
  }
  finally {
    assignLoading.value = false
  }
}

async function enableNotifications() {
  const permission = await ensurePermission()
  await prepareSound()
  if (permission === 'granted') {
    await registerPushSubscription(String(config.public.vapidPublicKey ?? '')).catch(() => false)
    await notifyMessage(
      'Chat notifications enabled',
      'This device is ready for new chat message alerts.',
      route.path,
      { forcePush: true },
    )
  }
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null
function scheduleRefresh(delay = 220) {
  if (refreshTimer)
    clearTimeout(refreshTimer)
  refreshTimer = setTimeout(async () => {
    await loadThreads()
    if (selectedThreadId.value)
      await loadMessages()
  }, delay)
}

function hasThreadWithUser(userId: string) {
  if (!userId)
    return false
  return threads.value.some((thread: any) =>
    String(thread?.member_id ?? '') === userId || String(thread?.assigned_to ?? '') === userId,
  )
}

function applyPresenceToThreads(userId: string, isOnline: boolean, lastSeenAt?: string | null) {
  if (!userId)
    return
  let changed = false
  const normalizedLastSeen = String(lastSeenAt ?? '').trim() || null
  const next = threads.value.map((thread: any) => {
    const candidate = { ...thread }
    if (String(candidate?.member?.id ?? '') === userId) {
      const memberChanged = candidate.member?.is_online !== isOnline || String(candidate.member?.presence_last_seen_at ?? '') !== String(normalizedLastSeen ?? '')
      if (memberChanged) {
        candidate.member = { ...(candidate.member ?? {}), is_online: isOnline, presence_last_seen_at: normalizedLastSeen }
        changed = true
      }
    }
    if (String(candidate?.assigned?.id ?? '') === userId) {
      const assignedChanged = candidate.assigned?.is_online !== isOnline || String(candidate.assigned?.presence_last_seen_at ?? '') !== String(normalizedLastSeen ?? '')
      if (assignedChanged) {
        candidate.assigned = { ...(candidate.assigned ?? {}), is_online: isOnline, presence_last_seen_at: normalizedLastSeen }
        changed = true
      }
    }
    return candidate
  })
  if (changed)
    threads.value = next
}
      
function refreshPresenceClock() {
  presenceNowTick.value = Date.now()
}

async function handleIncomingNotification(payload: any) {
  const senderId = String(payload?.new?.sender_id ?? '')
  if (!senderId || senderId === actorId.value)
    return

  const incomingThreadId = String(payload?.new?.thread_id ?? '')
  const incomingMessage = String(payload?.new?.message ?? '')
  const incomingCreatedAt = String(payload?.new?.created_at ?? '')
  if (props.mode === 'operator' && incomingThreadId) {
    if (selectedThreadId.value !== incomingThreadId)
      incrementUnread(incomingThreadId)
    moveThreadToTop(incomingThreadId, {
      last_message_at: incomingCreatedAt || new Date().toISOString(),
      last_message_preview: incomingMessage,
    })
  }

  const title = props.mode === 'member' ? 'Shop message' : 'New member message'
  const body = incomingMessage.slice(0, 120)
  const url = props.mode === 'member'
    ? '/member/chat'
    : (actorRole.value === 'staff' ? '/staff/inbox' : actorRole.value === 'superadmin' ? '/superadmin/inbox' : '/admin/inbox')

  await notifyMessage(title, body, url, { forcePush: true })
}

function setupRealtime() {
  channel?.unsubscribe()
  channel = supabase
    .channel(`chat-realtime-${props.mode}-${actorId.value}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_presence' }, async (payload: any) => {
      const presenceUserId = String(payload?.new?.user_id ?? payload?.old?.user_id ?? '')
      if (!presenceUserId || presenceUserId === actorId.value)
        return
      if (!hasThreadWithUser(presenceUserId))
        return
      const seenAt = String(payload?.new?.last_seen_at ?? payload?.old?.last_seen_at ?? '')
      const ageMs = Date.now() - new Date(seenAt).getTime()
      const isOnline = Boolean(seenAt) && Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= 60_000
      applyPresenceToThreads(presenceUserId, isOnline, seenAt)
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads' }, async (payload: any) => {
      const threadId = String(payload?.new?.id ?? payload?.old?.id ?? '')
      if (payload?.new)
        applyThreadPatchFromRealtime(payload.new)

      // Critical transition path (assigned/unassigned or ban/status change):
      // if active thread changed, hard-refresh both thread metadata and messages immediately.
      if (threadId && selectedThreadId.value === threadId) {
        await Promise.all([loadThreads(), loadMessages()])
        return
      }

      scheduleRefresh(80)
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, async (payload: any) => {
      const eventType = String(payload?.eventType ?? '')
      const threadId = String(payload?.new?.thread_id ?? payload?.old?.thread_id ?? '')

      if (threadId && selectedThreadId.value === threadId)
        await loadMessages()
      // Always refresh thread list metadata so assigned/unassigned + preview/order stay in sync.
      await loadThreads()

      if (eventType === 'INSERT')
        await handleIncomingNotification(payload)
    })
    .subscribe()
}

watch(selectedThreadId, () => {
  loadMessages()
})

watch(() => displayedMessages.value.length, () => {
  scrollToBottom()
})

onMounted(async () => {
  await ensureProfile()
  presenceClockTimer = setInterval(refreshPresenceClock, 5000)
  await Promise.all([loadThreads(), loadOperators()])
  await prepareSound()
  const permission = await ensurePermission().catch(() => 'denied' as NotificationPermission)
  if (permission === 'granted')
    await registerPushSubscription(String(config.public.vapidPublicKey ?? '')).catch(() => false)
  if (selectedThreadId.value)
    await loadMessages()
  setupRealtime()
})

onBeforeUnmount(() => {
  if (refreshTimer)
    clearTimeout(refreshTimer)
  if (presenceClockTimer)
    clearInterval(presenceClockTimer)
  channel?.unsubscribe()
})
</script>

<style scoped>
.chat-panel {
  min-height: 74vh;
}

.chat-start-wrap {
  min-height: calc(74vh - 140px);
  display: grid;
  place-content: center;
  gap: 16px;
}

.chat-empty-icon {
  color: rgba(var(--v-theme-on-surface), 0.35);
}

.chat-thread-list {
  max-height: calc(74vh - 120px);
  overflow: auto;
}

.chat-member-skeleton {
  min-height: calc(74vh - 140px);
  display: flex;
  flex-direction: column;
}

.chat-member-skeleton-head {
  border-radius: 12px;
}

.chat-member-skeleton-body {
  flex: 1;
  border-radius: 12px;
  padding: 12px;
  background: rgba(var(--v-theme-surface), 0.5);
}

.chat-member-skeleton-composer {
  min-height: 44px;
}

.chat-composer {
  align-items: center;
}

.chat-input :deep(.v-field) {
  min-height: 40px;
}

.chat-send-btn {
  width: 40px;
  height: 40px;
  min-width: 40px;
}

.chat-message-wrap {
  border: none;
  border-radius: 12px;
  height: calc(74vh - 270px);
  min-height: 320px;
  overflow: auto;
  padding: 12px;
  background: rgb(var(--v-theme-background));
}

.chat-loading-wrap {
  padding-top: 4px;
}

.chat-state-separator {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 2px 0 12px;
}

.chat-state-separator__line {
  flex: 1;
  height: 1px;
  background: rgba(var(--v-theme-on-surface), 0.22);
}

.chat-state-separator__text {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  white-space: nowrap;
  text-transform: lowercase;
}

.chat-message-row {
  display: flex;
  justify-content: flex-start;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 10px;
}

.chat-message-row--mine {
  justify-content: flex-end;
}

.chat-avatar {
  flex-shrink: 0;
}

.chat-message-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.chat-message-stack--mine {
  align-items: flex-end;
}

.chat-bubble {
  max-width: min(82%, 760px);
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 10%, rgb(var(--v-theme-surface)));
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 12px;
  padding: 8px 10px;
}

.chat-bubble--mine {
  background: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

.chat-bubble--pending {
  opacity: 0.9;
}

.chat-name-outside {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
}

.chat-bubble-text {
  font-size: 13px;
  line-height: 1.25;
}

.chat-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 14px;
}

.chat-meta-text {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.64);
  line-height: 1.2;
}

.chat-delivery {
  display: flex;
  align-items: center;
  min-height: 12px;
}

.chat-presence-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}

.chat-presence-dot--online {
  background: rgb(var(--v-theme-success));
}

.chat-presence-dot--offline {
  background: rgba(var(--v-theme-on-surface), 0.32);
}

.chat-unread-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgb(var(--v-theme-error));
  color: rgb(var(--v-theme-on-error));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}
</style>
