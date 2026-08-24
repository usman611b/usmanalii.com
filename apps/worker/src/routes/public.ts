/**
 * Public API Routes (`/api/v1/public/*`).
 *
 * CRITICAL SECURITY RULES (CRITICAL-02 & Privacy Safeguards):
 *  - Expose ONLY published, public records via allowlisted queries.
 *  - NEVER leak drafts, unlisted, restricted, or archived records.
 *  - Validate preview tokens cryptographically.
 */

import { Hono } from 'hono';
import type { WorkerEnv } from '../index.js';
import type { AuthVariables } from '../middleware/auth.js';
import {
  D1ContentRepository,
  D1EvidenceRepository,
  D1ArtifactRepository,
  D1ProfileRepository,
} from '@usmanalii/database';
import { filterPublicEvidence, filterPublicArtifacts } from '@usmanalii/evidence';
import { formatContentDisposition } from './artifacts.js';
import { type ContentType, type EntityId, computeActivityHeatmap } from '@usmanalii/domain';
import { ContactMessageRequestSchema } from '@usmanalii/contracts';
import { z } from 'zod';

export const publicRoutes = new Hono<{
  Bindings: WorkerEnv;
  Variables: AuthVariables;
}>();

const JournalCommentRequestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  authorWebsite: z.string().trim().max(300).optional().default(''),
  body: z.string().trim().min(10).max(2000),
  parentCommentId: z.string().trim().max(100).optional(),
  company: z.string().max(0).optional().default(''),
  turnstileToken: z.string().min(1),
});

const JournalReactionRequestSchema = z.object({
  reaction: z.enum(['useful', 'insightful', 'learned']),
});

async function visitorFingerprint(c: {
  req: { header(name: string): string | undefined };
  env: WorkerEnv;
}): Promise<string> {
  const fingerprintSecret =
    c.env.PREVIEW_SECRET ||
    (c.env.ENVIRONMENT === 'local' ? c.env.LOCAL_OWNER_TOKEN : undefined) ||
    (c.env.ENVIRONMENT === 'test' ? 'test-fingerprint-secret' : undefined);
  if (!fingerprintSecret) throw new Error('Visitor fingerprint secret is not configured.');
  const seed = [
    c.req.header('CF-Connecting-IP') || 'unknown',
    c.req.header('User-Agent') || 'unknown',
    fingerprintSecret,
  ].join('|');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function verifyJournalTurnstile(
  c: {
    req: { header(name: string): string | undefined };
    env: WorkerEnv;
    get(name: 'requestId'): string;
  },
  token: string,
): Promise<boolean> {
  if (!c.env.TURNSTILE_SECRET_KEY) return false;
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: c.env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: c.req.header('CF-Connecting-IP'),
      idempotency_key: c.get('requestId'),
    }),
  });
  const result = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    action?: string;
  };
  return response.ok && result.success === true && result.action === 'journal-comment';
}

async function journalReactionCounts(db: D1Database, contentItemId: string) {
  const result = await db
    .prepare(
      `SELECT reaction_type, COUNT(*) AS count
       FROM journal_reactions WHERE content_item_id = ? GROUP BY reaction_type`,
    )
    .bind(contentItemId)
    .all<{ reaction_type: string; count: number }>();
  const counts: Record<string, number> = { useful: 0, insightful: 0, learned: 0 };
  for (const row of result.results ?? []) counts[row.reaction_type] = Number(row.count);
  return counts;
}

// Health check endpoint
publicRoutes.get('/health', (c) => {
  return c.json({ status: 'ok', requestId: c.get('requestId') });
});

// Public profile endpoint
publicRoutes.get('/profile', async (c) => {
  if (c.env?.DB && typeof c.env.DB.prepare === 'function') {
    const { D1ProfileRepository } = await import('@usmanalii/database');
    const repo = new D1ProfileRepository(c.env.DB);
    const profile = await repo.getPublicProfile();
    if (profile) {
      return c.json({ ...profile, requestId: c.get('requestId') });
    }
  }

  return c.json(
    {
      code: 'RESOURCE_NOT_FOUND',
      message: 'No public profile has been published.',
      requestId: c.get('requestId'),
    },
    404,
  );
});

/** GET /api/v1/public/recruiter — Recruiter Mode Projection */
publicRoutes.get('/recruiter', async (c) => {
  if (!c.env?.DB || typeof c.env.DB.prepare !== 'function') {
    return c.json({
      profile: null,
      summary: null,
      featuredExperience: [],
      featuredEducation: [],
      featuredCredentials: [],
      featuredCapabilities: [],
      featuredSkills: [],
      featuredProjects: [],
      approvedClaims: [],
      resumeAssetUrl: null,
      contactUrl: null,
      requestId: c.get('requestId'),
    });
  }

  const {
    D1ProfileRepository,
    D1ProfessionalRecordsRepository,
    D1ClaimsRepository,
    D1CapabilityRepository,
    D1SkillRepository,
    D1ProjectRepository,
  } = await import('@usmanalii/database');

  const profileRepo = new D1ProfileRepository(c.env.DB);
  const recordsRepo = new D1ProfessionalRecordsRepository(c.env.DB);
  const claimsRepo = new D1ClaimsRepository(c.env.DB);
  const capRepo = new D1CapabilityRepository(c.env.DB);
  const skillRepo = new D1SkillRepository(c.env.DB);
  const projRepo = new D1ProjectRepository(c.env.DB);

  const ownerId = '00000000-0000-0000-0000-000000000001' as EntityId;

  const [profile, exp, edu, cred, claims, caps, skills, projects] = await Promise.all([
    profileRepo.getPublicProfile(),
    recordsRepo.listPublicExperience(),
    recordsRepo.listPublicEducation(),
    recordsRepo.listPublicCredentials(),
    claimsRepo.listPublicClaims(),
    capRepo.listCapabilitiesByOwner(ownerId, { visibility: 'public', state: 'published' }),
    skillRepo.listSkillsByOwner(ownerId, { visibility: 'public' }),
    projRepo.listProjects(ownerId, { visibility: 'public', publicationState: 'published' }),
  ]);

  const capabilityDtos = await Promise.all(
    caps.map(async (capability) => {
      const count = await c.env.DB.prepare(
        `SELECT COUNT(*) AS count
         FROM evidence_capability_links ecl
         JOIN evidence_items ei ON ei.id = ecl.evidence_id
         WHERE ecl.capability_id = ? AND ecl.approval_state = 'accepted'
           AND ei.visibility = 'public' AND ei.archived_at IS NULL`,
      )
        .bind(capability.id)
        .first<{ count: number }>();
      return {
        id: capability.id,
        title: capability.title,
        slug: capability.slug,
        description: capability.description,
        maturity: capability.maturity,
        maturityRationale: capability.maturityRationale,
        lastReviewedAt: capability.lastReviewedAt,
        publicEvidenceCount: Number(count?.count || 0),
        skillNames: [],
      };
    }),
  );
  const skillDtos = await Promise.all(
    skills.map(async (skill) => {
      const count = await c.env.DB.prepare(
        `SELECT COUNT(DISTINCT csr.capability_id) AS count
         FROM capability_skill_relationships csr
         JOIN capabilities cap ON cap.id = csr.capability_id
         WHERE csr.skill_id = ? AND csr.approval_state = 'accepted'
           AND cap.visibility = 'public' AND cap.state = 'published' AND cap.archived_at IS NULL`,
      )
        .bind(skill.id)
        .first<{ count: number }>();
      return {
        id: skill.id,
        name: skill.name,
        slug: skill.slug,
        description: skill.description,
        parentId: skill.parentId,
        publicCapabilityCount: Number(count?.count || 0),
      };
    }),
  );

  return c.json({
    profile,
    summary: profile?.bio || profile?.headline || null,
    featuredExperience: exp,
    featuredEducation: edu,
    featuredCredentials: cred,
    featuredCapabilities: capabilityDtos,
    featuredSkills: skillDtos,
    featuredProjects: projects,
    approvedClaims: claims,
    resumeAssetUrl: profile?.resumeAssetUrl || null,
    contactUrl: profile?.contactUrl || null,
    requestId: c.get('requestId'),
  });
});

