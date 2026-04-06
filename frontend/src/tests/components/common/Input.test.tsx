import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Input } from '@/components/common/Input'

describe('Input', () => {
  describe('基础渲染', () => {
    it('渲染 input 元素', () => {
      render(<Input />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('渲染带 label 的 input', () => {
      render(<Input label="用户名" />)
      expect(screen.getByLabelText('用户名')).toBeInTheDocument()
    })

    it('渲染 placeholder', () => {
      render(<Input placeholder="请输入" />)
      expect(screen.getByPlaceholderText('请输入')).toBeInTheDocument()
    })

    it('渲染自定义 id', () => {
      render(<Input label="邮箱" id="email-input" />)
      expect(screen.getByLabelText('邮箱')).toHaveAttribute('id', 'email-input')
    })
  })

  describe('error 状态', () => {
    it('有 error 时显示错误信息', () => {
      render(<Input error="这是必填字段" />)
      expect(screen.getByText('这是必填字段')).toBeInTheDocument()
    })

    it('有 error 时 input 有错误样式', () => {
      render(<Input error="错误" />)
      const input = screen.getByRole('textbox')
      expect(input.className).toContain('border-red-500')
    })

    it('无 error 时不显示错误信息', () => {
      render(<Input />)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('disabled 状态', () => {
    it('disabled 时 input 被禁用', () => {
      render(<Input disabled />)
      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('disabled 时有禁用样式', () => {
      render(<Input disabled />)
      const input = screen.getByRole('textbox')
      expect(input.className).toContain('disabled:opacity-50')
    })
  })

  describe('className', () => {
    it('合并自定义 className', () => {
      render(<Input className="custom-input" />)
      const input = screen.getByRole('textbox')
      expect(input.className).toContain('custom-input')
    })
  })
})
