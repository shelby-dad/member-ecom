import { vi } from 'vitest'

vi.mock('h3', () => ({
  createError: (opts: { statusCode: number; message: string }) => {
    const err = new Error(opts.message) as Error & { statusCode: number }
    err.statusCode = opts.statusCode
    return err
  },
}))

vi.mock('#supabase/server', () => ({
  serverSupabaseUser: vi.fn(),
  serverSupabaseClient: vi.fn(),
}))
