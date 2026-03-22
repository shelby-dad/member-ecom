export const MEMBER_ORDER_SOURCE = 'Member Order' as const
export const POS_ORDER_SOURCE = 'POS Order' as const

export function isMemberOrderSource(source: unknown): boolean {
  return String(source ?? '').trim() === MEMBER_ORDER_SOURCE
}

