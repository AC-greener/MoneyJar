import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

function Thrower(): React.ReactNode {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('正常情况下渲染子组件', () => {
    render(
      <ErrorBoundary>
        <div>safe child</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('safe child')).toBeInTheDocument()
  })

  it('出错时渲染默认兜底 UI', () => {
    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>
    )

    expect(screen.getByText('出错了')).toBeInTheDocument()
    expect(screen.getByText('查看错误详情')).toBeInTheDocument()
    expect(screen.getByText('boom')).toBeInTheDocument()
  })

  it('提供 fallback 时渲染自定义兜底内容', () => {
    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <Thrower />
      </ErrorBoundary>
    )

    expect(screen.getByText('custom fallback')).toBeInTheDocument()
  })

  it('点击刷新按钮时调用 reload', () => {
    const reload = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload },
    })

    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>
    )

    fireEvent.click(screen.getByRole('button', { name: '刷新页面' }))
    expect(reload).toHaveBeenCalled()
  })
})
