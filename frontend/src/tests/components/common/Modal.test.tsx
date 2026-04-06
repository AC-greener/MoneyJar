import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from '@/components/common/Modal'

describe('Modal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Reset body overflow after each test
    document.body.style.overflow = 'unset'
  })

  describe('渲染', () => {
    it('isOpen 为 false 时不渲染', () => {
      render(
        <Modal isOpen={false} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )
      expect(screen.queryByText('Content')).not.toBeInTheDocument()
    })

    it('isOpen 为 true 时渲染内容', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Modal Content</div>
        </Modal>
      )
      expect(screen.getByText('Modal Content')).toBeInTheDocument()
    })

    it('有 title 时渲染标题', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="测试标题">
          <div>Content</div>
        </Modal>
      )
      expect(screen.getByText('测试标题')).toBeInTheDocument()
    })

    it('无 title 时不渲染头部', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )
      // 没有关闭按钮（标题区的 X 按钮）
      expect(screen.queryByLabelText('关闭')).not.toBeInTheDocument()
    })
  })

  describe('交互', () => {
    it('点击关闭按钮调用 onClose', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="标题">
          <div>Content</div>
        </Modal>
      )
      fireEvent.click(screen.getByLabelText('关闭'))
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('按 ESC 键调用 onClose', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('按非 ESC 键不调用 onClose', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )
      fireEvent.keyDown(document, { key: 'Enter' })
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('body scroll lock', () => {
    it('isOpen 为 true 时设置 body overflow 为 hidden', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('isOpen 变为 false 时重置 body overflow', () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )
      expect(document.body.style.overflow).toBe('hidden')

      rerender(
        <Modal isOpen={false} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )
      expect(document.body.style.overflow).toBe('unset')
    })
  })
})
