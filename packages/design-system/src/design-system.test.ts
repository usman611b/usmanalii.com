import { describe, it, expect } from 'vitest';
import { colorTokens, typographyTokens, layoutTokens, gradientTokens } from './index.js';

describe('Design System Tokens', () => {
  it('defines required dark surface foundation', () => {
    expect(colorTokens.obsidian).toBe('#070B12');
    expect(colorTokens.midnight).toBe('#0B1220');
    expect(colorTokens.canvas).toBe('#030507');
  });

  it('defines required semantic accent colors', () => {
    expect(colorTokens.cyan).toBe('#25E6FF');
    expect(colorTokens.violet).toBe('#8B5CF6');
    expect(colorTokens.magenta).toBe('#FF2DAA');
    expect(colorTokens.lime).toBe('#B8FF3D');
  });

  it('defines typography reading width and hero size', () => {
    expect(typographyTokens.readingWidth).toBe('68ch');
    expect(typographyTokens.heroSize).toContain('clamp');
  });

  it('defines 12-column bento desktop layout', () => {
    expect(layoutTokens.bentoColumns).toBe(12);
  });

  it('defines cyan-to-violet hero gradient', () => {
    expect(gradientTokens.hero).toContain(colorTokens.cyan);
    expect(gradientTokens.hero).toContain(colorTokens.violet);
  });
});
