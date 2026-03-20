self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification?.data?.url || '/admin/inbox'

  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of clientsList) {
      if ('focus' in client) {
        client.postMessage({ type: 'chat-notification-click', url: targetUrl })
        await client.focus()
        if ('navigate' in client)
          await client.navigate(targetUrl)
        return
      }
    }
    if (self.clients.openWindow)
      await self.clients.openWindow(targetUrl)
  })())
})

self.addEventListener('push', (event) => {
  const formatRelative = (value) => {
    const date = value ? new Date(value) : new Date()
    const diff = Math.max(0, Date.now() - date.getTime())
    const sec = Math.floor(diff / 1000)
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

  let payload = {}
  try {
    payload = event.data?.json?.() ?? {}
  }
  catch {
    payload = {}
  }
  const title = String(payload.title || payload.sender_name || 'New message').trim() || 'New message'
  const textBody = payload.body || 'You have a new chat message.'
  const timeLabel = formatRelative(payload.sent_at || payload.ts)
  const body = `${textBody}\n${timeLabel}`
  const url = payload.url || '/admin/inbox'

  event.waitUntil(self.registration.showNotification(title, {
    body,
    tag: 'shop-chat-message',
    data: { url },
    silent: false,
    requireInteraction: true,
    vibrate: [120, 40, 120],
  }))
})
