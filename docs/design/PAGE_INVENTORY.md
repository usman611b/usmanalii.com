# PAGE INVENTORY — usmanalii.com

> Complete audit of all public and private routes, layouts, interactive components, API integrations, and state projections.

---

## 1. Public Professional Identity Experience

| Route                  | Layout             | Key Components                                                              | Data Endpoint                        | View Modes               |
| ---------------------- | ------------------ | --------------------------------------------------------------------------- | ------------------------------------ | ------------------------ |
| `/`                    | `BaseLayout.astro` | `PortraitHero`, `HomeLiveSummary`, `ActivityHeatmap`, `SkillsEvidenceGraph` | `/api/v1/public/*`                   | General (default)        |
| `/recruiter`           | `BaseLayout.astro` | `PublicIdentityView`, `ModeSwitcher`                                        | `/api/v1/public/recruiter`           | Recruiter (60-sec scan)  |
| `/deep-dive`           | `BaseLayout.astro` | `ArchitectureCanvas`, `ModeSwitcher`                                        | `/api/v1/public/projects`            | Deep Dive (ADRs & trace) |
| `/about`               | `BaseLayout.astro` | `PublicIdentityView`                                                        | `/api/v1/public/recruiter`           | All modes                |
| `/journey`             | `BaseLayout.astro` | `PublicRecordDirectory`                                                     | `/api/v1/public/journey`             | All modes                |
| `/evidence`            | `BaseLayout.astro` | `PublicRecordDirectory`                                                     | `/api/v1/public/evidence`            | All modes                |
| `/projects`            | `BaseLayout.astro` | `PublicRecordDirectory`                                                     | `/api/v1/public/projects`            | All modes                |
| `/projects/[slug]`     | `BaseLayout.astro` | `ProjectDetailView`                                                         | `/api/v1/public/projects/[slug]`     | Deep Dive focus          |
| `/skills`              | `BaseLayout.astro` | `SkillsEvidenceGraph`, `PublicRecordDirectory`                              | `/api/v1/public/graph/visualization` | All modes                |
| `/capabilities`        | `BaseLayout.astro` | `PublicRecordDirectory`                                                     | `/api/v1/public/capabilities`        | All modes                |
| `/capabilities/[slug]` | `BaseLayout.astro` | `CapabilityDetailView`                                                      | `/api/v1/public/capabilities/[slug]` | All modes                |
| `/resume`              | `BaseLayout.astro` | `ResumeView`                                                                | `/api/v1/public/resumes`             | Recruiter / Print        |
| `/search`              | `BaseLayout.astro` | `GlobalSearchView`                                                          | `/api/v1/public/search`              | All modes                |

---

## 2. Private Owner Command Center (`/dashboard/*`)

All dashboard pages consume `DashboardLayout.astro` with persistent 5-group left rail navigation.

| Route                            | Layout            | Active Section | Primary Management Focus                  |
| -------------------------------- | ----------------- | -------------- | ----------------------------------------- |
| `/dashboard`                     | `DashboardLayout` | `overview`     | Stat cards, Evidence Inbox, GitHub status |
| `/dashboard/journal`             | `DashboardLayout` | `journal`      | Append-only journal entries & drafts      |
| `/dashboard/evidence`            | `DashboardLayout` | `evidence`     | Ledger verification, state management     |
| `/dashboard/artifacts`           | `DashboardLayout` | `artifacts`    | Document & file artifact links            |
| `/dashboard/skills`              | `DashboardLayout` | `skills`       | Skill taxonomy management                 |
| `/dashboard/capabilities`        | `DashboardLayout` | `capabilities` | Capability definition & links             |
| `/dashboard/graph`               | `DashboardLayout` | `graph`        | Relational edge editor                    |
| `/dashboard/suggestions`         | `DashboardLayout` | `suggestions`  | System suggestions engine                 |
| `/dashboard/projects`            | `DashboardLayout` | `projects`     | Project case study editor                 |
| `/dashboard/records`             | `DashboardLayout` | `records`      | Professional records & experience         |
| `/dashboard/profile`             | `DashboardLayout` | `profile`      | Canonical profile editor                  |
| `/dashboard/claims`              | `DashboardLayout` | `claims`       | Professional claims & evidence links      |
| `/dashboard/resumes`             | `DashboardLayout` | `resumes`      | Tailored résumé generator                 |
| `/dashboard/integrations/github` | `DashboardLayout` | `github`       | Candidate inbox & repo sync config        |

---

## 3. Component Architecture & Islands

| Component                   | Technology     | Hydration     | Accessibility Controls                              |
| --------------------------- | -------------- | ------------- | --------------------------------------------------- |
| `Navigation.astro`          | Astro          | SSR           | Focus trap, mobile sheet, Escape listener           |
| `ModeSwitcher.tsx`          | React          | `client:load` | `role="radiogroup"`, `role="radio"`, `aria-checked` |
| `PortraitHero.tsx`          | React + Canvas | `client:load` | Reduced-motion disable, tab-hidden pause, DPR cap   |
| `HomeLiveSummary.tsx`       | React          | `client:load` | Skeleton loading, semantic error alerts             |
| `PublicRecordDirectory.tsx` | React          | `client:load` | Keyboard filter select, ARIA live count             |
| `SkillsEvidenceGraph.tsx`   | React + SVG    | `client:load` | Accessible table fallback, node keyboard focus      |
| `ActivityHeatmap.tsx`       | React          | `client:load` | `role="grid"`, arrow nav, `aria-live` tooltip       |
| `PublicIdentityView.tsx`    | React          | `client:load` | Section headings, record spine, skeleton loading    |
| `DashboardOverview.tsx`     | React          | `client:load` | Stat cards, GitHub status vocabulary, inbox act     |