/** GET /api/v1/public/resumes — List published public resume variants */
publicRoutes.get('/resumes', async (c) => {
  if (!c.env?.DB || typeof c.env.DB.prepare !== 'function') {
    return c.json({ items: [], requestId: c.get('requestId') });
  }
  const { D1ResumeRepository } = await import('@usmanalii/database');
  const repo = new D1ResumeRepository(c.env.DB);
  const items = await repo.listPublicResumeVariants();
  return c.json({ items, requestId: c.get('requestId') });
});

/** GET /api/v1/public/resumes/:slug — Get published public resume variant detail */
publicRoutes.get('/resumes/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (!c.env?.DB || typeof c.env.DB.prepare !== 'function') {
    return c.json(
      {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Résumé variant not found.',
        requestId: c.get('requestId'),
      },
      404,
    );
  }
  const { D1ResumeRepository } = await import('@usmanalii/database');
  const repo = new D1ResumeRepository(c.env.DB);
  const variant = await repo.getPublicResumeVariantBySlug(slug);
  if (!variant) {
    return c.json(
      {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Résumé variant not found.',
        requestId: c.get('requestId'),
      },
      404,
    );
  }
  return c.json({ variant, requestId: c.get('requestId') });
});

/** GET /api/v1/public/resumes/:slug/export — Export published resume variant in HTML/TXT/JSON/MD */
publicRoutes.get('/resumes/:slug/export', async (c) => {
  const slug = c.req.param('slug');
  const format = (c.req.query('format') || 'json').toLowerCase();

  if (!c.env?.DB || typeof c.env.DB.prepare !== 'function') {
    return c.json(
      {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Résumé variant not found.',
        requestId: c.get('requestId'),
      },
      404,
    );
  }

  const {
    D1ResumeRepository,
    D1ProfileRepository,
    D1ProfessionalRecordsRepository,
    D1ClaimsRepository,
  } = await import('@usmanalii/database');
  const resumeRepo = new D1ResumeRepository(c.env.DB);
  const profileRepo = new D1ProfileRepository(c.env.DB);
  const recordsRepo = new D1ProfessionalRecordsRepository(c.env.DB);
  const claimsRepo = new D1ClaimsRepository(c.env.DB);

  const variant = await resumeRepo.getPublicResumeVariantBySlug(slug);
  if (!variant) {
    return c.json(
      {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Résumé variant not found.',
        requestId: c.get('requestId'),
      },
      404,
    );
  }

  const [profile, exp, edu, cred, claims] = await Promise.all([
    profileRepo.getPublicProfile(),
    recordsRepo.listPublicExperience(),
    recordsRepo.listPublicEducation(),
    recordsRepo.listPublicCredentials(),
    claimsRepo.listPublicClaims(),
  ]);

  if (format === 'json') {
    return c.json({
      variant,
      profile,
      experience: exp,
      education: edu,
      credentials: cred,
      claims,
      exportedAt: new Date().toISOString(),
      schemaVersion: 17,
      requestId: c.get('requestId'),
    });
  }

  if (format === 'txt' || format === 'text') {
    let txt = `========================================================================\n`;
    txt += `${profile?.displayName || 'Professional Profile'} — ${profile?.headline || 'Professional Résumé'}\n`;
    txt += `========================================================================\n\n`;
    txt += `Bio: ${profile?.bio || ''}\n`;
    txt += `Location: ${profile?.location || ''}\n\n`;

    txt += `WORK EXPERIENCE:\n`;
    for (const e of exp) {
      txt += `- ${e.roleTitle} at ${e.company} (${e.startDate} - ${e.endDate || 'Present'})\n`;
      if (e.description) txt += `  ${e.description}\n`;
    }
    txt += `\nEDUCATION:\n`;
    for (const ed of edu) {
      txt += `- ${ed.degree} in ${ed.fieldOfStudy || ''}, ${ed.institution} (${ed.startDate} - ${ed.endDate || 'Present'})\n`;
    }
    txt += `\nCREDENTIALS & CERTIFICATIONS:\n`;
    for (const cr of cred) {
      txt += `- ${cr.name} (${cr.issuingOrganization}, Issued ${cr.issueDate})\n`;
    }
    txt += `\nAPPROVED CLAIMS:\n`;
    for (const cl of claims) {
      txt += `- ${cl.wording}\n`;
    }

    c.header('Content-Type', 'text/plain; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="${variant.slug}-resume.txt"`);
    return c.text(txt);
  }

  if (format === 'md' || format === 'markdown') {
    let md = `# ${profile?.displayName || 'Professional Profile'}\n\n`;
    md += `**${profile?.headline || ''}**  \n`;
    md += `📍 ${profile?.location || ''}  \n\n`;
    md += `## Summary\n\n${profile?.bio || ''}\n\n`;

    md += `## Work Experience\n\n`;
    for (const e of exp) {
      md += `### ${e.roleTitle} — ${e.company}\n`;
      md += `*${e.startDate} – ${e.endDate || 'Present'}* | ${e.location || ''}\n\n`;
      if (e.description) md += `${e.description}\n\n`;
    }

    md += `## Education\n\n`;
    for (const ed of edu) {
      md += `### ${ed.degree} ${ed.fieldOfStudy ? `in ${ed.fieldOfStudy}` : ''}\n`;
      md += `**${ed.institution}** (*${ed.startDate} – ${ed.endDate || 'Present'}*)\n\n`;
    }

    md += `## Certifications\n\n`;
    for (const cr of cred) {
      md += `- **${cr.name}** — ${cr.issuingOrganization} (${cr.issueDate})\n`;
    }

    md += `\n## Approved Professional Claims\n\n`;
    for (const cl of claims) {
      md += `- ${cl.wording}\n`;
    }

    c.header('Content-Type', 'text/markdown; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="${variant.slug}-resume.md"`);
    return c.text(md);
  }

  if (format === 'html') {
    let html = `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><title>${profile?.displayName || 'Professional Profile'} - Résumé</title></head>\n<body>\n`;
    html += `<h1>${profile?.displayName || 'Professional Profile'}</h1>\n<p><strong>${profile?.headline || ''}</strong></p>\n<p>${profile?.bio || ''}</p>\n`;
    html += `<h2>Experience</h2>\n<ul>\n`;
    for (const e of exp) {
      html += `<li><strong>${e.roleTitle}</strong> at ${e.company} (${e.startDate} - ${e.endDate || 'Present'})</li>\n`;
    }
    html += `</ul>\n<h2>Education</h2>\n<ul>\n`;
    for (const ed of edu) {
      html += `<li><strong>${ed.degree}</strong>, ${ed.institution}</li>\n`;
    }
    html += `</ul>\n</body>\n</html>`;

    c.header('Content-Type', 'text/html; charset=utf-8');
    c.header('Content-Disposition', `inline; filename="${variant.slug}-resume.html"`);
    return c.html(html);
  }

  return c.json(
    {
      code: 'UNSUPPORTED_FORMAT',
      message: 'Format must be one of: json, txt, md, html.',
      requestId: c.get('requestId'),
    },
    400,
  );
});

// Public activity heatmap endpoint
publicRoutes.get('/activity', async (c) => {
  const timezone = c.req.query('timezone') || 'Asia/Karachi';
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 364 * 86400 * 1000).toISOString();
  const nowIso = now.toISOString();

  // Query publicly eligible events from D1
  const sql = `
    SELECT id, captured_at as date_iso, evidence_type as type, visibility, 'published' as state
    FROM evidence_items
    WHERE visibility = 'public' AND archived_at IS NULL
    UNION ALL
    SELECT id, created_at as date_iso, 'journal_entry' as type, visibility, state
    FROM content_items
    WHERE visibility = 'public' AND state = 'published' AND deleted_at IS NULL
    UNION ALL
    SELECT id, deployed_at as date_iso, 'deployment' as type, visibility, 'published' as state
    FROM deployments
    WHERE visibility = 'public' AND status = 'success'
    UNION ALL
    SELECT id, created_at as date_iso, 'project_milestone' as type, visibility, state
    FROM projects
    WHERE visibility = 'public' AND state = 'published' AND deleted_at IS NULL
  `;

  const { results } = await c.env.DB.prepare(sql).all<Record<string, unknown>>();
  const events = (results ?? []).map((row) => ({
    id: String(row.id),
    dateIso: String(row.date_iso || new Date().toISOString()),
    type: String(row.type),
    visibility: String(row.visibility) as 'public' | 'private',
    isPublished: true,
  }));

  const projection = computeActivityHeatmap(events, oneYearAgo, nowIso, timezone, true);
  return c.json({ projection, requestId: c.get('requestId') });
});

// Contact form mutation endpoint
publicRoutes.post('/contact', async (c) => {
  const parsed = ContactMessageRequestSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json(
      {
        code: 'INVALID_PAYLOAD',
        message: 'Enter a valid name, email address, and message.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  // Honeypot submissions get a neutral response without spending email quota.
  if (parsed.data.website) {
    return c.json({ success: true, status: 'accepted', requestId: c.get('requestId') });
  }

  if (!parsed.data.turnstileToken) {
    return c.json(
      {
        code: 'CONTACT_VERIFICATION_REQUIRED',
        message: 'Complete the verification before sending your message.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  if (!c.env.TURNSTILE_SECRET_KEY || !c.env.RESEND_API_KEY || !c.env.CONTACT_FROM_EMAIL) {
    return c.json(
      {
        code: 'CONTACT_UNAVAILABLE',
        message: 'Message delivery is temporarily unavailable.',
        requestId: c.get('requestId'),
      },
      503,
    );
  }

  const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: c.env.TURNSTILE_SECRET_KEY,
      response: parsed.data.turnstileToken,
      remoteip: c.req.header('CF-Connecting-IP'),
      idempotency_key: c.get('requestId'),
    }),
  });
  const verificationResult = (await verification.json().catch(() => ({}))) as {
    success?: boolean;
    action?: string;
  };
  if (!verification.ok || !verificationResult.success || verificationResult.action !== 'contact') {
    return c.json(
      {
        code: 'CONTACT_VERIFICATION_FAILED',
        message: 'Verification failed. Please try again.',
        requestId: c.get('requestId'),
      },
      403,
    );
  }

  const { D1ProfileRepository } = await import('@usmanalii/database');
  const profile = await new D1ProfileRepository(c.env.DB).getOwnerContactTarget();
  if (!profile?.contactEmail) {
    return c.json(
      {
        code: 'CONTACT_UNAVAILABLE',
        message: 'No contact destination has been configured.',
        requestId: c.get('requestId'),
      },
      503,
    );
  }

  const delivery = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: c.env.CONTACT_FROM_EMAIL,
      to: [profile.contactEmail],
      reply_to: parsed.data.email,
      subject: parsed.data.subject || `Portfolio message from ${parsed.data.name}`,
      text: `Name: ${parsed.data.name}\nEmail: ${parsed.data.email}\n\n${parsed.data.message}`,
    }),
  });

  if (!delivery.ok) {
    console.error(JSON.stringify({ event: 'contact_delivery_failed', status: delivery.status }));
    return c.json(
      {
        code: 'CONTACT_DELIVERY_FAILED',
        message: 'The message could not be delivered. Please try again later.',
        requestId: c.get('requestId'),
      },
      502,
    );
  }

  return c.json({
    success: true,
    status: 'sent',
    message: 'Your message was sent successfully.',
    requestId: c.get('requestId'),
  });
});

