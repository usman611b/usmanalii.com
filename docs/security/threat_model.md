# Graph & System Security Threat Model

This document identifies threat vectors and security mitigations across the Skills, Capabilities, Evidence, and Content graph.

---

## 1. Graph Privacy & Neighbor Leak Vectors

| Threat Vector | Mitigation Strategy | Enforced Location |
| :--- | :--- | :--- |
| **Private Neighbor Count Leakage** | SQL-level pre-filtering (`WHERE visibility = 'public'`) joins nodes before serialization so non-public neighbor counts are never computed in application memory. | `D1GraphRepository.getPublicGraphProjection()`, `filterPublicGraphProjection()` |
| **Opaque 404 Behavior** | Ineligible, private, draft, scheduled, or embargoed detail lookups return identical `404 RESOURCE_NOT_FOUND` responses. | `apps/worker/src/routes/public.ts` |
| **Graph Traversal Denial of Service (DoS)** | Hard upper bounds: `maxDepth = 5`, `maxNodes = 100`, `maxEdges = 200`, Tarjan / DFS cycle detection. | `traverseBoundedGraph()`, `detectsCycle()` |
| **Traversal Cursor Forgery** | Cryptographically serialized base64url cursors with offset validation. | `encodeCursor()`, `decodeCursor()` |

---

## 2. Progression Integrity & Immutability Vectors

| Threat Vector | Mitigation Strategy | Enforced Location |
| :--- | :--- | :--- |
| **Silent Overwrite of Historical Progression** | Database triggers `trg_prevent_progression_update` and `trg_prevent_progression_delete` raise SQLite `ABORT` errors on any `UPDATE` or `DELETE`. | `011_skills_capabilities_m4.sql` |
| **Unbacked Progression Claims** | Domain validator `validateProgressionEventTarget` and `validateProgressionTransition` require >= 1 eligible same-owner evidence record. | `graph-invariants.ts` |
| **AI Progression Inflation** | System flag `AI_SUGGESTIONS_ENABLED = false` by default; AI proposals remain private and require human owner authorization to accept. | `suggestionRoutes` |
