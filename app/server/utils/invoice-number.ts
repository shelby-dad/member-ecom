function randomLetters(length: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let output = ''
  for (let i = 0; i < length; i++)
    output += chars[Math.floor(Math.random() * chars.length)]
  return output
}

function randomDigits(length: number) {
  let output = ''
  for (let i = 0; i < length; i++)
    output += String(Math.floor(Math.random() * 10))
  return output
}

export function generateInvoiceNumberCandidate() {
  return `INV-${randomLetters(4)}${randomDigits(4)}`
}

export async function generateUniqueInvoiceNumber(
  supabase: any,
  maxAttempts = 20,
) {
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = generateInvoiceNumberCandidate()
    const { data, error } = await supabase
      .from('payment_submissions')
      .select('id')
      .eq('invoice_number', candidate)
      .limit(1)
      .maybeSingle()
    if (error)
      throw createError({ statusCode: 500, message: error.message })
    if (!data)
      return candidate
  }

  throw createError({
    statusCode: 500,
    message: 'Failed to generate unique invoice number. Please retry.',
  })
}

