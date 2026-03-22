#!/usr/bin/env node
/**
 * Hard-clean all in-app user notifications.
 *
 * Deletes all rows from:
 * - user_notifications
 *
 * Requires:
 * - SUPABASE_URL
 * - NUXT_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 *
 * Usage:
 * - pnpm clean:notification -- --yes
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function loadEnv() {
  const path = join(root, '.env')
  if (!existsSync(path))
    return
  const content = readFileSync(path, 'utf8')
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match)
      continue
    const key = match[1]
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1).replace(/\\n/g, '\n')
    if (!(key in process.env))
      process.env[key] = value
  }
}

loadEnv()

const url = process.env.SUPABASE_URL
const serviceKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const confirmed = process.argv.includes('--yes')

if (!confirmed) {
  console.error('Refusing to run without confirmation flag.')
  console.error('Run: pnpm clean:notification -- --yes')
  process.exit(1)
}

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or NUXT_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY).')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log('Cleaning notifications...')
  const { error, count } = await supabase
    .from('user_notifications')
    .delete({ count: 'exact' })
    .not('id', 'is', null)

  if (error)
    throw new Error(`[user_notifications] ${error.message}`)

  console.log(`user_notifications: deleted ${count ?? 0}`)
  console.log('Done.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
