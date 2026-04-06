import { useEffect, useRef, useCallback } from 'react'
import { useVoiceInputStore } from '@/stores/voiceInputStore'

// Check if Web Speech API is available
const isSpeechRecognitionSupported = () => {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
}

interface UseVoiceInputOptions {
  onFinalText?: (text: string) => void
  continuous?: boolean
  lang?: string
}

export const useVoiceInput = (options: UseVoiceInputOptions = {}) => {
  const { onFinalText, continuous = false, lang = 'zh-CN' } = options
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  const {
    isListening,
    interimText,
    finalText,
    error,
    startListening,
    stopListening,
    setInterimText,
    setFinalText,
    setError,
    reset,
  } = useVoiceInputStore()

  // Initialize Speech Recognition
  useEffect(() => {
    if (!isSpeechRecognitionSupported()) {
      setError('您的浏览器不支持语音识别')
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = continuous
    recognition.interimResults = true
    recognition.lang = lang

    recognition.onstart = () => {
      startListening()
      setError(null)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }

      setInterimText(interim)
      if (final) {
        setFinalText(final)
        onFinalText?.(final)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      switch (event.error) {
        case 'no-speech':
          setError('没有检测到语音，请重试')
          break
        case 'audio-capture':
          setError('无法访问麦克风')
          break
        case 'not-allowed':
          setError('麦克风权限被拒绝')
          break
        case 'network':
          setError('网络错误，语音识别不可用')
          break
        default:
          setError('语音识别出错')
      }
      stopListening()
    }

    recognition.onend = () => {
      stopListening()
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [continuous, lang, onFinalText, setError, setFinalText, setInterimText, startListening, stopListening])

  const start = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start()
      } catch {
        // Recognition might already be running
      }
    }
  }, [isListening])

  const stop = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }, [isListening])

  return {
    isListening,
    interimText,
    finalText,
    error,
    start,
    stop,
    reset,
    isSupported: isSpeechRecognitionSupported(),
  }
}
