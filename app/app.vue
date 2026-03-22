<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const route = useRoute()
const config = useRuntimeConfig()
const { siteSettings } = useSiteSettings()

function storagePublicUrl(path: string | null | undefined) {
  const value = String(path ?? '').trim()
  if (!value)
    return ''
  if (value.startsWith('http://') || value.startsWith('https://'))
    return value
  const base = String(config.public.supabaseUrl || '').trim()
  return base ? `${base}/storage/v1/object/public/product-images/${value}` : value
}

function resolveSeo(path: string) {
  const p = String(path || '/')

  if (p === '/auth/login')
    return { title: 'Login', description: 'Sign in to access your account and dashboard.' }
  if (p === '/auth/callback')
    return { title: 'Signing In', description: 'Completing secure sign-in and redirecting to your dashboard.' }

  if (p === '/superadmin')
    return { title: 'Superadmin Overview', description: 'Manage global feature settings, pricing, shop, and system configuration.' }
  if (p.startsWith('/superadmin/email-templates'))
    return { title: 'Email Templates', description: 'Manage system notification templates used by the server notification queue.' }
  if (p.startsWith('/superadmin/inbox'))
    return { title: 'Inbox', description: 'Review incoming member conversations and manage assignments.' }
  if (p.startsWith('/superadmin/profile'))
    return { title: 'Profile', description: 'Manage your account details, contact info, and password.' }

  if (p === '/admin')
    return { title: 'Admin Dashboard', description: 'Overview of products, orders, promotions, and payment operations.' }
  if (p.startsWith('/admin/users'))
    return { title: 'User Management', description: 'Create, update, and manage admin, staff, and member user accounts.' }
  if (p.startsWith('/admin/inbox'))
    return { title: 'Inbox', description: 'Handle incoming member conversations and assignment workflow.' }
  if (p.startsWith('/admin/profile'))
    return { title: 'Profile', description: 'Manage your account details, contact info, and password.' }
  if (p.startsWith('/admin/products'))
    return { title: 'Products', description: 'Manage product catalog, variants, stock, media, and product metadata links.' }
  if (p.startsWith('/admin/product-metadata'))
    return { title: 'Product Metadata', description: 'Manage categories, tags, and brand models used across product catalog.' }
  if (p.startsWith('/admin/promotions'))
    return { title: 'Promotions', description: 'Configure discounts, promo packages, and campaign rules.' }
  if (p.startsWith('/admin/orders'))
    return { title: 'Orders', description: 'Review order lifecycle, payment status, and fulfillment updates.' }
  if (p.startsWith('/admin/payment-methods'))
    return { title: 'Payment Methods', description: 'Manage bank transfer methods and payment method configuration.' }

  if (p === '/staff')
    return { title: 'Staff Overview', description: 'Access daily operational tools for POS and order workflows.' }
  if (p.startsWith('/staff/pos'))
    return { title: 'Point of Sale', description: 'Create in-store orders, process payments, and complete sales quickly.' }
  if (p.startsWith('/staff/inbox'))
    return { title: 'Inbox', description: 'Handle conversations assigned to your account.' }
  if (p.startsWith('/staff/profile'))
    return { title: 'Profile', description: 'Manage your account details, contact info, and password.' }

  if (p === '/member')
    return { title: 'Member Home', description: 'Explore featured products and your personalized shopping experience.' }
  if (p.startsWith('/member/profile'))
    return { title: 'Profile', description: 'Manage your account details, contact info, and password.' }
  if (p.startsWith('/member/chat'))
    return { title: 'Chat to Shop', description: 'Send messages to shop support and follow your conversation updates.' }
  if (p === '/member/catalog')
    return { title: 'Catalog', description: 'Browse products, filter items, and add selections to your cart.' }
  if (p.startsWith('/member/catalog/'))
    return { title: 'Product Details', description: 'View product gallery, variants, pricing, and stock details.' }
  if (p === '/member/orders')
    return { title: 'My Orders', description: 'Track your orders, payment status, and estimated delivery information.' }
  if (p.startsWith('/member/orders/'))
    return { title: 'Order Details', description: 'Review complete order information, payment details, and invoice access.' }
  if (p.startsWith('/member/addresses'))
    return { title: 'My Addresses', description: 'Manage shipping addresses for faster and accurate checkout.' }
  if (p.startsWith('/member/checkout'))
    return { title: 'Checkout', description: 'Review selected cart items, choose payment method, and place your order.' }

  return {
    title: 'App',
    description: 'Single Tenant Shop management and shopping application.',
  }
}

const seo = computed(() => resolveSeo(route.path))
const siteName = computed(() => String(siteSettings.value.site_name || '').trim() || 'Single Tenant Shop')
const favicon64 = computed(() => storagePublicUrl(siteSettings.value.site_favicon_64))
const favicon84 = computed(() => storagePublicUrl(siteSettings.value.site_favicon_84))
const favicon512 = computed(() => storagePublicUrl(siteSettings.value.site_favicon_512))

useSeoMeta({
  title: () => `${seo.value.title} | ${siteName.value}`,
  description: () => seo.value.description,
  ogTitle: () => `${seo.value.title} | ${siteName.value}`,
  ogDescription: () => seo.value.description,
})

useHead(() => {
  const links: Array<Record<string, string>> = []
  if (favicon64.value) {
    links.push(
      { rel: 'icon', type: 'image/png', sizes: '64x64', href: favicon64.value },
      { rel: 'shortcut icon', type: 'image/png', href: favicon64.value },
    )
  }
  if (favicon84.value)
    links.push({ rel: 'icon', type: 'image/png', sizes: '84x84', href: favicon84.value })
  if (favicon512.value)
    links.push({ rel: 'apple-touch-icon', sizes: '512x512', href: favicon512.value })
  return { link: links }
})
</script>
