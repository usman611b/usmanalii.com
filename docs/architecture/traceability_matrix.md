# Portfolio Architecture Traceability Matrix

This document maps user requirements and epic specifications to technical implementation components and automated verification tests across all milestones.

---

## Milestone M4 — Skills & Capabilities Graph

| Requirement ID | Domain Rule / Entity | Repository / SQL | API Route | Automated Test Coverage |
| :--- | :--- | :--- | :--- | :--- |
| **M4-REQ-1** (Skill Relationship Schema) | `SkillRelationshipEntity`, `validateSkillRelationship` | `011_skills_capabilities_m4.sql`, `D1GraphRepository.createSkillRelationship` | `POST /api/v1/private/graph/relationships` | `graph-invariants.test.ts`, `database.test.ts`, `worker.test.ts` |
| **M4-REQ-2** (Append-Only Progression Events) | `ProgressionEventEntity`, `validateProgressionEventTarget`, `validateProgressionTransition` | DB triggers `trg_prevent_progression_update` & `trg_prevent_progression_delete`, `D1ProgressionRepository` | `D1ProgressionRepository.createProgressionEvent` | `graph-invariants.test.ts`, `database.test.ts` |
| **M4-REQ-3** (Capability Wording Rules) | `CapabilityEntity`, `validateCapabilityWording` | `D1CapabilityRepository.createCapability` | `POST /api/v1/private/capabilities` | `graph-invariants.test.ts`, `database.test.ts`, `worker.test.ts` |
| **M4-REQ-4** (Suggestion Safety & Deduplication) | `SuggestionEntity` | `D1SuggestionRepository.createSuggestion` (partial index `WHERE suggestion_state = 'rejected'`) | `POST /api/v1/private/suggestions` | `database.test.ts`, `worker.test.ts` |
| **M4-REQ-5** (SQL Pre-filtered Public Graph) | `filterPublicGraphProjection` | `D1GraphRepository.getPublicGraphProjection` | `GET /api/v1/public/graph/visualization` | `evidence.test.ts`, `worker.test.ts` |
| **M4-REQ-6** (Explainable Evidence Strength) | `evaluateEvidenceStrength` | `D1EvidenceRepository` | `evaluateEvidenceStrength()` helper | `evidence.test.ts` |
| **M4-REQ-7** (Bounded Graph Traversal) | `traverseBoundedGraph`, `encodeCursor`, `decodeCursor` | `D1GraphRepository` | `GET /api/v1/public/graph/visualization` | `evidence.test.ts` |
| **M4-REQ-8** (Durable Reconciliation Queue) | `processReconciliationQueue` | `reconciliation_queue` table in D1 | `POST /api/v1/private/artifacts/reconcile` | `database.test.ts` |
