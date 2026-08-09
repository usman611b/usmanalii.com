/**
 * D1 Database Repository for Engineering Records:
 * Contributions, Experiments, ADRs, Debugging Lessons, Deployments, Versions.
 */

import {
  type ProjectContributionEntity,
  type ProjectContributionType,
  type ExperimentEntity,
  type ExperimentStatus,
  type ProjectAdrEntity,
  type ProjectAdrStatus,
  type DebuggingLessonEntity,
  type DeploymentEntity,
  type DeploymentEnvironment,
  type DeploymentStatus,
  type ProjectVersionEntity,
  type ProjectVersionStatus,
  type Visibility,
  type PublicationState,
  type EvidenceVerificationState,
  type EntityId,
  type ISODateTime,
  sanitizeEngineeringTextWithMetadata,
} from '@usmanalii/domain';

interface D1Database {
  prepare(sql: string): {
    bind(...params: unknown[]): {
      first<T>(): Promise<T | null>;
      all<T>(): Promise<{ results?: T[] }>;
      run(): Promise<{ meta?: { changes?: number } }>;
    };
  };
}

export function sanitizeEngineeringText(text: string): string {
  return sanitizeEngineeringTextWithMetadata(text).sanitizedText;
}

export class D1EngineeringRecordRepository {
  constructor(private readonly db: D1Database) {}

