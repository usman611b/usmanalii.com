# usmanalii.com — UI/UX & Visual Design Specification

**Document:** 3 of 6  
**Version:** 1.0  
**Depends on:** PRD v1.1 and Database & Evidence Model v1.0  
**Status:** V1 implementation baseline

## 1. Design objective

Create a cinematic, evidence-driven professional identity: an obsidian interface with luminous mesh gradients, spatial glass surfaces, asymmetric bento composition, restrained 3D depth and precise physics-based motion. The result must feel memorable and technically sophisticated without becoming an effects demo. Evidence, readability, accessibility and recruiter comprehension always outrank decoration.

## 2. Experience principles

1. **Evidence is the hero.** Visual effects direct attention toward proof and relationships.
2. **One identity, two depths.** Recruiter mode is concise; Deep-dive mode exposes engineering detail.
3. **Cinematic entry, editorial reading.** The homepage may be dramatic; journals remain calm.
4. **Motion explains.** Animation communicates navigation, relationship, hierarchy or feedback.
5. **Progressive enhancement.** The complete public site works without WebGL and remains meaningful without JavaScript.
6. **Private work requires calm.** The dashboard shares the identity but minimizes ambient effects.
7. **Mobile is not a reduced desktop.** Content order and interactions are intentionally recomposed.
8. **No invented content.** Mockups, empty states and visualizations never manufacture professional facts.

## 3. Information architecture

### Public navigation

- Home
- Journey
- Skills & Capabilities
- Projects
- Activity
- About
- Search
- Recruiter mode
- Deep-dive mode
- Résumé
- Contact

### Private navigation

- Overview
- Inbox
- Journal
- Evidence Ledger
- Skills & Capabilities
- Projects
- Profile
- Claims
- Résumés
- Approvals
- Activity
- Integrations
- Settings, export and backups

Desktop uses persistent primary navigation. Mobile uses a full-screen accessible menu with the same logical order. The mode switch appears in global navigation but never changes permissions.

## 4. Design tokens

### Colors

| Token           |     Value | Purpose                               |
| --------------- | --------: | ------------------------------------- |
| Obsidian        | `#050509` | Page foundation                       |
| Midnight        | `#080D1A` | Reading and navigation surfaces       |
| Elevated navy   | `#0D1528` | Cards and panels                      |
| Surface high    | `#101A31` | Interactive elevation                 |
| Foreground      | `#F7FBFF` | Primary text                          |
| Muted           | `#9CAAC1` | Secondary text                        |
| Cyber cyan      | `#22D3EE` | Evidence and verification             |
| Electric violet | `#8B5CF6` | Intelligence and identity             |
| Hot magenta     | `#EC4899` | Experiments and exploration           |
| Acid lime       | `#B6F43A` | Delivery and progress                 |
| Signal blue     | `#3B82F6` | Navigation and information            |
| Warning amber   | `#F59E0B` | Stale or incomplete evidence          |
| Error red       | `#F43F5E` | Broken, rejected or destructive state |

Large gradients use cyan → violet → magenta. Evidence gradients use cyan → blue → violet. Delivery gradients use cyan → lime. Body text never uses gradient fill.

### Typography

- Primary: Geist, fallback Inter and system sans-serif.
- Technical: Geist Mono, fallback IBM Plex Mono and system monospace.
- Hero: `clamp(3.5rem, 9vw, 8rem)`, line-height 0.92–1.02.
- Section title: `clamp(2.25rem, 5vw, 4.5rem)`.
- Card title: 1.2–2rem.
- Reading body: 1–1.125rem with 65–75 character line length.
- Metadata: 0.75–0.875rem, never below 12px rendered.
- Use weights 400, 500, 600 and 700 selectively.

### Spacing and geometry

- Base unit: 4px.
- Standard spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96 and 128px.
- Reading width: 680–760px.
- General content maximum: 1280–1440px.
- Card radius: 16–24px.
- Compact controls: 10–14px radius.
- Hairline border: 1px translucent white or semantic accent.

## 5. Surface system

### Atmospheric panel

Used for hero and major identity sections. Dark translucent fill, 24px blur, low-contrast border and broad shadow.

### Interactive glass card

Used for projects, capabilities and navigation. Medium blur, visible hierarchy border, pointer highlight and restrained depth response.

### Evidence chip

Compact, high-contrast proof label containing type, verification state and optional source icon. It is never a substitute for the evidence detail link.

### Reading surface

Nearly opaque midnight surface, low/no backdrop blur, narrow text measure and minimal ambient animation.

### Status surface

Semantic states combine icon, text and color. Color alone never communicates state.

## 6. Bento layout system

Bento cards use 12 desktop columns, 6 tablet columns and one mobile column. Cards may span 4, 6, 8 or 12 columns and one or two rows. Span reflects importance, not visual randomness.

Homepage priority:

1. Identity and Evidence Core
2. Current focus
3. Recruiter path
4. Featured project
5. Evidence-backed capabilities
6. Latest journey
7. Activity
8. Career direction

Dashboard priority:

