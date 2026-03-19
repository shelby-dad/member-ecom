function readUint32BE(bytes: Uint8Array, offset: number) {
  return ((bytes[offset] << 24) >>> 0) + ((bytes[offset + 1] << 16) >>> 0) + ((bytes[offset + 2] << 8) >>> 0) + bytes[offset + 3]
}

function readUint16LE(bytes: Uint8Array, offset: number) {
  return bytes[offset] + (bytes[offset + 1] << 8)
}

function readUint32LE(bytes: Uint8Array, offset: number) {
  return (bytes[offset]) + (bytes[offset + 1] << 8) + (bytes[offset + 2] << 16) + (bytes[offset + 3] << 24)
}

function isPng(bytes: Uint8Array) {
  return (
    bytes.length > 24
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4E
    && bytes[3] === 0x47
    && bytes[4] === 0x0D
    && bytes[5] === 0x0A
    && bytes[6] === 0x1A
    && bytes[7] === 0x0A
  )
}

function getPngDimensions(bytes: Uint8Array) {
  if (!isPng(bytes))
    return null
  const width = readUint32BE(bytes, 16)
  const height = readUint32BE(bytes, 20)
  if (!width || !height)
    return null
  return { width, height }
}

function getIcoDimensions(bytes: Uint8Array) {
  if (bytes.length < 22)
    return null

  const reserved = readUint16LE(bytes, 0)
  const iconType = readUint16LE(bytes, 2)
  const count = readUint16LE(bytes, 4)
  if (reserved !== 0 || iconType !== 1 || count < 1)
    return null

  let maxWidth = 0
  let maxHeight = 0

  for (let i = 0; i < count; i += 1) {
    const entryOffset = 6 + (i * 16)
    if (entryOffset + 16 > bytes.length)
      break

    let width = bytes[entryOffset] || 256
    let height = bytes[entryOffset + 1] || 256
    const bytesInRes = readUint32LE(bytes, entryOffset + 8)
    const imageOffset = readUint32LE(bytes, entryOffset + 12)

    if (imageOffset + bytesInRes <= bytes.length) {
      const image = bytes.slice(imageOffset, imageOffset + bytesInRes)
      const pngDims = getPngDimensions(image)
      if (pngDims) {
        width = pngDims.width
        height = pngDims.height
      }
    }

    maxWidth = Math.max(maxWidth, width)
    maxHeight = Math.max(maxHeight, height)
  }

  if (!maxWidth || !maxHeight)
    return null

  return { width: maxWidth, height: maxHeight }
}

export function getImageDimensions(bytes: Uint8Array, type: 'png' | 'ico') {
  if (type === 'png')
    return getPngDimensions(bytes)
  return getIcoDimensions(bytes)
}

export function isAllowedFaviconFile(fileName: string, mimeType: string) {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.png'))
    return mimeType === 'image/png' || mimeType === 'application/octet-stream'
  if (lower.endsWith('.ico'))
    return mimeType === 'image/x-icon' || mimeType === 'image/vnd.microsoft.icon' || mimeType === 'application/octet-stream'
  return false
}

export function getFaviconFileType(fileName: string): 'png' | 'ico' {
  return fileName.toLowerCase().endsWith('.ico') ? 'ico' : 'png'
}

export function buildPublicStorageUrl(baseUrl: string, bucket: string, path: string) {
  const encoded = path.split('/').map(seg => encodeURIComponent(seg)).join('/')
  return `${baseUrl}/storage/v1/object/public/${bucket}/${encoded}`
}

export function buildRenderStorageUrl(baseUrl: string, bucket: string, path: string, width: number, height: number) {
  const encoded = path.split('/').map(seg => encodeURIComponent(seg)).join('/')
  return `${baseUrl}/storage/v1/render/image/public/${bucket}/${encoded}?width=${width}&height=${height}&resize=cover`
}
