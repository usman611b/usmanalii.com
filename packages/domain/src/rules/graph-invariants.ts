/**
 * Milestone M4 — Graph Invariants & Validation Rules.
 *
 * Mandated Invariants:
 *  1. Cycle Detection: Parent/child and prerequisite skill edges must be acyclic.
 *  2. Self-Link Prevention: Nodes cannot link to themselves.
 *  3. Single-Target Progression: Events must target exactly one skill OR one capability.
 *  4. Capability Structural Validation: Bounded title, outcome statement, no percentages, no raw XSS markup.
 *  5. Zero Numeric Proficiency: Percentage scores or level numbers are strictly prohibited.
 */

export interface GraphEdgeInput {
  sourceId: string;
  targetId: string;
  relationshipType?: string;
}

/**
 * Tarjan / DFS Cycle Detection Algorithm.
 * Returns true if adding `newEdge` creates a cycle in the directed edge list.
 */
export function detectsCycle(
  existingEdges: readonly GraphEdgeInput[],
  newEdge: GraphEdgeInput,
): boolean {
  if (newEdge.sourceId === newEdge.targetId) return true;

  // Build adjacency list including the candidate new edge
  const adj = new Map<string, string[]>();
  const addEdge = (src: string, tgt: string) => {
    const list = adj.get(src) || [];
    list.push(tgt);
    adj.set(src, list);
  };

  for (const edge of existingEdges) {
    addEdge(edge.sourceId, edge.targetId);
  }
  addEdge(newEdge.sourceId, newEdge.targetId);

  // DFS cycle detection using 3-color marking
  const visited = new Map<string, 'visiting' | 'visited'>();

  function dfs(node: string): boolean {
    visited.set(node, 'visiting');
    const neighbors = adj.get(node) || [];
    for (const neighbor of neighbors) {
      const state = visited.get(neighbor);
      if (state === 'visiting') return true; // Cycle detected!
      if (!state && dfs(neighbor)) return true;
    }
    visited.set(node, 'visited');
    return false;
  }

  for (const node of adj.keys()) {
    if (!visited.has(node)) {
      if (dfs(node)) return true;
    }
  }

  return false;
}

/**
 * Validates skill relationship parameters.
 */
export function validateSkillRelationship(params: {
  sourceSkillId: string;
  targetSkillId: string;
  relationshipType: string;
  relevance: number;
  existingEdges?: readonly GraphEdgeInput[];
}): { valid: boolean; reason?: string } {
  if (!params.sourceSkillId || !params.targetSkillId) {
    return { valid: false, reason: 'Source and target skill IDs are required.' };
  }

  if (params.sourceSkillId === params.targetSkillId) {
    return { valid: false, reason: 'Self-referential skill relationships are prohibited.' };
  }

  if (params.relevance < 1 || params.relevance > 5) {
    return { valid: false, reason: 'Relevance must be an integer between 1 and 5.' };
  }

  const validTypes = ['parent_child', 'related', 'prerequisite', 'complementary', 'supersedes', 'applied_with'];
  if (!validTypes.includes(params.relationshipType)) {
    return { valid: false, reason: `Unsupported skill relationship type: ${params.relationshipType}` };
  }

  if ((params.relationshipType === 'parent_child' || params.relationshipType === 'prerequisite') && params.existingEdges) {
    if (detectsCycle(params.existingEdges, { sourceId: params.sourceSkillId, targetId: params.targetSkillId })) {
      return { valid: false, reason: `Adding ${params.relationshipType} relationship creates a graph cycle.` };
    }
  }

  return { valid: true };
}

/**
 * Structural validation for capability wording.
 */
export function validateCapabilityWording(title: string, outcomeStatement: string): { valid: boolean; reason?: string } {
  if (!title || title.trim().length === 0) {
    return { valid: false, reason: 'Capability title cannot be empty.' };
  }
  if (title.length > 120) {
    return { valid: false, reason: 'Capability title must not exceed 120 characters.' };
  }

  if (!outcomeStatement || outcomeStatement.trim().length < 10) {
    return { valid: false, reason: 'Outcome statement must be at least 10 characters describing a specific result.' };
  }
  if (outcomeStatement.length > 500) {
    return { valid: false, reason: 'Outcome statement must not exceed 500 characters.' };
  }

  // Reject numeric/percentage proficiency claims
  const combined = `${title} ${outcomeStatement}`.toLowerCase();
  if (/\b\d{1,3}\s*%/.test(combined) || /\b(percentage|proficiency score|expert level \d|rating \d\/10)\b/.test(combined)) {
    return { valid: false, reason: 'Capability wording must not include percentage scores or numeric proficiency ratings.' };
  }

  // Reject XSS / unsafe HTML markup
  if (/<script|javascript:|onload=|onerror=|<iframe/i.test(combined)) {
    return { valid: false, reason: 'Capability wording contains unsafe HTML or script tags.' };
  }

  return { valid: true };
}

/**
 * Validates single-target rule for progression events.
 */
export function validateProgressionEventTarget(params: {
  skillId?: string | null;
  capabilityId?: string | null;
  supportingEvidenceIds: readonly string[];
  reason: string;
}): { valid: boolean; reason?: string } {
  const hasSkill = Boolean(params.skillId && params.skillId.trim().length > 0);
  const hasCap = Boolean(params.capabilityId && params.capabilityId.trim().length > 0);

  if ((hasSkill && hasCap) || (!hasSkill && !hasCap)) {
    return { valid: false, reason: 'Progression event must explicitly target exactly ONE skill OR ONE capability.' };
  }

  if (!params.supportingEvidenceIds || params.supportingEvidenceIds.length === 0) {
    return { valid: false, reason: 'Progression event requires at least one supporting evidence ID.' };
  }

  if (!params.reason || params.reason.trim().length < 5) {
    return { valid: false, reason: 'Progression event requires a human-readable reason of at least 5 characters.' };
  }

  return { valid: true };
}

/**
 * Validates legal progression stage transitions.
 */
export function validateProgressionTransition(params: {
  previousStage: string | null;
  newStage: string;
  supportingEvidenceCount: number;
  reason: string;
  hasOwnerSkipJustification?: boolean;
}): { valid: boolean; reason?: string } {
  if (params.supportingEvidenceCount <= 0) {
    return { valid: false, reason: 'Progression transition requires at least 1 eligible supporting evidence record.' };
  }

  const validStages = ['observed', 'practiced', 'applied', 'delivered'];
  if (!validStages.includes(params.newStage)) {
    return { valid: false, reason: `Invalid progression stage: ${params.newStage}` };
  }

  // Handle stage skips
  if (params.previousStage === 'observed' && params.newStage === 'delivered') {
    if (!params.reason || params.reason.length < 15) {
      return { valid: false, reason: 'Skipping progression stages requires an explicit owner-approved justification of at least 15 characters.' };
    }
  }

  return { valid: true };
}

