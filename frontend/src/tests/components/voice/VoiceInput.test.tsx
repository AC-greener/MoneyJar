import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const useVoiceInputMock = vi.fn()

vi.mock('@/hooks/useVoiceInput', () => ({
  useVoiceInput: () => useVoiceInputMock(),
}))

import { VoiceInput } from '@/components/voice/VoiceInput'

describe('VoiceInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('不支持语音识别时显示提示', () => {
    useVoiceInputMock.mockReturnValue({
      isListening: false,
      interimText: '',
      error: null,
      start: vi.fn(),
      stop: vi.fn(),
      isSupported: false,
    })

    render(<VoiceInput onTranscript={vi.fn()} />)
    expect(screen.getByText('您的浏览器不支持语音识别')).toBeInTheDocument()
  })

  it('点击按钮时开始录音', () => {
    const start = vi.fn()
    useVoiceInputMock.mockReturnValue({
      isListening: false,
      interimText: '',
      error: null,
      start,
      stop: vi.fn(),
      isSupported: true,
    })

    render(<VoiceInput onTranscript={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '开始录音' }))
    expect(start).toHaveBeenCalled()
  })

  it('录音中点击按钮时停止录音，并显示中间结果和错误', () => {
    const stop = vi.fn()
    useVoiceInputMock.mockReturnValue({
      isListening: true,
      interimText: '正在识别',
      error: '网络错误',
      start: vi.fn(),
      stop,
      isSupported: true,
    })

    render(<VoiceInput onTranscript={vi.fn()} />)
    expect(screen.getByText('正在聆听...')).toBeInTheDocument()
    expect(screen.getByText('正在识别')).toBeInTheDocument()
    expect(screen.getByText('网络错误')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '停止录音' }))
    expect(stop).toHaveBeenCalled()
  })
})
