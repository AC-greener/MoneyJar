import type { Page } from '@playwright/test';

/**
 * 登录页面操作辅助函数
 */
export class AuthPage {
  constructor(private page: Page) {}

  /**
   * 点击登录按钮
   */
  async clickLoginButton(): Promise<void> {
    const loginButton = this.page.getByRole('button', { name: /使用 Google 登录/i });
    await loginButton.click();
  }

  /**
   * 检查是否显示登录按钮
   */
  async isLoginButtonVisible(): Promise<boolean> {
    const loginButton = this.page.getByRole('button', { name: /使用 Google 登录/i });
    return loginButton.isVisible();
  }

  /**
   * 检查是否已登录（显示用户信息）
   */
  async isLoggedIn(): Promise<boolean> {
    // 检查是否有登出按钮或用户信息
    const logoutButton = this.page.getByRole('button', { name: /登出/i });
    return logoutButton.isVisible().catch(() => false);
  }

  /**
   * 获取当前页面 URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }
}

/**
 * 清除登录状态
 */
export async function clearAuthState(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

/**
 * 设置模拟登录状态
 */
export async function setMockAuthState(page: Page, refreshToken?: string): Promise<void> {
  await page.evaluate(
    (token) => {
      if (token) {
        localStorage.setItem('refresh_token', token);
      }
    },
    refreshToken || 'mock-refresh-token'
  );
}
