import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

/**
 * OAuth Callback 页面
 *
 * 处理 Google OAuth 授权回调：
 * 1. 从 URL 读取 exchange_code 和 error
 * 2. 调用 completeOAuthLogin 兑换正式 tokens
 * 3. 成功后跳转到 return_to 或默认 /record
 * 4. 失败时显示错误信息，可点击重新登录
 */
export default function CallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { completeOAuthLogin, error, isLoading, clearError } = useAuthStore()
  const [localError, setLocalError] = useState<string | null>(null)
  const hasCalledRef = useRef(false)

  useEffect(() => {
    // 防止重复调用
    if (hasCalledRef.current) return
    hasCalledRef.current = true

    // 从 URL 获取 exchange_code 或 error
    const exchangeCode = searchParams.get('exchange_code')
    const errorParam = searchParams.get('error')
    const returnTo = searchParams.get('return_to') || '/record'

    // 如果有错误参数
    if (errorParam) {
      setLocalError(getErrorMessage(errorParam))
      return
    }

    // 如果没有 exchange_code
    if (!exchangeCode) {
      setLocalError('缺少登录凭据，请重新登录')
      return
    }

    // 执行 OAuth login
    completeOAuthLogin(exchangeCode)
      .then(() => {
        // 登录成功，跳转到 return_to
        navigate(returnTo, { replace: true })
      })
      .catch((err) => {
        // 登录失败，错误信息由 store 处理
        console.error('OAuth login failed:', err)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // 处理重新登录点击
  const handleRetry = () => {
    clearError()
    setLocalError(null)
    // 跳转到 Google 登录起点
    const returnTo = encodeURIComponent(window.location.pathname)
    window.location.href = `/api/auth/google/start?return_to=${returnTo}`
  }

  // 显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">正在登录...</h2>
          <p className="text-gray-500 dark:text-gray-400">正在完成 Google 授权，请稍候</p>
        </div>
      </div>
    )
  }

  // 显示错误状态
  const displayError = localError || error || '登录失败'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">登录失败</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{displayError}</p>
        <button
          onClick={handleRetry}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
        >
          重新登录
        </button>
      </div>
    </div>
  )
}

/**
 * 将错误码转换为可读的错误消息
 */
function getErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    invalid_state: '授权状态无效，请重新登录',
    google_token_exchange_failed: 'Google 授权失败，请重试',
    invalid_google_token: 'Google 身份验证失败，请重试',
    oauth_failed: '授权流程失败，请重新登录',
    access_denied: '您拒绝了 Google 授权',
  }

  return errorMessages[errorCode] || `授权失败 (${errorCode})，请重新登录`
}
