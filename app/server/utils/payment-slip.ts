type PaymentSubmissionWithSlip = {
  slip_path?: string | null
  [key: string]: unknown
}

export async function withSignedPaymentSlipUrls<T extends PaymentSubmissionWithSlip>(
  supabase: any,
  submissions: T[],
  expiresInSeconds = 60 * 60,
): Promise<Array<T & { slip_url: string | null }>> {
  if (!Array.isArray(submissions) || !submissions.length)
    return []

  const safeExpires = Math.max(60, Math.min(60 * 60 * 24, Number(expiresInSeconds) || (60 * 60)))

  const resolved = await Promise.all(submissions.map(async (submission) => {
    const slipPath = String(submission?.slip_path ?? '').trim()
    if (!slipPath)
      return { ...submission, slip_url: null }

    const { data, error } = await supabase.storage
      .from('payment-slips')
      .createSignedUrl(slipPath, safeExpires)

    if (error || !data?.signedUrl)
      return { ...submission, slip_url: null }

    return { ...submission, slip_url: String(data.signedUrl) }
  }))

  return resolved
}
