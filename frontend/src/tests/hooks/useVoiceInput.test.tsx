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

class MockSpeechRecognition {
  static lastInstance: MockSpeechRecognition | null = null

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
    MockSpeechRecognition.lastInstance = this
  }
}

describe('useVoiceInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storeState.isListening = false
    storeState.interimText = ''
    storeState.finalText = ''
    storeState.error = null
    MockSpeechRecognition.lastInstance = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).SpeechRecognition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).webkitSpeechRecognition
  })

  it('浏览器不支持时返回错误状态', () => {
    const { result } = renderHook(() => useVoiceInput())

    expect(storeState.setError).toHaveBeenCalledWith('您的浏览器不支持语音识别')
    expect(result.current.isSupported).toBe(false)
  })

  it('初始化 recognition 并处理最终识别文本', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).SpeechRecognition = MockSpeechRecognition
    const onFinalText = vi.fn()

    const { result, unmount } = renderHook(() =>
      useVoiceInput({ onFinalText, continuous: true, lang: 'en-US' })
    )

    expect(result.current.isSupported).toBe(true)
    expect(MockSpeechRecognition.lastInstance?.continuous).toBe(true)
    expect(MockSpeechRecognition.lastInstance?.interimResults).toBe(true)
    expect(MockSpeechRecognition.lastInstance?.lang).toBe('en-US')

    act(() => {
      MockSpeechRecognition.lastInstance?.onstart?.()
      MockSpeechRecognition.lastInstance?.onresult?.({
        resultIndex: 0,
        results: [
          { 0: { transcript: 'hello ' }, isFinal: false },
          { 0: { transcript: 'world' }, isFinal: true },
        ],
      })
      MockSpeechRecognition.lastInstance?.onend?.()
    })

    expect(storeState.startListening).toHaveBeenCalled()
    expect(storeState.setError).toHaveBeenCalledWith(null)
    expect(storeState.setInterimText).toHaveBeenCalledWith('hello ')
    expect(storeState.setFinalText).toHaveBeenCalledWith('world')
    expect(onFinalText).toHaveBeenCalledWith('world')
    expect(storeState.stopListening).toHaveBeenCalled()

    unmount()
    expect(MockSpeechRecognition.lastInstance?.abort).toHaveBeenCalled()
  })

  it('将识别错误映射为友好文案', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).SpeechRecognition = MockSpeechRecognition
    renderHook(() => useVoiceInput())

    act(() => {
      MockSpeechRecognition.lastInstance?.onerror?.({ error: 'audio-capture' })
      MockSpeechRecognition.lastInstance?.onerror?.({ error: 'not-allowed' })
      MockSpeechRecognition.lastInstance?.onerror?.({ error: 'network' })
      MockSpeechRecognition.lastInstance?.onerror?.({ error: 'something-else' })
    })

    expect(storeState.setError).toHaveBeenCalledWith('无法访问麦克风')
    expect(storeState.setError).toHaveBeenCalledWith('麦克风权限被拒绝')
    expect(storeState.setError).toHaveBeenCalledWith('网络错误，语音识别不可用')
    expect(storeState.setError).toHaveBeenCalledWith('语音识别出错')
    expect(storeState.stopListening).toHaveBeenCalledTimes(4)
  })

  it('start/stop 只在合适状态下调用 recognition', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).SpeechRecognition = MockSpeechRecognition
    const { result, rerender } = renderHook(() => useVoiceInput())

    act(() => {
      result.current.start()
    })
    expect(MockSpeechRecognition.lastInstance?.start).toHaveBeenCalled()

    storeState.isListening = true
    rerender()
    act(() => {
      result.current.stop()
      result.current.start()
    })

    expect(MockSpeechRecognition.lastInstance?.stop).toHaveBeenCalled()
    expect(MockSpeechRecognition.lastInstance?.start).toHaveBeenCalledTimes(1)
  })
})
