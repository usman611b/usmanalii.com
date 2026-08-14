# Visual QA Report — M8.5 release candidate

## Status

Automated visual, accessibility, lifecycle, and build gates pass for the current local release
candidate. This report does not claim complete WCAG conformance or human visual approval. Manual
assessment on representative physical devices remains a release-owner task.

## Verified implementation

- The public experience and Command Center share the M8 obsidian, cyan, violet, magenta, lime, and
  amber token system.
- The homepage keeps the approved portrait hero, canonical owner identity, live D1 projections,
  activity heatmap, career universe, engineering record rail, social links, and contact form.
- Public and private directory/detail pages use honest loading, empty, success, and failure states;
  decorative demo facts are not rendered as professional records.
- The Career Knowledge Universe uses one lazy WebGL canvas, deterministic layout, bounded API
  projections, Universe/Back/detail controls, node focus, a minimap, and a semantic table mode.
- Reduced-motion, Save-Data, missing WebGL, off-screen, hidden-tab, and no-public-data cases retain
  non-WebGL fallbacks.
- Contact verification uses Cloudflare Turnstile; the secret remains Worker-only and the public site
  key is a Pages build variable.

## Automated browser evidence

The one-worker Playwright run passed 50 of 50 tests with zero failures and zero skips. It covers all
registered axe-core scans, keyboard navigation, mobile menu focus restoration, view-mode controls,
graph controls, reduced motion, résumé print behavior, and responsive screenshot capture.

An automated axe result means no violations were detected under the configured rules. It is not a
manual accessibility certification.

## Performance evidence

Measured from the production Astro build:

| Asset group                         | Minified bytes | Gzip bytes |
| ----------------------------------- | -------------: | ---------: |
| Homepage directly referenced JS     |              — |     12,802 |
| Largest shared client runtime chunk |        132,706 |     42,492 |
| Lazy `CareerGraph3DScene` chunk     |        857,327 |    226,325 |
| Hero portrait at 960 px             |        121,444 |          — |
| Hero portrait at 1600 px            |        210,756 |          — |

The public shell remains below ADR-009's 150 KB compressed-JavaScript budget excluding lazy 3D.
Vite reports the isolated 3D chunk as larger than 500 KB minified. That warning is intentionally
retained: the chunk is dynamically imported only by the viewport-triggered graph island, is never
needed for primary content/LCP, and is not loaded for reduced-motion or unsupported-WebGL users.
The unchanged 3840 px portrait master is retained under `docs/design/source-assets`; responsive WebP
derivatives reduce hero transfer by approximately 96–98% compared with the 5,376,621-byte master.

## Remaining manual checks

- Inspect hero crop, typography, contrast, pointer motion, and graph readability on actual small,
  medium, and large screens.
- Test keyboard and screen-reader graph table navigation with at least one desktop screen reader.
- Confirm Turnstile and contact delivery on staging after both staging keys are configured.
- Confirm the visual output against owner-approved screenshots after real staging data is present.

No production deployment or production visual approval is asserted by this report.
