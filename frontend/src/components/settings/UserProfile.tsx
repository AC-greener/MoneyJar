import type { User } from '@/types/api'

interface UserProfileProps {
  user: User
  onEdit?: () => void
}

export function UserProfile({ user, onEdit }: UserProfileProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Avatar */}
      <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name || '用户头像'} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl font-bold text-gray-400">
            {user.name?.[0] || user.email[0].toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
          {user.name || '未设置昵称'}
        </h2>
        <p className="text-sm text-gray-500 truncate">{user.email}</p>
        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          user.plan === 'pro'
            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
        }`}>
          {user.plan === 'pro' ? 'Pro 会员' : '免费用户'}
        </span>
      </div>

      {/* Edit Button */}
      {onEdit && (
        <button
          onClick={onEdit}
          className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
          aria-label="编辑资料"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}
    </div>
  )
}
