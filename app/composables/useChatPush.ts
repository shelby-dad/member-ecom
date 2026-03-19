function base64UrlToUint8Array(base64Url: string) {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob(base64 + padding)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1)
    output[i] = raw.charCodeAt(i)
  return output
}

export function useChatPush() {
  const isSupported = computed(() => import.meta.client
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
    && window.isSecureContext)

  async function registerPushSubscription(vapidPublicKey: string) {
    if (!isSupported.value) {
      console.warn('[chat-push] Push API not supported or context is not secure (HTTPS required).')
      return false
    }
    if (!vapidPublicKey.trim()) {
      console.warn('[chat-push] Missing VAPID public key in runtime config.')
      return false
    }

    const permission = Notification.permission
    if (permission !== 'granted')
      return false

    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(vapidPublicKey.trim()),
      })
    }

    const json = subscription.toJSON()
    const endpoint = String(json.endpoint ?? '')
    const p256dh = String((json.keys as any)?.p256dh ?? '')
    const auth = String((json.keys as any)?.auth ?? '')
    if (!endpoint || !p256dh || !auth) {
      console.warn('[chat-push] Subscription keys are incomplete.')
      return false
    }

    await $fetch('/api/chat/push-subscriptions', {
      method: 'POST',
      body: {
        endpoint,
        keys: { p256dh, auth },
        user_agent: navigator.userAgent,
      },
    })

    return true
  }

  async function unregisterPushSubscription() {
    if (!isSupported.value)
      return false

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription)
      return false

    const endpoint = subscription.endpoint
    await subscription.unsubscribe().catch(() => false)

    await $fetch('/api/chat/push-subscriptions', {
      method: 'DELETE',
      body: { endpoint },
    }).catch(() => null)

    return true
  }

  return {
    isSupported,
    registerPushSubscription,
    unregisterPushSubscription,
  }
}