1. Pending approvals and warnings
2. Continue work
3. Quick capture
4. Drafts and inbox
5. Evidence health
6. Recent activity and backups

## 7. Signature 3D Evidence Core

The homepage contains one primary WebGL canvas. A luminous central core represents the Evidence Ledger. Five connected nodes represent the finalized pillars. Animated particles indicate evidence moving into capabilities and professional surfaces.

### Interaction

- Pointer gently changes camera/light orientation.
- Pillar node focus displays a concise label and route.
- Keyboard users can navigate equivalent HTML controls.
- Scroll may reveal connections but cannot hijack page scrolling.
- The scene pauses offscreen, in hidden tabs and when motion is reduced.

### Limits

- One homepage canvas.
- Simple procedural geometry and shaders.
- No heavy downloadable 3D model.
- No real-time shadows required.
- Device pixel ratio is clamped.
- CSS/static fallback preserves the same five-pillar relationship.
- Hero text and actions render before the scene.

## 8. Motion language

### Orientation motion

Page transitions, active navigation, expansion and spatial continuity. Duration generally 180–450ms.

### Relationship motion

Evidence connections, timeline progression and graph exploration. It must reveal actual data relationships.

### Feedback motion

Save, approval, validation, copy, filter and error feedback. Immediate and restrained.

### Atmospheric motion

Mesh drift, particles and glow movement. Slow, subtle and nonessential.

### Card physics

- Lift: 4–8px.
- Tilt: maximum approximately 3–5 degrees.
- Perspective: approximately 1000px.
- Strong damping and subtle bounce.
- Pointer highlight stays within the card.
- Touch devices receive press feedback without tilt.

### Reduced motion

Remove continuous shaders, parallax, 3D tilt, word reveals and morphing page transitions. Preserve focus, selection, validation and loading state changes through opacity or instant updates.

## 9. Responsive behavior

### Large desktop — 1280px+

Full bento composition, Evidence Core, persistent navigation, pointer lighting and expanded technical diagrams.

### Tablet — 768–1279px

Six-column composition, reduced 3D scene, simplified graph labels and collapsible secondary navigation.

### Mobile — 320–767px

Single logical content sequence, no hover-only interaction, static or low-power Evidence Core, bottom-safe controls, full-screen navigation and touch-sized targets of at least 44×44px.

### Fallback matrix

- WebGL unavailable: CSS mesh + static Evidence Core diagram.
- Reduced motion: static gradients and instant navigation.
- Reduced data/low power: no 3D preload; load only after explicit activation if offered.
- JavaScript unavailable: content, navigation, projects, journey and recruiter view remain available.

## 10. Public page specifications

### 10.1 Home

Order: global navigation → cinematic hero → proof-at-a-glance bento → five pillars → featured project → capabilities → journey → activity → identity/contact footer.

Primary actions: View evidence, Explore journey, Recruiter view. The first viewport must communicate name, current truthful positioning and product concept without waiting for WebGL.

### 10.2 Journey index

Year/month chronology, content-type tabs, topic/project filters, activity context and result cards. The luminous timeline is paired with an accessible list. Filter state is shareable through the URL.

### 10.3 Journey entry

Editorial reading surface with title, summary, dates, type, reading time, revision signal, related skills/projects/evidence, code and diagrams, previous/next and what comes next. Effects stop while reading.

### 10.4 Skills index

Search and taxonomy discovery. Cards show skill definition and number/types of public supporting records, never percentage proficiency.

### 10.5 Capability detail

Definition → maturity label and rationale → evidence timeline → evidence diversity → project use → related learning → limitations and last review. Graph has a text/list alternative.

### 10.6 Projects index

Featured project receives a large card. Remaining projects filter by domain, status, capability and date. Broken demos and archived projects show truthful status.

### 10.7 Project case study

Cinematic header → problem/context → contribution → architecture → decisions → implementation → experiments → debugging → deployment → outcomes → limitations → evidence → timeline → future work. Architecture is interactive only when it improves understanding.

### 10.8 Activity

GitHub-style calendar with documented-activity legend, category filters and day drawer. Accessible date-grouped list is equally prominent. No streak pressure or competence implication.

### 10.9 Recruiter mode

Minimal animation and fastest scan path: positioning → selected capabilities → strongest projects/outcomes → evidence links → résumé → contact. Target comprehension within 90 seconds.

### 10.10 Deep-dive mode

Technical map emphasizing architecture, source, ADRs, experiments, debugging lessons, artifacts and provenance. It reads the same canonical data; it is not a separate portfolio.

### 10.11 About, résumé, search and evidence

About provides approved narrative and direction. Résumé exposes active approved variants. Search groups public results by type. Evidence detail shows safe provenance, verification, source and supported targets.

## 11. Private dashboard specifications

### 11.1 Overview

Calm bento workspace with quick capture, continue-work list, pending approvals, drafts, evidence warnings, recent activity, sync status and backup health.

### 11.2 Inbox

Unified candidate queue. Every item exposes source, capture date, suggested type, duplicate warning, visibility and accept/edit/reject actions.

### 11.3 Journal editor

