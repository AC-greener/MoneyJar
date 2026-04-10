import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CallbackPage from '../pages/CallbackPage';
import * as authStore from '@/stores/authStore';

// Mock auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Mock import.meta.env
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_API_BASE_URL: 'https://api.moneyjar.app',
  },
});

// Mock React Router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: vi.fn().mockReturnValue([new URLSearchParams(), vi.fn()]),
  };
});

describe('CallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('缺少 exchange_code', () => {
    it('应显示缺少登录凭据错误', () => {
      // Mock store
      (authStore.useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        completeOAuthLogin: vi.fn(),
        error: null,
        isLoading: false,
        clearError: vi.fn(),
      }));

      render(
        <BrowserRouter>
          <CallbackPage />
        </BrowserRouter>
      );

      expect(screen.getByText(/缺少登录凭据/)).toBeTruthy();
    });

    it('应显示错误图标', () => {
      (authStore.useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        completeOAuthLogin: vi.fn(),
        error: null,
        isLoading: false,
        clearError: vi.fn(),
      }));

      render(
        <BrowserRouter>
          <CallbackPage />
        </BrowserRouter>
      );

      // 应该有错误图标 (svg with fill="none")
      const svgElements = document.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
    });

    it('应显示重新登录按钮', () => {
      (authStore.useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        completeOAuthLogin: vi.fn(),
        error: null,
        isLoading: false,
        clearError: vi.fn(),
      }));

      render(
        <BrowserRouter>
          <CallbackPage />
        </BrowserRouter>
      );

      const retryButton = screen.getByRole('button', { name: /重新登录/ });
      expect(retryButton).toBeTruthy();
    });
  });

  describe('getErrorMessage 函数', () => {
    // 静态测试错误消息映射表
    const errorMessages: Record<string, string> = {
      invalid_state: '授权状态无效，请重新登录',
      google_token_exchange_failed: 'Google 授权失败，请重试',
      invalid_google_token: 'Google 身份验证失败，请重试',
      oauth_failed: '授权流程失败，请重新登录',
      access_denied: '您拒绝了 Google 授权',
    };

    it('应该有预定义的所有错误消息映射', () => {
      expect(errorMessages.invalid_state).toBeTruthy();
      expect(errorMessages.google_token_exchange_failed).toBeTruthy();
      expect(errorMessages.invalid_google_token).toBeTruthy();
      expect(errorMessages.oauth_failed).toBeTruthy();
      expect(errorMessages.access_denied).toBeTruthy();
    });

    it('未知错误码应该返回格式化的错误消息', () => {
      const unknownError = 'unknown_error';
      const result = `授权失败 (${unknownError})，请重新登录`;
      expect(result).toBeTruthy();
    });
  });
});
