export default defineNuxtPlugin(() => {
  if (!('serviceWorker' in navigator))
    return

  navigator.serviceWorker.register('/chat-sw.js').catch(() => {})
})
