import type { AppRole } from '~/utils/role-switch'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: AppRole
  branch_id: string | null
  status: string
  wallet_balance: number
  created_at: string
  updated_at: string
}

export function useProfile() {
  const profileState = useState<Profile | null>('profile', () => null)
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()

  async function fetchProfile() {
    if (!user.value?.id) {
      profileState.value = null
      return null
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, role, branch_id, status, wallet_balance, created_at, updated_at')
      .eq('id', user.value.id)
      .maybeSingle()
    if (error) {
      profileState.value = null
      return null
    }
    if (!data) {
      profileState.value = null
      return null
    }
    profileState.value = data as Profile
    return profileState.value
  }

  async function ensureProfile() {
    if (profileState.value?.id === user.value?.id)
      return profileState.value
    return fetchProfile()
  }

  function clearProfile() {
    profileState.value = null
  }

  const profile = readonly(profileState)

  return {
    profile,
    fetchProfile,
    ensureProfile,
    clearProfile,
  }
}
