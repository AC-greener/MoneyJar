import type { VoiceParseResult } from '@/types/api'

// Create mock voice input store
export function getMockVoiceInputStore(config: {
  finalText?: string
  parseResult?: VoiceParseResult | null
  isListening?: boolean
  interimText?: string
  error?: string | null
} = {}) {
  const { finalText = '', parseResult = null, isListening = false, interimText = '', error = null } = config

  return {
    finalText,
    parseResult,
    isListening,
    interimText,
    error,
    setFinalText: vi.fn(),
    setParseResult: vi.fn(),
    setInterimText: vi.fn(),
    setError: vi.fn(),
    reset: vi.fn(),
    startListening: vi.fn(),
    stopListening: vi.fn(),
  }
}
