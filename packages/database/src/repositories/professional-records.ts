/**
 * D1 Professional Records Repository — Work Experience, Education, Credentials.
 *
 * SECURITY: All owner operations require AuthorizationContext.
 * Public methods filter strictly by visibility = 'public' and state = 'published'.
 * Optimistic concurrency is enforced on all updates via version_no.
 */

import type { AuthorizationContext } from '@usmanalii/authorization';
import { requireOwnerContext } from '@usmanalii/authorization';
import type {
  ExperienceRecordEntity,
  EducationRecordEntity,
  CredentialRecordEntity,
  EntityId,
  ISODate,
  ISODateTime,
  Visibility,
  PublicationState,
  PublicationEligibility,
} from '@usmanalii/domain';
import type {
  PublicExperienceDto,
  PublicEducationDto,
  PublicCredentialDto,
  CreateExperienceRequest,
  UpdateExperienceRequest,
  CreateEducationRequest,
  UpdateEducationRequest,
  CreateCredentialRequest,
  UpdateCredentialRequest,
} from '@usmanalii/contracts';

interface RawExperienceRow {
  id: string;
  owner_id: string;
  company: string;
  role_title: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  is_current: number;
  description: string | null;
  key_achievements: string;
  visibility: string;
  state: string;
  publication_eligibility: string;
  ordering: number;
  version_no: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface RawEducationRow {
  id: string;
  owner_id: string;
  institution: string;
  degree: string;
  field_of_study: string | null;
  start_date: string;
  end_date: string | null;
  is_current: number;
  grade_or_honors: string | null;
  description: string | null;
  visibility: string;
  state: string;
  publication_eligibility: string;
  ordering: number;
  version_no: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface RawCredentialRow {
  id: string;
  owner_id: string;
  name: string;
  issuing_organization: string;
  credential_id: string | null;
  credential_url: string | null;
  issue_date: string;
  expiration_date: string | null;
  visibility: string;
  state: string;
  publication_eligibility: string;
  ordering: number;
  version_no: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

function mapExpRow(row: RawExperienceRow): ExperienceRecordEntity {
  let achievements: string[] = [];
  try {
    achievements = JSON.parse(row.key_achievements || '[]');
  } catch {
    achievements = [];
  }

  return {
    id: row.id as EntityId,
    ownerId: row.owner_id as EntityId,
    company: row.company,
    roleTitle: row.role_title,
    location: row.location ?? null,
    startDate: row.start_date as ISODate,
    endDate: row.end_date ? (row.end_date as ISODate) : null,
    isCurrent: Boolean(row.is_current),
    description: row.description ?? null,
    keyAchievements: achievements,
    visibility: row.visibility as Visibility,
    state: row.state as PublicationState,
    publicationEligibility: row.publication_eligibility as PublicationEligibility,
    ordering: Number(row.ordering),
    versionNo: Number(row.version_no),
    createdAt: row.created_at as ISODateTime,
    updatedAt: row.updated_at as ISODateTime,
    archivedAt: row.archived_at ? (row.archived_at as ISODateTime) : null,
  };
}

function mapEduRow(row: RawEducationRow): EducationRecordEntity {
  return {
    id: row.id as EntityId,
    ownerId: row.owner_id as EntityId,
    institution: row.institution,
    degree: row.degree,
    fieldOfStudy: row.field_of_study ?? null,
    startDate: row.start_date as ISODate,
    endDate: row.end_date ? (row.end_date as ISODate) : null,
    isCurrent: Boolean(row.is_current),
    gradeOrHonors: row.grade_or_honors ?? null,
    description: row.description ?? null,
    visibility: row.visibility as Visibility,
    state: row.state as PublicationState,
    publicationEligibility: row.publication_eligibility as PublicationEligibility,
    ordering: Number(row.ordering),
    versionNo: Number(row.version_no),
    createdAt: row.created_at as ISODateTime,
    updatedAt: row.updated_at as ISODateTime,
    archivedAt: row.archived_at ? (row.archived_at as ISODateTime) : null,
  };
}

function mapCredRow(row: RawCredentialRow): CredentialRecordEntity {
  return {
    id: row.id as EntityId,
    ownerId: row.owner_id as EntityId,
    name: row.name,
    issuingOrganization: row.issuing_organization,
    credentialId: row.credential_id ?? null,
    credentialUrl: row.credential_url ?? null,
    issueDate: row.issue_date as ISODate,
    expirationDate: row.expiration_date ? (row.expiration_date as ISODate) : null,
    visibility: row.visibility as Visibility,
    state: row.state as PublicationState,
    publicationEligibility: row.publication_eligibility as PublicationEligibility,
    ordering: Number(row.ordering),
    versionNo: Number(row.version_no),
    createdAt: row.created_at as ISODateTime,
    updatedAt: row.updated_at as ISODateTime,
    archivedAt: row.archived_at ? (row.archived_at as ISODateTime) : null,
  };
}

export class D1ProfessionalRecordsRepository {
  constructor(private readonly db: D1Database) {}

  // ---------------------------------------------------------------------------
  // Experience Methods
  // ---------------------------------------------------------------------------

  async listOwnerExperience(ctx: AuthorizationContext): Promise<readonly ExperienceRecordEntity[]> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const { results } = await this.db
      .prepare(
        'SELECT * FROM experience_records WHERE owner_id = ? AND archived_at IS NULL ORDER BY ordering ASC, start_date DESC',
      )
      .bind(ctx.ownerId)
      .all<RawExperienceRow>();

    return (results ?? []).map(mapExpRow);
  }

  async listPublicExperience(): Promise<readonly PublicExperienceDto[]> {
    const { results } = await this.db
      .prepare(
        `SELECT id, company, role_title, location, start_date, end_date, is_current,
                description, key_achievements, ordering
         FROM experience_records
         WHERE visibility = 'public' AND state = 'published' AND archived_at IS NULL
         ORDER BY ordering ASC, start_date DESC`,
      )
      .all<RawExperienceRow>();

    return (results ?? []).map((row) => {
      let achievements: string[] = [];
      try {
        achievements = JSON.parse(row.key_achievements || '[]');
      } catch {
        achievements = [];
      }
      return {
        id: row.id,
        company: row.company,
        roleTitle: row.role_title,
        location: row.location ?? null,
        startDate: row.start_date,
        endDate: row.end_date ?? null,
        isCurrent: Boolean(row.is_current),
        description: row.description ?? null,
        keyAchievements: achievements,
        ordering: Number(row.ordering),
      };
    });
  }

  async createExperience(
    ctx: AuthorizationContext,
    input: CreateExperienceRequest,
  ): Promise<ExperienceRecordEntity> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const achievementsJson = JSON.stringify(input.keyAchievements || []);

    await this.db
      .prepare(
        `INSERT INTO experience_records (
          id, owner_id, company, role_title, location, start_date, end_date,
          is_current, description, key_achievements, visibility, state,
          publication_eligibility, ordering, version_no, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'eligible', ?, 1, ?, ?)`,
      )
      .bind(
        id,
        ctx.ownerId,
        input.company,
        input.roleTitle,
        input.location ?? null,
        input.startDate,
        input.endDate ?? null,
        input.isCurrent ? 1 : 0,
        input.description ?? null,
        achievementsJson,
        input.visibility || 'private',
        input.ordering || 0,
        now,
        now,
      )
      .run();

    const created = await this.db
      .prepare('SELECT * FROM experience_records WHERE id = ?')
      .bind(id)
      .first<RawExperienceRow>();

    if (!created) throw new Error('EXPERIENCE_CREATE_FAILED');
    return mapExpRow(created);
  }

  async updateExperience(
    ctx: AuthorizationContext,
    id: string,
    updates: UpdateExperienceRequest,
  ): Promise<ExperienceRecordEntity> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const existingRow = await this.db
      .prepare('SELECT * FROM experience_records WHERE id = ? AND owner_id = ?')
      .bind(id, ctx.ownerId)
      .first<RawExperienceRow>();

    if (!existingRow) throw new Error('EXPERIENCE_NOT_FOUND');
    if (existingRow.version_no !== updates.versionNo) {
      throw new Error('CONCURRENCY_CONFLICT: Experience record modified by another request');
    }

    const now = new Date().toISOString();
    const newVersionNo = updates.versionNo + 1;
    const achievementsJson = updates.keyAchievements
      ? JSON.stringify(updates.keyAchievements)
      : existingRow.key_achievements;

    const res = await this.db
      .prepare(
        `UPDATE experience_records SET
          company = ?, role_title = ?, location = ?, start_date = ?, end_date = ?,
          is_current = ?, description = ?, key_achievements = ?, visibility = ?,
          state = ?, ordering = ?, updated_at = ?, version_no = ?
        WHERE id = ? AND owner_id = ? AND version_no = ?`,
      )
      .bind(
        updates.company ?? existingRow.company,
        updates.roleTitle ?? existingRow.role_title,
        updates.location !== undefined ? updates.location : existingRow.location,
        updates.startDate ?? existingRow.start_date,
        updates.endDate !== undefined ? updates.endDate : existingRow.end_date,
        updates.isCurrent !== undefined ? (updates.isCurrent ? 1 : 0) : existingRow.is_current,
        updates.description !== undefined ? updates.description : existingRow.description,
        achievementsJson,
        updates.visibility ?? existingRow.visibility,
        updates.state ?? existingRow.state,
        updates.ordering !== undefined ? updates.ordering : existingRow.ordering,
        now,
        newVersionNo,
        id,
        ctx.ownerId,
        updates.versionNo,
      )
      .run();

    if (!res.success || res.meta.changes === 0) {
      throw new Error('CONCURRENCY_CONFLICT: Update failed');
    }

    const updated = await this.db
      .prepare('SELECT * FROM experience_records WHERE id = ?')
      .bind(id)
      .first<RawExperienceRow>();

    if (!updated) throw new Error('EXPERIENCE_FETCH_FAILED');
    return mapExpRow(updated);
  }