// ----------------------------------------------------------------------------
// Public Journey Endpoints — Requirement 13, 14, 15, 16, 17
// ----------------------------------------------------------------------------

/** GET /api/v1/public/journey — List published public journey entries */
publicRoutes.get('/journey', async (c) => {
  const typeQuery = c.req.query('type');
  const dateQuery = c.req.query('date');
  const repo = new D1ContentRepository(c.env.DB);

  const filters: { contentType?: ContentType; yearMonth?: string } = {};
  if (typeQuery) filters.contentType = typeQuery as ContentType;
  if (dateQuery) filters.yearMonth = dateQuery;

  const items = await repo.getPublicPublishedEntries(filters);
  if (!items.length) return c.json({ items: [], requestId: c.get('requestId') });

  const ids = items.map((item) => String(item.id));
  const placeholders = ids.map(() => '?').join(', ');
  const [metadataResult, tagsResult, commentsResult] = await Promise.all([
    c.env.DB.prepare(
      `SELECT id, cover_image_url, is_featured, comments_enabled, seo_title, seo_description
       FROM content_items WHERE id IN (${placeholders})`,
    )
      .bind(...ids)
      .all<Record<string, unknown>>(),
    c.env.DB.prepare(
      `SELECT jet.content_item_id, jt.name, jt.slug
       FROM journal_entry_tags jet JOIN journal_tags jt ON jt.id = jet.tag_id
       WHERE jet.content_item_id IN (${placeholders}) ORDER BY jet.ordering, jt.name`,
    )
      .bind(...ids)
      .all<{ content_item_id: string; name: string; slug: string }>(),
    c.env.DB.prepare(
      `SELECT content_item_id, COUNT(*) AS count FROM journal_comments
       WHERE moderation_state = 'approved' AND content_item_id IN (${placeholders})
       GROUP BY content_item_id`,
    )
      .bind(...ids)
      .all<{ content_item_id: string; count: number }>(),
  ]);
  const metadata = new Map((metadataResult.results ?? []).map((row) => [String(row.id), row]));
  const tags = new Map<string, { name: string; slug: string }[]>();
  for (const row of tagsResult.results ?? []) {
    tags.set(row.content_item_id, [
      ...(tags.get(row.content_item_id) ?? []),
      { name: row.name, slug: row.slug },
    ]);
  }
  const comments = new Map(
    (commentsResult.results ?? []).map((row) => [row.content_item_id, Number(row.count)]),
  );
  return c.json({
    items: items.map((item) => {
      const itemId = String(item.id);
      const meta = metadata.get(itemId) ?? {};
      return {
        ...item,
        coverImageUrl: meta.cover_image_url ? String(meta.cover_image_url) : null,
        isFeatured: Number(meta.is_featured ?? 0) === 1,
        commentsEnabled: Number(meta.comments_enabled ?? 1) === 1,
        tags: tags.get(itemId) ?? [],
        approvedCommentCount: comments.get(itemId) ?? 0,
      };
    }),
    requestId: c.get('requestId'),
  });
});

