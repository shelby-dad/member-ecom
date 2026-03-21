import { cp, mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const src = resolve(process.cwd())
const dst = resolve(process.cwd(), '../supabase/functions')

const excluded = new Set([
  'scripts',
  'package.json',
  '.nvmrc',
  'node_modules',
  '.env.local',
  '.env.development',
  '.env.staging',
  '.env.production',
])

await rm(dst, { recursive: true, force: true })
await mkdir(dst, { recursive: true })

await cp(src, dst, {
  recursive: true,
  filter: (entry) => {
    const rel = entry.replace(`${src}/`, '')
    if (!rel)
      return true
    const first = rel.split('/')[0]
    return !excluded.has(first)
  },
})

console.log('[functions] synced to supabase/functions')
