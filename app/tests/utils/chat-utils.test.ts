import { describe, expect, it } from 'vitest'
import {
  canMemberSendWhileUnassigned,
  isValidImageAttachmentPath,
  normalizeChatAttachmentMessage,
  normalizeMessagePreviewWithAttachment,
} from '~/server/utils/chat'

describe('chat utils', () => {
  it('normalizes attachment-only message', () => {
    expect(normalizeChatAttachmentMessage('', true)).toBe('sent a file')
    expect(normalizeMessagePreviewWithAttachment('', true)).toBe('sent a file')
  })

  it('keeps explicit text when attachment exists', () => {
    expect(normalizeChatAttachmentMessage('hello', true)).toBe('hello')
  })

  it('validates attachment paths', () => {
    expect(isValidImageAttachmentPath('chat/a/b/file.jpg')).toBe(true)
    expect(isValidImageAttachmentPath('chat/a/b/file.webp')).toBe(true)
    expect(isValidImageAttachmentPath('../file.jpg')).toBe(false)
    expect(isValidImageAttachmentPath('chat/a/file.pdf')).toBe(false)
  })

  it('enforces unassigned member send turn', () => {
    expect(canMemberSendWhileUnassigned(null, 'm1')).toBe(true)
    expect(canMemberSendWhileUnassigned('m1', 'm1')).toBe(false)
    expect(canMemberSendWhileUnassigned('op1', 'm1')).toBe(true)
  })
})
