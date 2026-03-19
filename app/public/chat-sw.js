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
  let payload = {}
  try {
    payload = event.data?.json?.() ?? {}
  }
  catch {
    payload = {}
  }
  const title = payload.title || 'New message'
  const body = payload.body || 'You have a new chat message.'
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
