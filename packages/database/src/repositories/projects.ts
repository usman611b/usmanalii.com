/**
 * D1 Database Repository for Projects and Case Studies.
 */

import { compileJsonBlocksToMarkdown } from '@usmanalii/content';
import {
  type ProjectEntity,
  type ProjectRevisionEntity,
  type Visibility,
  type PublicationState,
  type ProjectLifecycleState,
  type EntityId,
  type ISODateTime,
} from '@usmanalii/domain';

function parseCanonicalRevisionBody(body: string): unknown[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error('MALFORMED_CANONICAL_BODY');
  }
  if (!Array.isArray(parsed) || parsed.length > 500) throw new Error('INVALID_CANONICAL_BODY');
  const supported = new Set([
    'heading',
    'paragraph',
    'code_block',
    'callout',
    'image',
    'embed_artifact',
    'quote',
    'list',
    'relationship_tag',
  ]);
  if (
    parsed.some(
      (block) =>
        !block ||
        typeof block !== 'object' ||
        !supported.has(String((block as { type?: unknown }).type)),
    )
  ) {
    throw new Error('UNSUPPORTED_CANONICAL_BLOCK');
  }
  return parsed;
}

export interface CreateProjectInput {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  shortSummary?: string | null;
  detailedContext?: string | null;
  problemStatement?: string | null;
  goals?: readonly string[];
  nonGoals?: readonly string[];
  constraints?: readonly string[];
  role?: string | null;
  contributionStatement?: string | null;
  collaborationContext?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  ongoingStatus?: boolean;
  lifecycleState?: ProjectLifecycleState;
  publicationState?: PublicationState;
  visibility?: Visibility;
  scheduledFor?: string | null;
  embargoUntil?: string | null;
  isFeatured?: boolean;
  recruiterSummary?: string | null;
  deepDiveContent?: string | null;
  repositoryReferences?: readonly string[];
  liveDemoReferences?: readonly string[];
  heroArtifactId?: string | null;
  caseStudyBody?: string | null;
  provenance?: string | null;
}

export interface UpdateProjectInput {
  title?: string;
  slug?: string;
  shortSummary?: string | null;
  detailedContext?: string | null;
  problemStatement?: string | null;
  goals?: readonly string[];
  nonGoals?: readonly string[];
  constraints?: readonly string[];
  role?: string | null;
  contributionStatement?: string | null;
  collaborationContext?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  ongoingStatus?: boolean;
  lifecycleState?: ProjectLifecycleState;
  publicationState?: PublicationState;
  visibility?: Visibility;
  scheduledFor?: string | null;
  embargoUntil?: string | null;
  isFeatured?: boolean;
  recruiterSummary?: string | null;
  deepDiveContent?: string | null;
  repositoryReferences?: readonly string[];
  liveDemoReferences?: readonly string[];
  heroArtifactId?: string | null;
  caseStudyBody?: string | null;
  expectedVersionNo?: number;
}

interface D1Database {
  prepare(sql: string): {
    bind(...params: unknown[]): {
      first<T>(): Promise<T | null>;
      all<T>(): Promise<{ results?: T[] }>;
      run(): Promise<{ meta?: { changes?: number } }>;
    };
  };
}