/** GET /api/v1/public/journey/:slug — Get published entry by slug */
publicRoutes.get('/journey/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (slug === 'preview') {
    return c.json(
      {
        code: 'NOT_FOUND',
        message:
          'Preview endpoint has been moved under Cloudflare Access protected private routes.',
        requestId: c.get('requestId'),
      },
      404,
    );
  }
  if (!c.env?.DB) {
    return c.json(
      { code: 'NOT_FOUND', message: 'Published entry not found.', requestId: c.get('requestId') },
      404,
    );
  }

  const repo = new D1ContentRepository(c.env.DB);

  const found = await repo.getPublicPublishedEntryBySlug(slug);
  if (!found) {
    return c.json(
      { code: 'NOT_FOUND', message: 'Published entry not found.', requestId: c.get('requestId') },
      404,
    );
  }

  const blocks = found.bodySnapshot ? JSON.parse(found.bodySnapshot) : [];

  const itemId = String(found.item.id);
  const relationshipBlocks = Array.isArray(blocks)
    ? (blocks as Record<string, unknown>[]).filter((block) => block.type === 'relationship_tag')
    : [];
  const projectIds = relationshipBlocks
    .filter((block) => block.entityType === 'project')
    .map((block) => String(block.entityId));
  const capabilityIds = relationshipBlocks
    .filter((block) => block.entityType === 'capability')
    .map((block) => String(block.entityId));
  const skillIds = relationshipBlocks
    .filter((block) => block.entityType === 'skill')
    .map((block) => String(block.entityId));
  const evidenceIds = relationshipBlocks
    .filter((block) => block.entityType === 'evidence')
    .map((block) => String(block.entityId));
  const artifactIds = Array.isArray(blocks)
    ? (blocks as Record<string, unknown>[])
        .filter((block) => block.type === 'embed_artifact')
        .map((block) => String(block.artifactId))
    : [];
  const selectIds = async (sql: string, selectedIds: string[]) => {
    if (!selectedIds.length) return [] as Record<string, unknown>[];
    const selectedPlaceholders = selectedIds.map(() => '?').join(', ');
    const result = await c.env.DB.prepare(sql.replace('__IDS__', selectedPlaceholders))
      .bind(...selectedIds)
      .all<Record<string, unknown>>();
    return result.results ?? [];
  };
  const [
    metadata,
    tagsResult,
    skillsResult,
    evidenceResult,
    projects,
    capabilities,
    artifacts,
    reactions,
    author,
    taggedSkills,
    taggedEvidence,
  ] = await Promise.all([
    c.env.DB.prepare(
      `SELECT cover_image_url, comments_enabled, seo_title, seo_description FROM content_items WHERE id = ?`,
    )
      .bind(itemId)
      .first<Record<string, unknown>>(),
    c.env.DB.prepare(
      `SELECT jt.name, jt.slug FROM journal_entry_tags jet JOIN journal_tags jt ON jt.id = jet.tag_id WHERE jet.content_item_id = ? ORDER BY jet.ordering, jt.name`,
    )
      .bind(itemId)
      .all<{ name: string; slug: string }>(),
    c.env.DB.prepare(
      `SELECT s.id, s.name, s.slug, s.category FROM content_skills cs JOIN skills s ON s.id = cs.skill_id WHERE cs.content_item_id = ? AND s.visibility = 'public' AND s.lifecycle_state <> 'archived' AND s.archived_at IS NULL ORDER BY s.name`,
    )
      .bind(itemId)
      .all<Record<string, unknown>>(),
    c.env.DB.prepare(
      `SELECT e.id, e.title, e.description, e.evidence_type AS evidenceType, e.verification_state AS verificationState FROM evidence_links el JOIN evidence_items e ON e.id = el.evidence_item_id WHERE el.content_item_id = ? AND el.approval_state = 'approved' AND e.visibility = 'public' AND e.verification_state IN ('owner_verified', 'source_verified', 'automatically_observed') AND e.archived_at IS NULL AND e.deleted_at IS NULL ORDER BY el.created_at`,
    )
      .bind(itemId)
      .all<Record<string, unknown>>(),
    selectIds(
      `SELECT id, title, slug, description AS shortSummary FROM projects WHERE id IN (__IDS__) AND visibility = 'public' AND state = 'published' AND deleted_at IS NULL`,
      projectIds,
    ),
    selectIds(
      `SELECT id, title, slug, outcome_statement AS outcomeStatement FROM capabilities WHERE id IN (__IDS__) AND visibility = 'public' AND state = 'published' AND archived_at IS NULL`,
      capabilityIds,
    ),
    selectIds(
      `SELECT id, title, artifact_type AS artifactType, media_type AS mediaType FROM artifacts WHERE id IN (__IDS__) AND visibility = 'public' AND archived_at IS NULL AND deleted_at IS NULL`,
      artifactIds,
    ),
    journalReactionCounts(c.env.DB, itemId),
    new D1ProfileRepository(c.env.DB).getPublicProfile(),
    selectIds(
      `SELECT id, name, slug, category FROM skills WHERE id IN (__IDS__) AND visibility = 'public' AND lifecycle_state <> 'archived' AND archived_at IS NULL`,
      skillIds,
    ),
    selectIds(
      `SELECT id, title, description, evidence_type AS evidenceType, verification_state AS verificationState FROM evidence_items WHERE id IN (__IDS__) AND visibility = 'public' AND verification_state IN ('owner_verified', 'source_verified', 'automatically_observed') AND archived_at IS NULL AND deleted_at IS NULL`,
      evidenceIds,
    ),
  ]);

  return c.json({
    item: {
      ...found.item,
      coverImageUrl: metadata?.cover_image_url ? String(metadata.cover_image_url) : null,
      commentsEnabled: Number(metadata?.comments_enabled ?? 1) === 1,
    },
    blocks,
    tags: tagsResult.results ?? [],
    skills: Array.from(
      new Map(
        [...(skillsResult.results ?? []), ...taggedSkills].map((record) => [
          String(record.id),
          record,
        ]),
      ).values(),
    ),
    evidence: Array.from(
      new Map(
        [...(evidenceResult.results ?? []), ...taggedEvidence].map((record) => [
          String(record.id),
          record,
        ]),
      ).values(),
    ),
    projects,
    capabilities,
    artifacts,
    reactions,
    author: author
      ? {
          displayName: author.displayName,
          headline: author.headline,
          profileImageUrl: author.profileImageUrl,
        }
      : null,
    requestId: c.get('requestId'),
  });
});

