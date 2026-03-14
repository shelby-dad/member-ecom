export default defineNuxtRouteMiddleware((to) => {
  // Skip auth check for public routes
  if (to.meta.auth === false)
    return
  const user = useSupabaseUser()
  if (!user.value && to.path !== '/auth/login' && to.path !== '/auth/callback') {
    return navigateTo('/auth/login', { replace: true })
  }
})
