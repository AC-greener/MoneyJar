import { useState } from 'react'
import { UserProfile } from '@/components/settings/UserProfile'
import { SettingsMenu } from '@/components/settings/SettingsMenu'
import { ProfileEditDialog } from '@/components/settings/ProfileEditDialog'
import { LoginButton } from '@/components/common/LoginButton'
import { useAuthStore } from '@/stores/authStore'
import { useTransactionStore } from '@/stores/transactionStore'

export default function SettingsPage() {
  const { user, logout } = useAuthStore()
  const { offlineQueue } = useTransactionStore()
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Logged-out state: keep Settings reachable and show a friendly placeholder instead of a blank redirect loop.
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-lg mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">设置</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9 9 0 1118.88 6.197M15 12H9m12 0A9 9 0 003.34 7.003" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">登录后可管理账户设置</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">登录后可以编辑资料、查看同步状态以及管理更多偏好设置</p>
            <div className="mb-6">
              <LoginButton />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>查看个人资料与账户状态</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>管理离线同步和提醒设置</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>安全退出并保护账户数据</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await logout()
    } catch {
      // Even if logout fails
    } finally {
      setIsLoggingOut(false)
      window.location.href = '/'
    }
  }

  const handleSaveProfile = async (data: { name: string; email: string }) => {
    // In production, this would call an API to update the user profile
    console.log('Saving profile:', data)
    // For now, just close the dialog
  }

  const menuItems = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      label: '编辑资料',
      description: '修改昵称和头像',
      onClick: () => setShowEditDialog(true),
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      label: '通知设置',
      description: '管理推送和提醒',
      onClick: () => {},
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      label: '隐私与安全',
      description: '密码和数据保护',
      onClick: () => {},
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: '帮助与反馈',
      description: '常见问题和联系支持',
      onClick: () => {},
    },
  ]

  const dangerMenuItems = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      ),
      label: isLoggingOut ? '退出中...' : '退出登录',
      onClick: handleLogout,
      danger: true,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">设置</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* User Profile Card */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <UserProfile user={user} onEdit={() => setShowEditDialog(true)} />
        </section>

        {/* Offline Queue Info */}
        {offlineQueue.length > 0 && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-400">
                  有待同步的交易
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-500">
                  {offlineQueue.length} 笔交易正在等待网络连接
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Settings Menu */}
        <section>
          <SettingsMenu items={menuItems} />
        </section>

        {/* Danger Zone */}
        <section>
          <h3 className="text-sm font-medium text-gray-500 mb-2 px-1">危险区域</h3>
          <SettingsMenu items={dangerMenuItems} />
        </section>

        {/* App Info */}
        <section className="text-center text-sm text-gray-400 py-4">
          <p>MoneyJar v0.0.1</p>
          <p className="mt-1">智能记账，语音驱动</p>
        </section>
      </main>

      {/* Edit Profile Dialog */}
      {showEditDialog && (
        <ProfileEditDialog
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          onSave={handleSaveProfile}
          user={user}
        />
      )}
    </div>
  )
}
