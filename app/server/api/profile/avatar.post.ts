import { randomUUID } from 'node:crypto'
import { serverSupabaseUser } from '#supabase/server'
import { getServiceRoleClient } from '~/server/utils/supabase'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 5 * 1024 * 1024
const BUCKET = 'product-images'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.id)
    throw createError({ statusCode: 401, message: 'Unauthorized' })

  const form = await readMultipartFormData(event)
  const file = form?.find(part => part.name === 'file' && part.filename && part.data)
  if (!file || !file.filename || !file.data)
    throw createError({ statusCode: 400, message: 'Profile image is required.' })

  const fileType = String(file.type || '').toLowerCase()
  if (!ALLOWED_TYPES.has(fileType))
    throw createError({ statusCode: 400, message: 'Only JPG, PNG, or WEBP is allowed.' })
  if (file.data.byteLength > MAX_BYTES)
    throw createError({ statusCode: 400, message: 'Image must be 5MB or smaller.' })

  const ext = fileType === 'image/png' ? 'png' : fileType === 'image/webp' ? 'webp' : 'jpg'
  const path = `profile-images/${user.id}/${randomUUID()}.${ext}`

  const supabase = await getServiceRoleClient(event)
  const upload = await supabase.storage.from(BUCKET).upload(path, file.data, {
    contentType: fileType,
    upsert: false,
  })
  if (upload.error)
    throw createError({ statusCode: 500, message: upload.error.message })

  return { path }
})
