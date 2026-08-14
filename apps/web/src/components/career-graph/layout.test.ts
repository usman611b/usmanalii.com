import { describe, expect, it } from 'vitest';
import { createCareerGraphLayout } from './layout';
import type { CareerGraphEdge, CareerGraphNode } from './types';

const nodes: CareerGraphNode[] = [
  {
    id: 'identity:owner',
    type: 'identity',
    label: 'Owner',
    subtitle: null,
    visibility: 'public',
    state: 'published',
    href: null,
    clusterId: null,
  },
  {
    id: 'role:ai',
    type: 'role',
    label: 'AI Engineer',
    subtitle: null,
    visibility: 'public',
    state: 'published',
    href: null,
    clusterId: 'role:ai',
  },
  {
    id: 'project:roadmap',
    type: 'project',
    label: 'Roadmap',
    subtitle: null,
    visibility: 'public',
    state: 'published',
    href: null,
    clusterId: 'role:ai',
  },
];

const edges: CareerGraphEdge[] = [
  {
    id: 'identity-role',
    sourceId: 'identity:owner',
    targetId: 'role:ai',
    relationshipType: 'practices',
    relevance: 5,
  },
  {
    id: 'role-project',
    sourceId: 'role:ai',
    targetId: 'project:roadmap',
    relationshipType: 'contains',
    relevance: 5,
  },
];

describe('career graph 3D layout', () => {
  it('places the focus at the origin and connected layers farther away', () => {
    const layout = createCareerGraphLayout(nodes, edges, 'identity:owner');
    expect(layout.get('identity:owner')).toEqual([0, 0, 0]);
    expect(Math.hypot(...layout.get('role:ai')!)).toBeGreaterThan(4);
    expect(Math.hypot(...layout.get('project:roadmap')!)).toBeGreaterThan(8);
  });

  it('is deterministic and recenters a focused project', () => {
    expect(createCareerGraphLayout(nodes, edges, null)).toEqual(
      createCareerGraphLayout(nodes, edges, null),
    );
    expect(createCareerGraphLayout(nodes, edges, 'project:roadmap').get('project:roadmap')).toEqual(
      [0, 0, 0],
    );
  });
});