function mapRowToProject(row: Record<string, unknown>): ProjectEntity {
  return {
    id: row.id as EntityId,
    ownerId: row.owner_id as EntityId,
    title: row.title as string,
    slug: row.slug as string,
    shortSummary: (row.description as string) || (row.short_summary as string) || null,
    detailedContext: (row.detailed_context as string) || null,
    problemStatement: (row.problem_statement as string) || null,
    goals: row.goals ? JSON.parse(row.goals as string) : [],
    nonGoals: row.non_goals ? JSON.parse(row.non_goals as string) : [],
    constraints: row.constraints ? JSON.parse(row.constraints as string) : [],
    role: (row.role_description as string) || (row.role as string) || null,
    contributionStatement: (row.contribution_statement as string) || null,
    collaborationContext: (row.collaboration_context as string) || null,
    startDate: (row.started_at as string) || (row.start_date as string) || null,
    endDate: (row.completed_at as string) || (row.end_date as string) || null,
    ongoingStatus: Boolean(row.ongoing_status || (row.status === 'active' && !row.completed_at)),
    lifecycleState: (row.status || row.lifecycle_state || 'active') as ProjectLifecycleState,
    publicationState: (row.state || row.publication_state || 'draft') as PublicationState,
    visibility: (row.visibility || 'private') as Visibility,
    scheduledFor: (row.scheduled_for as ISODateTime) || null,
    embargoUntil: (row.embargo_until as ISODateTime) || null,
    isFeatured: Boolean(row.is_featured),
    recruiterSummary: (row.recruiter_summary as string) || null,
    deepDiveContent: (row.deep_dive_content as string) || null,
    repositoryReferences: row.repository_url
      ? [row.repository_url as string]
      : row.repository_references
        ? JSON.parse(row.repository_references as string)
        : [],
    liveDemoReferences: row.demo_url
      ? [row.demo_url as string]
      : row.live_demo_references
        ? JSON.parse(row.live_demo_references as string)
        : [],
    heroArtifactId: (row.hero_artifact_id as EntityId) || null,
    caseStudyBody: (row.case_study_body as string) || null,
    caseStudyFormat: (row.case_study_format as string) || 'json_blocks',
    caseStudySchemaVersion: Number(row.case_study_schema_version || 1),
    editorialWarnings: row.editorial_warnings ? JSON.parse(row.editorial_warnings as string) : [],
    provenance: (row.provenance as string) || null,
    createdAt: row.created_at as ISODateTime,
    updatedAt: row.updated_at as ISODateTime,
    archivedAt: (row.archived_at as ISODateTime) || null,
    deletedAt: (row.deleted_at as ISODateTime) || null,
    versionNo: Number(row.version_no || 1),
  };
}

export class D1ProjectRepository {
  constructor(private readonly db: D1Database) {}

  async createProject(input: CreateProjectInput): Promise<ProjectEntity> {
    const now = new Date().toISOString();
    const goalsJson = JSON.stringify(input.goals || []);
    const nonGoalsJson = JSON.stringify(input.nonGoals || []);
    const constraintsJson = JSON.stringify(input.constraints || []);
    const repoRefsJson = JSON.stringify(input.repositoryReferences || []);
    const demoRefsJson = JSON.stringify(input.liveDemoReferences || []);

    const sql = `
      INSERT INTO projects (
        id, owner_id, title, slug, description, status, visibility, state,
        detailed_context, started_at, completed_at, role_description, is_collaboration,
        problem_statement, goals, non_goals, constraints, contribution_statement,
        collaboration_context, recruiter_summary, deep_dive_content, repository_references,
        live_demo_references, hero_artifact_id, case_study_body, case_study_format,
        case_study_schema_version, scheduled_for, embargo_until, is_featured, provenance,
        created_at, updated_at, version_no
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, 'json_blocks', 1,
        ?, ?, ?, ?,
        ?, ?, 1
      )
    `;

    await this.db
      .prepare(sql)
      .bind(
        input.id,
        input.ownerId,
        input.title,
        input.slug,
        input.shortSummary || null,
        input.lifecycleState || 'active',
        input.visibility || 'private',
        input.publicationState || 'draft',
        input.detailedContext || null,
        input.startDate || null,
        input.endDate || null,
        input.role || null,
        input.collaborationContext ? 1 : 0,
        input.problemStatement || null,
        goalsJson,
        nonGoalsJson,
        constraintsJson,
        input.contributionStatement || null,
        input.collaborationContext || null,
        input.recruiterSummary || null,
        input.deepDiveContent || null,
        repoRefsJson,
        demoRefsJson,
        input.heroArtifactId || null,
        input.caseStudyBody || null,
        input.scheduledFor || null,
        input.embargoUntil || null,
        input.isFeatured ? 1 : 0,
        input.provenance || '{}',
        now,
        now,
      )
      .run();

    return this.getProjectById(input.ownerId, input.id) as Promise<ProjectEntity>;
  }

  async getProjectById(ownerId: string, projectId: string): Promise<ProjectEntity | null> {
    const row = await this.db
      .prepare('SELECT * FROM projects WHERE owner_id = ? AND id = ? AND deleted_at IS NULL')
      .bind(ownerId, projectId)
      .first<Record<string, unknown>>();

    return row ? mapRowToProject(row) : null;
  }

  async getProjectBySlug(ownerId: string, slug: string): Promise<ProjectEntity | null> {
    const row = await this.db
      .prepare('SELECT * FROM projects WHERE owner_id = ? AND slug = ? AND deleted_at IS NULL')
      .bind(ownerId, slug)
      .first<Record<string, unknown>>();

    return row ? mapRowToProject(row) : null;
  }

