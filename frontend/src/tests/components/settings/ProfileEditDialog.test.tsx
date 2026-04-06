import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ProfileEditDialog } from '@/components/settings/ProfileEditDialog'

const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Tong',
  avatarUrl: null,
  plan: 'free' as const,
}

describe('ProfileEditDialog', () => {
  const onClose = vi.fn()
  const onSave = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('关闭状态下不渲染', () => {
    render(<ProfileEditDialog isOpen={false} onClose={onClose} onSave={onSave} user={mockUser} />)
    expect(screen.queryByText('编辑资料')).not.toBeInTheDocument()
  })

  it('显示默认用户信息和头像首字母', () => {
    render(<ProfileEditDialog isOpen={true} onClose={onClose} onSave={onSave} user={mockUser} />)

    expect(screen.getByDisplayValue('Tong')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@example.com')).toBeDisabled()
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('校验昵称必填', async () => {
    render(<ProfileEditDialog isOpen={true} onClose={onClose} onSave={onSave} user={mockUser} />)

    fireEvent.change(screen.getByPlaceholderText('请输入昵称'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    expect(await screen.findByText('请输入昵称')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('保存成功时调用 onSave 和 onClose', async () => {
    render(<ProfileEditDialog isOpen={true} onClose={onClose} onSave={onSave} user={mockUser} />)

    fireEvent.change(screen.getByPlaceholderText('请输入昵称'), { target: { value: 'New Name' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ name: 'New Name', email: 'test@example.com' })
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('保存失败时不关闭弹窗', async () => {
    onSave.mockRejectedValueOnce(new Error('save failed'))
    render(<ProfileEditDialog isOpen={true} onClose={onClose} onSave={onSave} user={mockUser} />)

    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled()
    })
    expect(onClose).not.toHaveBeenCalled()
  })
})
