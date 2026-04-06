import { describe, it, expect, beforeEach } from 'vitest'
import { act } from 'react'
import { renderHook } from '@testing-library/react'
import { useVoiceInputStore } from '@/stores/voiceInputStore'
import type { VoiceParseResult } from '@/types/api'

describe('voiceInputStore', () => {
  beforeEach(() => {
    // Reset store state
    useVoiceInputStore.setState({
      isListening: false,
      interimText: '',
      finalText: '',
      parseResult: null,
      error: null,
    })
  })

  describe('初始状态', () => {
    it('有正确的初始状态', () => {
      const { result } = renderHook(() => useVoiceInputStore())
      expect(result.current.isListening).toBe(false)
      expect(result.current.interimText).toBe('')
      expect(result.current.finalText).toBe('')
      expect(result.current.parseResult).toBeNull()
      expect(result.current.error).toBeNull()
    })
  })

  describe('startListening', () => {
    it('设置 isListening 为 true', () => {
      const { result } = renderHook(() => useVoiceInputStore())
      act(() => {
        result.current.startListening()
      })
      expect(result.current.isListening).toBe(true)
    })

    it('清除错误', () => {
      useVoiceInputStore.setState({ error: 'Some error' })
      const { result } = renderHook(() => useVoiceInputStore())
      act(() => {
        result.current.startListening()
      })
      expect(result.current.error).toBeNull()
    })
  })

  describe('stopListening', () => {
    it('设置 isListening 为 false', () => {
      useVoiceInputStore.setState({ isListening: true })
      const { result } = renderHook(() => useVoiceInputStore())
      act(() => {
        result.current.stopListening()
      })
      expect(result.current.isListening).toBe(false)
    })
  })

  describe('setInterimText', () => {
    it('设置 interimText', () => {
      const { result } = renderHook(() => useVoiceInputStore())
      act(() => {
        result.current.setInterimText('正在识别...')
      })
      expect(result.current.interimText).toBe('正在识别...')
    })
  })

  describe('setFinalText', () => {
    it('设置 finalText', () => {
      const { result } = renderHook(() => useVoiceInputStore())
      act(() => {
        result.current.setFinalText('最终识别结果')
      })
      expect(result.current.finalText).toBe('最终识别结果')
    })
  })

  describe('setParseResult', () => {
    it('设置 parseResult', () => {
      const mockResult: VoiceParseResult = {
        transactions: [{
          type: 'expense',
          amount: 100,
          category: '餐饮',
          note: '午餐',
        }],
        rawText: '花了100块吃午饭',
      }

      const { result } = renderHook(() => useVoiceInputStore())
      act(() => {
        result.current.setParseResult(mockResult)
      })
      expect(result.current.parseResult).toEqual(mockResult)
    })

    it('可以设置为 null', () => {
      useVoiceInputStore.setState({ parseResult: { transactions: [], rawText: '' } })
      const { result } = renderHook(() => useVoiceInputStore())
      act(() => {
        result.current.setParseResult(null)
      })
      expect(result.current.parseResult).toBeNull()
    })
  })

  describe('setError', () => {
    it('设置错误信息', () => {
      const { result } = renderHook(() => useVoiceInputStore())
      act(() => {
        result.current.setError('麦克风权限被拒绝')
      })
      expect(result.current.error).toBe('麦克风权限被拒绝')
    })

    it('可以设置为 null', () => {
      useVoiceInputStore.setState({ error: 'Some error' })
      const { result } = renderHook(() => useVoiceInputStore())
      act(() => {
        result.current.setError(null)
      })
      expect(result.current.error).toBeNull()
    })
  })

  describe('reset', () => {
    it('重置所有状态', () => {
      useVoiceInputStore.setState({
        isListening: true,
        interimText: '临时文本',
        finalText: '最终文本',
        parseResult: { transactions: [], rawText: '' },
        error: '错误',
      })

      const { result } = renderHook(() => useVoiceInputStore())
      act(() => {
        result.current.reset()
      })

      expect(result.current.isListening).toBe(false)
      expect(result.current.interimText).toBe('')
      expect(result.current.finalText).toBe('')
      expect(result.current.parseResult).toBeNull()
      expect(result.current.error).toBeNull()
    })
  })
})
