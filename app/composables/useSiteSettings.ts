export interface SiteSettings {
  site_name: string | null
  site_favicon_original: string | null
  site_favicon_64: string | null
  site_favicon_84: string | null
  site_favicon_512: string | null
}

const defaultSiteSettings: SiteSettings = {
  site_name: null,
  site_favicon_original: null,
  site_favicon_64: null,
  site_favicon_84: null,
  site_favicon_512: null,
}

export function useSiteSettings() {
  const settings = useState<SiteSettings>('site-settings', () => ({ ...defaultSiteSettings }))
  const loaded = useState<boolean>('site-settings-loaded', () => false)

  async function refreshSiteSettings() {
    const data = await $fetch<Partial<SiteSettings>>('/api/settings/public')
    settings.value = {
      ...defaultSiteSettings,
      ...data,
    }
    loaded.value = true
  }

  if (!loaded.value) {
    refreshSiteSettings().catch(() => {
      loaded.value = true
    })
  }

  return {
    siteSettings: readonly(settings),
    refreshSiteSettings,
  }
}
