#!/usr/bin/env node
/**
 * Hard-clean application data from DB while preserving user/role data.
 *
 * Keeps:
 * - auth.users
 * - public.profiles (including role)
 *
 * Deletes all rows from:
 * - payment_submissions
 * - reviews
 * - order_status_history
 * - order_items
 * - orders
 * - addresses
 * - stock_movements
 * - stock
 * - product_images
 * - product_variants
 * - product_categories
 * - product_tags
 * - products
 * - categories
 * - tags
 * - brands
 * - payment_methods
 * - branches
 *
 * Also deletes all files from all Storage buckets (keeps buckets).
 *
 * Re-seeds default payment methods after cleanup:
 * - Cash
 * - Cash on Delivery
 *
 * Resets all profile wallet balances to 0.
 *
 * Requires:
 * - SUPABASE_URL
 * - NUXT_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 *
 * Usage:
 * - pnpm clean:db -- --yes
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function loadEnv() {
  const path = join(root, '.env')
  if (!existsSync(path)) return
  const content = readFileSync(path, 'utf8')
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!m) continue
    const key = m[1]
    let val = m[2].trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1).replace(/\\n/g, '\n')
    if (!(key in process.env))
      process.env[key] = val
  }
}

loadEnv()

const url = process.env.SUPABASE_URL
const serviceKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const confirmed = process.argv.includes('--yes')

if (!confirmed) {
  console.error('Refusing to run without confirmation flag.')
  console.error('Run: pnpm clean:db -- --yes')
  process.exit(1)
}

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or NUXT_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY).')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TABLES_TO_CLEAN = [
  'payment_submissions',
  'reviews',
  'order_status_history',
  'order_items',
  'orders',
  'addresses',
  'stock_movements',
  'stock',
  'product_images',
  'product_variants',
  'product_categories',
  'product_tags',
  'products',
  'categories',
  'tags',
  'brands',
  'payment_methods',
  'branches',
]

async function listAllFilePaths(bucket, prefix = '') {
  const files = []
  const folders = []
  let offset = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: pageSize,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error)
      throw new Error(`[storage:${bucket}] list failed at "${prefix || '/'}": ${error.message}`)

    const rows = data ?? []
    for (const row of rows) {
      const name = String(row?.name ?? '')
      if (!name) continue
      const fullPath = prefix ? `${prefix}/${name}` : name
      if (row?.id)
        files.push(fullPath)
      else
        folders.push(fullPath)
    }

    if (rows.length < pageSize)
      break
    offset += pageSize
  }

  for (const folder of folders) {
    const nested = await listAllFilePaths(bucket, folder)
    files.push(...nested)
  }

  return files
}

async function removeStorageFiles(bucket) {
  const allFiles = await listAllFilePaths(bucket)
  if (!allFiles.length) {
    console.log(`storage:${bucket}: deleted 0`)
    return
  }

  let deleted = 0
  const chunkSize = 100
  for (let i = 0; i < allFiles.length; i += chunkSize) {
    const chunk = allFiles.slice(i, i + chunkSize)
    const { error } = await supabase.storage.from(bucket).remove(chunk)
    if (error)
      throw new Error(`[storage:${bucket}] remove failed: ${error.message}`)
    deleted += chunk.length
  }

  console.log(`storage:${bucket}: deleted ${deleted}`)
}

async function cleanStorageBuckets() {
  const { data, error } = await supabase.storage.listBuckets()
  if (error)
    throw new Error(`[storage] listBuckets failed: ${error.message}`)

  const buckets = (data ?? []).map(bucket => bucket.name).filter(Boolean)
  for (const bucket of buckets)
    await removeStorageFiles(bucket)
}

async function reseedDefaultPaymentMethods() {
  const defaults = [
    { name: 'Cash', type: 'cash', is_active: true, sort_order: 20 },
    { name: 'Cash on Delivery', type: 'cod', is_active: true, sort_order: 30 },
  ]

  const { data, error } = await supabase
    .from('payment_methods')
    .select('type')
    .in('type', defaults.map(method => method.type))

  if (error)
    throw new Error(`[payment_methods] read defaults failed: ${error.message}`)

  const existingTypes = new Set((data ?? []).map(row => String(row.type ?? '').trim()))
  const missing = defaults.filter(method => !existingTypes.has(method.type))

  if (!missing.length) {
    console.log('payment_methods: defaults already present')
    return
  }

  const { error: insertError } = await supabase
    .from('payment_methods')
    .insert(missing)

  if (insertError)
    throw new Error(`[payment_methods] seed defaults failed: ${insertError.message}`)

  console.log(`payment_methods: re-seeded ${missing.length} default method(s)`)
}

async function resetProfileWalletBalances() {
  const { error, count } = await supabase
    .from('profiles')
    .update({ wallet_balance: 0 }, { count: 'exact' })
    .not('id', 'is', null)

  if (error)
    throw new Error(`[profiles] reset wallet_balance failed: ${error.message}`)

  console.log(`profiles: wallet_balance reset to 0 for ${count ?? 0} profile(s)`)
}

async function deleteAllRows(table) {
  const { error, count } = await supabase
    .from(table)
    .delete({ count: 'exact' })
    .not('created_at', 'is', null)

  if (error)
    throw new Error(`[${table}] ${error.message}`)

  console.log(`${table}: deleted ${count ?? 0}`)
}

async function main() {
  console.log('Cleaning DB (hard delete)...')
  console.log('Preserving auth.users and profiles (including role data).')
  console.log('Removing all files from Storage buckets (keeping buckets).')
  await cleanStorageBuckets()
  for (const table of TABLES_TO_CLEAN)
    await deleteAllRows(table)
  await resetProfileWalletBalances()
  await reseedDefaultPaymentMethods()
  console.log('Done.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
