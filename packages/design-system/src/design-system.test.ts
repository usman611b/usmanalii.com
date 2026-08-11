import { describe, it, expect } from 'vitest';
import { colorTokens, typographyTokens, layoutTokens, gradientTokens } from './index.js';

describe('Design System Tokens', () => {
  it('defines required obsidian color foundation', () => {
    expect(colorTokens.obsidian).toBe('#05060A');
    expect(colorTokens.midnight).toBe('#08111F');
  });

  it('defines required semantic accent colors', () => {
    expect(colorTokens.cyberCyan).toBe('#45F3FF');
    expect(colorTokens.electricViolet).toBe('#8B5CFF');
    expect(colorTokens.hotMagenta).toBe('#FF3DA4');
    expect(colorTokens.acidLime).toBe('#B8FF5A');
  });

  it('defines typography clamp sizes and 65ch measure', () => {
    expect(typographyTokens.readingWidth).toBe('65ch');
    expect(typographyTokens.hero).toContain('clamp');
  });

  it('defines 12-column bento desktop layout', () => {
    expect(layoutTokens.bentoColumns).toBe(12);
  });

  it('defines cyan-to-violet hero gradient', () => {
    expect(gradientTokens.hero).toContain(colorTokens.cyberCyan);
    expect(gradientTokens.hero).toContain(colorTokens.electricViolet);
  });
});