Structured editing, autosave state, relationship sidebar, accessibility checks, exact public preview, revision note and publish validation. Distraction-free writing mode removes ambient motion.

### 11.4 Evidence Ledger

Filterable table/list with evidence type, source, verification, visibility, supported targets and health. Detail view prioritizes provenance. Destructive actions show dependency impact.

### 11.5 Skills and capabilities

Taxonomy management, aliases, bounded capability editor, qualifying-evidence rules, maturity suggestions, rationale and public preview.

### 11.6 Project workspace

Project overview plus sections for milestones, artifacts, experiments, ADRs, debugging lessons, deployments, evidence and case-study preview.

### 11.7 Claims and approvals

Claims show wording, audience, evidence health and usage locations. Approval detail shows source beside proposed diff, risk, confidence, privacy and affected surfaces.

### 11.8 Settings and operations

Profile, integrations, activity reconciliation, visibility defaults, export, backup, active sessions and security. Critical actions require re-authentication and explicit confirmation.

## 12. Component inventory

- Global navigation and mobile menu
- Mode switcher
- Primary, secondary, ghost and destructive buttons
- Search/command input
- Glass card variants
- Bento grid and responsive span utilities
- Evidence chip and provenance block
- Skill and capability card
- Project and journey cards
- Activity heatmap, cell and day drawer
- Timeline and milestone
- Evidence relationship graph with list alternative
- Architecture diagram container
- Code block and artifact preview
- Filter bar, select, checkbox and date controls
- Form field, validation and autosave status
- Editor toolbar and relationship selector
- Approval diff and impact panel
- Empty, loading, error, stale, offline and permission states
- Toast for noncritical confirmation; inline message for consequential state
- Dialog for focused confirmation; drawer for contextual detail
- Skeletons matching final geometry

Every component has default, hover, focus-visible, active, disabled, loading, error and reduced-motion behavior where applicable.

## 13. Content design

- Use direct factual labels: “View evidence,” “Last verified,” “Not enough evidence.”
- Never say “expert,” “mastered” or “100%” without an explicit approved policy—which V1 does not provide.
- Empty states explain why the space is empty and provide one next action.
- Errors state what happened, what was preserved and what the owner can do.
- AI suggestions are labeled “Suggestion” and never visually resemble approved facts.

## 14. Accessibility requirements

- WCAG 2.2 AA target.
- Logical headings, landmarks and DOM order.
- Keyboard access to all functions.
- Visible focus on every interactive element.
- 4.5:1 text contrast and 3:1 large text/UI contrast where applicable.
- No meaning through color, glow, position or animation alone.
- Graphs, 3D scenes, heatmaps and diagrams have structured text alternatives.
- Dialog focus management and escape behavior.
- Screen-reader announcements for save, publish, approval and validation status.
- Zoom/reflow to 400% without loss of function.
- Code blocks labeled and keyboard-scrollable.
- Images/diagrams require alt text or long descriptions.

## 15. Performance budgets

- Public LCP ≤ 2.5s at the 75th percentile.
- INP ≤ 200ms; CLS ≤ 0.1.
- Critical public shell target: <150KB compressed JavaScript excluding lazy 3D.
- Three.js bundle loads only on pages that need it.
- One continuous WebGL canvas maximum per page.
- Stop rendering when hidden or offscreen.
- Avoid large video backgrounds and expensive post-processing.
- Images use responsive dimensions, modern formats and explicit aspect ratios.
- Dashboard editing must not wait for decorative assets.

## 16. UX acceptance criteria

1. A first-time visitor understands identity and purpose from the initial viewport without WebGL.
2. A recruiter reaches positioning, proof, projects, résumé and contact within 90 seconds.
3. A technical evaluator can trace a claim to capability and evidence.
4. Every public page has a coherent no-JavaScript or static fallback.
5. Mobile contains no hover-only information or horizontal layout failure.
6. Reduced-motion mode removes continuous and spatial motion.
7. The Evidence Core has equivalent semantic navigation.
8. No page uses arbitrary percentage skill bars.
9. Private actions show save state, validation and recovery behavior.
10. Publishing previews the exact effective visibility and affected surfaces.
11. No animation delays navigation, traps scroll or causes layout shift.
12. Visual effects map to identity, relationship, status or hierarchy.
13. Representative mobile hardware remains responsive without sustained thermal-heavy rendering.
14. Automated accessibility checks and manual keyboard/screen-reader smoke tests pass.

## 17. Design-to-development handoff

Before coding each route, provide:

- Desktop and mobile wireframe
- Component/state inventory
- Content requirements and realistic approved fixtures
- Data entities and permissions used
- Loading, empty, error and offline states
- Motion and reduced-motion behavior
- Accessibility annotation
- Analytics event list
- Performance risks
- Route-level acceptance criteria

## 18. Approval decision

Approval freezes the visual principles, token system, page hierarchy, responsive behavior, Evidence Core constraints, motion language and accessibility/performance budgets. High-fidelity art direction may refine composition, but cannot weaken evidence clarity, recruiter usability, fallbacks or accessibility.
