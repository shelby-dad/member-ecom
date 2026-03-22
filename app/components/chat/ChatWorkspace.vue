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
              v-if="selectedThread && ((selectedThread.status !== 'banned' && canBanConversation) || (selectedThread.status === 'banned' && canUnflagConversation))"
              size="small"
              :color="selectedThread.status === 'banned' ? 'success' : 'error'"
              variant="tonal"
              :loading="banLoading"
              @click="toggleBan"
            >
              {{ selectedThread.status === 'banned' ? 'Unflagged' : 'Ban' }}
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
              <v-autocomplete
                v-model="assignedTo"
                :items="operatorItems"
                item-title="title"
                item-value="value"
                label="Assign operator"
                placeholder="Search by name, email, role"
                density="compact"
                variant="outlined"
                hide-details
                style="max-width: 320px"
                clearable
                prepend-inner-icon="mdi-magnify"
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
                      <div v-if="message.attachment_path" class="chat-attachment-wrap mb-1">
                        <button
                          type="button"
                          class="chat-attachment-btn"
                          @click="openImageViewer(message.attachment_path)"
                        >
                          <v-img :src="attachmentUrl(message.attachment_path)" class="chat-attachment-image" cover @load="scrollToBottomDebounced" />
                        </button>
                      </div>
                      <div v-if="displayMessageText(message)" class="chat-bubble-text">{{ displayMessageText(message) }}</div>
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

            <div v-if="attachmentPreviewUrl" class="chat-attach-preview-row mb-2">
              <div class="chat-attach-preview-box">
                <v-img :src="attachmentPreviewUrl" class="chat-attach-preview-image" cover />
                <v-btn
                  size="x-small"
                  icon="mdi-close"
                  variant="flat"
                  color="error"
                  class="chat-attach-remove-btn"
                  @click="clearAttachmentSelection"
                />
              </div>
            </div>
            <div class="chat-composer d-flex align-center ga-2 flex-wrap">
              <div class="flex-grow-1 chat-input-wrap">
                <v-btn
                  class="chat-attach-btn"
                  icon="mdi-paperclip"
                  size="x-small"
                  variant="text"
                  :disabled="!selectedThread || selectedThread.status === 'banned'"
                  @click="onAttachClick"
                />
                <v-textarea
                  v-model="draft"
                  placeholder="Message"
                  density="compact"
                  rows="1"
                  auto-grow
                  max-rows="4"
                  hide-details
                  variant="outlined"
                  class="chat-input chat-input--with-attach"
                  :disabled="!selectedThread || selectedThread.status === 'banned'"
                  @keydown.enter.exact.prevent="sendMessage"
                />
              </div>
              <v-btn
                color="primary"
                icon="mdi-send"
                :loading="sending || attachmentUploading"
                class="chat-send-btn"
                :disabled="attachmentUploading || (!selectedThread || selectedThread.status === 'banned') || (!draft.trim() && !hasAttachmentSelected)"
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
            <v-menu v-if="showAssignmentFilter" location="bottom end">
              <template #activator="{ props: menuProps }">
                <v-btn
                  size="small"
                  variant="text"
                  icon="mdi-filter-variant"
                  :color="filterIconColor"
                  aria-label="Filter conversations"
                  v-bind="menuProps"
                />
              </template>
              <v-list density="comfortable" min-width="230">
                <v-list-item
                  :active="assignmentFilter === 'all'"
                  @click="setAssignmentFilter('all')"
                >
                  <v-list-item-title class="text-caption">All Conversations</v-list-item-title>
                </v-list-item>
                <v-list-item
                  :active="assignmentFilter === 'assigned'"
                  @click="setAssignmentFilter('assigned')"
                >
                  <v-list-item-title class="text-caption">Assigned Conversations</v-list-item-title>
                </v-list-item>
                <v-list-item
                  :active="assignmentFilter === 'unassigned'"
                  @click="setAssignmentFilter('unassigned')"
                >
                  <v-list-item-title class="text-caption">Unassigned Conversations</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
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

            <div
              ref="threadListRef"
              class="chat-thread-list"
              @scroll.passive="onThreadListScroll"
            >
              <div v-if="showThreadSkeleton" class="pt-1">
                <v-skeleton-loader
                  v-for="index in 6"
                  :key="`thread-skeleton-${index}`"
                  class="mb-2"
                  type="list-item-avatar-two-line"
                />
              </div>

              <v-list v-else density="comfortable">
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
              <div v-if="threadsLoadingMore" class="py-2 d-flex justify-center">
                <v-progress-circular indeterminate size="18" width="2" color="primary" />
              </div>
              <p
                v-if="!showThreadSkeleton && !threadsLoadingMore && threads.length > 0 && !threadsHasMore"
                class="text-caption text-medium-emphasis text-center py-2 mb-0"
              >
                No more conversations
              </p>
            </div>
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

          <template v-else-if="isMemberThreadBanned">
            <div class="chat-flagged-wrap">
              <div class="chat-flagged-icon-wrap mb-3">
                <v-icon size="46" color="error">mdi-flag-variant</v-icon>
              </div>
              <p class="text-h6 font-weight-bold mb-1">You are flagged by our shop administrator.</p>
              <p class="text-body-2 text-medium-emphasis mb-4">Please contact the following.</p>
              <v-card variant="tonal" class="chat-flagged-contact pa-5">
                <div v-if="shopLogoUrl" class="d-flex justify-center mb-3">
                  <v-avatar size="76" rounded="lg">
                    <v-img :src="shopLogoUrl" alt="Shop logo" cover />
                  </v-avatar>
                </div>
                <div class="chat-flagged-contact-row">
                  <span class="text-medium-emphasis">Shop</span>
                  <span class="font-weight-medium">{{ shopContact.shop_name || 'Shop' }}</span>
                </div>
                <v-divider class="my-2" />
                <div class="chat-flagged-contact-row">
                  <span class="text-medium-emphasis">Email</span>
                  <span class="font-weight-medium">{{ shopContact.shop_email || '-' }}</span>
                </div>
                <v-divider class="my-2" />
                <div class="chat-flagged-contact-row">
                  <span class="text-medium-emphasis">Mobile</span>
                  <span class="font-weight-medium">{{ shopContact.mobile_number || '-' }}</span>
                </div>
                <v-divider class="my-2" />
                <div class="chat-flagged-contact-row">
                  <span class="text-medium-emphasis">Address</span>
                  <span class="font-weight-medium text-right">{{ shopContact.shop_address || '-' }}</span>
                </div>
              </v-card>
            </div>
          </template>

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
                      <div v-if="message.attachment_path" class="chat-attachment-wrap mb-1">
                        <button
                          type="button"
                          class="chat-attachment-btn"
                          @click="openImageViewer(message.attachment_path)"
                        >
                          <v-img :src="attachmentUrl(message.attachment_path)" class="chat-attachment-image" cover @load="scrollToBottomDebounced" />
                        </button>
                      </div>
                      <div v-if="displayMessageText(message)" class="chat-bubble-text">{{ displayMessageText(message) }}</div>
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

            <div v-if="attachmentPreviewUrl" class="chat-attach-preview-row mb-2">
              <div class="chat-attach-preview-box">
                <v-img :src="attachmentPreviewUrl" class="chat-attach-preview-image" cover />
                <v-btn
                  size="x-small"
                  icon="mdi-close"
                  variant="flat"
                  color="error"
                  class="chat-attach-remove-btn"
                  @click="clearAttachmentSelection"
                />
              </div>
            </div>
            <div class="chat-composer d-flex align-center ga-2 flex-wrap">
              <div class="flex-grow-1 chat-input-wrap">
                <v-btn
                  class="chat-attach-btn"
                  icon="mdi-paperclip"
                  size="x-small"
                  variant="text"
                  :disabled="isSendDisabled"
                  @click="onAttachClick"
                />
                <v-textarea
                  v-model="draft"
                  placeholder="Message"
                  density="compact"
                  rows="1"
                  auto-grow
                  max-rows="4"
                  hide-details
                  variant="outlined"
                  class="chat-input chat-input--with-attach"
                  :disabled="isSendDisabled"
                  @keydown.enter.exact.prevent="sendMessage"
                />
              </div>
              <v-btn
                color="primary"
                icon="mdi-send"
                :loading="sending || attachmentUploading"
                class="chat-send-btn"
                :disabled="attachmentUploading || isSendDisabled || (!draft.trim() && !hasAttachmentSelected)"
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

    <StorageImagePickerDialog
      v-if="mode === 'operator'"
      v-model="storagePickerOpen"
      :bucket="'product-images'"
      :selected-path="attachmentPath"
      @selected="onOperatorAttachmentSelected"
    />
    <v-dialog v-model="imageViewerOpen" max-width="920">
      <v-card>
        <v-card-title class="d-flex align-center">
          <span>Image Viewer</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="imageViewerOpen = false" />
        </v-card-title>
        <v-card-text class="d-flex justify-center">
          <v-img
            v-if="imageViewerUrl"
            :src="imageViewerUrl"
            class="chat-image-viewer"
            contain
          />
        </v-card-text>
      </v-card>
    </v-dialog>
    <input
      v-if="mode === 'member'"
      ref="memberAttachmentInput"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="d-none"
      @change="onMemberAttachmentPick"
    >
  </v-row>
