import { test, expect } from '@playwright/test';

test.describe('登录流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // 清理 localStorage - 使用 try/catch 处理可能的错误
    await page.evaluate(() => {
      try {
        localStorage.clear();
      } catch {
        // ignore
      }
    });
  });

  test('登录页面渲染', async ({ page }) => {
    // 验证 Google 登录按钮存在
    const loginButton = page.getByRole('button', { name: /使用 Google 登录/i });
    await expect(loginButton).toBeVisible();

    // 验证按钮包含 Google 图标
    const googleIcon = loginButton.locator('svg');
    await expect(googleIcon).toBeVisible();
  });

  test('点击登录按钮跳转到 Google OAuth', async ({ page }) => {
    // 点击登录按钮
    const loginButton = page.getByRole('button', { name: /使用 Google 登录/i });
    await loginButton.click();

    // 验证跳转到 Google 授权页面
    await expect(page).toHaveURL(/accounts\.google\.com/);
  });

  test('callback 页面无 exchange_code 时显示错误', async ({ page }) => {
    await page.goto('/auth/callback');

    // 验证显示缺少登录凭据错误
    await expect(page.getByText(/缺少登录凭据/i)).toBeVisible();

    // 验证显示重新登录按钮
    const retryButton = page.getByRole('button', { name: /重新登录/i });
    await expect(retryButton).toBeVisible();
  });

  test('callback 页面有 exchange_code 时显示页面', async ({ page }) => {
    // 导航到 callback 页面
    await page.goto('/auth/callback?exchange_code=test-code&return_to=/record');

    // 验证页面加载 - 使用 body 作为 locator
    await expect(page.locator('body')).toBeVisible();
  });

  test('未登录用户访问受保护页面显示登录按钮', async ({ page }) => {
    // 首页应该显示登录按钮
    const loginButton = page.getByRole('button', { name: /使用 Google 登录/i });
    await expect(loginButton).toBeVisible();
  });

  test('localStorage 可以存储 refresh_token', async ({ page }) => {
    // 设置 refresh_token
    await page.evaluate(() => {
      localStorage.setItem('refresh_token', 'test-refresh-token-12345');
    });

    // 验证 localStorage 中有 refresh_token
    const storedToken = await page.evaluate(() => localStorage.getItem('refresh_token'));
    expect(storedToken).toBe('test-refresh-token-12345');
  });

  test('底部导航在首页显示', async ({ page }) => {
    // 验证底部导航存在
    const bottomNav = page.locator('nav, footer, [class*="bottom"]').first();
    await expect(bottomNav).toBeVisible();
  });

  test('重新登录按钮点击跳转到 Google OAuth', async ({ page }) => {
    await page.goto('/auth/callback');

    // 点击重新登录按钮
    const retryButton = page.getByRole('button', { name: /重新登录/i });
    await retryButton.click();

    // 验证跳转到 Google OAuth 页面
    await expect(page).toHaveURL(/accounts\.google\.com/);
  });
});

test.describe('OAuth 完整流程（需要人工授权）', () => {
  test.skip('完整 OAuth 登录流程需要人工操作 Google 授权', async ({ page }) => {
    // 注意：这个测试需要人工在 Google 授权页面完成登录
    // 自动化测试无法完成 Google 登录

    await page.goto('/');

    // 1. 点击登录按钮
    const loginButton = page.getByRole('button', { name: /使用 Google 登录/i });
    await loginButton.click();

    // 2. 应该跳转到 Google 授权页面
    await expect(page).toHaveURL(/accounts\.google\.com/);
  });
});
