import { describe, expect, it } from 'vitest'
import { responsesInputToMessages } from './unifiedResponsesProxy'

describe('responsesInputToMessages system message normalization', () => {
  it('merges instructions plus developer and system messages into one leading system message', () => {
    const messages = responsesInputToMessages([
      {
        type: 'message',
        role: 'developer',
        content: [{ type: 'input_text', text: 'Memory instructions' }],
      },
      {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'first user message' }],
      },
      {
        type: 'message',
        role: 'system',
        content: [{ type: 'input_text', text: 'Late system note' }],
      },
      {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'second user message' }],
      },
    ], 'Base instructions')

    expect(messages).toEqual([
      {
        role: 'system',
        content: 'Base instructions\n\nMemory instructions\n\nLate system note',
      },
      { role: 'user', content: 'first user message' },
      { role: 'user', content: 'second user message' },
    ])
  })

  it('does not add a system message when no system-level content exists', () => {
    const messages = responsesInputToMessages([
      {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'hello' }],
      },
    ])

    expect(messages).toEqual([{ role: 'user', content: 'hello' }])
  })
})
