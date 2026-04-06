import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useVoiceInput } from '@/hooks/useVoiceInput'

const storeState = {
  isListening: false,
  interimText: '',
  finalText: '',
  error: null as string | null,
  startListening: vi.fn(),
  stopListening: vi.fn(),
  setInterimText: vi.fn(),
  setFinalText: vi.fn(),
  setError: vi.fn(),
  reset: vi.fn(),
}

vi.mock('@/stores/voiceInputStore', () => ({
  useVoiceInputStore: () => storeState,
}))

let recognitionInstance: MockSpeechRecognition | null = null

class MockSpeechRecognition {
  continuous = false
  interimResults = false
  lang = ''
  onstart: (() => void) | null = null
  onresult: ((event: unknown) => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn()
  abort = vi.fn()

  constructor() {
    recognitionInstance = this
  }
}

describe('useVoiceInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storeState.isListening = false
    storeState.interimText = ''
    storeState.finalText = ''
    storeState.error = null
    recognitionInstance = null
    delete (window as Window & { SpeechRecognition?: typeof MockSpeechRecognition }).SpeechRecognition
    delete (window as Window & { webkitSpeechRecognition?: typeof MockSpeechRecognition }).webkitSpeechRecognition
  })

  it('浏览器不支持时返回错误状态', () => {
    const { result } = renderHook(() => useVoiceInput())

    expect(storeState.setError).toHaveBeenCalledWith('您的浏览器不支持语音识别')
    expect(result.current.isSupported).toBe(false)
  })

  it('初始化 recognition 并处理最终识别文本', () => {
    ;(window as Window & { SpeechRecognition?: typeof MockSpeechRecognition }).SpeechRecognition = MockSpeechRecognition
    const onFinalText = vi.fn()

    const { result, unmount } = renderHook(() =>
      useVoiceInput({ onFinalText, continuous: true, lang: 'en-US' })
    )

    expect(result.current.isSupported).toBe(true)
    expect(recognitionInstance?.continuous).toBe(true)
    expect(recognitionInstance?.interimResults).toBe(true)
    expect(recognitionInstance?.lang).toBe('en-US')

    act(() => {
      recognitionInstance?.onstart?.()
      recognitionInstance?.onresult?.({
        resultIndex: 0,
        results: [
          { 0: { transcript: 'hello ' }, isFinal: false },
          { 0: { transcript: 'world' }, isFinal: true },
        ],
      })
      recognitionInstance?.onend?.()
    })

    expect(storeState.startListening).toHaveBeenCalled()
    expect(storeState.setError).toHaveBeenCalledWith(null)
    expect(storeState.setInterimText).toHaveBeenCalledWith('hello ')
    expect(storeState.setFinalText).toHaveBeenCalledWith('world')
    expect(onFinalText).toHaveBeenCalledWith('world')
    expect(storeState.stopListening).toHaveBeenCalled()

    unmount()
    expect(recognitionInstance?.abort).toHaveBeenCalled()
  })

  it('将识别错误映射为友好文案', () => {
    ;(window as Window & { SpeechRecognition?: typeof MockSpeechRecognition }).SpeechRecognition = MockSpeechRecognition
    renderHook(() => useVoiceInput())

    act(() => {
      recognitionInstance?.onerror?.({ error: 'audio-capture' })
      recognitionInstance?.onerror?.({ error: 'not-allowed' })
      recognitionInstance?.onerror?.({ error: 'network' })
      recognitionInstance?.onerror?.({ error: 'something-else' })
    })

    expect(storeState.setError).toHaveBeenCalledWith('无法访问麦克风')
    expect(storeState.setError).toHaveBeenCalledWith('麦克风权限被拒绝')
    expect(storeState.setError).toHaveBeenCalledWith('网络错误，语音识别不可用')
    expect(storeState.setError).toHaveBeenCalledWith('语音识别出错')
    expect(storeState.stopListening).toHaveBeenCalledTimes(4)
  })

  it('start/stop 只在合适状态下调用 recognition', () => {
    ;(window as Window & { SpeechRecognition?: typeof MockSpeechRecognition }).SpeechRecognition = MockSpeechRecognition
    const { result, rerender } = renderHook(() => useVoiceInput())

    act(() => {
      result.current.start()
    })
    expect(recognitionInstance?.start).toHaveBeenCalled()

    storeState.isListening = true
    rerender()
    act(() => {
      result.current.stop()
      result.current.start()
    })

    expect(recognitionInstance?.stop).toHaveBeenCalled()
    expect(recognitionInstance?.start).toHaveBeenCalledTimes(1)
  })
})