  async updateProject(
    ownerId: string,
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<ProjectEntity> {
    const current = await this.getProjectById(ownerId, projectId);
    if (!current) throw new Error(`PROJECT_NOT_FOUND: ${projectId}`);

    if (input.expectedVersionNo && current.versionNo !== input.expectedVersionNo) {
      throw new Error(
        `CONCURRENCY_CONFLICT: Current version ${current.versionNo} !== expected ${input.expectedVersionNo}`,
      );
    }

    const now = new Date().toISOString();
    const newVersion = current.versionNo + 1;

    const sql = `
      UPDATE projects SET
        title = COALESCE(?, title),
        slug = COALESCE(?, slug),
        description = COALESCE(?, description),
        detailed_context = COALESCE(?, detailed_context),
        status = COALESCE(?, status),
        visibility = COALESCE(?, visibility),
        state = COALESCE(?, state),
        started_at = COALESCE(?, started_at),
        completed_at = COALESCE(?, completed_at),
        role_description = COALESCE(?, role_description),
        problem_statement = COALESCE(?, problem_statement),
        goals = COALESCE(?, goals),
        non_goals = COALESCE(?, non_goals),
        constraints = COALESCE(?, constraints),
        contribution_statement = COALESCE(?, contribution_statement),
        collaboration_context = COALESCE(?, collaboration_context),
        recruiter_summary = COALESCE(?, recruiter_summary),
        deep_dive_content = COALESCE(?, deep_dive_content),
        repository_references = COALESCE(?, repository_references),
        live_demo_references = COALESCE(?, live_demo_references),
        hero_artifact_id = COALESCE(?, hero_artifact_id),
        case_study_body = COALESCE(?, case_study_body),
        scheduled_for = COALESCE(?, scheduled_for),
        embargo_until = COALESCE(?, embargo_until),
        is_featured = COALESCE(?, is_featured),
        updated_at = ?,
        version_no = ?
      WHERE owner_id = ? AND id = ? AND version_no = ?
    `;

    const res = await this.db
      .prepare(sql)
      .bind(
        input.title || null,
        input.slug || null,
        input.shortSummary || null,
        input.detailedContext || null,
        input.lifecycleState || null,
        input.visibility || null,
        input.publicationState || null,
        input.startDate || null,
        input.endDate || null,
        input.role || null,
        input.problemStatement || null,
        input.goals ? JSON.stringify(input.goals) : null,
        input.nonGoals ? JSON.stringify(input.nonGoals) : null,
        input.constraints ? JSON.stringify(input.constraints) : null,
        input.contributionStatement || null,
        input.collaborationContext || null,
        input.recruiterSummary || null,
        input.deepDiveContent || null,
        input.repositoryReferences ? JSON.stringify(input.repositoryReferences) : null,
        input.liveDemoReferences ? JSON.stringify(input.liveDemoReferences) : null,
        input.heroArtifactId || null,
        input.caseStudyBody || null,
        input.scheduledFor || null,
        input.embargoUntil || null,
        input.isFeatured !== undefined ? (input.isFeatured ? 1 : 0) : null,
        now,
        newVersion,
        ownerId,
        projectId,
        current.versionNo,
      )
      .run();

    if (res.meta?.changes === 0) {
      throw new Error(`UPDATE_FAILED: Concurrency conflict or project missing`);
    }

    return this.getProjectById(ownerId, projectId) as Promise<ProjectEntity>;
  }

  async createRevisionSnapshot(
    ownerId: string,
    projectId: string,
    snapshotBody: string,
    note?: string,
  ): Promise<ProjectRevisionEntity> {
    const project = await this.getProjectById(ownerId, projectId);
    if (!project) throw new Error(`PROJECT_NOT_FOUND: ${projectId}`);

    const now = new Date().toISOString();
    const revNo = project.versionNo;
    const revId = `proj-rev-${projectId}-${revNo}-${Date.now()}`;

    // ADR-005: JSON blocks are authoritative. Markdown may be imported, but
    // is converted before persistence and never becomes authoritative content.
    const jsonBlocks = parseCanonicalRevisionBody(snapshotBody);

    const canonicalBodyJson = JSON.stringify(jsonBlocks);
    const markdownExport = compileJsonBlocksToMarkdown(
      {
        id: project.id,
        title: project.title,
        slug: project.slug,
        contentType: 'deep_dive',
        visibility: project.visibility,
        state: project.publicationState,
        versionNo: revNo,
      },
      jsonBlocks as unknown as Parameters<typeof compileJsonBlocksToMarkdown>[1],
    );

    const sql = `
      INSERT INTO project_revisions (
        id, project_id, owner_id, revision_no, case_study_snapshot, canonical_body_json, body_format,
        body_schema_version, markdown_export, redaction_metadata, revision_note, created_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, 'json_blocks', 1, ?, '[]', ?, ?, ?)
    `;

    await this.db
      .prepare(sql)
      .bind(
        revId,
        projectId,
        ownerId,
        revNo,
        canonicalBodyJson,
        canonicalBodyJson,
        markdownExport,
        note || null,
        now,
        ownerId,
      )
      .run();

    return {
      id: revId as EntityId,
      projectId: projectId as EntityId,
      ownerId: ownerId as EntityId,
      revisionNo: revNo,
      caseStudySnapshot: canonicalBodyJson,
      bodyFormat: 'json_blocks',
      bodySchemaVersion: 1,
      markdownExport,
      redactionMetadata: [],
      revisionNote: note || null,
      createdAt: now as ISODateTime,
      createdBy: ownerId,
    };
  }

  async rollbackToRevision(
    ownerId: string,
    projectId: string,
    targetRevisionNo: number,
  ): Promise<ProjectEntity> {
    const revisions = await this.listRevisions(ownerId, projectId);
    const targetRev = revisions.find((r) => r.revisionNo === targetRevisionNo);
    if (!targetRev) {
      throw new Error(
        `REVISION_NOT_FOUND: Revision ${targetRevisionNo} does not exist for project ${projectId}`,
      );
    }

    const current = await this.getProjectById(ownerId, projectId);
    if (!current) throw new Error(`PROJECT_NOT_FOUND: ${projectId}`);

    // Update project caseStudyBody
    const updated = await this.updateProject(ownerId, projectId, {
      caseStudyBody: targetRev.caseStudySnapshot,
      expectedVersionNo: current.versionNo,
    });

    // Append new revision record for rollback
    await this.createRevisionSnapshot(
      ownerId,
      projectId,
      targetRev.caseStudySnapshot,
      `Rollback to revision ${targetRevisionNo}`,
    );

    return updated;
  }

  async listRevisions(
    ownerId: string,
    projectId: string,
  ): Promise<readonly ProjectRevisionEntity[]> {
    const res = await this.db
      .prepare(
        'SELECT * FROM project_revisions WHERE owner_id = ? AND project_id = ? ORDER BY revision_no DESC',
      )
      .bind(ownerId, projectId)
      .all<Record<string, unknown>>();

    return (res.results || []).map((r: Record<string, unknown>) => ({
      id: r.id as EntityId,
      projectId: r.project_id as EntityId,
      ownerId: r.owner_id as EntityId,
      revisionNo: Number(r.revision_no),
      caseStudySnapshot: (r.canonical_body_json || r.case_study_snapshot) as string,
      bodyFormat: (r.body_format as string) || 'json_blocks',
      bodySchemaVersion: Number(r.body_schema_version || 1),
      markdownExport: (r.markdown_export as string) || null,
      redactionMetadata: r.redaction_metadata ? JSON.parse(r.redaction_metadata as string) : [],
      revisionNote: (r.revision_note as string) || null,
      createdAt: r.created_at as ISODateTime,
      createdBy: r.created_by as string,
    }));
  }

  async listProjects(
    ownerId: string,
    options?: { visibility?: Visibility; publicationState?: PublicationState; limit?: number },
  ): Promise<readonly ProjectEntity[]> {
    let sql = 'SELECT * FROM projects WHERE owner_id = ? AND deleted_at IS NULL';
    const params: unknown[] = [ownerId];

    if (options?.visibility) {
      sql += ' AND visibility = ?';
      params.push(options.visibility);
    }
    if (options?.publicationState) {
      sql += ' AND state = ?';
      params.push(options.publicationState);
    }
    sql += ' ORDER BY created_at DESC';
    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const res = await this.db
      .prepare(sql)
      .bind(...params)
      .all<Record<string, unknown>>();
    return (res.results || []).map(mapRowToProject);
  }
}