  // ---------------------------------------------------------------------------
  // Project Contributions
  // ---------------------------------------------------------------------------
  async createContribution(input: {
    id: string;
    projectId: string;
    ownerId: string;
    contributionType: ProjectContributionType;
    description: string;
    scope?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    collaborationContext?: string | null;
    supportingEvidenceIds?: readonly string[];
    verificationState?: EvidenceVerificationState;
    visibility?: Visibility;
    ownerApproval?: boolean;
    provenance?: string | null;
  }): Promise<ProjectContributionEntity> {
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO project_contributions (
        id, project_id, owner_id, contribution_type, description, scope,
        start_date, end_date, collaboration_context, supporting_evidence_ids,
        verification_state, visibility, owner_approval, provenance, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db
      .prepare(sql)
      .bind(
        input.id,
        input.projectId,
        input.ownerId,
        input.contributionType,
        sanitizeEngineeringText(input.description),
        input.scope ? sanitizeEngineeringText(input.scope) : null,
        input.startDate || null,
        input.endDate || null,
        input.collaborationContext ? sanitizeEngineeringText(input.collaborationContext) : null,
        JSON.stringify(input.supportingEvidenceIds || []),
        input.verificationState || 'unverified',
        input.visibility || 'private',
        input.ownerApproval ? 1 : 0,
        input.provenance || '{}',
        now,
        now,
      )
      .run();

    return {
      id: input.id as EntityId,
      projectId: input.projectId as EntityId,
      ownerId: input.ownerId as EntityId,
      contributionType: input.contributionType,
      description: input.description,
      scope: input.scope || null,
      startDate: input.startDate || null,
      endDate: input.endDate || null,
      collaborationContext: input.collaborationContext || null,
      supportingEvidenceIds: (input.supportingEvidenceIds || []) as readonly EntityId[],
      verificationState: input.verificationState || 'unverified',
      visibility: input.visibility || 'private',
      ownerApproval: Boolean(input.ownerApproval),
      provenance: input.provenance || null,
      createdAt: now as ISODateTime,
      updatedAt: now as ISODateTime,
      deletedAt: null,
    };
  }

  async listContributions(
    ownerId: string,
    projectId: string,
  ): Promise<readonly ProjectContributionEntity[]> {
    const res = await this.db
      .prepare(
        'SELECT * FROM project_contributions WHERE owner_id = ? AND project_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
      )
      .bind(ownerId, projectId)
      .all<Record<string, unknown>>();

    return (res.results || []).map((r: Record<string, unknown>) => ({
      id: r.id as EntityId,
      projectId: r.project_id as EntityId,
      ownerId: r.owner_id as EntityId,
      contributionType: r.contribution_type as ProjectContributionType,
      description: r.description as string,
      scope: (r.scope as string) || null,
      startDate: (r.start_date as string) || null,
      endDate: (r.end_date as string) || null,
      collaborationContext: (r.collaboration_context as string) || null,
      supportingEvidenceIds: JSON.parse((r.supporting_evidence_ids as string) || '[]'),
      verificationState: r.verification_state as EvidenceVerificationState,
      visibility: r.visibility as Visibility,
      ownerApproval: Boolean(r.owner_approval),
      provenance: (r.provenance as string) || null,
      createdAt: r.created_at as ISODateTime,
      updatedAt: r.updated_at as ISODateTime,
      deletedAt: (r.deleted_at as ISODateTime) || null,
    }));
  }

  // ---------------------------------------------------------------------------
  // Experiments
  // ---------------------------------------------------------------------------
  async createExperiment(input: {
    id: string;
    projectId: string;
    ownerId: string;
    title: string;
    slug: string;
    hypothesis: string;
    motivation?: string | null;
    methodology: string;
    variables?: readonly string[];
    inputs?: string | null;
    results?: string | null;
    conclusion?: string | null;
    limitations?: string | null;
    status?: ExperimentStatus;
    dates?: string | null;
    supportingEvidenceIds?: readonly string[];
    artifactIds?: readonly string[];
    visibility?: Visibility;
    state?: PublicationState;
  }): Promise<ExperimentEntity> {
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO experiments (
        id, project_id, owner_id, title, slug, hypothesis, motivation,
        methodology, variables, inputs, results, conclusion, limitations,
        status, dates, supporting_evidence_ids, artifact_ids, visibility, state,
        created_at, updated_at, version_no
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;

    await this.db
      .prepare(sql)
      .bind(
        input.id,
        input.projectId,
        input.ownerId,
        input.title,
        input.slug,
        sanitizeEngineeringText(input.hypothesis),
        input.motivation ? sanitizeEngineeringText(input.motivation) : null,
        sanitizeEngineeringText(input.methodology),
        JSON.stringify(input.variables || []),
        input.inputs ? sanitizeEngineeringText(input.inputs) : null,
        input.results ? sanitizeEngineeringText(input.results) : null,
        input.conclusion ? sanitizeEngineeringText(input.conclusion) : null,
        input.limitations ? sanitizeEngineeringText(input.limitations) : null,
        input.status || 'planned',
        input.dates || null,
        JSON.stringify(input.supportingEvidenceIds || []),
        JSON.stringify(input.artifactIds || []),
        input.visibility || 'private',
        input.state || 'draft',
        now,
        now,
      )
      .run();

    return {
      id: input.id as EntityId,
      projectId: input.projectId as EntityId,
      ownerId: input.ownerId as EntityId,
      title: input.title,
      slug: input.slug,
      hypothesis: input.hypothesis,
      motivation: input.motivation || null,
      methodology: input.methodology,
      variables: input.variables || [],
      inputs: input.inputs || null,
      results: input.results || null,
      conclusion: input.conclusion || null,
      limitations: input.limitations || null,
      status: input.status || 'planned',
      dates: input.dates || null,
      supportingEvidenceIds: (input.supportingEvidenceIds || []) as readonly EntityId[],
      artifactIds: (input.artifactIds || []) as readonly EntityId[],
      visibility: input.visibility || 'private',
      state: input.state || 'draft',
      provenance: null,
      createdAt: now as ISODateTime,
      updatedAt: now as ISODateTime,
      archivedAt: null,
      deletedAt: null,
      versionNo: 1,
    };
  }

  async listExperiments(ownerId: string, projectId: string): Promise<readonly ExperimentEntity[]> {
    const res = await this.db
      .prepare(
        'SELECT * FROM experiments WHERE owner_id = ? AND project_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
      )
      .bind(ownerId, projectId)
      .all<Record<string, unknown>>();

    return (res.results || []).map((r: Record<string, unknown>) => ({
      id: r.id as EntityId,
      projectId: r.project_id as EntityId,
      ownerId: r.owner_id as EntityId,
      title: r.title as string,
      slug: r.slug as string,
      hypothesis: r.hypothesis as string,
      motivation: (r.motivation as string) || null,
      methodology: r.methodology as string,
      variables: JSON.parse((r.variables as string) || '[]'),
      inputs: (r.inputs as string) || null,
      results: (r.results as string) || null,
      conclusion: (r.conclusion as string) || null,
      limitations: (r.limitations as string) || null,
      status: r.status as ExperimentStatus,
      dates: (r.dates as string) || null,
      supportingEvidenceIds: JSON.parse((r.supporting_evidence_ids as string) || '[]'),
      artifactIds: JSON.parse((r.artifact_ids as string) || '[]'),
      visibility: r.visibility as Visibility,
      state: r.state as PublicationState,
      provenance: (r.provenance as string) || null,
      createdAt: r.created_at as ISODateTime,
      updatedAt: r.updated_at as ISODateTime,
      archivedAt: (r.archived_at as ISODateTime) || null,
      deletedAt: (r.deleted_at as ISODateTime) || null,
      versionNo: Number(r.version_no || 1),
    }));
  }

  // ---------------------------------------------------------------------------
  // ADRs (Architecture Decision Records)
  // ---------------------------------------------------------------------------
  async createAdr(input: {
    id: string;
    projectId: string;
    ownerId: string;
    adrNumber: number;
    title: string;
    slug: string;
    context: string;
    decision: string;
    consequences: string;
    alternativesConsidered?: readonly string[];
    rationale?: string | null;
    tradeOffs?: string | null;
    status?: ProjectAdrStatus;
    supersededBy?: string | null;
    decisionDate?: string | null;
    supportingEvidenceIds?: readonly string[];
    visibility?: Visibility;
    state?: PublicationState;
  }): Promise<ProjectAdrEntity> {
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO project_adrs (
        id, project_id, owner_id, adr_number, title, slug, context, decision,
        consequences, alternatives_considered, rationale, trade_offs, status,
        superseded_by, decision_date, supporting_evidence_ids, visibility, state,
        created_at, updated_at, version_no
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;

    await this.db
      .prepare(sql)
      .bind(
        input.id,
        input.projectId,
        input.ownerId,
        input.adrNumber,
        input.title,
        input.slug,
        sanitizeEngineeringText(input.context),
        sanitizeEngineeringText(input.decision),
        sanitizeEngineeringText(input.consequences),
        JSON.stringify(input.alternativesConsidered || []),
        input.rationale ? sanitizeEngineeringText(input.rationale) : null,
        input.tradeOffs ? sanitizeEngineeringText(input.tradeOffs) : null,
        input.status || 'proposed',
        input.supersededBy || null,
        input.decisionDate || null,
        JSON.stringify(input.supportingEvidenceIds || []),
        input.visibility || 'private',
        input.state || 'draft',
        now,
        now,
      )
      .run();

    return {
      id: input.id as EntityId,
      projectId: input.projectId as EntityId,
      ownerId: input.ownerId as EntityId,
      adrNumber: input.adrNumber,
      title: input.title,
      slug: input.slug,
      status: input.status || 'proposed',
      context: input.context,
      alternativesConsidered: input.alternativesConsidered || [],
      decision: input.decision,
      rationale: input.rationale || null,
      consequences: input.consequences,
      tradeOffs: input.tradeOffs || null,
      relatedAdrIds: [],
      supersededBy: (input.supersededBy || null) as EntityId | null,
      decisionDate: input.decisionDate || null,
      supportingEvidenceIds: (input.supportingEvidenceIds || []) as readonly EntityId[],
      visibility: input.visibility || 'private',
      state: input.state || 'draft',
      provenance: null,
      createdAt: now as ISODateTime,
      updatedAt: now as ISODateTime,
      archivedAt: null,
      deletedAt: null,
      versionNo: 1,
    };
  }

  async listAdrs(ownerId: string, projectId: string): Promise<readonly ProjectAdrEntity[]> {
    const res = await this.db
      .prepare(
        'SELECT * FROM project_adrs WHERE owner_id = ? AND project_id = ? AND deleted_at IS NULL ORDER BY adr_number ASC',
      )
      .bind(ownerId, projectId)
      .all<Record<string, unknown>>();

    return (res.results || []).map((r: Record<string, unknown>) => ({
      id: r.id as EntityId,
      projectId: r.project_id as EntityId,
      ownerId: r.owner_id as EntityId,
      adrNumber: Number(r.adr_number),
      title: r.title as string,
      slug: r.slug as string,
      status: r.status as ProjectAdrStatus,
      context: r.context as string,
      alternativesConsidered: JSON.parse((r.alternatives_considered as string) || '[]'),
      decision: r.decision as string,
      rationale: (r.rationale as string) || null,
      consequences: r.consequences as string,
      tradeOffs: (r.trade_offs as string) || null,
      relatedAdrIds: JSON.parse((r.related_adr_ids as string) || '[]'),
      supersededBy: (r.superseded_by as EntityId) || null,
      decisionDate: (r.decision_date as string) || null,
      supportingEvidenceIds: JSON.parse((r.supporting_evidence_ids as string) || '[]'),
      visibility: r.visibility as Visibility,
      state: r.state as PublicationState,
      provenance: (r.provenance as string) || null,
      createdAt: r.created_at as ISODateTime,
      updatedAt: r.updated_at as ISODateTime,
      archivedAt: (r.archived_at as ISODateTime) || null,
      deletedAt: (r.deleted_at as ISODateTime) || null,
      versionNo: Number(r.version_no || 1),
    }));
  }

  // ---------------------------------------------------------------------------
  // Debugging Lessons
  // ---------------------------------------------------------------------------
  async createDebuggingLesson(input: {
    id: string;
    projectId: string;
    ownerId: string;
    title: string;
    slug: string;
    symptom: string;
    impact?: string | null;
    environment?: string | null;
    investigation?: string | null;
    rootCause: string;
    resolution: string;
    prevention: string;
    lessonsLearned?: string | null;
    relevantDates?: string | null;
    tags?: readonly string[];
    supportingEvidenceIds?: readonly string[];
    artifactIds?: readonly string[];
    visibility?: Visibility;
    state?: PublicationState;
  }): Promise<DebuggingLessonEntity> {
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO debugging_lessons (
        id, project_id, owner_id, title, slug, symptom, impact, environment,
        investigation, root_cause, resolution, prevention, lessons_learned,
        relevant_dates, tags, supporting_evidence_ids, artifact_ids, visibility, state,
        created_at, updated_at, version_no
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;

    await this.db
      .prepare(sql)
      .bind(
        input.id,
        input.projectId,
        input.ownerId,
        input.title,
        input.slug,
        sanitizeEngineeringText(input.symptom),
        input.impact ? sanitizeEngineeringText(input.impact) : null,
        input.environment ? sanitizeEngineeringText(input.environment) : null,
        input.investigation ? sanitizeEngineeringText(input.investigation) : null,
        sanitizeEngineeringText(input.rootCause),
        sanitizeEngineeringText(input.resolution),
        sanitizeEngineeringText(input.prevention),
        input.lessonsLearned ? sanitizeEngineeringText(input.lessonsLearned) : null,
        input.relevantDates || null,
        JSON.stringify(input.tags || []),
        JSON.stringify(input.supportingEvidenceIds || []),
        JSON.stringify(input.artifactIds || []),
        input.visibility || 'private',
        input.state || 'draft',
        now,
        now,
      )
      .run();

    return {
      id: input.id as EntityId,
      projectId: input.projectId as EntityId,
      ownerId: input.ownerId as EntityId,
      title: input.title,
      slug: input.slug,
      symptom: input.symptom,
      impact: input.impact || null,
      environment: input.environment || null,
      investigation: input.investigation || null,
      rootCause: input.rootCause,
      resolution: input.resolution,
      prevention: input.prevention,
      lessonsLearned: input.lessonsLearned || null,
      relevantDates: input.relevantDates || null,
      tags: input.tags || [],
      supportingEvidenceIds: (input.supportingEvidenceIds || []) as readonly EntityId[],
      artifactIds: (input.artifactIds || []) as readonly EntityId[],
      visibility: input.visibility || 'private',
      state: input.state || 'draft',
      provenance: null,
      createdAt: now as ISODateTime,
      updatedAt: now as ISODateTime,
      archivedAt: null,
      deletedAt: null,
      versionNo: 1,
    };
  }

  async listDebuggingLessons(
    ownerId: string,
    projectId: string,
  ): Promise<readonly DebuggingLessonEntity[]> {
    const res = await this.db
      .prepare(
        'SELECT * FROM debugging_lessons WHERE owner_id = ? AND project_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
      )
      .bind(ownerId, projectId)
      .all<Record<string, unknown>>();

    return (res.results || []).map((r: Record<string, unknown>) => ({
      id: r.id as EntityId,
      projectId: r.project_id as EntityId,
      ownerId: r.owner_id as EntityId,
      title: r.title as string,
      slug: r.slug as string,
      symptom: r.symptom as string,
      impact: (r.impact as string) || null,
      environment: (r.environment as string) || null,
      investigation: (r.investigation as string) || null,
      rootCause: r.root_cause as string,
      resolution: r.resolution as string,
      prevention: r.prevention as string,
      lessonsLearned: (r.lessons_learned as string) || null,
      relevantDates: (r.relevant_dates as string) || null,
      tags: JSON.parse((r.tags as string) || '[]'),
      supportingEvidenceIds: JSON.parse((r.supporting_evidence_ids as string) || '[]'),
      artifactIds: JSON.parse((r.artifact_ids as string) || '[]'),
      visibility: r.visibility as Visibility,
      state: r.state as PublicationState,
      provenance: (r.provenance as string) || null,
      createdAt: r.created_at as ISODateTime,
      updatedAt: r.updated_at as ISODateTime,
      archivedAt: (r.archived_at as ISODateTime) || null,
      deletedAt: (r.deleted_at as ISODateTime) || null,
      versionNo: Number(r.version_no || 1),
    }));
  }

  // ---------------------------------------------------------------------------
  // Deployments
  // ---------------------------------------------------------------------------
  async createDeployment(input: {
    id: string;
    projectId: string;
    ownerId: string;
    environment: DeploymentEnvironment;
    releaseVersion: string;
    gitSha?: string | null;
    deploymentUrl?: string | null;
    status?: DeploymentStatus;
    startedAt?: string | null;
    deployedAt?: string;
    rollbackInfo?: string | null;
    outcome?: string | null;
    supportingEvidenceIds?: readonly string[];
    artifactIds?: readonly string[];
    visibility?: Visibility;
    publicationState?: PublicationState;
  }): Promise<DeploymentEntity> {
    const now = input.deployedAt || new Date().toISOString();
    const sql = `
      INSERT INTO deployments (
        id, project_id, owner_id, environment, release_version, git_sha,
        deployment_url, status, started_at, deployed_at, rollback_info, outcome,
        supporting_evidence_ids, artifact_ids, visibility, state, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db
      .prepare(sql)
      .bind(
        input.id,
        input.projectId,
        input.ownerId,
        input.environment,
        input.releaseVersion,
        input.gitSha || null,
        input.deploymentUrl || null,
        input.status || 'pending',
        input.startedAt || null,
        now,
        input.rollbackInfo ? sanitizeEngineeringText(input.rollbackInfo) : null,
        input.outcome ? sanitizeEngineeringText(input.outcome) : null,
        JSON.stringify(input.supportingEvidenceIds || []),
        JSON.stringify(input.artifactIds || []),
        input.visibility || 'private',
        input.publicationState || 'published',
        now,
        now,
      )
      .run();

    return {
      id: input.id as EntityId,
      projectId: input.projectId as EntityId,
      ownerId: input.ownerId as EntityId,
      environment: input.environment,
      releaseVersion: input.releaseVersion,
      gitSha: input.gitSha || null,
      deploymentUrl: input.deploymentUrl || null,
      status: input.status || 'pending',
      startedAt: (input.startedAt || null) as ISODateTime | null,
      deployedAt: now as ISODateTime,
      rollbackInfo: input.rollbackInfo || null,
      outcome: input.outcome || null,
      supportingEvidenceIds: (input.supportingEvidenceIds || []) as readonly EntityId[],
      artifactIds: (input.artifactIds || []) as readonly EntityId[],
      visibility: input.visibility || 'private',
      publicationState: input.publicationState || 'published',
      provenance: null,
      createdAt: now as ISODateTime,
      updatedAt: now as ISODateTime,
      deletedAt: null,
    };
  }

  async listDeployments(ownerId: string, projectId: string): Promise<readonly DeploymentEntity[]> {
    const res = await this.db
      .prepare(
        'SELECT * FROM deployments WHERE owner_id = ? AND project_id = ? AND deleted_at IS NULL ORDER BY deployed_at DESC',
      )
      .bind(ownerId, projectId)
      .all<Record<string, unknown>>();

    return (res.results || []).map((r: Record<string, unknown>) => ({
      id: r.id as EntityId,
      projectId: r.project_id as EntityId,
      ownerId: r.owner_id as EntityId,
      environment: r.environment as DeploymentEnvironment,
      releaseVersion: r.release_version as string,
      gitSha: (r.git_sha as string) || null,
      deploymentUrl: (r.deployment_url as string) || null,
      status: r.status as DeploymentStatus,
      startedAt: (r.started_at as ISODateTime) || null,
      deployedAt: r.deployed_at as ISODateTime,
      rollbackInfo: (r.rollback_info as string) || null,
      outcome: (r.outcome as string) || null,
      supportingEvidenceIds: JSON.parse((r.supporting_evidence_ids as string) || '[]'),
      artifactIds: JSON.parse((r.artifact_ids as string) || '[]'),
      visibility: r.visibility as Visibility,
      publicationState: (r.state as PublicationState) || 'published',
      provenance: (r.provenance as string) || null,
      createdAt: r.created_at as ISODateTime,
      updatedAt: r.updated_at as ISODateTime,
      deletedAt: (r.deleted_at as ISODateTime) || null,
    }));
  }

  // ---------------------------------------------------------------------------
  // Project Versions & Milestones
  // ---------------------------------------------------------------------------
  async createVersion(input: {
    id: string;
    projectId: string;
    ownerId: string;
    name: string;
    versionIdentifier: string;
    description?: string | null;
    status?: ProjectVersionStatus;
    startedDate?: string | null;
    completedDate?: string | null;
    changelog?: string | null;
    outcome?: string | null;
    supportingEvidenceIds?: readonly string[];
    artifactIds?: readonly string[];
    previousVersionId?: string | null;
    visibility?: Visibility;
    state?: PublicationState;
  }): Promise<ProjectVersionEntity> {
    const now = new Date().toISOString();
    const sql = `
      INSERT INTO project_versions (
        id, project_id, owner_id, name, version_identifier, description, status,
        started_date, completed_date, changelog, outcome, supporting_evidence_ids,
        artifact_ids, previous_version_id, visibility, state, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db
      .prepare(sql)
      .bind(
        input.id,
        input.projectId,
        input.ownerId,
        input.name,
        input.versionIdentifier,
        input.description ? sanitizeEngineeringText(input.description) : null,
        input.status || 'planned',
        input.startedDate || null,
        input.completedDate || null,
        input.changelog ? sanitizeEngineeringText(input.changelog) : null,
        input.outcome ? sanitizeEngineeringText(input.outcome) : null,
        JSON.stringify(input.supportingEvidenceIds || []),
        JSON.stringify(input.artifactIds || []),
        input.previousVersionId || null,
        input.visibility || 'private',
        input.state || 'draft',
        now,
        now,
      )
      .run();

    return {
      id: input.id as EntityId,
      projectId: input.projectId as EntityId,
      ownerId: input.ownerId as EntityId,
      name: input.name,
      versionIdentifier: input.versionIdentifier,
      description: input.description || null,
      status: input.status || 'planned',
      startedDate: input.startedDate || null,
      completedDate: input.completedDate || null,
      changelog: input.changelog || null,
      outcome: input.outcome || null,
      supportingEvidenceIds: (input.supportingEvidenceIds || []) as readonly EntityId[],
      artifactIds: (input.artifactIds || []) as readonly EntityId[],
      previousVersionId: (input.previousVersionId || null) as EntityId | null,
      visibility: input.visibility || 'private',
      state: input.state || 'draft',
      createdAt: now as ISODateTime,
      updatedAt: now as ISODateTime,
      deletedAt: null,
    };
  }

  async listVersions(ownerId: string, projectId: string): Promise<readonly ProjectVersionEntity[]> {
    const res = await this.db
      .prepare(
        'SELECT * FROM project_versions WHERE owner_id = ? AND project_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
      )
      .bind(ownerId, projectId)
      .all<Record<string, unknown>>();

    return (res.results || []).map((r: Record<string, unknown>) => ({
      id: r.id as EntityId,
      projectId: r.project_id as EntityId,
      ownerId: r.owner_id as EntityId,
      name: r.name as string,
      versionIdentifier: r.version_identifier as string,
      description: (r.description as string) || null,
      status: r.status as ProjectVersionStatus,
      startedDate: (r.started_date as string) || null,
      completedDate: (r.completed_date as string) || null,
      changelog: (r.changelog as string) || null,
      outcome: (r.outcome as string) || null,
      supportingEvidenceIds: JSON.parse((r.supporting_evidence_ids as string) || '[]'),
      artifactIds: JSON.parse((r.artifact_ids as string) || '[]'),
      previousVersionId: (r.previous_version_id as EntityId) || null,
      visibility: r.visibility as Visibility,
      state: r.state as PublicationState,
      createdAt: r.created_at as ISODateTime,
      updatedAt: r.updated_at as ISODateTime,
      deletedAt: (r.deleted_at as ISODateTime) || null,
    }));
  }
}
