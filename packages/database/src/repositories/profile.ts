/**
 * Profile repository implementation for Cloudflare D1.
 *
 * SECURITY: All owner methods require AuthorizationContext.
 * Public methods use named, allowlisted queries only.
 * No method accepts owner_id from client input.
 */
import type { AuthorizationContext } from '@usmanalii/authorization';
import { requireOwnerContext } from '@usmanalii/authorization';
import type {
  ProfileEntity,
  EntityId,
  ISODateTime,
  Visibility,
  AvailabilityState,
} from '@usmanalii/domain';
import type { PublicProfileDto } from '@usmanalii/contracts';

export interface ProfileRepository {
  getOwnerProfile(ctx: AuthorizationContext): Promise<ProfileEntity | null>;
  getPublicProfile(): Promise<PublicProfileDto | null>;
  getOwnerContactTarget(): Promise<{ contactEmail: string | null } | null>;
  createProfile(ctx: AuthorizationContext, displayName: string): Promise<ProfileEntity>;
  updateProfile(
    ctx: AuthorizationContext,
    updates: Partial<Omit<ProfileEntity, 'id' | 'ownerId' | 'createdAt'>>,
    currentVersionNo: number,
  ): Promise<ProfileEntity>;
}

interface RawProfileRow {
  id: string;
  owner_id: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  current_focus: string | null;
  contact_email: string | null;
  contact_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  x_url: string | null;
  instagram_url: string | null;
  timezone: string;
  visibility: string;
  availability_state?: string | null;
  preferred_roles?: string | null;
  profile_image_url?: string | null;
  resume_asset_url?: string | null;
  location?: string | null;
  created_at: string;
  updated_at: string;
  version_no: number;
}

function mapRowToEntity(row: RawProfileRow): ProfileEntity {
  return {
    id: row.id as EntityId,
    ownerId: row.owner_id as EntityId,
    displayName: row.display_name,
    headline: row.headline,
    bio: row.bio,
    currentFocus: row.current_focus,
    contactEmail: row.contact_email,
    contactUrl: row.contact_url,
    githubUrl: row.github_url,
    linkedinUrl: row.linkedin_url,
    xUrl: row.x_url,
    instagramUrl: row.instagram_url,
    timezone: row.timezone,
    visibility: row.visibility as Visibility,
    availabilityState: (row.availability_state || 'available') as AvailabilityState,
    preferredRoles: row.preferred_roles ?? null,
    profileImageUrl: row.profile_image_url ?? null,
    resumeAssetUrl: row.resume_asset_url ?? null,
    location: row.location ?? null,
    createdAt: row.created_at as ISODateTime,
    updatedAt: row.updated_at as ISODateTime,
    versionNo: Number(row.version_no),
  };
}

export class D1ProfileRepository implements ProfileRepository {
  constructor(private readonly db: D1Database) {}

