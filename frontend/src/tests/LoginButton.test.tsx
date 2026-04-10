import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginButton } from '../components/common/LoginButton';

describe('LoginButton', () => {
  describe('渲染', () => {
    it('应该渲染登录按钮', () => {
      render(<LoginButton />);

      const button = screen.getByRole('button', { name: /使用 Google 登录/ });
      expect(button).toBeTruthy();
    });

    it('应该包含 Google 图标 (SVG)', () => {
      render(<LoginButton />);

      const svg = screen.getByRole('button', { name: /使用 Google 登录/ }).querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('按钮应该有正确的样式类', () => {
      render(<LoginButton />);

      const button = screen.getByRole('button', { name: /使用 Google 登录/ });
      expect(button.className).toContain('bg-blue-500');
      expect(button.className).toContain('hover:bg-blue-600');
    });

    it('按钮应该有 flex 和居中样式', () => {
      render(<LoginButton />);

      const button = screen.getByRole('button', { name: /使用 Google 登录/ });
      expect(button.className).toContain('flex');
      expect(button.className).toContain('items-center');
      expect(button.className).toContain('justify-center');
    });

    it('按钮文字应该是"使用 Google 登录"', () => {
      render(<LoginButton />);

      const button = screen.getByRole('button', { name: /使用 Google 登录/ });
      expect(button).toHaveTextContent('使用 Google 登录');
    });
  });
});
