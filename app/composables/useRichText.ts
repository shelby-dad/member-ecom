export function isRichTextEmpty(value: string | null | undefined) {
  const html = String(value ?? '').trim()
  if (!html) return true
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length === 0
}

export function sanitizeRichText(value: string | null | undefined) {
  let html = String(value ?? '')
  if (!html.trim()) return ''

  html = html.replace(/<\s*(script|style|iframe|object|embed|form|input|button|textarea|select)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
  html = html.replace(/<\s*(script|style|iframe|object|embed|form|input|button|textarea|select)[^>]*\/?\s*>/gi, '')
  html = html.replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
  html = html.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
  html = html.replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, ' $1="#"')

  return html
}