/** Reader responses are moderated and are never evidence or professional claims. */
publicRoutes.get('/journey/:slug/comments', async (c) => {
  const entry = await c.env.DB.prepare(
    `SELECT id FROM content_items
     WHERE slug = ? AND visibility = 'public' AND state = 'published'
       AND deleted_at IS NULL AND archived_at IS NULL`,
  )
    .bind(c.req.param('slug'))
    .first<{ id: string }>();
  if (!entry) {
    return c.json(
      { code: 'NOT_FOUND', message: 'Published entry not found.', requestId: c.get('requestId') },
      404,
    );
  }
  const result = await c.env.DB.prepare(
    `SELECT id, parent_comment_id AS parentCommentId, author_name AS authorName,
            body, created_at AS createdAt
     FROM journal_comments
     WHERE content_item_id = ? AND moderation_state = 'approved'
     ORDER BY created_at ASC`,
  )
    .bind(entry.id)
    .all<{
      id: string;
      parentCommentId: string | null;
      authorName: string;
      body: string;
      createdAt: string;
    }>();
  const rows = result.results ?? [];
  const replies = new Map<string, typeof rows>();
  for (const row of rows.filter((comment) => comment.parentCommentId)) {
    replies.set(row.parentCommentId!, [...(replies.get(row.parentCommentId!) ?? []), row]);
  }
  const comments = rows
    .filter((comment) => !comment.parentCommentId)
    .map((comment) => ({ ...comment, replies: replies.get(comment.id) ?? [] }));
  return c.json({ comments, count: comments.length, requestId: c.get('requestId') });
});

publicRoutes.post('/journey/:slug/comments', async (c) => {
  const parsed = JournalCommentRequestSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json(
      {
        code: 'INVALID_PAYLOAD',
        message: 'Enter a valid name, email, and response between 10 and 2,000 characters.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }
  if (parsed.data.company) {
    return c.json({
      success: true,
      status: 'pending',
      message: 'Response submitted for review.',
      requestId: c.get('requestId'),
    });
  }
  const entry = await c.env.DB.prepare(
    `SELECT id, comments_enabled FROM content_items
     WHERE slug = ? AND visibility = 'public' AND state = 'published'
       AND deleted_at IS NULL AND archived_at IS NULL`,
  )
    .bind(c.req.param('slug'))
    .first<{ id: string; comments_enabled: number }>();
  if (!entry) {
    return c.json(
      { code: 'NOT_FOUND', message: 'Published entry not found.', requestId: c.get('requestId') },
      404,
    );
  }
  if (Number(entry.comments_enabled) !== 1) {
    return c.json(
      {
        code: 'COMMENTS_CLOSED',
        message: 'Responses are closed for this entry.',
        requestId: c.get('requestId'),
      },
      403,
    );
  }
  if (!(await verifyJournalTurnstile(c, parsed.data.turnstileToken))) {
    return c.json(
      {
        code: 'COMMENT_VERIFICATION_FAILED',
        message: 'Verification failed. Please try again.',
        requestId: c.get('requestId'),
      },
      403,
    );
  }
  if (parsed.data.authorWebsite) {
    try {
      const url = new URL(parsed.data.authorWebsite);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsafe');
    } catch {
      return c.json(
        {
          code: 'INVALID_WEBSITE',
          message: 'Website must be a valid public HTTP or HTTPS address.',
          requestId: c.get('requestId'),
        },
        400,
      );
    }
  }
  const fingerprint = await visitorFingerprint(c);
  const recent = await c.env.DB.prepare(
    `SELECT COUNT(*) AS count FROM journal_comments
     WHERE request_fingerprint = ? AND created_at >= datetime('now', '-1 hour')`,
  )
    .bind(fingerprint)
    .first<{ count: number }>();
  if (Number(recent?.count ?? 0) >= 3) {
    return c.json(
      {
        code: 'COMMENT_RATE_LIMITED',
        message: 'Too many recent responses. Please try again later.',
        requestId: c.get('requestId'),
      },
      429,
    );
  }
  if (parsed.data.parentCommentId) {
    const parent = await c.env.DB.prepare(
      `SELECT id FROM journal_comments
       WHERE id = ? AND content_item_id = ? AND moderation_state = 'approved'
         AND parent_comment_id IS NULL`,
    )
      .bind(parsed.data.parentCommentId, entry.id)
      .first<{ id: string }>();
    if (!parent) {
      return c.json(
        {
          code: 'INVALID_PARENT',
          message: 'The parent response is unavailable.',
          requestId: c.get('requestId'),
        },
        400,
      );
    }
  }
  const commentId = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO journal_comments (
       id, content_item_id, parent_comment_id, author_name, author_email,
       author_website, body, moderation_state, request_fingerprint, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
  )
    .bind(
      commentId,
      entry.id,
      parsed.data.parentCommentId ?? null,
      parsed.data.name,
      parsed.data.email.toLowerCase(),
      parsed.data.authorWebsite || null,
      parsed.data.body,
      fingerprint,
      new Date().toISOString(),
    )
    .run();

  if (c.env.RESEND_API_KEY && c.env.CONTACT_FROM_EMAIL) {
    try {
      const { D1ProfileRepository } = await import('@usmanalii/database');
      const profile = await new D1ProfileRepository(c.env.DB).getOwnerContactTarget();
      if (profile?.contactEmail) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: c.env.CONTACT_FROM_EMAIL,
            to: [profile.contactEmail],
            subject: `Journal response awaiting review: ${c.req.param('slug')}`,
            text: `A new response from ${parsed.data.name} is waiting in the Command Center moderation queue.\n\n${parsed.data.body}`,
          }),
        });
      }
    } catch {
      console.error(JSON.stringify({ event: 'journal_comment_notification_failed', commentId }));
    }
  }
  return c.json(
    {
      success: true,
      status: 'pending',
      message: 'Response submitted for owner approval.',
      requestId: c.get('requestId'),
    },
    202,
  );
});

