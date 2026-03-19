interface NotifyOptions {
  forcePush?: boolean
}

export function useChatNotifications() {
  const permission = ref<NotificationPermission>('default')
  const canPlaySound = ref(false)
  let audioContext: AudioContext | null = null
  let unlockEventsBound = false

  if (import.meta.client && 'Notification' in window)
    permission.value = Notification.permission

  function bindAudioUnlockEvents() {
    if (!import.meta.client || unlockEventsBound)
      return
    unlockEventsBound = true
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'touchstart', 'keydown']
    const unlock = async () => {
      await prepareSound()
      for (const eventName of events)
        window.removeEventListener(eventName, unlock)
    }
    for (const eventName of events)
      window.addEventListener(eventName, unlock, { passive: true })
  }

  async function prepareSound() {
    if (!import.meta.client)
      return false

    const AudioCtor = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AudioCtor)
      return false

    if (!audioContext)
      audioContext = new AudioCtor()
    const ctx = audioContext as AudioContext

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      }
      catch {
        bindAudioUnlockEvents()
        return false
      }
    }

    canPlaySound.value = ctx.state === 'running'
    if (!canPlaySound.value)
      bindAudioUnlockEvents()
    return canPlaySound.value
  }

  async function playIncomingSound() {
    if (!import.meta.client)
      return
    const ready = await prepareSound()
    if (!ready || !audioContext)
      return
    const ctx = audioContext as AudioContext

    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.20)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.22)
  }

  async function ensurePermission() {
    if (!import.meta.client || !('Notification' in window))
      return 'denied' as NotificationPermission
    if (Notification.permission === 'granted') {
      permission.value = 'granted'
      return permission.value
    }
    const result = await Notification.requestPermission()
    permission.value = result
    return result
  }

  async function notifyMessage(title: string, body: string, url: string, options?: NotifyOptions) {
    if (!import.meta.client)
      return

    await playIncomingSound()

    if (!('Notification' in window))
      return
    if (Notification.permission !== 'granted')
      return
    const shouldShowSystemNotification = options?.forcePush === true || document.hidden
    if (!shouldShowSystemNotification)
      return

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready.catch(() => null)
      if (registration) {
        await registration.showNotification(title, {
          body,
          tag: 'shop-chat-message',
          silent: false,
          requireInteraction: true,
          data: { url },
        })
        return
      }
    }

    const notification = new Notification(title, { body, tag: 'shop-chat-message' })
    notification.onclick = () => {
      window.focus()
      navigateTo(url)
    }
  }

  return {
    permission: readonly(permission),
    canPlaySound: readonly(canPlaySound),
    ensurePermission,
    prepareSound,
    playIncomingSound,
    notifyMessage,
  }
}