  async deleteExperience(ctx: AuthorizationContext, id: string): Promise<boolean> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const now = new Date().toISOString();
    const res = await this.db
      .prepare(
        'UPDATE experience_records SET archived_at = ?, updated_at = ? WHERE id = ? AND owner_id = ?',
      )
      .bind(now, now, id, ctx.ownerId)
      .run();

    return res.success && res.meta.changes > 0;
  }

  // ---------------------------------------------------------------------------
  // Education Methods
  // ---------------------------------------------------------------------------

  async listOwnerEducation(ctx: AuthorizationContext): Promise<readonly EducationRecordEntity[]> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const { results } = await this.db
      .prepare(
        'SELECT * FROM education_records WHERE owner_id = ? AND archived_at IS NULL ORDER BY ordering ASC, start_date DESC',
      )
      .bind(ctx.ownerId)
      .all<RawEducationRow>();

    return (results ?? []).map(mapEduRow);
  }

  async listPublicEducation(): Promise<readonly PublicEducationDto[]> {
    const { results } = await this.db
      .prepare(
        `SELECT id, institution, degree, field_of_study, start_date, end_date, is_current,
                grade_or_honors, description, ordering
         FROM education_records
         WHERE visibility = 'public' AND state = 'published' AND archived_at IS NULL
         ORDER BY ordering ASC, start_date DESC`,
      )
      .all<RawEducationRow>();

    return (results ?? []).map((row) => ({
      id: row.id,
      institution: row.institution,
      degree: row.degree,
      fieldOfStudy: row.field_of_study ?? null,
      startDate: row.start_date,
      endDate: row.end_date ?? null,
      isCurrent: Boolean(row.is_current),
      gradeOrHonors: row.grade_or_honors ?? null,
      description: row.description ?? null,
      ordering: Number(row.ordering),
    }));
  }

  async createEducation(
    ctx: AuthorizationContext,
    input: CreateEducationRequest,
  ): Promise<EducationRecordEntity> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO education_records (
          id, owner_id, institution, degree, field_of_study, start_date, end_date,
          is_current, grade_or_honors, description, visibility, state,
          publication_eligibility, ordering, version_no, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'eligible', ?, 1, ?, ?)`,
      )
      .bind(
        id,
        ctx.ownerId,
        input.institution,
        input.degree,
        input.fieldOfStudy ?? null,
        input.startDate,
        input.endDate ?? null,
        input.isCurrent ? 1 : 0,
        input.gradeOrHonors ?? null,
        input.description ?? null,
        input.visibility || 'private',
        input.ordering || 0,
        now,
        now,
      )
      .run();

    const created = await this.db
      .prepare('SELECT * FROM education_records WHERE id = ?')
      .bind(id)
      .first<RawEducationRow>();

    if (!created) throw new Error('EDUCATION_CREATE_FAILED');
    return mapEduRow(created);
  }

  async updateEducation(
    ctx: AuthorizationContext,
    id: string,
    updates: UpdateEducationRequest,
  ): Promise<EducationRecordEntity> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const existingRow = await this.db
      .prepare('SELECT * FROM education_records WHERE id = ? AND owner_id = ?')
      .bind(id, ctx.ownerId)
      .first<RawEducationRow>();

    if (!existingRow) throw new Error('EDUCATION_NOT_FOUND');
    if (existingRow.version_no !== updates.versionNo) {
      throw new Error('CONCURRENCY_CONFLICT: Education record modified by another request');
    }

    const now = new Date().toISOString();
    const newVersionNo = updates.versionNo + 1;

    const res = await this.db
      .prepare(
        `UPDATE education_records SET
          institution = ?, degree = ?, field_of_study = ?, start_date = ?, end_date = ?,
          is_current = ?, grade_or_honors = ?, description = ?, visibility = ?,
          state = ?, ordering = ?, updated_at = ?, version_no = ?
        WHERE id = ? AND owner_id = ? AND version_no = ?`,
      )
      .bind(
        updates.institution ?? existingRow.institution,
        updates.degree ?? existingRow.degree,
        updates.fieldOfStudy !== undefined ? updates.fieldOfStudy : existingRow.field_of_study,
        updates.startDate ?? existingRow.start_date,
        updates.endDate !== undefined ? updates.endDate : existingRow.end_date,
        updates.isCurrent !== undefined ? (updates.isCurrent ? 1 : 0) : existingRow.is_current,
        updates.gradeOrHonors !== undefined ? updates.gradeOrHonors : existingRow.grade_or_honors,
        updates.description !== undefined ? updates.description : existingRow.description,
        updates.visibility ?? existingRow.visibility,
        updates.state ?? existingRow.state,
        updates.ordering !== undefined ? updates.ordering : existingRow.ordering,
        now,
        newVersionNo,
        id,
        ctx.ownerId,
        updates.versionNo,
      )
      .run();

    if (!res.success || res.meta.changes === 0) {
      throw new Error('CONCURRENCY_CONFLICT: Update failed');
    }

    const updated = await this.db
      .prepare('SELECT * FROM education_records WHERE id = ?')
      .bind(id)
      .first<RawEducationRow>();

    if (!updated) throw new Error('EDUCATION_FETCH_FAILED');
    return mapEduRow(updated);
  }

  async deleteEducation(ctx: AuthorizationContext, id: string): Promise<boolean> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const now = new Date().toISOString();
    const res = await this.db
      .prepare(
        'UPDATE education_records SET archived_at = ?, updated_at = ? WHERE id = ? AND owner_id = ?',
      )
      .bind(now, now, id, ctx.ownerId)
      .run();

    return res.success && res.meta.changes > 0;
  }

  // ---------------------------------------------------------------------------
  // Credential Methods
  // ---------------------------------------------------------------------------

  async listOwnerCredentials(
    ctx: AuthorizationContext,
  ): Promise<readonly CredentialRecordEntity[]> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const { results } = await this.db
      .prepare(
        'SELECT * FROM credential_records WHERE owner_id = ? AND archived_at IS NULL ORDER BY ordering ASC, issue_date DESC',
      )
      .bind(ctx.ownerId)
      .all<RawCredentialRow>();

    return (results ?? []).map(mapCredRow);
  }

  async listPublicCredentials(): Promise<readonly PublicCredentialDto[]> {
    const { results } = await this.db
      .prepare(
        `SELECT id, name, issuing_organization, credential_id, credential_url, issue_date, expiration_date, ordering
         FROM credential_records
         WHERE visibility = 'public' AND state = 'published' AND archived_at IS NULL
         ORDER BY ordering ASC, issue_date DESC`,
      )
      .all<RawCredentialRow>();

    return (results ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      issuingOrganization: row.issuing_organization,
      credentialId: row.credential_id ?? null,
      credentialUrl: row.credential_url ?? null,
      issueDate: row.issue_date,
      expirationDate: row.expiration_date ?? null,
      ordering: Number(row.ordering),
    }));
  }

  async createCredential(
    ctx: AuthorizationContext,
    input: CreateCredentialRequest,
  ): Promise<CredentialRecordEntity> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO credential_records (
          id, owner_id, name, issuing_organization, credential_id, credential_url,
          issue_date, expiration_date, visibility, state, publication_eligibility,
          ordering, version_no, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'eligible', ?, 1, ?, ?)`,
      )
      .bind(
        id,
        ctx.ownerId,
        input.name,
        input.issuingOrganization,
        input.credentialId ?? null,
        input.credentialUrl ?? null,
        input.issueDate,
        input.expirationDate ?? null,
        input.visibility || 'private',
        input.ordering || 0,
        now,
        now,
      )
      .run();

    const created = await this.db
      .prepare('SELECT * FROM credential_records WHERE id = ?')
      .bind(id)
      .first<RawCredentialRow>();

    if (!created) throw new Error('CREDENTIAL_CREATE_FAILED');
    return mapCredRow(created);
  }

  async updateCredential(
    ctx: AuthorizationContext,
    id: string,
    updates: UpdateCredentialRequest,
  ): Promise<CredentialRecordEntity> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const existingRow = await this.db
      .prepare('SELECT * FROM credential_records WHERE id = ? AND owner_id = ?')
      .bind(id, ctx.ownerId)
      .first<RawCredentialRow>();

    if (!existingRow) throw new Error('CREDENTIAL_NOT_FOUND');
    if (existingRow.version_no !== updates.versionNo) {
      throw new Error('CONCURRENCY_CONFLICT: Credential record modified by another request');
    }

    const now = new Date().toISOString();
    const newVersionNo = updates.versionNo + 1;

    const res = await this.db
      .prepare(
        `UPDATE credential_records SET
          name = ?, issuing_organization = ?, credential_id = ?, credential_url = ?,
          issue_date = ?, expiration_date = ?, visibility = ?, state = ?,
          ordering = ?, updated_at = ?, version_no = ?
        WHERE id = ? AND owner_id = ? AND version_no = ?`,
      )
      .bind(
        updates.name ?? existingRow.name,
        updates.issuingOrganization ?? existingRow.issuing_organization,
        updates.credentialId !== undefined ? updates.credentialId : existingRow.credential_id,
        updates.credentialUrl !== undefined ? updates.credentialUrl : existingRow.credential_url,
        updates.issueDate ?? existingRow.issue_date,
        updates.expirationDate !== undefined ? updates.expirationDate : existingRow.expiration_date,
        updates.visibility ?? existingRow.visibility,
        updates.state ?? existingRow.state,
        updates.ordering !== undefined ? updates.ordering : existingRow.ordering,
        now,
        newVersionNo,
        id,
        ctx.ownerId,
        updates.versionNo,
      )
      .run();

    if (!res.success || res.meta.changes === 0) {
      throw new Error('CONCURRENCY_CONFLICT: Update failed');
    }

    const updated = await this.db
      .prepare('SELECT * FROM credential_records WHERE id = ?')
      .bind(id)
      .first<RawCredentialRow>();

    if (!updated) throw new Error('CREDENTIAL_FETCH_FAILED');
    return mapCredRow(updated);
  }

  async deleteCredential(ctx: AuthorizationContext, id: string): Promise<boolean> {
    const auth = requireOwnerContext(ctx);
    if (!auth.authorized) throw new Error(`UNAUTHORIZED: ${auth.reason}`);

    const now = new Date().toISOString();
    const res = await this.db
      .prepare(
        'UPDATE credential_records SET archived_at = ?, updated_at = ? WHERE id = ? AND owner_id = ?',
      )
      .bind(now, now, id, ctx.ownerId)
      .run();

    return res.success && res.meta.changes > 0;
  }
}
