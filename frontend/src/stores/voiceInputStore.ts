import { create } from 'zustand'
import type { VoiceParseResult } from '@/types/api'

interface VoiceInputState {
  isListening: boolean
  interimText: string
  finalText: string
  parseResult: VoiceParseResult | null
  error: string | null

  // Actions
  startListening: () => void
  stopListening: () => void
  setInterimText: (text: string) => void
  setFinalText: (text: string) => void
  setParseResult: (result: VoiceParseResult | null) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useVoiceInputStore = create<VoiceInputState>((set) => ({
  isListening: false,
  interimText: '',
  finalText: '',
  parseResult: null,
  error: null,

  startListening: () => set({ isListening: true, error: null }),
  stopListening: () => set({ isListening: false }),
  setInterimText: (text) => set({ interimText: text }),
  setFinalText: (text) => set({ finalText: text }),
  setParseResult: (result) => set({ parseResult: result }),
  setError: (error) => set({ error }),
  reset: () => set({
    isListening: false,
    interimText: '',
    finalText: '',
    parseResult: null,
    error: null,
  }),
}))
