import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Accessibility & Keyboard Navigation Verification', () => {
  // 1. Navigation Landmark & ARIA Attributes
  it('Navigation component includes semantic header, nav landmark, and ARIA controls', () => {
    const content = readFileSync(join(__dirname, 'components/Navigation.astro'), 'utf8');

    expect(content).toContain('<header');
    expect(content).toContain('aria-label="Main Navigation"');
    expect(content).toContain('id="mobile-menu-btn"');
    expect(content).toContain('aria-expanded="false"');
    expect(content).toContain('aria-controls="mobile-menu"');
    expect(content).toContain('aria-label="Toggle Navigation Menu"');
  });

  // 2. Skip-to-content Link
  it('BaseLayout includes accessible skip-to-main-content link', () => {
    const content = readFileSync(join(__dirname, 'layouts/BaseLayout.astro'), 'utf8');

    expect(content).toContain('href="#main-content"');
    expect(content).toContain('Skip to main content');
    expect(content).toContain('id="main-content"');
  });

  // 3. Mode Switcher RadioGroup & Keyboard Attributes
  it('ModeSwitcher component includes radiogroup role, aria-checked, and keyboard focus rings', () => {
    const content = readFileSync(join(__dirname, 'components/ModeSwitcher.tsx'), 'utf8');

    expect(content).toContain('role="radiogroup"');
    expect(content).toContain('aria-label="View Mode Switcher"');
    expect(content).toContain('role="radio"');
    expect(content).toContain('aria-checked');
    expect(content).toContain('button');
  });

  // 4. Dashboard Shell Landmarks
  it('DashboardLayout includes aside, main, and ARIA navigation labels', () => {
    const content = readFileSync(join(__dirname, 'layouts/DashboardLayout.astro'), 'utf8');

    expect(content).toContain('<aside');
    expect(content).toContain('<main');
    expect(content).toContain('aria-label="Dashboard Navigation"');
    expect(content).toContain('Protected Session');
  });

  // 5. Reduced Motion CSS Verification
  it('Global CSS enforces prefers-reduced-motion disable rules', () => {
    const css = readFileSync(join(__dirname, 'styles/global.css'), 'utf8');

    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('animation-duration: 0.01ms !important');
    expect(css).toContain('transition-duration: 0.01ms !important');
  });

  it('Career graph is lazy, pauses outside the viewport, and retains a semantic table fallback', () => {
    const graph = readFileSync(join(__dirname, 'components/SkillsEvidenceGraph.tsx'), 'utf8');
    const scene = readFileSync(
      join(__dirname, 'components/career-graph/CareerGraph3DScene.tsx'),
      'utf8',
    );

    expect(graph).toContain("lazy(() => import('./career-graph/CareerGraph3DScene'))");
    expect(graph).toContain('new IntersectionObserver');
    expect(graph).toContain("document.addEventListener('visibilitychange'");
    expect(graph).toContain('<table>');
    expect(scene).toContain("frameloop={props.active ? 'always' : 'never'}");
  });
});
