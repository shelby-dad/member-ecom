#!/usr/bin/env node
/**
 * Hard-clean all member users and their related data.
 *
 * Deletes all users with role = 'member' and related rows such as:
 * - orders (+ cascaded order_items, order_status_history, payment_submissions by order_id)
 * - payment_submissions (by user_id)
 * - reviews
 * - addresses
 * - member_cart_items
 * - chat_threads (+ cascaded chat_messages)
 * - chat_push_subscriptions
 * - chat_presence
 * - profiles (member rows)
 * - auth.users (member accounts)
 *
 * Keeps non-member users and their data.
 *
 * Requires:
 * - SUPABASE_URL
 * - NUXT_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 *
 * Usage:
 * - pnpm clean:members -- --yes
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const CHUNK_SIZE = 200

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

function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size)
    out.push(list.slice(i, i + size))
  return out
}

loadEnv()

const url = process.env.SUPABASE_URL
const serviceKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const confirmed = process.argv.includes('--yes')

if (!confirmed) {
  console.error('Refusing to run without confirmation flag.')
  console.error('Run: pnpm clean:members -- --yes')
  process.exit(1)
}

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or NUXT_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY).')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function fetchMemberIds() {
  let from = 0
  const pageSize = 1000
  const ids = []
  while (true) {
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'member')
      .range(from, to)
      .order('id', { ascending: true })
    if (error)
      throw new Error(`[profiles] failed loading member ids: ${error.message}`)
    const rows = data ?? []
    ids.push(...rows.map(row => row.id).filter(Boolean))
    if (rows.length < pageSize)
      break
    from += pageSize
  }
  return ids
}

async function deleteByIds({ table, column, ids }) {
  if (!ids.length) {
    console.log(`${table}: deleted 0`)
    return 0
  }

  let total = 0
  for (const idsChunk of chunk(ids, CHUNK_SIZE)) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .in(column, idsChunk)
    if (error)
      throw new Error(`[${table}] ${error.message}`)
    total += count ?? 0
  }
  console.log(`${table}: deleted ${total}`)
  return total
}

async function deleteMemberOrdersAndDependents(memberIds) {
  if (!memberIds.length)
    return []

  const orderIds = []
  for (const idsChunk of chunk(memberIds, CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .in('user_id', idsChunk)
    if (error)
      throw new Error(`[orders] failed loading member orders: ${error.message}`)
    orderIds.push(...(data ?? []).map(row => row.id).filter(Boolean))
  }

  if (orderIds.length) {
    await deleteByIds({ table: 'payment_submissions', column: 'order_id', ids: orderIds })
    await deleteByIds({ table: 'order_status_history', column: 'order_id', ids: orderIds })
    await deleteByIds({ table: 'order_items', column: 'order_id', ids: orderIds })
  } else {
    console.log('payment_submissions: deleted 0')
    console.log('order_status_history: deleted 0')
    console.log('order_items: deleted 0')
  }

  await deleteByIds({ table: 'orders', column: 'user_id', ids: memberIds })
  return orderIds
}

async function deleteMemberAuthUsers(memberIds) {
  if (!memberIds.length) {
    console.log('auth.users: deleted 0')
    return 0
  }

  let deleted = 0
  for (const userId of memberIds) {
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error)
      throw new Error(`[auth.users] failed deleting ${userId}: ${error.message}`)
    deleted += 1
  }
  console.log(`auth.users: deleted ${deleted}`)
  return deleted
}

async function main() {
  console.log('Cleaning member users and related data (hard delete)...')
  const memberIds = await fetchMemberIds()
  if (!memberIds.length) {
    console.log('No member users found. Nothing to delete.')
    return
  }

  console.log(`Found ${memberIds.length} member user(s).`)

  await deleteMemberOrdersAndDependents(memberIds)
  await deleteByIds({ table: 'payment_submissions', column: 'user_id', ids: memberIds })
  await deleteByIds({ table: 'reviews', column: 'user_id', ids: memberIds })
  await deleteByIds({ table: 'addresses', column: 'user_id', ids: memberIds })
  await deleteByIds({ table: 'member_cart_items', column: 'user_id', ids: memberIds })
  await deleteByIds({ table: 'chat_push_subscriptions', column: 'user_id', ids: memberIds })
  await deleteByIds({ table: 'chat_presence', column: 'user_id', ids: memberIds })
  await deleteByIds({ table: 'chat_threads', column: 'member_id', ids: memberIds })
  await deleteByIds({ table: 'profiles', column: 'id', ids: memberIds })
  await deleteMemberAuthUsers(memberIds)

  console.log('Done.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
