import { randomUUID } from 'node:crypto'
import { getProfileOrThrow, requireRoles } from '~/server/utils/auth'
import { getImageDimensions, isAllowedFaviconFile, getFaviconFileType, buildRenderStorageUrl } from '~/server/utils/favicon'
import { getServiceRoleClient } from '~/server/utils/supabase'

const BUCKET = 'product-images'

export default defineEventHandler(async (event) => {
  const profile = await getProfileOrThrow(event)
  requireRoles(profile, ['superadmin'])

  const form = await readMultipartFormData(event)
  const file = form?.find(part => part.name === 'file' && part.filename && part.data)
  if (!file || !file.filename || !file.data)
    throw createError({ statusCode: 400, message: 'Favicon file is required.' })

  if (!isAllowedFaviconFile(file.filename, file.type || ''))
    throw createError({ statusCode: 400, message: 'Only .png or .ico files are allowed.' })

  const fileType = getFaviconFileType(file.filename)
  const dimensions = getImageDimensions(file.data, fileType)
  if (!dimensions || dimensions.width !== 512 || dimensions.height !== 512)
    throw createError({ statusCode: 400, message: 'Favicon must be exactly 512x512.' })

  const supabase = await getServiceRoleClient(event)
  const config = useRuntimeConfig(event)
  const supabaseUrl = String(config.public.supabaseUrl || '').trim()
  if (!supabaseUrl)
    throw createError({ statusCode: 500, message: 'Supabase URL is not configured.' })

  const id = randomUUID()
  const sourcePath = `site/favicon/${id}-source.${fileType}`
  const output64Path = `site/favicon/${id}-64.png`
  const output84Path = `site/favicon/${id}-84.png`
  const output512Path = `site/favicon/${id}-512.png`

  const sourceContentType = fileType === 'ico' ? 'image/x-icon' : 'image/png'
  const sourceUpload = await supabase.storage.from(BUCKET).upload(sourcePath, file.data, { contentType: sourceContentType, upsert: false })
  if (sourceUpload.error)
    throw createError({ statusCode: 500, message: sourceUpload.error.message })

  async function uploadResized(path: string, size: number) {
    const renderUrl = buildRenderStorageUrl(supabaseUrl, BUCKET, sourcePath, size, size)
    let lastStatus = 0
    let bytes: Uint8Array | null = null
    for (let i = 0; i < 3; i += 1) {
      const response = await fetch(renderUrl)
      lastStatus = response.status
      if (response.ok) {
        bytes = new Uint8Array(await response.arrayBuffer())
        break
      }
      await new Promise(resolve => setTimeout(resolve, 120 * (i + 1)))
    }
    if (!bytes)
      throw createError({ statusCode: 500, message: `Failed to generate ${size}x${size} favicon (status ${lastStatus}).` })

    const upload = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/png', upsert: false })
    if (upload.error)
      throw createError({ statusCode: 500, message: upload.error.message })
  }

  await uploadResized(output64Path, 64)
  await uploadResized(output84Path, 84)
  await uploadResized(output512Path, 512)

  return {
    site_favicon_original: sourcePath,
    site_favicon_64: output64Path,
    site_favicon_84: output84Path,
    site_favicon_512: output512Path,
  }
})
