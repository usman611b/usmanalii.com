# Evidence-Backed Progression Rules Specification

This document specifies the rules governing progression events across skills and capabilities.

---

## Core Invariants

1. **Append-Only Immutability**:
   - Progression events are strictly append-only.
   - Database triggers `trg_prevent_progression_update` and `trg_prevent_progression_delete` enforce that no event row can be modified or deleted.

2. **Single Target Scope**:
   - Every progression event targets **either** one skill **or** one capability, never both or neither (`validateProgressionEventTarget`).

3. **Mandatory Same-Owner Evidence Support**:
   - A progression event requires at least one eligible supporting evidence record belonging to the same owner.
   - Disputed, revoked, deleted, private, archived, or embargoed evidence cannot justify a public progression transition.

4. **Legal Progression Transitions**:
   - Supported stages: `observed`, `practiced`, `applied`, `delivered`.
   - Stage skips (e.g., `observed` directly to `delivered`) require explicit owner-approved justification of at least 15 characters backed by evidence.
   - Regressions, staleness, and corrections are recorded as new append-only events referencing superseding events (`supersedesEventId`).

5. **No Synthetic Progression**:
   - System never infers progression from commit counts, elapsed time, tags, AI confidence, or evidence quantity alone.
