export default defineNuxtRouteMiddleware(async (to) => {
  // Skip auth check for public routes
  if (to.meta.auth === false)
    return

  const user = useSupabaseUser()

  if (!user.value && import.meta.client) {
    const supabase = useSupabaseClient()
    for (let attempt = 0; attempt < 12 && !user.value; attempt++) {
      const { data } = await supabase.auth.getSession()
      if (data.session?.user) {
        user.value = data.session.user
        break
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  if (!user.value && to.path !== '/auth/login' && to.path !== '/auth/callback') {
    return navigateTo('/auth/login', { replace: true })
  }
})
