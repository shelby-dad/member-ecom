import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { AppRole } from '~/utils/role-switch'

export interface AppNavItem {
  label: string
  to: string
  icon: string
  description: string
}

const NAVIGATION_BY_ROLE: Record<AppRole, AppNavItem[]> = {
  superadmin: [
    { label: 'Overview', to: '/superadmin', icon: 'mdi-shield-crown-outline', description: 'Configure app-wide features, pricing, and shop settings.' },
    { label: 'Dashboard', to: '/admin', icon: 'mdi-view-dashboard-outline', description: 'Manage products, stock, orders, and payment methods.' },
    { label: 'Users', to: '/admin/users', icon: 'mdi-account-multiple-outline', description: 'Create and manage admin, staff, and member accounts.' },
    { label: 'POS', to: '/staff/pos', icon: 'mdi-point-of-sale', description: 'Run checkout flow and create in-store sales orders.' },
    { label: 'Products', to: '/admin/products', icon: 'mdi-package-variant-closed', description: 'Create and maintain products, variants, and images.' },
    { label: 'Metadata', to: '/admin/product-metadata', icon: 'mdi-shape-outline', description: 'Manage categories, tags, and brand models.' },
    { label: 'Promotions', to: '/admin/promotions', icon: 'mdi-sale-outline', description: 'Create promo rules and discount campaigns.' },
    { label: 'Orders', to: '/admin/orders', icon: 'mdi-receipt-text-outline', description: 'Track orders, update status, and review payments.' },
    { label: 'Inbox', to: '/superadmin/inbox', icon: 'mdi-message-text-outline', description: 'Handle member conversations and assignment workflow.' },
    { label: 'Payment Methods', to: '/admin/payment-methods', icon: 'mdi-credit-card-outline', description: 'Manage bank transfer and default payment methods.' },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin', icon: 'mdi-view-dashboard-outline', description: 'Manage products, stock, orders, and payment methods.' },
    { label: 'Users', to: '/admin/users', icon: 'mdi-account-multiple-outline', description: 'Create and manage staff and member accounts.' },
    { label: 'POS', to: '/staff/pos', icon: 'mdi-point-of-sale', description: 'Run checkout flow and create in-store sales orders.' },
    { label: 'Products', to: '/admin/products', icon: 'mdi-package-variant-closed', description: 'Create and maintain products, variants, and images.' },
    { label: 'Metadata', to: '/admin/product-metadata', icon: 'mdi-shape-outline', description: 'Manage categories, tags, and brand models.' },
    { label: 'Promotions', to: '/admin/promotions', icon: 'mdi-sale-outline', description: 'Create promo rules and discount campaigns.' },
    { label: 'Orders', to: '/admin/orders', icon: 'mdi-receipt-text-outline', description: 'Track orders, update status, and review payments.' },
    { label: 'Inbox', to: '/admin/inbox', icon: 'mdi-message-text-outline', description: 'Handle incoming member conversations and assignment workflow.' },
    { label: 'Payment Methods', to: '/admin/payment-methods', icon: 'mdi-credit-card-outline', description: 'Manage bank transfer and default payment methods.' },
  ],
  staff: [
    { label: 'Overview', to: '/staff', icon: 'mdi-account-tie-outline', description: 'Quick access to daily staff workflows.' },
    { label: 'Point of Sale', to: '/staff/pos', icon: 'mdi-point-of-sale', description: 'Run checkout flow and create in-store sales orders.' },
    { label: 'Orders', to: '/admin/orders', icon: 'mdi-receipt-text-outline', description: 'Track orders and update order statuses.' },
    { label: 'Inbox', to: '/staff/inbox', icon: 'mdi-message-text-outline', description: 'Handle conversations assigned to your account.' },
    { label: 'Products', to: '/admin/products', icon: 'mdi-package-variant-closed', description: 'View and maintain product catalog and stock.' },
    { label: 'Metadata', to: '/admin/product-metadata', icon: 'mdi-shape-outline', description: 'View product categories, tags, and brands.' },
  ],
  member: [
    { label: 'Home', to: '/member', icon: 'mdi-home-outline', description: 'Browse featured products and shop updates.' },
    { label: 'Catalog', to: '/member/catalog', icon: 'mdi-store-outline', description: 'Search products and add items to your cart.' },
    { label: 'My Orders', to: '/member/orders', icon: 'mdi-package-variant', description: 'Track order status and payment progress.' },
    { label: 'Addresses', to: '/member/addresses', icon: 'mdi-map-marker-outline', description: 'Manage your shipping addresses.' },
    { label: 'Chat to Shop', to: '/member/chat', icon: 'mdi-chat-processing-outline', description: 'Start a direct conversation with shop support.' },
    { label: 'Checkout', to: '/member/checkout', icon: 'mdi-cart-outline', description: 'Review cart and place your order.' },
  ],
}

const ROLE_HOME: Record<AppRole, string> = {
  superadmin: '/superadmin',
  admin: '/admin',
  member: '/member',
  staff: '/staff',
}

export function getNavigationForRole(role: AppRole): AppNavItem[] {
  return NAVIGATION_BY_ROLE[role]
}

export function getRoleHome(role: AppRole): string {
  return ROLE_HOME[role]
}

export function useAppNavigation(role: MaybeRefOrGetter<AppRole>) {
  const resolvedRole = computed(() => toValue(role))

  return {
    items: computed(() => getNavigationForRole(resolvedRole.value)),
    home: computed(() => getRoleHome(resolvedRole.value)),
  }
}