</template>

<script setup lang="ts">
import type { RealtimeChannel } from '@supabase/supabase-js'

type ChatMessage = {
  id: string
  thread_id: string
  sender_id: string
  message: string
  attachment_path?: string | null
  attachment_name?: string | null
  attachment_mime_type?: string | null
  attachment_size_bytes?: number | null
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
const threadsLoadingMore = ref(false)
const messagesLoading = ref(false)
const hasLoadedThreadsOnce = ref(false)
const hasLoadedMessagesOnce = ref(false)
const isConversationSwitching = ref(false)
const search = ref('')
const draft = ref('')
const memberAttachmentInput = ref<HTMLInputElement | null>(null)
const memberAttachmentFile = ref<File | null>(null)
const attachmentPreviewUrl = ref('')
const attachmentPath = ref('')
const attachmentName = ref('')
const attachmentMimeType = ref('')
const attachmentSizeBytes = ref<number | null>(null)
const attachmentUploading = ref(false)
const storagePickerOpen = ref(false)
const imageViewerOpen = ref(false)
const imageViewerUrl = ref('')
const threads = ref<any[]>([])
const threadListRef = ref<HTMLElement | null>(null)
const messages = ref<ChatMessage[]>([])
const pendingMessages = ref<ChatMessage[]>([])
const unreadByThread = ref<Record<string, number>>({})
const selectedThreadId = ref<string | null>(null)
const operators = ref<any[]>([])
const shopContact = ref({
  shop_logo: '',
  shop_name: '',
  shop_email: '',
  mobile_number: '',
  shop_address: '',
})
const assignedTo = ref<string | null>(null)
const messageContainerRef = ref<HTMLElement | null>(null)
const presenceNowTick = ref(Date.now())
const threadLimit = 10
const threadOffset = ref(0)
const threadsHasMore = ref(true)
const assignmentFilter = ref<'all' | 'assigned' | 'unassigned'>('all')
const pushReady = ref(false)
let channel: RealtimeChannel | null = null
let presenceClockTimer: ReturnType<typeof setInterval> | null = null

const actorId = computed(() => String(profile.value?.id || ''))
const actorRole = computed(() => String(profile.value?.role || 'member'))
const routeConversationId = computed(() => String(route.params?.conversationId ?? '').trim() || null)
const canAssignOperator = computed(() => props.mode === 'operator' && (actorRole.value === 'admin' || actorRole.value === 'superadmin'))
const canBanConversation = computed(() => props.mode === 'operator' && ['staff', 'admin', 'superadmin'].includes(actorRole.value))
const canUnflagConversation = computed(() => props.mode === 'operator' && actorRole.value === 'superadmin')
const showAssignmentFilter = computed(() => props.mode === 'operator')
const filterIconColor = computed(() => assignmentFilter.value === 'all' ? undefined : 'primary')
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
const hasAttachmentSelected = computed(() =>
  Boolean(memberAttachmentFile.value || attachmentPath.value),
)
const memberConversationStatusText = computed(() => {
  if (props.mode !== 'member' || !selectedThread.value)
    return ''
  if (selectedThread.value.assigned_to)
    return 'conversation was assigned'
  return 'conversation was unassigned'
})
const isMemberThreadBanned = computed(() =>
  props.mode === 'member'
  && Boolean(selectedThread.value)
  && selectedThread.value?.status === 'banned',
)
const shopLogoUrl = computed(() => avatarUrl(shopContact.value.shop_logo))

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

function attachmentUrl(path?: string | null) {
  const value = String(path ?? '').trim()
  if (!value)
    return ''
  if (value.startsWith('http://') || value.startsWith('https://'))
    return value
  const base = String(config.public.supabaseUrl || '').trim()
  return base ? `${base}/storage/v1/object/public/product-images/${value}` : value
}

function displayMessageText(message: ChatMessage) {
  if (message.attachment_path && String(message.message || '').trim() === 'sent a file')
    return ''
  return message.message
}

function resolveAttachmentName(path?: string | null) {
  const value = String(path ?? '').trim()
  if (!value)
    return ''
  const parts = value.split('/')
  return parts[parts.length - 1] || 'image'
}

function clearAttachmentSelection() {
  memberAttachmentFile.value = null
  attachmentPath.value = ''
  attachmentName.value = ''
  attachmentMimeType.value = ''
  attachmentSizeBytes.value = null
  if (attachmentPreviewUrl.value && attachmentPreviewUrl.value.startsWith('blob:'))
    URL.revokeObjectURL(attachmentPreviewUrl.value)
  attachmentPreviewUrl.value = ''
}

function openImageViewer(path?: string | null) {
  const url = attachmentUrl(path)
  if (!url)
    return
  imageViewerUrl.value = url
  imageViewerOpen.value = true
}

function onAttachClick() {
  if (props.mode === 'operator') {
    storagePickerOpen.value = true
    return
  }
  memberAttachmentInput.value?.click()
}

function onOperatorAttachmentSelected(path: string) {
  const value = String(path ?? '').trim()
  if (!value)
    return
  attachmentPath.value = value
  attachmentName.value = resolveAttachmentName(value)
  const ext = attachmentName.value.split('.').pop()?.toLowerCase() || ''
  attachmentMimeType.value = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
  attachmentSizeBytes.value = null
  attachmentPreviewUrl.value = attachmentUrl(value)
  memberAttachmentFile.value = null
}

function onMemberAttachmentPick(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  input.value = ''
  if (!file)
    return
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
    sendError.value = 'Only JPG, PNG, or WEBP up to 5MB is allowed.'
    return
  }
  clearAttachmentSelection()
  memberAttachmentFile.value = file
  attachmentName.value = file.name
  attachmentMimeType.value = file.type
  attachmentSizeBytes.value = file.size
  attachmentPreviewUrl.value = URL.createObjectURL(file)
}

