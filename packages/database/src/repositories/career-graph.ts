import type { AuthorizationContext } from '@usmanalii/authorization';
import { requireOwnerContext } from '@usmanalii/authorization';

export type CareerGraphNodeType =
  | 'identity'
  | 'role'
  | 'project'
  | 'skill'
  | 'capability'
  | 'evidence'
  | 'journey'
  | 'artifact'
  | 'adr'
  | 'experiment'
  | 'debugging_lesson'
  | 'deployment';

export interface CareerGraphNode {
  id: string;
  type: CareerGraphNodeType;
  label: string;
  subtitle: string | null;
  visibility: string;
  state: string | null;
  href: string | null;
  clusterId: string | null;
}

export interface CareerGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationshipType: string;
  relevance: number;
  approvalState: string;
}

export interface CareerGraphProjection {
  nodes: CareerGraphNode[];
  edges: CareerGraphEdge[];
  focus: { type: CareerGraphNodeType | 'universe'; id: string | null };
  truncated: boolean;
}

interface QueryResult<T> {
  results?: T[];
}

interface D1Statement {
  bind(...params: unknown[]): D1Statement;
  all<T>(): Promise<QueryResult<T>>;
  first<T>(): Promise<T | null>;
  run(): Promise<{ meta?: { changes?: number } }>;
}

interface D1Database {
  prepare(sql: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown[]>;
}

type GraphRow = {
  id: string;
  label: string;
  subtitle?: string | null;
  visibility?: string | null;
  state?: string | null;
  slug?: string | null;
  project_id?: string | null;
};

type EdgeRow = {
  id: string;
  source_id: string;
  target_id: string;
  relationship_type: string;
  relevance?: number | null;
  approval_state?: string | null;
};

const OWNER_NODE_ID = 'identity:owner';
const MAX_NODES = 160;
const MAX_EDGES = 320;

function nodeId(type: CareerGraphNodeType, id: string) {
  return `${type}:${id}`;
}

function safeRows<T>(result: QueryResult<T>): T[] {
  return result.results ?? [];
}

function addNode(
  nodes: Map<string, CareerGraphNode>,
  type: CareerGraphNodeType,
  row: GraphRow,
  href: string | null,
  clusterId: string | null = null,
) {
  const id = type === 'identity' ? OWNER_NODE_ID : nodeId(type, row.id);
  nodes.set(id, {
    id,
    type,
    label: row.label,
    subtitle: row.subtitle ?? null,
    visibility: row.visibility ?? 'private',
    state: row.state ?? null,
    href,
    clusterId,
  });
}

function addEdge(edges: Map<string, CareerGraphEdge>, row: EdgeRow) {
  if (row.source_id === row.target_id) return;
  edges.set(row.id, {
    id: row.id,
    sourceId: row.source_id,
    targetId: row.target_id,
    relationshipType: row.relationship_type,
    relevance: Number(row.relevance ?? 3),
    approvalState: row.approval_state ?? 'accepted',
  });
}

export function buildBoundedCareerProjection(
  allNodes: Map<string, CareerGraphNode>,
  allEdges: Map<string, CareerGraphEdge>,
  focusType: CareerGraphNodeType | 'universe',
  focusId: string | null,
  depth: number,
): CareerGraphProjection {
  const edges = [...allEdges.values()].filter(
    (edge) => allNodes.has(edge.sourceId) && allNodes.has(edge.targetId),
  );
  if (focusType === 'universe' || !focusId) {
    const broadTypes = new Set<CareerGraphNodeType>(['identity', 'role', 'project']);
    const nodes = [...allNodes.values()]
      .filter((node) => broadTypes.has(node.type))
      .slice(0, MAX_NODES);
    const ids = new Set(nodes.map((node) => node.id));
    return {
      nodes,
      edges: edges
        .filter((edge) => ids.has(edge.sourceId) && ids.has(edge.targetId))
        .slice(0, MAX_EDGES),
      focus: { type: 'universe', id: null },
      truncated: nodes.length >= MAX_NODES,
    };
  }

  const canonicalFocus = focusId.includes(':') ? focusId : nodeId(focusType, focusId);
  const visited = new Set<string>([canonicalFocus]);
  let frontier = [canonicalFocus];
  for (let level = 0; level < Math.min(Math.max(depth, 1), 5); level += 1) {
    const next: string[] = [];
    for (const edge of edges) {
      if (frontier.includes(edge.sourceId) && !visited.has(edge.targetId)) next.push(edge.targetId);
      if (frontier.includes(edge.targetId) && !visited.has(edge.sourceId)) next.push(edge.sourceId);
    }
    for (const id of next) {
      if (visited.size >= MAX_NODES) break;
      visited.add(id);
    }
    frontier = [...new Set(next)].filter((id) => visited.has(id));
    if (frontier.length === 0 || visited.size >= MAX_NODES) break;
  }
  const nodes = [...visited].map((id) => allNodes.get(id)).filter(Boolean) as CareerGraphNode[];
  return {
    nodes,
    edges: edges
      .filter((edge) => visited.has(edge.sourceId) && visited.has(edge.targetId))
      .slice(0, MAX_EDGES),
    focus: { type: focusType, id: canonicalFocus },
    truncated: visited.size >= MAX_NODES,
  };
}

export class D1CareerGraphRepository {
  constructor(private readonly db: D1Database) {}

