export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  const key = config.supabaseServiceRoleKey
  if (key && !process.env.SUPABASE_SERVICE_KEY)
    process.env.SUPABASE_SERVICE_KEY = key
})
