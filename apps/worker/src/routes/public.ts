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
} from '@usmanalii/database';
import { filterPublicEvidence, filterPublicArtifacts } from '@usmanalii/evidence';
import { formatContentDisposition } from './artifacts.js';
import { type ContentType, type EntityId, computeActivityHeatmap } from '@usmanalii/domain';
import { ContactMessageRequestSchema } from '@usmanalii/contracts';

export const publicRoutes = new Hono<{
  Bindings: WorkerEnv;
  Variables: AuthVariables;
}>();

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
  const oneYearAgo = new Date(now.getTime() - 365 * 86400 * 1000).toISOString();
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
  return c.json({ items, requestId: c.get('requestId') });
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

  return c.json({
    item: found.item,
    blocks,
    requestId: c.get('requestId'),
  });
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

  const projection = getPublicProjectProjection({
    project,
    contributions,
    experiments,
    adrs,
    debuggingLessons,
    deployments,
    versions,
    relationships,
  });

  if (!projection) {
    return c.json(
      { code: 'RESOURCE_NOT_FOUND', message: 'Project not found.', requestId: c.get('requestId') },
      404,
    );
  }

  return c.json({
    data: projection,
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
