import { describe, it, expect } from 'vitest';
import {
  detectsCycle,
  validateSkillRelationship,
  validateCapabilityWording,
  validateProgressionEventTarget,
} from './graph-invariants';

describe('Milestone M4 — Domain Invariant & Graph Rule Tests', () => {
  it('1. detectsCycle finds direct and multi-node cycles', () => {
    const existingEdges = [
      { sourceId: 'skill-A', targetId: 'skill-B' },
      { sourceId: 'skill-B', targetId: 'skill-C' },
    ];

    // Adding C -> A creates a 3-node cycle (A -> B -> C -> A)
    expect(detectsCycle(existingEdges, { sourceId: 'skill-C', targetId: 'skill-A' })).toBe(true);

    // Adding A -> D does NOT create a cycle
    expect(detectsCycle(existingEdges, { sourceId: 'skill-A', targetId: 'skill-D' })).toBe(false);

    // Self-link (A -> A) is always a cycle
    expect(detectsCycle([], { sourceId: 'skill-A', targetId: 'skill-A' })).toBe(true);
  });

  it('2. validateSkillRelationship enforces relevance bounds, self-link prevention, and cycle checks', () => {
    // Self-link rejection
    expect(
      validateSkillRelationship({
        sourceSkillId: 'skill-1',
        targetSkillId: 'skill-1',
        relationshipType: 'parent_child',
        relevance: 3,
      }).valid,
    ).toBe(false);

    // Relevance bounds
    expect(
      validateSkillRelationship({
        sourceSkillId: 'skill-1',
        targetSkillId: 'skill-2',
        relationshipType: 'related',
        relevance: 0,
      }).valid,
    ).toBe(false);

    // Cycle detection for parent_child
    const existing = [{ sourceId: 'skill-1', targetId: 'skill-2' }];
    const cycleRes = validateSkillRelationship({
      sourceSkillId: 'skill-2',
      targetSkillId: 'skill-1',
      relationshipType: 'parent_child',
      relevance: 4,
      existingEdges: existing,
    });
    expect(cycleRes.valid).toBe(false);
    expect(cycleRes.reason).toContain('creates a graph cycle');
  });

  it('3. validateCapabilityWording validates title/outcome bounds and rejects percentage scores and script tags', () => {
    // Valid capability wording
    expect(
      validateCapabilityWording(
        'Cloudflare Workers API Security',
        'Design secure multi-tenant API endpoints with Cloudflare Access JWT validation.',
      ).valid,
    ).toBe(true);

    // Rejects numeric percentage score
    expect(
      validateCapabilityWording(
        'API Security',
        'Demonstrates 95% proficiency in Cloudflare Workers security.',
      ).valid,
    ).toBe(false);

    // Rejects XSS script tags
    expect(
      validateCapabilityWording(
        'Frontend Design',
        'Builds accessible Web apps <script>alert(1)</script>',
      ).valid,
    ).toBe(false);

    // Rejects empty title
    expect(validateCapabilityWording('', 'Valid outcome statement').valid).toBe(false);
  });

  it('4. validateProgressionEventTarget enforces single-target rule (skill XOR capability)', () => {
    // Valid skill progression
    expect(
      validateProgressionEventTarget({
        skillId: 'skill-1',
        capabilityId: null,
        supportingEvidenceIds: ['ev-1'],
        reason: 'Demonstrated in production implementation',
      }).valid,
    ).toBe(true);

    // Valid capability progression
    expect(
      validateProgressionEventTarget({
        skillId: null,
        capabilityId: 'cap-1',
        supportingEvidenceIds: ['ev-1'],
        reason: 'Delivered in production release',
      }).valid,
    ).toBe(true);

    // Rejects targeting BOTH skill and capability
    expect(
      validateProgressionEventTarget({
        skillId: 'skill-1',
        capabilityId: 'cap-1',
        supportingEvidenceIds: ['ev-1'],
        reason: 'Targeting both',
      }).valid,
    ).toBe(false);

    // Rejects targeting NEITHER skill nor capability
    expect(
      validateProgressionEventTarget({
        skillId: null,
        capabilityId: null,
        supportingEvidenceIds: ['ev-1'],
        reason: 'Targeting neither',
      }).valid,
    ).toBe(false);

    // Rejects progression without supporting evidence IDs
    expect(
      validateProgressionEventTarget({
        skillId: 'skill-1',
        capabilityId: null,
        supportingEvidenceIds: [],
        reason: 'No evidence provided',
      }).valid,
    ).toBe(false);
  });

  it('5. validateProgressionTransition requires evidence and explicit owner reason for stage skips', async () => {
    const { validateProgressionTransition } = await import('./graph-invariants');

    // Requires evidence
    expect(
      validateProgressionTransition({
        previousStage: 'observed',
        newStage: 'applied',
        supportingEvidenceCount: 0,
        reason: 'Valid reason string here',
      }).valid,
    ).toBe(false);

    // Stage skip requires explicit owner justification
    const skipShort = validateProgressionTransition({
      previousStage: 'observed',
      newStage: 'delivered',
      supportingEvidenceCount: 2,
      reason: 'Short reason',
    });
    expect(skipShort.valid).toBe(false);
    expect(skipShort.reason).toContain('Skipping progression stages requires an explicit owner-approved justification');

    const skipLong = validateProgressionTransition({
      previousStage: 'observed',
      newStage: 'delivered',
      supportingEvidenceCount: 2,
      reason: 'Explicit evidence-backed owner justification for skipping intermediate stage.',
    });
    expect(skipLong.valid).toBe(true);
  });
});
