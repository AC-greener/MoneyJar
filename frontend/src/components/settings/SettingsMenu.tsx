interface SettingsMenuItem {
  icon: React.ReactNode
  label: string
  description?: string
  onClick?: () => void
  href?: string
  danger?: boolean
}

interface SettingsMenuProps {
  items: SettingsMenuItem[]
}

export function SettingsMenu({ items }: SettingsMenuProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm divide-y divide-gray-200 dark:divide-gray-700">
      {items.map((item, index) => (
        <div key={index}>
          {item.href ? (
            <a
              href={item.href}
              className={`flex items-center gap-4 px-4 py-4 ${
                item.danger
                  ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10'
                  : 'text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'
              } transition-colors`}
            >
              <div className={`flex-shrink-0 ${item.danger ? 'text-red-500' : 'text-gray-400'}`}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{item.label}</p>
                {item.description && (
                  <p className="text-sm text-gray-500">{item.description}</p>
                )}
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          ) : (
            <button
              onClick={item.onClick}
              className={`w-full flex items-center gap-4 px-4 py-4 ${
                item.danger
                  ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10'
                  : 'text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'
              } transition-colors`}
            >
              <div className={`flex-shrink-0 ${item.danger ? 'text-red-500' : 'text-gray-400'}`}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium">{item.label}</p>
                {item.description && (
                  <p className="text-sm text-gray-500">{item.description}</p>
                )}
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
