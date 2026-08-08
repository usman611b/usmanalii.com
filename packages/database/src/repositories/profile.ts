/**
 * Profile repository interface.
 *
 * SECURITY: All methods require AuthorizationContext.
 * Public methods use named, allowlisted queries only.
 * No method accepts owner_id from client input.
 */
import type { AuthorizationContext } from '@usmanalii/authorization';
import type { ProfileEntity } from '@usmanalii/domain';
import type { PublicProfileDto } from '@usmanalii/contracts';

export interface ProfileRepository {
  /**
   * Gets the owner's profile.
   * Requires owner authorization context.
   */
  getOwnerProfile(ctx: AuthorizationContext): Promise<ProfileEntity | null>;

  /**
   * Gets the public profile projection.
   * Returns only explicitly allowlisted public fields.
   * SECURITY: Does not expose contactEmail, ownerId or internal state.
   */
  getPublicProfile(): Promise<PublicProfileDto | null>;

  /**
   * Updates the owner's profile.
   * Requires owner authorization context.
   * Uses optimistic concurrency via version_no.
   */
  updateProfile(
    ctx: AuthorizationContext,
    updates: Partial<Omit<ProfileEntity, 'id' | 'ownerId' | 'createdAt'>>,
    currentVersionNo: number,
  ): Promise<ProfileEntity>;
}
