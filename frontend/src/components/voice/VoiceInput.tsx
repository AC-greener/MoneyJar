import { useVoiceInput } from '@/hooks/useVoiceInput'
import type { VoiceInputProps } from '@/types/api'

export function VoiceInput({ onTranscript, disabled = false }: VoiceInputProps) {
  const { isListening, interimText, error, start, stop, isSupported } = useVoiceInput({
    onFinalText: onTranscript,
    continuous: false,
  })

  const handleClick = () => {
    if (isListening) {
      stop()
    } else {
      start()
    }
  }

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <p className="text-red-500 text-sm">您的浏览器不支持语音识别</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Microphone Button */}
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`
          w-20 h-20 rounded-full flex items-center justify-center
          transition-all duration-200 ease-out
          ${isListening
            ? 'bg-red-500 scale-110 animate-pulse'
            : 'bg-blue-500 hover:bg-blue-600 active:scale-95'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        `}
        aria-label={isListening ? '停止录音' : '开始录音'}
      >
        <svg
          className="w-10 h-10 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isListening ? (
            // Stop icon
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          ) : (
            // Microphone icon
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          )}
        </svg>
      </button>

      {/* Status Text */}
      <p className="text-gray-600 dark:text-gray-400 text-sm">
        {isListening ? '正在聆听...' : '点击麦克风开始说话'}
      </p>

      {/* Interim Text Display */}
      {interimText && (
        <div className="w-full max-w-md p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 text-xs mb-1">识别中...</p>
          <p className="text-gray-800 dark:text-gray-200">{interimText}</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="w-full max-w-md p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}
