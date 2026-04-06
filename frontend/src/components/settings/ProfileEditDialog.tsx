import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import type { User } from '@/types/api'

const ProfileSchema = z.object({
  name: z.string().min(1, '请输入昵称').max(50, '昵称最多50个字符'),
  email: z.string().email('请输入有效的邮箱'),
})

type ProfileFormData = z.infer<typeof ProfileSchema>

interface ProfileEditDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ProfileFormData) => Promise<void>
  user: User
}

export function ProfileEditDialog({ isOpen, onClose, onSave, user }: ProfileEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      name: user.name || '',
      email: user.email,
    },
  })

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true)
    try {
      await onSave(data)
      onClose()
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="编辑资料">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden mb-4">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="头像" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-gray-400">
                {user.name?.[0] || user.email[0].toUpperCase()}
              </span>
            )}
          </div>
          <button type="button" className="text-blue-500 text-sm hover:underline">
            更换头像
          </button>
        </div>

        {/* Name */}
        <Input
          label="昵称"
          placeholder="请输入昵称"
          {...register('name')}
          error={errors.name?.message}
        />

        {/* Email (read-only) */}
        <Input
          label="邮箱"
          type="email"
          placeholder="请输入邮箱"
          {...register('email')}
          error={errors.email?.message}
          disabled
        />
        <p className="text-xs text-gray-500 -mt-4">邮箱暂不支持修改</p>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            取消
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? '保存中...' : '保存'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