async function uploadMemberAttachment() {
  if (!memberAttachmentFile.value || !selectedThreadId.value)
    return
  const form = new FormData()
  form.append('file', memberAttachmentFile.value)
  attachmentUploading.value = true
  try {
    const data = await $fetch<{ path: string; name: string; mime_type: string; size_bytes: number }>(
      `/api/chat/threads/${selectedThreadId.value}/attachments`,
      {
        method: 'POST',
        body: form,
      },
    )
    attachmentPath.value = String(data?.path ?? '')
    attachmentName.value = String(data?.name ?? memberAttachmentFile.value.name)
    attachmentMimeType.value = String(data?.mime_type ?? memberAttachmentFile.value.type)
    attachmentSizeBytes.value = Number(data?.size_bytes ?? memberAttachmentFile.value.size)
    attachmentPreviewUrl.value = attachmentUrl(attachmentPath.value)
    memberAttachmentFile.value = null
  }
  finally {
    attachmentUploading.value = false
  }
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

function operatorInboxBasePath() {
  if (route.path.startsWith('/staff/inbox'))
    return '/staff/inbox'
  if (route.path.startsWith('/superadmin/inbox'))
    return '/superadmin/inbox'
  return '/admin/inbox'
}

function operatorThreadPath(threadId: string) {
  return `${operatorInboxBasePath()}/${threadId}`
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

let scrollTimer: ReturnType<typeof setTimeout> | null = null
function scrollToBottomDebounced() {
  if (scrollTimer)
    clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    scrollToBottom()
  }, 40)
}

