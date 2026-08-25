import { describe, expect, it, vi } from 'vitest';
import {
  buildBoundedCareerProjection,
  D1CareerGraphRepository,
  type CareerGraphEdge,
  type CareerGraphNode,
} from './repositories/career-graph.js';

function graphNode(id: string, type: CareerGraphNode['type']): CareerGraphNode {
  return {
    id,
    type,
    label: id,
    subtitle: null,
    visibility: 'public',
    state: 'published',
    href: null,
    clusterId: null,
  };
}

function projectionDb() {
  const queries: string[] = [];
  const rowsFor = (sql: string): unknown[] => {
    if (sql.includes('FROM profiles'))
      return [{ id: 'profile-1', label: 'Owner', visibility: 'public' }];
    if (sql.includes('FROM career_roles'))
      return [{ id: 'ai-role', label: 'AI Engineer', visibility: 'public', state: 'published' }];
    if (sql.includes('FROM projects'))
      return [
        {
          id: 'project-1',
          label: 'Project One',
          slug: 'project-one',
          visibility: 'public',
          state: 'published',
        },
      ];
    if (sql.includes('FROM skills'))
      return [
        {
          id: 'skill-1',
          label: 'Python',
          slug: 'python',
          visibility: 'public',
          state: 'active',
        },
      ];
    if (sql.includes('FROM project_role_links'))
      return [
        {
          id: 'role-project',
          source_id: 'role:ai-role',
          target_id: 'project:project-1',
          relationship_type: 'demonstrates',
        },
      ];
    if (sql.includes('FROM project_skills'))
      return [
        {
          id: 'project-skill',
          source_id: 'project:project-1',
          target_id: 'skill:skill-1',
          relationship_type: 'uses',
        },
      ];
    return [];
  };
  const db = {
    prepare(sql: string) {
      queries.push(sql);
      return {
        bind() {
          return this;
        },
        async all() {
          return { results: rowsFor(sql) };
        },
        async first() {
          return null;
        },
        async run() {
          return { meta: { changes: 1 } };
        },
      };
    },
    async batch() {
      return [];
    },
  };
  return { db, queries };
}

describe('M8 career knowledge graph', () => {
  it('keeps the broad universe bounded to identity, role, and project nodes', () => {
    const nodes = new Map<string, CareerGraphNode>();
    nodes.set('identity:owner', graphNode('identity:owner', 'identity'));
    for (let index = 0; index < 200; index += 1) {
      nodes.set(`project:${index}`, graphNode(`project:${index}`, 'project'));
    }
    nodes.set('skill:hidden-from-broad', graphNode('skill:hidden-from-broad', 'skill'));
    const edges = new Map<string, CareerGraphEdge>();

    const projection = buildBoundedCareerProjection(nodes, edges, 'universe', null, 2);

    expect(projection.nodes).toHaveLength(160);
    expect(
      projection.nodes.every((node) => ['identity', 'role', 'project'].includes(node.type)),
    ).toBe(true);
    expect(projection.truncated).toBe(true);
  });

  it('builds a public broad view and a focused project neighborhood from approved links', async () => {
    const { db, queries } = projectionDb();
    const repository = new D1CareerGraphRepository(db as never);

    const broad = await repository.getProjection('owner-1', {
      publicOnly: true,
      focusType: 'universe',
    });
    expect(broad.nodes.map((node) => node.id)).toEqual([
      'identity:owner',
      'role:ai-role',
      'project:project-1',
    ]);
    expect(broad.edges.map((edge) => edge.id)).toEqual(['identity-role:ai-role', 'role-project']);
    expect(broad.nodes.find((node) => node.id === 'project:project-1')?.href).toBe(
      '/projects/record?slug=project-one',
    );

    const focused = await repository.getProjection('owner-1', {
      publicOnly: true,
      focusType: 'project',
      focusId: 'project-1',
      depth: 1,
    });
    expect(focused.nodes.map((node) => node.id).sort()).toEqual([
      'project:project-1',
      'role:ai-role',
      'skill:skill-1',
    ]);
    expect(focused.edges).toHaveLength(2);
    expect(focused.nodes.find((node) => node.id === 'skill:skill-1')?.href).toBe(
      '/skills/record?slug=python',
    );
    expect(
      queries.filter((sql) => /FROM (profiles|career_roles|projects|skills)/.test(sql)),
    ).toSatisfy((nodeQueries: string[]) =>
      nodeQueries.every((sql) => sql.includes("visibility = 'public'")),
    );
  });

  it('rejects cross-owner role assignments before starting the atomic replacement batch', async () => {
    const batch = vi.fn();
    const db = {
      prepare(sql: string) {
        return {
          bind() {
            return this;
          },
          async first() {
            return sql.includes('FROM projects') ? { id: 'project-1' } : null;
          },
          async all() {
            return { results: [] };
          },
          async run() {
            return { meta: { changes: 1 } };
          },
        };
      },
      batch,
    };
    const repository = new D1CareerGraphRepository(db as never);

    await expect(
      repository.replaceProjectRoles({ ownerId: 'owner-1', isOwner: true } as never, 'project-1', [
        'other-owner-role',
      ]),
    ).rejects.toThrow('ROLE_OWNERSHIP_INVALID');
    expect(batch).not.toHaveBeenCalled();
  });
});