  async createProfile(ctx: AuthorizationContext, displayName: string): Promise<ProfileEntity> {
    const authRes = requireOwnerContext(ctx);
    if (!authRes.authorized) {
      throw new Error(`UNAUTHORIZED: ${authRes.reason}`);
    }

    if (await this.getOwnerProfile(ctx)) {
      throw new Error('PROFILE_ALREADY_EXISTS');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO profiles (
          id, owner_id, display_name, headline, bio, current_focus,
          contact_email, contact_url, github_url, linkedin_url, x_url, instagram_url,
          timezone, visibility, availability_state, preferred_roles,
          profile_image_url, resume_asset_url, location, created_at, updated_at, version_no
        ) VALUES (?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
                  'Asia/Karachi', 'private', 'available', NULL, NULL, NULL, NULL, ?, ?, 1)`,
      )
      .bind(id, ctx.ownerId, displayName.trim(), now, now)
      .run();

    const created = await this.getOwnerProfile(ctx);
    if (!created) throw new Error('PROFILE_CREATE_FAILED');
    return created;
  }

  async getOwnerProfile(ctx: AuthorizationContext): Promise<ProfileEntity | null> {
    const authRes = requireOwnerContext(ctx);
    if (!authRes.authorized) {
      throw new Error(`UNAUTHORIZED: ${authRes.reason}`);
    }

    const row = await this.db
      .prepare('SELECT * FROM profiles WHERE owner_id = ? LIMIT 1')
      .bind(ctx.ownerId)
      .first<RawProfileRow>();

    if (!row) return null;
    return mapRowToEntity(row);
  }

  async getPublicProfile(): Promise<PublicProfileDto | null> {
    const row = await this.db
      .prepare(
        `SELECT display_name, headline, bio, current_focus, availability_state,
                preferred_roles, profile_image_url, resume_asset_url, location, timezone, contact_url,
                github_url, linkedin_url, x_url, instagram_url
         FROM profiles
         WHERE visibility = 'public' LIMIT 1`,
      )
      .first<RawProfileRow>();

    if (!row) return null;

    return {
      displayName: row.display_name,
      headline: row.headline,
      bio: row.bio,
      currentFocus: row.current_focus,
      availabilityState: row.availability_state || 'available',
      preferredRoles: row.preferred_roles ?? null,
      profileImageUrl: row.profile_image_url ?? null,
      resumeAssetUrl: row.resume_asset_url ?? null,
      location: row.location ?? null,
      timezone: row.timezone,
      contactUrl: row.contact_url,
      githubUrl: row.github_url,
      linkedinUrl: row.linkedin_url,
      xUrl: row.x_url,
      instagramUrl: row.instagram_url,
    };
  }

  async getOwnerContactTarget(): Promise<{ contactEmail: string | null } | null> {
    const row = await this.db
      .prepare("SELECT contact_email FROM profiles WHERE visibility = 'public' LIMIT 1")
      .first<{ contact_email: string | null }>();
    return row ? { contactEmail: row.contact_email } : null;
  }

  async updateProfile(
    ctx: AuthorizationContext,
    updates: Partial<Omit<ProfileEntity, 'id' | 'ownerId' | 'createdAt'>>,
    currentVersionNo: number,
  ): Promise<ProfileEntity> {
    const authRes = requireOwnerContext(ctx);
    if (!authRes.authorized) {
      throw new Error(`UNAUTHORIZED: ${authRes.reason}`);
    }

    const existing = await this.getOwnerProfile(ctx);
    if (!existing) {
      throw new Error('PROFILE_NOT_FOUND');
    }

    if (existing.versionNo !== currentVersionNo) {
      throw new Error('CONCURRENCY_CONFLICT: Profile has been modified by another process');
    }

    const updatedDisplayName = updates.displayName ?? existing.displayName;
    const updatedHeadline = updates.headline !== undefined ? updates.headline : existing.headline;
    const updatedBio = updates.bio !== undefined ? updates.bio : existing.bio;
    const updatedFocus =
      updates.currentFocus !== undefined ? updates.currentFocus : existing.currentFocus;
    const updatedEmail =
      updates.contactEmail !== undefined ? updates.contactEmail : existing.contactEmail;
    const updatedContactUrl =
      updates.contactUrl !== undefined ? updates.contactUrl : existing.contactUrl;
    const updatedGithubUrl =
      updates.githubUrl !== undefined ? updates.githubUrl : existing.githubUrl;
    const updatedLinkedinUrl =
      updates.linkedinUrl !== undefined ? updates.linkedinUrl : existing.linkedinUrl;
    const updatedXUrl = updates.xUrl !== undefined ? updates.xUrl : existing.xUrl;
    const updatedInstagramUrl =
      updates.instagramUrl !== undefined ? updates.instagramUrl : existing.instagramUrl;
    const updatedTimezone = updates.timezone ?? existing.timezone;
    const updatedVisibility = updates.visibility ?? existing.visibility;
    const updatedAvail = updates.availabilityState ?? existing.availabilityState;
    const updatedRoles =
      updates.preferredRoles !== undefined ? updates.preferredRoles : existing.preferredRoles;
    const updatedImg =
      updates.profileImageUrl !== undefined ? updates.profileImageUrl : existing.profileImageUrl;
    const updatedResume =
      updates.resumeAssetUrl !== undefined ? updates.resumeAssetUrl : existing.resumeAssetUrl;
    const updatedLoc = updates.location !== undefined ? updates.location : existing.location;

    const newVersionNo = currentVersionNo + 1;
    const updatedAt = new Date().toISOString();

    const res = await this.db
      .prepare(
        `UPDATE profiles SET
          display_name = ?,
          headline = ?,
          bio = ?,
          current_focus = ?,
          contact_email = ?,
          contact_url = ?,
          github_url = ?,
          linkedin_url = ?,
          x_url = ?,
          instagram_url = ?,
          timezone = ?,
          visibility = ?,
          availability_state = ?,
          preferred_roles = ?,
          profile_image_url = ?,
          resume_asset_url = ?,
          location = ?,
          updated_at = ?,
          version_no = ?
        WHERE owner_id = ? AND version_no = ?`,
      )
      .bind(
        updatedDisplayName,
        updatedHeadline,
        updatedBio,
        updatedFocus,
        updatedEmail,
        updatedContactUrl,
        updatedGithubUrl,
        updatedLinkedinUrl,
        updatedXUrl,
        updatedInstagramUrl,
        updatedTimezone,
        updatedVisibility,
        updatedAvail,
        updatedRoles,
        updatedImg,
        updatedResume,
        updatedLoc,
        updatedAt,
        newVersionNo,
        ctx.ownerId,
        currentVersionNo,
      )
      .run();

    if (!res.success || res.meta.changes === 0) {
      throw new Error('CONCURRENCY_CONFLICT: Profile update failed due to concurrent modification');
    }

    const updated = await this.getOwnerProfile(ctx);
    if (!updated) throw new Error('PROFILE_FETCH_FAILED');
    return updated;
  }
}