function truncateNotificationText(message: string, max = 100) {
  const text = String(message ?? '').trim()
  if (text.length <= max)
    return text
  return `${text.slice(0, max)}...`
}

function formatNotificationBody(message: string, hasAttachment: boolean) {
  const trimmed = truncateNotificationText(message, 100)
  if (!hasAttachment)
    return trimmed
  if (trimmed && trimmed !== 'sent a file')
    return `${trimmed} (received image)`
  return 'received image'
}

function reconcilePendingMessages(serverItems: ChatMessage[]) {
  if (!pendingMessages.value.length)
    return
  const serverOwn = serverItems.filter(item => item.sender_id === actorId.value)
  pendingMessages.value = pendingMessages.value.filter((pending) => {
    const pendingAt = new Date(pending.created_at).getTime()
    return !serverOwn.some((item) => {
      const sameMessage = item.message.trim() === pending.message.trim()
      const sameAttachment = String(item.attachment_path ?? '') === String(pending.attachment_path ?? '')
      const itemAt = new Date(item.created_at).getTime()
      const closeTimestamp = Math.abs(itemAt - pendingAt) <= 15000
      return sameMessage && sameAttachment && closeTimestamp
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

function mergeThreadsById(existing: any[], incoming: any[]) {
  const map = new Map<string, any>()
  for (const thread of existing)
    map.set(String(thread.id), thread)
  for (const thread of incoming)
    map.set(String(thread.id), thread)
  return [...map.values()]
}

async function loadThreads(options: { loadMore?: boolean; reset?: boolean } = {}) {
  const loadMore = Boolean(options.loadMore)
  const reset = Boolean(options.reset)
  if (loadMore) {
    if (threadsLoadingMore.value || threadsLoading.value || !threadsHasMore.value)
      return
    threadsLoadingMore.value = true
  } else {
    threadsLoading.value = true
    if (reset) {
      threadOffset.value = 0
      threadsHasMore.value = true
    }
  }
  try {
    const requestOffset = loadMore ? threadOffset.value : 0
    const data = await $fetch<{ items: any[]; has_more?: boolean }>('/api/chat/threads', {
      query: {
        limit: threadLimit,
        offset: requestOffset,
        assignment: showAssignmentFilter.value ? assignmentFilter.value : 'all',
      },
    })
    const fetchedThreads = data?.items ?? []
    const nextThreads = loadMore ? mergeThreadsById(threads.value, fetchedThreads) : fetchedThreads
    const nextIds = new Set(nextThreads.map((thread: any) => String(thread.id)))
    const preservedUnread: Record<string, number> = {}
    for (const [threadId, count] of Object.entries(unreadByThread.value)) {
      if (nextIds.has(threadId) && count > 0)
        preservedUnread[threadId] = count
    }
    unreadByThread.value = preservedUnread
    threads.value = nextThreads
    threadOffset.value = requestOffset + fetchedThreads.length
    threadsHasMore.value = Boolean(data?.has_more)

    if (props.mode === 'member' && !selectedThreadId.value && threads.value.length)
      selectedThreadId.value = threads.value[0].id

    if (props.mode === 'operator') {
      if (routeConversationId.value) {
        if (threads.value.some((thread: any) => String(thread.id) === routeConversationId.value)) {
          if (selectedThreadId.value !== routeConversationId.value)
            selectedThreadId.value = routeConversationId.value
        } else if (selectedThreadId.value === routeConversationId.value) {
          selectedThreadId.value = null
        }
      } else if (selectedThreadId.value && !threads.value.some((thread: any) => thread.id === selectedThreadId.value)) {
        selectedThreadId.value = null
      }
    } else if (selectedThreadId.value && !threads.value.some((thread: any) => thread.id === selectedThreadId.value)) {
      selectedThreadId.value = null
    }

    if (selectedThread.value)
      assignedTo.value = selectedThread.value.assigned_to
  }
  finally {
    if (loadMore) {
      threadsLoadingMore.value = false
    } else {
      threadsLoading.value = false
    }
    hasLoadedThreadsOnce.value = true
  }
}

function setAssignmentFilter(value: 'all' | 'assigned' | 'unassigned') {
  if (assignmentFilter.value === value)
    return
  assignmentFilter.value = value
  selectedThreadId.value = null
  loadThreads({ reset: true })
}

async function onThreadListScroll() {
  if (!threadListRef.value || showThreadSkeleton.value || !threadsHasMore.value)
    return
  const el = threadListRef.value
  const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 56
  if (nearBottom)
    await loadThreads({ loadMore: true })
}

async function loadMessages() {
  if (!selectedThreadId.value) {
    messages.value = []
    pendingMessages.value = []
    clearAttachmentSelection()
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
    scrollToBottomDebounced()
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
  clearAttachmentSelection()
  if (props.mode === 'operator') {
    const target = operatorThreadPath(threadId)
    if (route.path !== target)
      await navigateTo(target)
  }
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
  if (!selectedThreadId.value)
    return

  const text = draft.value.trim()
  if (!text && !hasAttachmentSelected.value)
    return

  sendError.value = ''
  draft.value = ''
  const tempId = `tmp-${Date.now()}-${Math.round(Math.random() * 100000)}`
  let nextAttachmentPath = attachmentPath.value
  let nextAttachmentName = attachmentName.value
  let nextAttachmentMimeType = attachmentMimeType.value
  let nextAttachmentSize = attachmentSizeBytes.value

  if (memberAttachmentFile.value && !nextAttachmentPath) {
    try {
      await uploadMemberAttachment()
      nextAttachmentPath = attachmentPath.value
      nextAttachmentName = attachmentName.value
      nextAttachmentMimeType = attachmentMimeType.value
      nextAttachmentSize = attachmentSizeBytes.value
    } catch (error) {
      draft.value = text
      sendError.value = String((error as any)?.data?.message ?? (error as any)?.message ?? 'Failed to upload attachment.')
      return
    }
  }

  pendingMessages.value.push({
    id: tempId,
    thread_id: selectedThreadId.value,
    sender_id: actorId.value,
    message: text || 'sent a file',
    attachment_path: nextAttachmentPath || null,
    attachment_name: nextAttachmentName || null,
    attachment_mime_type: nextAttachmentMimeType || null,
    attachment_size_bytes: nextAttachmentSize ?? null,
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
        body: {
          message: text,
          attachment_path: nextAttachmentPath || null,
          attachment_name: nextAttachmentName || null,
          attachment_mime_type: nextAttachmentMimeType || null,
          attachment_size_bytes: nextAttachmentSize ?? null,
        },
      })
    } catch (error: any) {
      const status = Number(error?.statusCode ?? error?.status ?? error?.data?.statusCode ?? 0)
      if (import.meta.client && status === 401) {
        try {
          await supabase.auth.getSession()
          response = await $fetch<{ item: ChatMessage }>(endpoint, {
            method: 'POST',
            credentials: 'include',
            body: {
              message: text,
              attachment_path: nextAttachmentPath || null,
              attachment_name: nextAttachmentName || null,
              attachment_mime_type: nextAttachmentMimeType || null,
              attachment_size_bytes: nextAttachmentSize ?? null,
            },
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
    clearAttachmentSelection()

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

async function loadShopContact() {
  if (props.mode !== 'member')
    return
  const data = await $fetch<any>('/api/settings/public')
  shopContact.value = {
    shop_logo: String(data?.shop_logo ?? '').trim(),
    shop_name: String(data?.shop_name ?? '').trim(),
    shop_email: String(data?.shop_email ?? '').trim(),
    mobile_number: String(data?.mobile_number ?? '').trim(),
    shop_address: String(data?.shop_address ?? '').trim(),
  }
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
    const ok = await registerPushSubscription(String(config.public.vapidPublicKey ?? '')).catch(() => false)
    pushReady.value = Boolean(ok)
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
  const incomingHasAttachment = Boolean(payload?.new?.attachment_path)
  const incomingCreatedAt = String(payload?.new?.created_at ?? '')
  if (props.mode === 'operator' && incomingThreadId) {
    if (selectedThreadId.value !== incomingThreadId)
      incrementUnread(incomingThreadId)
    moveThreadToTop(incomingThreadId, {
      last_message_at: incomingCreatedAt || new Date().toISOString(),
      last_message_preview: incomingMessage,
    })
  }

  // Deduplicate when web-push is active; service worker will display notification.
  if (pushReady.value)
    return

  const title = props.mode === 'member' ? 'Shop message' : 'New member message'
  const body = formatNotificationBody(incomingMessage, incomingHasAttachment)
  const url = props.mode === 'member'
    ? '/member/chat'
    : incomingThreadId
      ? operatorThreadPath(incomingThreadId)
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

watch(routeConversationId, (nextId) => {
  if (props.mode !== 'operator')
    return
  if (!nextId) {
    selectedThreadId.value = null
    return
  }
  if (selectedThreadId.value !== nextId) {
    isConversationSwitching.value = true
    clearUnread(nextId)
    selectedThreadId.value = nextId
  }
})

watch(() => displayedMessages.value.length, () => {
  scrollToBottomDebounced()
})

onMounted(async () => {
  await ensureProfile()
  presenceClockTimer = setInterval(refreshPresenceClock, 5000)
  await Promise.all([loadThreads(), loadOperators(), loadShopContact()])
  await prepareSound()
  const permission = await ensurePermission().catch(() => 'denied' as NotificationPermission)
  if (permission === 'granted') {
    const ok = await registerPushSubscription(String(config.public.vapidPublicKey ?? '')).catch(() => false)
    pushReady.value = Boolean(ok)
  } else {
    pushReady.value = false
  }
  if (selectedThreadId.value)
    await loadMessages()
  setupRealtime()
})

onBeforeUnmount(() => {
  if (refreshTimer)
    clearTimeout(refreshTimer)
  if (presenceClockTimer)
    clearInterval(presenceClockTimer)
  if (scrollTimer)
    clearTimeout(scrollTimer)
  clearAttachmentSelection()
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

.chat-flagged-wrap {
  min-height: calc(74vh - 160px);
  display: grid;
  place-content: center;
  text-align: center;
}

.chat-flagged-icon-wrap {
  width: 84px;
  height: 84px;
  margin-inline: auto;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(var(--v-theme-error), 0.12);
}

.chat-flagged-contact {
  width: min(560px, calc(100vw - 64px));
  margin-inline: auto;
  text-align: left;
}

.chat-flagged-contact-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  font-size: 0.925rem;
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

.chat-input-wrap {
  position: relative;
  min-width: 0;
}

.chat-attach-btn {
  position: absolute;
  left: 6px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
}

.chat-input :deep(.v-field) {
  min-height: 40px;
}

.chat-input--with-attach :deep(.v-field__input) {
  padding-left: 34px;
}

.chat-send-btn {
  width: 40px;
  height: 40px;
  min-width: 40px;
}

.chat-attach-preview-box {
  position: relative;
  width: 100px;
  height: 100px;
  flex-shrink: 0;
}

.chat-attach-preview-image {
  width: 100px;
  height: 100px;
  border-radius: 10px;
  overflow: hidden;
}

.chat-attach-remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  min-width: 20px;
  z-index: 2;
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
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-attachment-wrap {
  max-width: 220px;
}

.chat-attachment-btn {
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.chat-attachment-image {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.chat-image-viewer {
  width: 100%;
  max-height: 72vh;
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
