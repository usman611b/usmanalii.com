import type { CareerGraphEdge, CareerGraphNode, CareerGraphPosition } from './types';

function hash(value: string) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function createCareerGraphLayout(
  nodes: CareerGraphNode[],
  edges: CareerGraphEdge[],
  focusId: string | null,
) {
  const positions = new Map<string, CareerGraphPosition>();
  if (!nodes.length) return positions;

  const nodeIds = new Set(nodes.map(({ id }) => id));
  const adjacency = new Map<string, string[]>();
  for (const { sourceId, targetId } of edges) {
    if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) continue;
    adjacency.set(sourceId, [...(adjacency.get(sourceId) ?? []), targetId]);
    adjacency.set(targetId, [...(adjacency.get(targetId) ?? []), sourceId]);
  }

  const center =
    nodes.find(({ id }) => id === focusId) ??
    nodes.find(({ type }) => type === 'identity') ??
    nodes[0]!;
  const distance = new Map<string, number>([[center.id, 0]]);
  const queue = [center.id];

  while (queue.length) {
    const current = queue.shift()!;
    const nextDistance = (distance.get(current) ?? 0) + 1;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (distance.has(neighbor)) continue;
      distance.set(neighbor, nextDistance);
      queue.push(neighbor);
    }
  }

  const rings = new Map<number, CareerGraphNode[]>();
  const maxConnectedDepth = Math.max(0, ...distance.values());
  for (const node of nodes) {
    const ring = distance.get(node.id) ?? maxConnectedDepth + 1;
    rings.set(ring, [...(rings.get(ring) ?? []), node]);
  }

  for (const [ring, ringNodes] of rings) {
    ringNodes.sort((a, b) => a.type.localeCompare(b.type) || a.label.localeCompare(b.label));
    ringNodes.forEach((node, index) => {
      if (ring === 0) {
        positions.set(node.id, [0, 0, 0]);
        return;
      }
      const seed = hash(`${node.type}:${node.id}`);
      const phase = ((hash(node.type) % 360) * Math.PI) / 180;
      const angle = phase + (index / ringNodes.length) * Math.PI * 2;
      const radius = 5.8 + (ring - 1) * 4.7;
      const stretch = ring % 2 ? 0.78 : 1;
      const jitter = ((seed % 100) / 100 - 0.5) * 1.8;
      positions.set(node.id, [
        Math.cos(angle) * (radius + jitter),
        Math.sin(angle) * (radius * stretch + jitter * 0.5),
        ((seed >> 8) % 700) / 100 - 3.5,
      ]);
    });
  }

  return positions;
}