  async listRoles(ctx: AuthorizationContext) {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);
    return safeRows(
      await this.db
        .prepare(
          'SELECT * FROM career_roles WHERE owner_id = ? AND archived_at IS NULL ORDER BY ordering, name',
        )
        .bind(ctx.ownerId)
        .all<Record<string, unknown>>(),
    );
  }

  async createRole(
    ctx: AuthorizationContext,
    input: { name: string; slug: string; description?: string | null; color?: string },
  ) {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO career_roles
         (id, owner_id, name, slug, description, color, visibility, publication_state,
          ordering, created_at, updated_at, version_no)
         VALUES (?, ?, ?, ?, ?, ?, 'private', 'draft', 0, ?, ?, 1)`,
      )
      .bind(
        id,
        ctx.ownerId,
        input.name,
        input.slug,
        input.description ?? null,
        input.color ?? '#8B5CF6',
        now,
        now,
      )
      .run();
    return { id, ...input, visibility: 'private', publicationState: 'draft', versionNo: 1 };
  }

  async updateRole(
    ctx: AuthorizationContext,
    id: string,
    input: {
      name: string;
      slug: string;
      description?: string | null;
      color?: string;
      visibility: string;
      publicationState: string;
      versionNo: number;
    },
  ) {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);
    const result = await this.db
      .prepare(
        `UPDATE career_roles SET name = ?, slug = ?, description = ?, color = ?, visibility = ?,
          publication_state = ?, updated_at = ?, version_no = version_no + 1
         WHERE owner_id = ? AND id = ? AND version_no = ? AND archived_at IS NULL`,
      )
      .bind(
        input.name,
        input.slug,
        input.description ?? null,
        input.color ?? '#8B5CF6',
        input.visibility,
        input.publicationState,
        new Date().toISOString(),
        ctx.ownerId,
        id,
        input.versionNo,
      )
      .run();
    if ((result.meta?.changes ?? 0) !== 1) throw new Error('CONCURRENCY_CONFLICT');
  }

  async replaceProjectRoles(ctx: AuthorizationContext, projectId: string, roleIds: string[]) {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);
    const project = await this.db
      .prepare('SELECT id FROM projects WHERE owner_id = ? AND id = ? AND deleted_at IS NULL')
      .bind(ctx.ownerId, projectId)
      .first<{ id: string }>();
    if (!project) throw new Error('PROJECT_OWNERSHIP_INVALID');
    const uniqueRoleIds = [...new Set(roleIds)];
    if (uniqueRoleIds.length > 0) {
      const placeholders = uniqueRoleIds.map(() => '?').join(',');
      const owned = await this.db
        .prepare(
          `SELECT id FROM career_roles WHERE owner_id = ? AND id IN (${placeholders}) AND archived_at IS NULL`,
        )
        .bind(ctx.ownerId, ...uniqueRoleIds)
        .all<{ id: string }>();
      if (safeRows(owned).length !== uniqueRoleIds.length)
        throw new Error('ROLE_OWNERSHIP_INVALID');
    }
    const now = new Date().toISOString();
    const statements = [
      this.db
        .prepare(
          'UPDATE project_role_links SET archived_at = ? WHERE owner_id = ? AND project_id = ? AND archived_at IS NULL',
        )
        .bind(now, ctx.ownerId, projectId),
      ...uniqueRoleIds.map((roleId) =>
        this.db
          .prepare(
            `INSERT INTO project_role_links
             (id, owner_id, project_id, role_id, relationship_type, relevance,
              created_by_classification, approval_state, created_at)
             VALUES (?, ?, ?, ?, 'demonstrates', 3, 'owner', 'accepted', ?)`,
          )
          .bind(crypto.randomUUID(), ctx.ownerId, projectId, roleId, now),
      ),
    ];
    await this.db.batch(statements);
  }

  async replaceProjectSkills(ctx: AuthorizationContext, projectId: string, skillIds: string[]) {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);
    const project = await this.db
      .prepare('SELECT id FROM projects WHERE owner_id = ? AND id = ? AND deleted_at IS NULL')
      .bind(ctx.ownerId, projectId)
      .first<{ id: string }>();
    if (!project) throw new Error('PROJECT_OWNERSHIP_INVALID');
    const uniqueSkillIds = [...new Set(skillIds)];
    if (uniqueSkillIds.length > 0) {
      const placeholders = uniqueSkillIds.map(() => '?').join(',');
      const owned = await this.db
        .prepare(
          `SELECT id FROM skills WHERE owner_id = ? AND id IN (${placeholders}) AND archived_at IS NULL`,
        )
        .bind(ctx.ownerId, ...uniqueSkillIds)
        .all<{ id: string }>();
      if (safeRows(owned).length !== uniqueSkillIds.length)
        throw new Error('SKILL_OWNERSHIP_INVALID');
    }
    const statements = [
      this.db.prepare('DELETE FROM project_skills WHERE project_id = ?').bind(projectId),
      ...uniqueSkillIds.map((skillId) =>
        this.db
          .prepare('INSERT INTO project_skills(project_id, skill_id, created_at) VALUES (?, ?, ?)')
          .bind(projectId, skillId, new Date().toISOString()),
      ),
    ];
    await this.db.batch(statements);
  }

  async getProjectRoleIds(ctx: AuthorizationContext, projectId: string) {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);
    const result = await this.db
      .prepare(
        `SELECT role_id FROM project_role_links
         WHERE owner_id = ? AND project_id = ? AND approval_state = 'accepted' AND archived_at IS NULL`,
      )
      .bind(ctx.ownerId, projectId)
      .all<{ role_id: string }>();
    return safeRows(result).map((row) => row.role_id);
  }

  async getProjectSkillIds(ctx: AuthorizationContext, projectId: string) {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);
    const result = await this.db
      .prepare(
        `SELECT ps.skill_id FROM project_skills ps JOIN projects p ON p.id = ps.project_id
         WHERE p.owner_id = ? AND ps.project_id = ?`,
      )
      .bind(ctx.ownerId, projectId)
      .all<{ skill_id: string }>();
    return safeRows(result).map((row) => row.skill_id);
  }

  async getProjection(
    ownerId: string,
    options: {
      publicOnly: boolean;
      focusType?: CareerGraphNodeType | 'universe';
      focusId?: string | null;
      depth?: number;
    },
  ): Promise<CareerGraphProjection> {
    const publicOnly = options.publicOnly;
    const nodes = new Map<string, CareerGraphNode>();
    const edges = new Map<string, CareerGraphEdge>();
    const ownerFilter = publicOnly ? "owner_id = ? AND visibility = 'public'" : 'owner_id = ?';
    const bindOwner = <T>(statement: D1Statement) => statement.bind(ownerId).all<T>();

    const [profiles, roles, projects, skills, capabilities, evidence, content, artifacts] =
      await Promise.all([
        bindOwner<GraphRow>(
          this.db.prepare(
            `SELECT id, display_name AS label, headline AS subtitle, visibility, 'published' AS state
             FROM profiles WHERE ${ownerFilter} LIMIT 1`,
          ),
        ),
        bindOwner<GraphRow>(
          this.db.prepare(
            `SELECT id, name AS label, description AS subtitle, visibility, publication_state AS state, slug
             FROM career_roles WHERE ${ownerFilter} AND archived_at IS NULL
             ${publicOnly ? "AND publication_state = 'published'" : ''}`,
          ),
        ),
        bindOwner<GraphRow>(
          this.db.prepare(
            `SELECT id, title AS label, description AS subtitle, visibility, state, slug
             FROM projects WHERE ${ownerFilter} AND deleted_at IS NULL
             ${publicOnly ? "AND state = 'published'" : ''}`,
          ),
        ),
        bindOwner<GraphRow>(
          this.db.prepare(
            `SELECT id, name AS label, description AS subtitle, visibility, lifecycle_state AS state, slug
             FROM skills WHERE ${ownerFilter} AND archived_at IS NULL
             ${publicOnly ? "AND lifecycle_state = 'active'" : ''}`,
          ),
        ),
        bindOwner<GraphRow>(
          this.db.prepare(
            `SELECT id, title AS label, outcome_statement AS subtitle, visibility, state, slug
             FROM capabilities WHERE ${ownerFilter} AND archived_at IS NULL
             ${publicOnly ? "AND state = 'published'" : ''}`,
          ),
        ),
        bindOwner<GraphRow>(
          this.db.prepare(
            `SELECT id, title AS label, description AS subtitle, visibility, verification_state AS state
             FROM evidence_items WHERE ${ownerFilter} AND archived_at IS NULL
             ${publicOnly ? "AND verification_state IN ('owner_verified','source_verified','automatically_observed')" : ''}`,
          ),
        ),
        bindOwner<GraphRow>(
          this.db.prepare(
            `SELECT id, title AS label, summary AS subtitle, visibility, state, slug
             FROM content_items WHERE ${ownerFilter} AND deleted_at IS NULL AND archived_at IS NULL
             ${publicOnly ? "AND state = 'published'" : ''}`,
          ),
        ),
        bindOwner<GraphRow>(
          this.db.prepare(
            `SELECT id, title AS label, description AS subtitle, visibility, 'active' AS state
             FROM artifacts WHERE ${ownerFilter} AND deleted_at IS NULL`,
          ),
        ),
      ]);

    for (const row of safeRows(profiles)) addNode(nodes, 'identity', row, '/about');
    for (const row of safeRows(roles)) addNode(nodes, 'role', row, null);
    for (const row of safeRows(projects))
      addNode(
        nodes,
        'project',
        row,
        publicOnly
          ? row.slug
            ? `/projects/record?slug=${encodeURIComponent(row.slug)}`
            : null
          : `/dashboard/projects/record?id=${encodeURIComponent(row.id)}`,
      );
    for (const row of safeRows(skills))
      addNode(
        nodes,
        'skill',
        row,
        publicOnly && row.slug
          ? `/skills/record?slug=${encodeURIComponent(row.slug)}`
          : '/dashboard/skills',
      );
    for (const row of safeRows(capabilities))
      addNode(
        nodes,
        'capability',
        row,
        publicOnly && row.slug
          ? `/capabilities/record?slug=${encodeURIComponent(row.slug)}`
          : '/dashboard/capabilities',
      );
    for (const row of safeRows(evidence))
      addNode(
        nodes,
        'evidence',
        row,
        publicOnly
          ? `/evidence/record?id=${encodeURIComponent(row.id)}`
          : `/dashboard/evidence/record?id=${encodeURIComponent(row.id)}`,
      );
    for (const row of safeRows(content))
      addNode(
        nodes,
        'journey',
        row,
        publicOnly
          ? row.slug
            ? `/journey/record?slug=${encodeURIComponent(row.slug)}`
            : null
          : `/dashboard/journal/record/edit?id=${encodeURIComponent(row.id)}`,
      );
    for (const row of safeRows(artifacts))
      addNode(
        nodes,
        'artifact',
        row,
        publicOnly
          ? `/api/v1/public/artifacts/${encodeURIComponent(row.id)}/download`
          : '/dashboard/artifacts',
      );

    if (nodes.has(OWNER_NODE_ID)) {
      for (const role of safeRows(roles))
        addEdge(edges, {
          id: `identity-role:${role.id}`,
          source_id: OWNER_NODE_ID,
          target_id: nodeId('role', role.id),
          relationship_type: 'targets',
          relevance: 5,
          approval_state: 'accepted',
        });
    }

    const privateClause = 'AND r.owner_id = ?';
    const queryEdges = async (sql: string) => {
      const stmt = this.db.prepare(sql);
      return safeRows(await stmt.bind(ownerId).all<EdgeRow>());
    };
    const relationshipEdges = await Promise.all([
      queryEdges(
        `SELECT r.id, 'role:' || r.role_id AS source_id, 'project:' || r.project_id AS target_id,
          r.relationship_type, r.relevance, r.approval_state
         FROM project_role_links r WHERE r.archived_at IS NULL AND r.approval_state = 'accepted' ${privateClause}`,
      ),
      queryEdges(
        `SELECT 'project-skill:' || ps.project_id || ':' || ps.skill_id AS id,
          'project:' || ps.project_id AS source_id, 'skill:' || ps.skill_id AS target_id,
          'uses' AS relationship_type, 3 AS relevance, 'accepted' AS approval_state
         FROM project_skills ps JOIN projects p ON p.id = ps.project_id
         WHERE p.owner_id = ? ${publicOnly ? "AND p.visibility = 'public' AND p.state = 'published'" : ''}`,
      ),
      queryEdges(
        `SELECT r.id, 'skill:' || r.source_skill_id AS source_id, 'skill:' || r.target_skill_id AS target_id,
          r.relationship_type, r.relevance, r.approval_state
         FROM skill_relationships r WHERE r.archived_at IS NULL AND r.approval_state = 'accepted' ${privateClause}`,
      ),
      queryEdges(
        `SELECT r.id, 'skill:' || r.skill_id AS source_id, 'capability:' || r.capability_id AS target_id,
          r.relationship_type, r.relevance, r.approval_state
         FROM capability_skill_relationships r WHERE r.archived_at IS NULL AND r.approval_state = 'accepted' ${privateClause}`,
      ),
      queryEdges(
        `SELECT r.id, 'evidence:' || r.evidence_id AS source_id, 'skill:' || r.skill_id AS target_id,
          r.relationship_type, r.relevance, r.approval_state
         FROM evidence_skill_links r WHERE r.archived_at IS NULL AND r.approval_state = 'accepted' ${privateClause}`,
      ),
      queryEdges(
        `SELECT r.id, 'evidence:' || r.evidence_id AS source_id, 'capability:' || r.capability_id AS target_id,
          r.relationship_type, r.relevance, r.approval_state
         FROM evidence_capability_links r WHERE r.archived_at IS NULL AND r.approval_state = 'accepted' ${privateClause}`,
      ),
    ]);
    for (const group of relationshipEdges) for (const edge of group) addEdge(edges, edge);

    const evidenceLinks = await queryEdges(
      `SELECT el.id, 'evidence:' || el.evidence_item_id AS source_id,
        CASE
          WHEN el.project_id IS NOT NULL THEN 'project:' || el.project_id
          WHEN el.content_item_id IS NOT NULL THEN 'journey:' || el.content_item_id
          WHEN el.artifact_id IS NOT NULL THEN 'artifact:' || el.artifact_id
          WHEN el.capability_id IS NOT NULL THEN 'capability:' || el.capability_id
          ELSE 'evidence:' || el.evidence_item_id
        END AS target_id,
        el.support_type AS relationship_type, COALESCE(el.relevance, 3) AS relevance,
        CASE WHEN el.approval_state = 'approved' THEN 'accepted' ELSE el.approval_state END AS approval_state
       FROM evidence_links el JOIN evidence_items e ON e.id = el.evidence_item_id
       WHERE el.approval_state = 'approved' AND e.owner_id = ? ${publicOnly ? "AND e.visibility = 'public'" : ''}`,
    );
    for (const edge of evidenceLinks) addEdge(edges, edge);

    const projectRelationshipEdges = await queryEdges(
      `SELECT pr.id,
        CASE pr.source_type
          WHEN 'project' THEN 'project:' || pr.source_id
          WHEN 'skill' THEN 'skill:' || pr.source_id
          WHEN 'capability' THEN 'capability:' || pr.source_id
          WHEN 'evidence' THEN 'evidence:' || pr.source_id
          WHEN 'artifact' THEN 'artifact:' || pr.source_id
          WHEN 'journey' THEN 'journey:' || pr.source_id
          WHEN 'content_item' THEN 'journey:' || pr.source_id
          ELSE 'project:' || pr.source_id
        END AS source_id,
        CASE pr.target_type
          WHEN 'project' THEN 'project:' || pr.target_id
          WHEN 'skill' THEN 'skill:' || pr.target_id
          WHEN 'capability' THEN 'capability:' || pr.target_id
          WHEN 'evidence' THEN 'evidence:' || pr.target_id
          WHEN 'artifact' THEN 'artifact:' || pr.target_id
          WHEN 'journey' THEN 'journey:' || pr.target_id
          WHEN 'content_item' THEN 'journey:' || pr.target_id
          ELSE 'project:' || pr.target_id
        END AS target_id,
        pr.relationship_type, pr.relevance,
        CASE WHEN pr.approval_state = 'approved' THEN 'accepted' ELSE pr.approval_state END AS approval_state
       FROM project_relationships pr
       WHERE pr.archived_at IS NULL AND pr.approval_state = 'approved'
       AND pr.owner_id = ?`,
    );
    for (const edge of projectRelationshipEdges) addEdge(edges, edge);

    const engineeringSpecs: Array<{
      type: CareerGraphNodeType;
      table: string;
      title: string;
      publicState?: string;
    }> = [
      {
        type: 'adr',
        table: 'project_adrs',
        title: 'title',
        publicState: "AND state = 'published'",
      },
      {
        type: 'experiment',
        table: 'experiments',
        title: 'title',
        publicState: "AND state = 'published'",
      },
      {
        type: 'debugging_lesson',
        table: 'debugging_lessons',
        title: 'title',
        publicState: "AND state = 'published'",
      },
      { type: 'deployment', table: 'deployments', title: 'release_version', publicState: '' },
    ];
    for (const spec of engineeringSpecs) {
      const stmt = this.db.prepare(
        `SELECT record.id, record.${spec.title} AS label, NULL AS subtitle, record.visibility,
          'published' AS state, record.project_id
         FROM ${spec.table} record
         JOIN projects p ON p.id = record.project_id
         WHERE record.owner_id = ? ${publicOnly ? "AND record.visibility = 'public' AND p.visibility = 'public' AND p.state = 'published'" : ''}
         ${spec.table === 'deployments' ? '' : 'AND record.archived_at IS NULL'}
         ${publicOnly ? (spec.publicState ?? '').replace(/\bstate\b/g, 'record.state') : ''}`,
      );
      const rows = safeRows(await stmt.bind(ownerId).all<GraphRow>());
      for (const row of rows) {
        addNode(
          nodes,
          spec.type,
          row,
          null,
          row.project_id ? nodeId('project', row.project_id) : null,
        );
        if (row.project_id)
          addEdge(edges, {
            id: `${spec.type}-project:${row.id}`,
            source_id: nodeId('project', row.project_id),
            target_id: nodeId(spec.type, row.id),
            relationship_type: 'contains',
            relevance: 3,
            approval_state: 'accepted',
          });
      }
    }

    const contentRevisionRows = safeRows(
      await this.db
        .prepare(
          `SELECT ci.id, cr.body_snapshot FROM content_items ci
           JOIN content_revisions cr ON cr.id = (
             SELECT cr2.id FROM content_revisions cr2 WHERE cr2.content_item_id = ci.id
             ORDER BY cr2.revision_no DESC LIMIT 1)
           WHERE ci.owner_id = ? AND ci.deleted_at IS NULL
           ${publicOnly ? "AND ci.visibility = 'public' AND ci.state = 'published'" : ''}`,
        )
        .bind(ownerId)
        .all<{ id: string; body_snapshot: string }>(),
    );
    for (const row of contentRevisionRows) {
      let blocks: Array<Record<string, unknown>> = [];
      try {
        const parsed = JSON.parse(row.body_snapshot);
        if (Array.isArray(parsed)) blocks = parsed;
      } catch {
        blocks = [];
      }
      for (const block of blocks) {
        if (block.type !== 'relationship_tag') continue;
        const entityType = String(block.entityType);
        const entityId = String(block.entityId);
        const mappedType = entityType === 'content_item' ? 'journey' : entityType;
        if (!['skill', 'capability', 'project', 'evidence', 'journey'].includes(mappedType))
          continue;
        addEdge(edges, {
          id: `journey-tag:${row.id}:${mappedType}:${entityId}`,
          source_id: nodeId('journey', row.id),
          target_id: nodeId(mappedType as CareerGraphNodeType, entityId),
          relationship_type: 'documents',
          relevance: 3,
          approval_state: 'accepted',
        });
      }
    }

    return buildBoundedCareerProjection(
      nodes,
      edges,
      options.focusType ?? 'universe',
      options.focusId ?? null,
      options.depth ?? 2,
    );
  }
}
