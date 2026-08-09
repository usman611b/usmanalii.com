export interface TraversalNode {
  id: string;
  name: string;
  type: 'skill' | 'capability';
  category?: string;
  stage?: string;
  visibility: 'private' | 'restricted' | 'unlisted' | 'public';
}

export interface TraversalEdge {
  sourceId: string;
  targetId: string;
  relationshipType: string;
}

export interface TraversalParams {
  startNodeId: string;
  maxDepth?: number;
  maxNodes?: number;
  maxEdges?: number;
  cursor?: string | null;
}

interface TraversalCursorPayload {
  readonly version: 1;
  readonly offset: number;
  readonly startNodeId: string;
  readonly maxDepth: number;
  readonly maxNodes: number;
  readonly maxEdges: number;
}

export interface TraversalResult {
  nodes: readonly TraversalNode[];
  edges: readonly TraversalEdge[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Encodes an opaque (not integrity-protected) traversal cursor. Every field is
 * validated and bound to the traversal context when decoded.
 */
export function encodeCursor(
  offset: number,
  context: Omit<TraversalCursorPayload, 'version' | 'offset'>,
): string {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10_000)
    throw new Error('INVALID_CURSOR');
  return Buffer.from(
    JSON.stringify({ version: 1, offset, ...context } satisfies TraversalCursorPayload),
  ).toString('base64url');
}

/**
 * Decodes traversal cursor with strict parameter validation.
 */
export function decodeCursor(
  cursor: string,
  context: Omit<TraversalCursorPayload, 'version' | 'offset'>,
): number {
  try {
    if (!/^[A-Za-z0-9_-]{1,2048}$/.test(cursor)) throw new Error('INVALID_CURSOR');
    const raw = Buffer.from(cursor, 'base64url').toString('utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error('INVALID_CURSOR');
    const value = parsed as Record<string, unknown>;
    const expectedKeys = ['version', 'offset', 'startNodeId', 'maxDepth', 'maxNodes', 'maxEdges'];
    if (Object.keys(value).sort().join(',') !== expectedKeys.sort().join(','))
      throw new Error('INVALID_CURSOR');
    if (
      value.version !== 1 ||
      !Number.isSafeInteger(value.offset) ||
      Number(value.offset) < 0 ||
      Number(value.offset) > 10_000
    )
      throw new Error('INVALID_CURSOR');
    for (const key of ['startNodeId', 'maxDepth', 'maxNodes', 'maxEdges'] as const) {
      if (value[key] !== context[key]) throw new Error('INVALID_CURSOR');
    }
    return Number(value.offset);
  } catch {
    throw new Error('INVALID_CURSOR: Malformed traversal cursor');
  }
}

/**
 * Executes a bounded, cycle-safe graph traversal.
 */
export function traverseBoundedGraph(
  allNodes: readonly TraversalNode[],
  allEdges: readonly TraversalEdge[],
  params: TraversalParams,
): TraversalResult {
  const maxDepth = Math.min(params.maxDepth || 3, 5);
  const maxNodes = Math.min(params.maxNodes || 50, 100);
  const maxEdges = Math.min(params.maxEdges || 100, 200);
  const cursorContext = { startNodeId: params.startNodeId, maxDepth, maxNodes, maxEdges };
  const offset = params.cursor ? decodeCursor(params.cursor, cursorContext) : 0;

  const adj = new Map<string, TraversalEdge[]>();
  for (const edge of allEdges) {
    const list = adj.get(edge.sourceId) || [];
    list.push(edge);
    adj.set(edge.sourceId, list);
  }

  const visitedNodes = new Set<string>();
  const visitedEdges = new Set<string>();
  const resultNodes: TraversalNode[] = [];
  const resultEdges: TraversalEdge[] = [];
  const nodeMap = new Map<string, TraversalNode>(allNodes.map((n) => [n.id, n]));

  // Queue for BFS traversal: [nodeId, currentDepth]
  const queue: Array<[string, number]> = [[params.startNodeId, 0]];

  while (queue.length > 0 && resultNodes.length < maxNodes && resultEdges.length < maxEdges) {
    const [currId, depth] = queue.shift()!;
    if (visitedNodes.has(currId)) continue;
    visitedNodes.add(currId);

    const node = nodeMap.get(currId);
    if (node) {
      resultNodes.push(node);
    }

    if (depth >= maxDepth) continue;

    const outEdges = adj.get(currId) || [];
    for (const edge of outEdges) {
      const edgeKey = `${edge.sourceId}->${edge.targetId}:${edge.relationshipType}`;
      if (!visitedEdges.has(edgeKey) && resultEdges.length < maxEdges) {
        visitedEdges.add(edgeKey);
        resultEdges.push(edge);
        if (!visitedNodes.has(edge.targetId)) {
          queue.push([edge.targetId, depth + 1]);
        }
      }
    }
  }

  // Apply pagination offset
  const paginatedNodes = resultNodes.slice(offset, offset + maxNodes);
  const hasMore = offset + maxNodes < resultNodes.length;
  const nextCursor = hasMore ? encodeCursor(offset + maxNodes, cursorContext) : null;

  return {
    nodes: paginatedNodes,
    edges: resultEdges,
    nextCursor,
    hasMore,
  };
}

/**
 * Filter public graph projections (Section 9 Privacy Safety).
 * Removes any private neighbor nodes or edges connecting to non-public endpoints.
 */
export function filterPublicGraphProjection(
  nodes: readonly TraversalNode[],
  edges: readonly TraversalEdge[],
): { nodes: readonly TraversalNode[]; edges: readonly TraversalEdge[] } {
  const publicNodes = nodes.filter((n) => n.visibility === 'public');
  const publicNodeIds = new Set(publicNodes.map((n) => n.id));

  const publicEdges = edges.filter(
    (e) => publicNodeIds.has(e.sourceId) && publicNodeIds.has(e.targetId),
  );

  return {
    nodes: publicNodes,
    edges: publicEdges,
  };
}
