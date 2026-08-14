-- Forward-only profile communication extension.
-- Historical migrations 001-017 remain immutable.

ALTER TABLE profiles ADD COLUMN github_url TEXT;
ALTER TABLE profiles ADD COLUMN linkedin_url TEXT;
ALTER TABLE profiles ADD COLUMN x_url TEXT;
ALTER TABLE profiles ADD COLUMN instagram_url TEXT;

INSERT INTO schema_versions (version, description, applied_at)
VALUES (18, 'Owner-managed public social profiles and Resend contact delivery support', datetime('now'));
