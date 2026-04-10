import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { BottomNav } from '@/components/common/BottomNav'
import { useAuthStore } from '@/stores/authStore'

// Lazy load pages for better performance
const RecordPage = lazy(() => import('@/pages/RecordPage'))
const StatsPage = lazy(() => import('@/pages/StatsPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const CallbackPage = lazy(() => import('@/pages/CallbackPage'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <LoadingSpinner size="lg" />
    </div>
  )
}

function App() {
  const { isInitialized, isLoading, initialize } = useAuthStore()

  // Initialize auth on app mount - only once
  useEffect(() => {
    const state = useAuthStore.getState()
    if (!state.isInitialized && !state.isLoading) {
      initialize()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Show loading while initializing
  if (!isInitialized || isLoading) {
    return (
      <ErrorBoundary>
        <PageLoader />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/record" replace />} />
            <Route path="/record" element={<RecordPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/auth/callback" element={<CallbackPage />} />
          </Routes>
        </Suspense>
        <BottomNav />
      </div>
    </ErrorBoundary>
  )
}

export default App
