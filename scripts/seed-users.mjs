#!/usr/bin/env node
/**
 * Seed example users (re-runnable). Creates or updates users and their profile roles.
 * Requires: SUPABASE_URL and NUXT_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env
 * Password for all: 123456
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// Load .env
function loadEnv() {
  const path = join(root, '.env')
  if (!existsSync(path)) return
  const content = readFileSync(path, 'utf8')
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (m) {
      const key = m[1]
      let val = m[2].trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1).replace(/\\n/g, '\n')
      if (!(key in process.env)) process.env[key] = val
    }
  }
}
loadEnv()

const url = process.env.SUPABASE_URL
const serviceKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or NUXT_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY). Set in .env')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const SEED_USERS = [
  { email: 'superadmin@tenat-shop.com', role: 'superadmin' },
  { email: 'admin@tenat-shop.com', role: 'admin' },
  { email: 'staff@tenat-shop.com', role: 'staff' },
  { email: 'member@tenat-shop.com', role: 'member' },
]

const PASSWORD = '123456'

async function ensureUser({ email, role }) {
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const existing = list?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
  let userId

  if (existing) {
    userId = existing.id
    console.log(`User exists: ${email}`)
  } else {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    })
    if (error) {
      console.error(`Failed to create ${email}:`, error.message)
      return
    }
    userId = created.user.id
    console.log(`Created user: ${email}`)
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (profileError) {
    const { error: insertError } = await supabase.from('profiles').insert({
      id: userId,
      email,
      role,
      status: 'active',
    })
    if (insertError) console.error(`Profile update/insert for ${email}:`, insertError.message)
    else console.log(`Profile set role=${role} for ${email}`)
  } else {
    console.log(`Profile role set to ${role} for ${email}`)
  }
}

async function main() {
  console.log('Seeding users (password for all: 123456)...')
  for (const user of SEED_USERS) {
    await ensureUser(user)
  }
  console.log('Done.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
