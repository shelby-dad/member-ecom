#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const migrationsDir = join(root, 'supabase', 'migrations')
const outPath = join(root, 'supabase', 'full-schema.sql')

const files = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort()

const contents = files.map(f => {
  const path = join(migrationsDir, f)
  return `-- ${f}\n${readFileSync(path, 'utf8')}`
}).join('\n\n')

writeFileSync(outPath, contents, 'utf8')
console.log(`Wrote ${files.length} migrations to supabase/full-schema.sql`)
