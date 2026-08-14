# FUNCTIONAL CONTROL MATRIX — usmanalii.com

> Audit of all user actions, keyboard controls, view mode toggles, API mutations, and error recovery behaviors across the product.

---

## 1. View Mode Control Matrix

| Mode          | Trigger                      | Storage                      | URL Effect                | UI Projection                                            |
| ------------- | ---------------------------- | ---------------------------- | ------------------------- | -------------------------------------------------------- |
| **General**   | `ModeSwitcher` → "General"   | Cookie `view_mode=general`   | Redirects to `/`          | Narrative identity hero, full live summary, skills graph |
| **Recruiter** | `ModeSwitcher` → "Recruiter" | Cookie `view_mode=recruiter` | Redirects to `/recruiter` | 60-second scan layout, outcome claims, experience spine  |
| **Deep Dive** | `ModeSwitcher` → "Deep"      | Cookie `view_mode=deep-dive` | Redirects to `/deep-dive` | Architecture maps, ADR decision trees, trace links       |

---

## 2. Global Accessibility & Keyboard Controls

| Control / Landmark | Keyboard Shortcut / Interaction              | Expected System Behavior                                                  |
| ------------------ | -------------------------------------------- | ------------------------------------------------------------------------- |
| Skip Navigation    | `Tab` on initial page load                   | Focuses `.skip-nav` link at top-left; `Enter` jumps to `#main-content`    |
| Navigation Links   | `Tab` / `Shift+Tab`                          | Sequentially highlights links with `2px solid var(--cyan)` focus ring     |
| Mobile Menu Toggle | `Enter` / `Space` on `#mobile-menu-btn`      | Toggles mobile sheet overlay (`aria-expanded="true/false"`)               |
| Mobile Sheet Trap  | `Tab` inside mobile menu                     | Traps focus within sheet until closed                                     |
| Mobile Sheet Close | `Escape` key                                 | Closes sheet overlay and restores focus to toggle button                  |
| Mode Switcher      | Arrow keys / `Tab` inside radiogroup         | Moves focus across radio options, updates `aria-checked`                  |
| Evidence Graph     | `Tab` to graph node → `Enter` / `Space`      | Selects node, highlights connected edges, reveals details                 |
| Table Fallback     | `Tab` to "Accessible table" button → `Enter` | Swaps SVG graph canvas for semantic HTML data table                       |
| Activity Heatmap   | Arrow keys inside `role="grid"`              | Navigates cells; updates `aria-live` tooltip with cell date & event count |

---

## 3. Command Center Action Matrix (`/dashboard/*`)

| Component               | User Action         | API Endpoint                                                     | Success Outcome                               | Error Outcome                                    |
| ----------------------- | ------------------- | ---------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------ |
| `DashboardOverview`     | Accept candidate    | `POST /api/v1/private/integrations/github/candidates/:id/accept` | Removes item from inbox, updates stat card    | Displays error message in `role="status"` banner |
| `DashboardOverview`     | Reject candidate    | `POST /api/v1/private/integrations/github/candidates/:id/reject` | Removes item from inbox                       | Displays error message in `role="status"` banner |
| `DashboardOverview`     | Manage GitHub sync  | Link navigation                                                  | Navigates to `/dashboard/integrations/github` | N/A                                              |
| `PublicRecordDirectory` | Filter projects     | Select dropdown change                                           | Client-side filter of visible project cards   | N/A                                              |
| `PublicRecordDirectory` | Retry on error      | Click "Retry"                                                    | Re-fetches `/api/v1/public/:kind`             | Retries request with error feedback              |
| `ActivityHeatmap`       | Retry on error      | Click "Retry"                                                    | Re-fetches `/api/v1/public/activity`          | Retries request                                  |
| `CareerRoleManager`     | Create role         | `POST /api/v1/private/graph/roles`                               | Creates a private owner-approved role         | Displays validation/API error in status region   |
| `CareerRoleManager`     | Save role           | `PUT /api/v1/private/graph/roles/:id`                            | Saves visibility/publication with concurrency | Displays validation/conflict error               |
| `ProjectForm`           | Assign roles/skills | Project create/update API                                        | Persists owner-approved graph relationships   | Rejects cross-owner relationship IDs             |
| `SkillsEvidenceGraph`   | Universe / Back     | Public or private career graph query                             | Changes bounded semantic focus and breadcrumb | Keeps last valid projection and shows API error  |
| `SkillsEvidenceGraph`   | Detail slider       | Career graph query with depth `1–5`                              | Reloads a bounded neighborhood                | Displays API error                               |
| `SkillsEvidenceGraph`   | Table / 3D universe | Local render-mode state                                          | Switches WebGL/static view and semantic table | Table remains available without WebGL            |
| `ContactSection`        | Send message        | `POST /api/v1/public/contact`                                    | Verifies Turnstile and sends through Resend   | Shows validation/verification/delivery error     |

---

## 4. State & Resilience Matrix

| State Scenario                                         | Component Behavior                          | Fallback UI                                                                   |
| ------------------------------------------------------ | ------------------------------------------- | ----------------------------------------------------------------------------- |
| Public API Offline (`500` / `FetchError`)              | Component catches error, sets `error` state | Displays semantic alert banner with error message + "Retry" button            |
| Empty Database (`0` public records)                    | Component checks `array.length === 0`       | Displays honest `empty-state` card (icon + title + explanation + primary CTA) |
| Async Data Loading                                     | Component sets `loading = true`             | Displays animated CSS skeleton blocks matching target card layout             |
| Tab Inactive (`document.visibilityState === 'hidden'`) | Event listener triggers                     | Sets the 3D renderer to `frameloop="never"` and pauses decorative motion      |
| Graph outside viewport                                 | `IntersectionObserver` reports not visible  | Keeps semantic content mounted while pausing the WebGL render loop            |
| Reduced Motion Active                                  | Media query triggers                        | Uses the static career graph and neutralizes continuous CSS motion            |
| Save-Data Active                                       | Network preference detection                | Uses static graph unless the visitor explicitly enables interactive 3D        |
