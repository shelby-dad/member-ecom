import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { AppRole } from '~/utils/role-switch'

export interface AppNavItem {
  label: string
  to: string
  icon: string
}

const NAVIGATION_BY_ROLE: Record<AppRole, AppNavItem[]> = {
  superadmin: [
    { label: 'Overview', to: '/superadmin', icon: 'mdi-shield-crown-outline' },
    { label: 'Admin Panel', to: '/admin', icon: 'mdi-view-dashboard-outline' },
    { label: 'Users', to: '/admin/users', icon: 'mdi-account-multiple-outline' },
    { label: 'Metadata', to: '/admin/product-metadata', icon: 'mdi-shape-outline' },
    { label: 'POS', to: '/staff/pos', icon: 'mdi-point-of-sale' },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin', icon: 'mdi-view-dashboard-outline' },
    { label: 'Users', to: '/admin/users', icon: 'mdi-account-multiple-outline' },
    { label: 'POS', to: '/staff/pos', icon: 'mdi-point-of-sale' },
    { label: 'Products', to: '/admin/products', icon: 'mdi-package-variant-closed' },
    { label: 'Metadata', to: '/admin/product-metadata', icon: 'mdi-shape-outline' },
    { label: 'Promotions', to: '/admin/promotions', icon: 'mdi-sale-outline' },
    { label: 'Orders', to: '/admin/orders', icon: 'mdi-receipt-text-outline' },
    { label: 'Payment Methods', to: '/admin/payment-methods', icon: 'mdi-credit-card-outline' },
  ],
  staff: [
    { label: 'Overview', to: '/staff', icon: 'mdi-account-tie-outline' },
    { label: 'Point of Sale', to: '/staff/pos', icon: 'mdi-point-of-sale' },
    { label: 'Orders', to: '/admin/orders', icon: 'mdi-receipt-text-outline' },
    { label: 'Products', to: '/admin/products', icon: 'mdi-package-variant-closed' },
    { label: 'Metadata', to: '/admin/product-metadata', icon: 'mdi-shape-outline' },
  ],
  member: [
    { label: 'Home', to: '/member', icon: 'mdi-home-outline' },
    { label: 'Catalog', to: '/member/catalog', icon: 'mdi-store-outline' },
    { label: 'My Orders', to: '/member/orders', icon: 'mdi-package-variant' },
    { label: 'Addresses', to: '/member/addresses', icon: 'mdi-map-marker-outline' },
    { label: 'Checkout', to: '/member/checkout', icon: 'mdi-cart-outline' },
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