publicRoutes.post('/journey/:slug/reactions', async (c) => {
  const parsed = JournalReactionRequestSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json(
      {
        code: 'INVALID_REACTION',
        message: 'Choose a supported reaction.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }
  const entry = await c.env.DB.prepare(
    `SELECT id FROM content_items
     WHERE slug = ? AND visibility = 'public' AND state = 'published'
       AND deleted_at IS NULL AND archived_at IS NULL`,
  )
    .bind(c.req.param('slug'))
    .first<{ id: string }>();
  if (!entry) {
    return c.json(
      { code: 'NOT_FOUND', message: 'Published entry not found.', requestId: c.get('requestId') },
      404,
    );
  }
  const fingerprint = await visitorFingerprint(c);
  const result = await c.env.DB.prepare(
    `INSERT INTO journal_reactions
       (id, content_item_id, reaction_type, request_fingerprint, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(content_item_id, reaction_type, request_fingerprint) DO NOTHING`,
  )
    .bind(
      crypto.randomUUID(),
      entry.id,
      parsed.data.reaction,
      fingerprint,
      new Date().toISOString(),
    )
    .run();
  const reactions = await journalReactionCounts(c.env.DB, entry.id);
  if (Number(result.meta?.changes ?? 0) === 0) {
    return c.json(
      {
        code: 'REACTION_EXISTS',
        message: 'You already recorded this reaction.',
        reactions,
        requestId: c.get('requestId'),
      },
      409,
    );
  }
  return c.json({ success: true, reactions, requestId: c.get('requestId') });
});

// ----------------------------------------------------------------------------
// Public Evidence & Artifact Endpoints (Requirement 6, 8)
// SECURITY: Only exposes eligible public evidence & artifacts.
// Private evidence & artifacts return 404 NOT_FOUND to prevent existence leakage.
// ----------------------------------------------------------------------------

/** GET /api/v1/public/evidence — List public eligible evidence items */
publicRoutes.get('/evidence', async (c) => {
  if (!c.env?.DB) {
    return c.json({ items: [], requestId: c.get('requestId') });
  }
  const repo = new D1EvidenceRepository(c.env.DB);
  const items = await repo.getPublicEvidence();
  const filtered = filterPublicEvidence(items);

  // Redact private fields
  const publicDtos = filtered.map((e) => ({
    id: e.id,
    evidenceType: e.evidenceType,
    sourceType: e.sourceType,
    provider: e.provider,
    title: e.title,
    description: e.description,
    canonicalLocator: e.canonicalLocator,
    verificationState: e.verificationState,
    occurredAt: e.occurredAt,
  }));

  return c.json({ items: publicDtos, requestId: c.get('requestId') });
});

/** GET /api/v1/public/evidence/:id — Get public eligible evidence item by ID */
publicRoutes.get('/evidence/:id', async (c) => {
  const id = c.req.param('id');
  if (!c.env?.DB) {
    return c.json(
      {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Evidence item not found.',
        requestId: c.get('requestId'),
      },
      404,
    );
  }
  const repo = new D1EvidenceRepository(c.env.DB);
  const found = await repo.getPublicEvidenceById(id);

  if (!found) {
    return c.json(
      {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Evidence item not found.',
        requestId: c.get('requestId'),
      },
      404,
    );
  }

  const eligible = filterPublicEvidence([found]);
  if (eligible.length === 0) {
    return c.json(
      {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Evidence item not found.',
        requestId: c.get('requestId'),
      },
      404,
    );
  }

  return c.json({
    item: {
      id: found.id,
      evidenceType: found.evidenceType,
      sourceType: found.sourceType,
      provider: found.provider,
      title: found.title,
      description: found.description,
      canonicalLocator: found.canonicalLocator,
      verificationState: found.verificationState,
      occurredAt: found.occurredAt,
    },
    requestId: c.get('requestId'),
  });
});

/** GET /api/v1/public/artifacts/:id/download — Public R2 binary download (checks public eligibility) */
publicRoutes.get('/artifacts/:id/download', async (c) => {
  const id = c.req.param('id');
  if (!c.env?.DB) {
    return c.json(
      { code: 'RESOURCE_NOT_FOUND', message: 'Artifact not found.', requestId: c.get('requestId') },
      404,
    );
  }
  const repo = new D1ArtifactRepository(c.env.DB);
  const artifact = await repo.getPublicArtifactById(id);

  if (!artifact) {
    return c.json(
      { code: 'RESOURCE_NOT_FOUND', message: 'Artifact not found.', requestId: c.get('requestId') },
      404,
    );
  }

  const eligible = filterPublicArtifacts([artifact]);
  if (eligible.length === 0) {
    return c.json(
      { code: 'RESOURCE_NOT_FOUND', message: 'Artifact not found.', requestId: c.get('requestId') },
      404,
    );
  }

  const r2 = c.env.ARTIFACTS_BUCKET || c.env.R2_PUBLIC || c.env.R2_PRIVATE;
  if (r2 && typeof r2.get === 'function') {
    const object = await r2.get(artifact.r2Key);
    if (object && object.body) {
      c.header('Content-Type', artifact.mediaType || 'application/octet-stream');
      c.header(
        'Content-Disposition',
        formatContentDisposition(artifact.originalName || 'artifact'),
      );
      c.header('Content-Security-Policy', "default-src 'none'");
      c.header('X-Content-Type-Options', 'nosniff');
      c.header('Cache-Control', 'public, no-cache, must-revalidate');
      return c.body(object.body as unknown as ReadableStream);
    }
  }

  return c.json({
    message:
      'Public artifact metadata verified. Binary content delivered in R2 production binding.',
    data: {
      id: artifact.id,
      title: artifact.title,
      artifactType: artifact.artifactType,
      mediaType: artifact.mediaType,
      byteSize: artifact.byteSize,
      originalName: artifact.originalName,
    },
    requestId: c.get('requestId'),
  });
});

/** GET /api/v1/public/skills — List public skills */
publicRoutes.get('/skills', async (c) => {
  const { D1SkillRepository } = await import('@usmanalii/database');
  const repo = new D1SkillRepository(c.env.DB);
  const ownerId = '00000000-0000-0000-0000-000000000001' as EntityId;
  const skills = await repo.listSkillsByOwner(ownerId, { visibility: 'public' });
  return c.json({ data: skills, count: skills.length, requestId: c.get('requestId') });
});

/** GET /api/v1/public/skills/:slug — Get public skill by slug */
publicRoutes.get('/skills/:slug', async (c) => {
  const { D1SkillRepository } = await import('@usmanalii/database');
  const repo = new D1SkillRepository(c.env.DB);
  const ownerId = '00000000-0000-0000-0000-000000000001' as EntityId;
  const slug = c.req.param('slug');

  const skill = await repo.getSkillBySlug(ownerId, slug);
  if (!skill || skill.visibility !== 'public') {
    return c.json(
      { code: 'RESOURCE_NOT_FOUND', message: 'Skill not found.', requestId: c.get('requestId') },
      404,
    );
  }
  return c.json({ data: skill, requestId: c.get('requestId') });
});

/** GET /api/v1/public/capabilities — List public capabilities */
publicRoutes.get('/capabilities', async (c) => {
  const { D1CapabilityRepository } = await import('@usmanalii/database');
  const repo = new D1CapabilityRepository(c.env.DB);
  const ownerId = '00000000-0000-0000-0000-000000000001' as EntityId;
  const capabilities = await repo.listCapabilitiesByOwner(ownerId, {
    visibility: 'public',
    state: 'published',
  });
  return c.json({ data: capabilities, count: capabilities.length, requestId: c.get('requestId') });
});

/** GET /api/v1/public/capabilities/:slug — Get public capability by slug */
publicRoutes.get('/capabilities/:slug', async (c) => {
  const { D1CapabilityRepository } = await import('@usmanalii/database');
  const repo = new D1CapabilityRepository(c.env.DB);
  const ownerId = '00000000-0000-0000-0000-000000000001' as EntityId;
  const slug = c.req.param('slug');

  const cap = await repo.getCapabilityBySlug(ownerId, slug);
  if (!cap || cap.visibility !== 'public' || cap.state !== 'published') {
    return c.json(
      {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Capability not found.',
        requestId: c.get('requestId'),
      },
      404,
    );
  }
  return c.json({ data: cap, requestId: c.get('requestId') });
});

/**
 * Milestone M5 — Public Projects API Routes
 */

type PublicConnectionRecord = Record<string, unknown>;

function safeJsonIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

async function queryRows(
  db: D1Database,
  sql: string,
  params: readonly unknown[],
): Promise<PublicConnectionRecord[]> {
  const result = await db
    .prepare(sql)
    .bind(...params)
    .all<PublicConnectionRecord>();
  return result.results ?? [];
}

async function loadPublicProjectConnections(params: {
  db: D1Database;
  ownerId: string;
  project: { id: string; heroArtifactId?: string | null };
  adrs: readonly { id: string; supportingEvidenceIds?: readonly string[] }[];
  experiments: readonly {
    id: string;
    supportingEvidenceIds?: readonly string[];
    artifactIds?: readonly string[];
  }[];
  debuggingLessons: readonly {
    id: string;
    supportingEvidenceIds?: readonly string[];
    artifactIds?: readonly string[];
  }[];
  deployments: readonly {
    id: string;
    supportingEvidenceIds?: readonly string[];
    artifactIds?: readonly string[];
  }[];
  versions: readonly {
    id: string;
    supportingEvidenceIds?: readonly string[];
    artifactIds?: readonly string[];
  }[];
  contributions: readonly { supportingEvidenceIds?: readonly string[] }[];
}) {
  const { db, ownerId, project } = params;
  const now = new Date().toISOString();
  const childTargets = [
    ...params.adrs.map((record) => ({ column: 'adr_id', id: record.id })),
    ...params.experiments.map((record) => ({ column: 'experiment_id', id: record.id })),
    ...params.debuggingLessons.map((record) => ({ column: 'debugging_lesson_id', id: record.id })),
    ...params.deployments.map((record) => ({ column: 'deployment_id', id: record.id })),
  ];
  const targetClauses = ['el.project_id = ?'];
  const targetParams: unknown[] = [project.id];
  for (const target of childTargets) {
    targetClauses.push(`el.${target.column} = ?`);
    targetParams.push(target.id);
  }

  const explicitEvidenceIds = new Set<string>();
  const artifactIds = new Set<string>();
  if (project.heroArtifactId) artifactIds.add(project.heroArtifactId);
  for (const record of [
    ...params.adrs,
    ...params.experiments,
    ...params.debuggingLessons,
    ...params.deployments,
    ...params.versions,
    ...params.contributions,
  ]) {
    for (const id of safeJsonIds(record.supportingEvidenceIds)) explicitEvidenceIds.add(id);
    if ('artifactIds' in record) {
      for (const id of safeJsonIds(record.artifactIds)) artifactIds.add(id);
    }
  }

  const evidenceIdClause = explicitEvidenceIds.size
    ? ` OR ei.id IN (${[...explicitEvidenceIds].map(() => '?').join(', ')})`
    : '';
  const evidenceParams = [...targetParams, ...explicitEvidenceIds];
  const artifactRelationshipRows = await queryRows(
    db,
    `SELECT target_id FROM project_relationships
     WHERE owner_id = ? AND source_id = ? AND source_type = 'project'
       AND target_type = 'artifact' AND approval_state = 'approved' AND archived_at IS NULL`,
    [ownerId, project.id],
  );
  for (const row of artifactRelationshipRows) {
    if (typeof row.target_id === 'string') artifactIds.add(row.target_id);
  }

  const artifactQuery = artifactIds.size
    ? queryRows(
        db,
        `SELECT id, title, description, artifact_type AS artifactType,
                media_type AS mediaType, byte_size AS byteSize, original_name AS originalName,
                visibility, created_at AS createdAt
         FROM artifacts
         WHERE owner_id = ? AND id IN (${[...artifactIds].map(() => '?').join(', ')})
           AND visibility = 'public' AND deleted_at IS NULL AND archived_at IS NULL`,
        [ownerId, ...artifactIds],
      )
    : Promise.resolve([] as PublicConnectionRecord[]);

  const [evidence, artifacts, skills, capabilities, journalLinks, relatedProjects, roles] =
    await Promise.all([
      queryRows(
        db,
        `SELECT DISTINCT ei.id, ei.title, ei.description,
                ei.evidence_type AS evidenceType, ei.source_type AS sourceType,
                ei.provider, ei.canonical_locator AS canonicalLocator,
                ei.verification_state AS verificationState, ei.occurred_at AS occurredAt,
                ei.visibility,
                CASE
                  WHEN el.project_id IS NOT NULL THEN 'project'
                  WHEN el.adr_id IS NOT NULL THEN 'adr'
                  WHEN el.experiment_id IS NOT NULL THEN 'experiment'
                  WHEN el.debugging_lesson_id IS NOT NULL THEN 'debugging_lesson'
                  WHEN el.deployment_id IS NOT NULL THEN 'deployment'
                  ELSE 'engineering_record'
                END AS targetType,
                COALESCE(el.project_id, el.adr_id, el.experiment_id,
                         el.debugging_lesson_id, el.deployment_id) AS targetId,
                el.support_type AS supportType, el.rationale, el.relevance,
                'approved' AS approvalState
         FROM evidence_items ei
         LEFT JOIN evidence_links el ON el.evidence_item_id = ei.id AND el.approval_state = 'approved'
         WHERE ei.owner_id = ? AND ei.visibility = 'public'
           AND ei.deleted_at IS NULL AND ei.archived_at IS NULL
           AND ei.verification_state NOT IN ('disputed', 'revoked', 'archived')
           AND (ei.embargo_until IS NULL OR ei.embargo_until <= ?)
           AND ((${targetClauses.join(' OR ')})${evidenceIdClause})`,
        [ownerId, now, ...evidenceParams],
      ),
      artifactQuery,
      queryRows(
        db,
        `SELECT s.id, s.name, s.slug, s.description, s.category, s.skill_type AS skillType,
                s.visibility, 'approved' AS approvalState
         FROM project_skills ps
         JOIN skills s ON s.id = ps.skill_id
         WHERE ps.project_id = ? AND s.owner_id = ?
           AND s.visibility = 'public' AND s.archived_at IS NULL`,
        [project.id, ownerId],
      ),
      queryRows(
        db,
        `SELECT DISTINCT c.id, c.title, c.slug, c.description, c.outcome_statement AS outcomeStatement,
                c.maturity, c.maturity_rationale AS maturityRationale,
                c.visibility, c.state, 'approved' AS approvalState
         FROM capabilities c
         LEFT JOIN capability_skill_relationships csr
           ON csr.capability_id = c.id AND csr.approval_state = 'accepted' AND csr.archived_at IS NULL
         LEFT JOIN project_skills ps ON ps.skill_id = csr.skill_id AND ps.project_id = ?
         LEFT JOIN project_relationships pr
           ON pr.target_id = c.id AND pr.target_type = 'capability'
          AND pr.source_id = ? AND pr.source_type = 'project'
          AND pr.approval_state = 'approved' AND pr.archived_at IS NULL
         WHERE c.owner_id = ? AND c.visibility = 'public' AND c.state = 'published'
           AND c.archived_at IS NULL AND (ps.project_id IS NOT NULL OR pr.id IS NOT NULL)`,
        [project.id, project.id, ownerId],
      ),
      queryRows(
        db,
        `SELECT ci.id, ci.title, ci.slug, ci.summary, ci.content_type AS contentType,
                ci.occurred_at AS occurredAt, ci.published_at AS publishedAt,
                ci.visibility, ci.state, pr.relationship_type AS relationshipType,
                pr.relevance, 'approved' AS approvalState
         FROM project_relationships pr
         JOIN content_items ci ON ci.id = pr.target_id
         WHERE pr.owner_id = ? AND pr.source_id = ? AND pr.source_type = 'project'
           AND pr.target_type IN ('journey', 'content_item')
           AND pr.approval_state = 'approved' AND pr.archived_at IS NULL
           AND ci.visibility = 'public' AND ci.state = 'published'
           AND ci.deleted_at IS NULL AND ci.archived_at IS NULL
           AND (ci.scheduled_for IS NULL OR ci.scheduled_for <= ?)
           AND (ci.embargo_until IS NULL OR ci.embargo_until <= ?)`,
        [ownerId, project.id, now, now],
      ),
      queryRows(
        db,
        `SELECT p.id, p.title, p.slug, p.description, p.status,
                p.visibility, p.state AS publicationState,
                pr.relationship_type AS relationshipType, pr.relevance,
                'approved' AS approvalState
         FROM project_relationships pr
         JOIN projects p ON p.id = pr.target_id
         WHERE pr.owner_id = ? AND pr.source_id = ? AND pr.source_type = 'project'
           AND pr.target_type = 'project' AND pr.approval_state = 'approved'
           AND pr.archived_at IS NULL AND p.visibility = 'public' AND p.state = 'published'
           AND p.deleted_at IS NULL`,
        [ownerId, project.id],
      ),
      queryRows(
        db,
        `SELECT r.id, r.name, r.slug, r.description, r.color, r.visibility,
                r.publication_state AS publicationState,
                pr.relationship_type AS relationshipType, pr.relevance,
                'approved' AS approvalState
         FROM project_role_links pr
         JOIN career_roles r ON r.id = pr.role_id
         WHERE pr.owner_id = ? AND pr.project_id = ? AND pr.approval_state = 'accepted'
           AND pr.archived_at IS NULL AND r.visibility = 'public'
           AND r.publication_state = 'published' AND r.archived_at IS NULL
         ORDER BY r.ordering ASC, r.name ASC`,
        [ownerId, project.id],
      ),
    ]);

  return { evidence, artifacts, skills, capabilities, journalLinks, relatedProjects, roles };
}

/** GET /api/v1/public/projects — List public eligible projects */
publicRoutes.get('/projects', async (c) => {
  const { D1ProjectRepository } = await import('@usmanalii/database');
  const { getPublicProjectProjection } = await import('@usmanalii/domain');
  const repo = new D1ProjectRepository(c.env.DB);
  const ownerId = '00000000-0000-0000-0000-000000000001';

  const projects = await repo.listProjects(ownerId, {
    visibility: 'public',
    publicationState: 'published',
  });
  const eligible = projects.flatMap((project) => {
    const projection = getPublicProjectProjection({
      project,
      contributions: [],
      experiments: [],
      adrs: [],
      debuggingLessons: [],
      deployments: [],
      versions: [],
      relationships: [],
    });
    return projection ? [projection.project] : [];
  });

  return c.json({ data: eligible, count: eligible.length, requestId: c.get('requestId') });
});

/** GET /api/v1/public/projects/:slug — Get public eligible project detail */
publicRoutes.get('/projects/:slug', async (c) => {
  const { D1ProjectRepository, D1EngineeringRecordRepository, D1ProjectRelationshipRepository } =
    await import('@usmanalii/database');
  const { getPublicProjectProjection } = await import('@usmanalii/domain');
  const ownerId = '00000000-0000-0000-0000-000000000001';
  const slug = c.req.param('slug');

  const projRepo = new D1ProjectRepository(c.env.DB);
  const project = await projRepo.getProjectBySlug(ownerId, slug);

  if (!project) {
    return c.json(
      { code: 'RESOURCE_NOT_FOUND', message: 'Project not found.', requestId: c.get('requestId') },
      404,
    );
  }

  const engRepo = new D1EngineeringRecordRepository(c.env.DB);
  const relRepo = new D1ProjectRelationshipRepository(c.env.DB);

  const [contributions, experiments, adrs, debuggingLessons, deployments, versions, relationships] =
    await Promise.all([
      engRepo.listContributions(ownerId, project.id),
      engRepo.listExperiments(ownerId, project.id),
      engRepo.listAdrs(ownerId, project.id),
      engRepo.listDebuggingLessons(ownerId, project.id),
      engRepo.listDeployments(ownerId, project.id),
      engRepo.listVersions(ownerId, project.id),
      relRepo.listRelationships(ownerId, project.id),
    ]);

  const connections = await loadPublicProjectConnections({
    db: c.env.DB,
    ownerId,
    project,
    contributions,
    experiments,
    adrs,
    debuggingLessons,
    deployments,
    versions,
  });

  const projection = getPublicProjectProjection({
    project,
    contributions,
    experiments,
    adrs,
    debuggingLessons,
    deployments,
    versions,
    relationships,
    evidence: connections.evidence,
    artifacts: connections.artifacts,
    skills: connections.skills,
    capabilities: connections.capabilities,
    journalLinks: connections.journalLinks,
    relatedProjects: connections.relatedProjects,
    mode: 'deep_dive',
  });

  if (!projection) {
    return c.json(
      { code: 'RESOURCE_NOT_FOUND', message: 'Project not found.', requestId: c.get('requestId') },
      404,
    );
  }

  return c.json({
    data: { ...projection, roles: connections.roles },
    requestId: c.get('requestId'),
  });
});

/** GET /api/v1/public/graph/visualization — Get sanitized public graph projection */
publicRoutes.get('/graph/visualization', async (c) => {
  const { D1CareerGraphRepository } = await import('@usmanalii/database');
  const repo = new D1CareerGraphRepository(c.env.DB);
  const focusType = c.req.query('focusType') as
    | 'universe'
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
    | 'deployment'
    | undefined;
  const projection = await repo.getProjection('00000000-0000-0000-0000-000000000001', {
    publicOnly: true,
    focusType: focusType || 'universe',
    focusId: c.req.query('focusId') || null,
    depth: Math.min(Math.max(Number(c.req.query('depth') || 2), 1), 5),
  });
  return c.json({ data: projection, requestId: c.get('requestId') });
});
