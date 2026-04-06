import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/common/Button'

describe('Button', () => {
  describe('variant 变体', () => {
    it('默认渲染 primary 变体', () => {
      render(<Button>Primary Button</Button>)
      const button = screen.getByRole('button', { name: 'Primary Button' })
      expect(button).toHaveClass('bg-blue-500')
    })

    it('渲染 secondary 变体', () => {
      render(<Button variant="secondary">Secondary</Button>)
      const button = screen.getByRole('button', { name: 'Secondary' })
      expect(button).toHaveClass('bg-gray-200')
    })

    it('渲染 danger 变体', () => {
      render(<Button variant="danger">Danger</Button>)
      const button = screen.getByRole('button', { name: 'Danger' })
      expect(button).toHaveClass('bg-red-500')
    })
  })

  describe('size 尺寸', () => {
    it('默认渲染 md 尺寸', () => {
      render(<Button>Medium</Button>)
      const button = screen.getByRole('button', { name: 'Medium' })
      expect(button).toHaveClass('px-4', 'py-2')
    })

    it('渲染 sm 尺寸', () => {
      render(<Button size="sm">Small</Button>)
      const button = screen.getByRole('button', { name: 'Small' })
      expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm')
    })

    it('渲染 lg 尺寸', () => {
      render(<Button size="lg">Large</Button>)
      const button = screen.getByRole('button', { name: 'Large' })
      expect(button).toHaveClass('px-6', 'py-3', 'text-lg')
    })
  })

  describe('disabled 状态', () => {
    it('disabled 时添加禁用样式', () => {
      render(<Button disabled>Disabled</Button>)
      const button = screen.getByRole('button', { name: 'Disabled' })
      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:opacity-50')
    })

    it('disabled 时点击不触发事件', async () => {
      const handleClick = vi.fn()
      render(<Button disabled onClick={handleClick}>Disabled</Button>)
      const button = screen.getByRole('button', { name: 'Disabled' })
      button.click()
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('基础渲染', () => {
    it('渲染子元素', () => {
      render(<Button><span>Child</span></Button>)
      expect(screen.getByText('Child')).toBeInTheDocument()
    })

    it('传递额外 className', () => {
      render(<Button className="custom-class">Custom</Button>)
      const button = screen.getByRole('button', { name: 'Custom' })
      expect(button.className).toContain('custom-class')
    })

    it('渲染为 button 元素', () => {
      render(<Button>Button</Button>)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })
})
