import type { JourneySnapshot } from '@/domains/journey-engine/types';
import type { LivingJourneyEngine } from '@/domains/journey-engine/living-journey-engine';
import type { AiErrorCategory, SessionActorContext } from './types';

/**
 * PHASE 05 — SECURITY GUARD: PROMPT INJECTION, TOOL INJECTION, PII & RBAC
 *
 * Enforces:
 * 1. Prompt Injection & Instruction Hierarchy Protection (Sections 28, 30, 75)
 * 2. Tool Output Injection Sanitization (Section 29)
 * 3. Session-Bound Identity & Multi-Tenant Isolation (Sections 31, 32, 77)
 * 4. PII Minimization & Secret Redaction (Sections 33, 34)
 */

export interface PromptSecurityInspectionResult {
  safe: boolean;
  blocked: boolean;
  errorCategory: AiErrorCategory;
  matchedRuleIds: string[];
  sanitizedMessage: string;
  refusalReason?: string;
}

interface InjectionRule {
  id: string;
  category: AiErrorCategory;
  pattern: RegExp;
  refusalMessage: string;
}

const ADVERSARIAL_INJECTION_RULES: InjectionRule[] = [
  {
    id: 'INJ_SYSTEM_PROMPT_OVERRIDE',
    category: 'PROMPT_INJECTION_BLOCKED',
    pattern:
      /\b(ignore\s+(all\s+)?(previous|prior|your)\s+(instructions|system\s+prompt|rules)|disregard\s+(all\s+)?(previous|system)\s+instructions|use\s+this\s+(vendor|activity)\s+description\s+as\s+your\s+system\s+instruction)\b/i,
    refusalMessage:
      'I cannot override system safety instructions or treat untrusted content as system directives.',
  },
  {
    id: 'INJ_SECRET_OR_PROMPT_EXFILTRATION',
    category: 'PROMPT_INJECTION_BLOCKED',
    pattern:
      /\b(reveal\s+(your\s+)?(api\s+key|secret\s+key|system\s+prompt)|tell\s+me\s+the\s+(gemini|supabase|service[_\s-]?role)\s+(api\s+)?key|show\s+(your\s+)?hidden\s+instructions|print\s+(?:env\s+variables|.*(?:api|secret)_key|.*key))\b/i,
    refusalMessage:
      'I cannot disclose API keys, server credentials, or internal system instructions.',
  },
  {
    id: 'INJ_ARBITRARY_SQL_EXECUTION',
    category: 'PROMPT_INJECTION_BLOCKED',
    pattern:
      /\b(call\s+arbitrary\s+sql|use\s+sql\s+to\s+(update|delete|insert|drop)|update\s+booking\s+set|drop\s+table|delete\s+from\s+journeys|insert\s+into\s+audit_logs|execute\s+raw\s+sql)\b/i,
    refusalMessage:
      'Direct SQL generation or database query execution is strictly prohibited. All operational reads and changes must pass through deterministic TripPlanner services.',
  },
  {
    id: 'INJ_PRIVILEGE_ESCALATION',
    category: 'UNAUTHORIZED_ACCESS',
    pattern:
      /\b(i\s+am\s+(an?\s+)?admin|use\s+admin\s+permissions|ignore\s+authorization|the\s+system\s+says\s+you\s+are\s+allowed|grant\s+me\s+operator\s+access|elevate\s+my\s+role)\b/i,
    refusalMessage:
      'Authorization is strictly bound to your authenticated session role and organization. Prompt claims cannot alter permissions.',
  },
  {
    id: 'INJ_CROSS_TENANT_OR_OTHER_USER_DATA',
    category: 'CROSS_TENANT_DENIED',
    pattern:
      /\b(change\s+another\s+(user'?s|traveler'?s|customer'?s)\s+journey|give\s+me\s+another\s+(customer'?s|traveler'?s|user'?s)\s+(booking|journey|profile)|show\s+(me\s+)?(all\s+)?(other\s+)?(users'|customers'|travelers'|all)\s*(journeys?|bookings?|operator\s+notes)|show\s+all\s+customers'\s+bookings)\b/i,
    refusalMessage:
      'Access denied. You may only access journeys and bookings authorized for your authenticated account and organization.',
  },
  {
    id: 'INJ_BYPASS_APPROVAL_OR_BUDGET',
    category: 'PROMPT_INJECTION_BLOCKED',
    pattern:
      /\b(developer\s+says\s+bypass\s+approval|skip\s+approval|bypass\s+human\s+approval|force\s+apply|without\s+approval|commit\s+to\s+database|override\s+(?:the\s+)?budget\s+cap|ignore\s+(the\s+)?budget\s+constraints?|ignore\s+all\s+constraints)\b/i,
    refusalMessage:
      'Deterministic budget caps, constraint validation, and human approval requirements cannot be bypassed through conversation.',
  },
  {
    id: 'INJ_FABRICATE_OPERATIONAL_TRUTH',
    category: 'PROMPT_INJECTION_BLOCKED',
    pattern:
      /\b(pretend\s+(this\s+booking|scuba(\s+diving)?)\s+is\s+(confirmed|available)|say\s+(the\s+)?payment\s+succeeded|mark\s+payment\s+successful|fake\s+a\s+booking\s+confirmation)\b/i,
    refusalMessage:
      'I cannot fabricate booking confirmations, availability, or payment states. Operational facts come strictly from authoritative TripPlanner records.',
  },
  {
    id: 'INJ_DIRECT_DESTRUCTIVE_MUTATION',
    category: 'MUTATION_APPROVAL_REQUIRED',
    pattern:
      /\b(delete\s+(my|this|all)\s+(journey|booking|itinerary)|destroy\s+journey|wipe\s+my\s+bookings)\b/i,
    refusalMessage:
      'I cannot directly delete journeys or bookings. Destructive changes are not exposed to AI execution; please use verified account controls or request a formal itinerary change.',
  },
  {
    id: 'INJ_TOOL_OUTPUT_DIRECTIVE',
    category: 'TOOL_INJECTION_BLOCKED',
    pattern:
      /\b(tool\s+output\s+says\s+call\s+another\s+tool|call\s+deleteAllJourneys\s*\(\s*\)|call\s+dropDatabase\s*\(\s*\)|executeTool\s*\()/i,
    refusalMessage:
      'Embedded tool directives inside data or user messages are blocked. Only allowlisted tools validated by the orchestrator may execute.',
  },
];

export function inspectUserPromptSecurity(
  rawMessage: string
): PromptSecurityInspectionResult {
  const trimmed = (rawMessage || '').trim();
  const matchedRuleIds: string[] = [];
  let primaryCategory: AiErrorCategory = 'NONE';
  let refusalReason: string | undefined;

  for (const rule of ADVERSARIAL_INJECTION_RULES) {
    if (rule.pattern.test(trimmed)) {
      matchedRuleIds.push(rule.id);
      if (primaryCategory === 'NONE') {
        primaryCategory = rule.category;
        refusalReason = rule.refusalMessage;
      }
    }
  }

  const piiResult = redactPiiAndSecrets(trimmed);

  if (matchedRuleIds.length > 0) {
    return {
      safe: false,
      blocked: true,
      errorCategory: primaryCategory,
      matchedRuleIds,
      sanitizedMessage: piiResult.sanitizedText,
      refusalReason,
    };
  }

  return {
    safe: true,
    blocked: false,
    errorCategory: 'NONE',
    matchedRuleIds: [],
    sanitizedMessage: piiResult.sanitizedText,
  };
}

/**
 * Neutralizes embedded prompt/tool injection inside untrusted external text
 * (vendor notes, activity descriptions, reviews, or tool outputs) so the content
 * is treated strictly as inert data.
 */
export function sanitizeUntrustedExternalText(rawText: string): {
  sanitizedData: string;
  neutralizedDirectivesCount: number;
} {
  if (!rawText) {
    return { sanitizedData: '', neutralizedDirectivesCount: 0 };
  }

  let neutralizedCount = 0;
  let cleaned = rawText;

  const embeddedDirectivePatterns: RegExp[] = [
    /ignore\s+(all\s+)?(previous|prior|system)\s+instructions\.?/gi,
    /delete\s+(the\s+|all\s+)?journeys?\.?/gi,
    /call\s+[a-zA-Z0-9_]+\s*\([^)]*\)/gi,
    /\b(DROP\s+TABLE|UPDATE\s+\w+\s+SET|DELETE\s+FROM|INSERT\s+INTO)\b[^.;]*/gi,
    /system\s+instruction\s*:/gi,
    /bypass\s+approval/gi,
    /ignore\s+all\s+constraints/gi,
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<[^>]+>/gi,
  ];

  for (const pattern of embeddedDirectivePatterns) {
    cleaned = cleaned.replace(pattern, () => {
      neutralizedCount += 1;
      return '[QUARANTINED_UNTRUSTED_DIRECTIVE]';
    });
  }

  const piiCleaned = redactPiiAndSecrets(cleaned);
  return {
    sanitizedData: piiCleaned.sanitizedText,
    neutralizedDirectivesCount: neutralizedCount,
  };
}

export interface RedactionResult {
  sanitizedText: string;
  redactedCount: number;
  secretDetected: boolean;
}

/**
 * Minimizes PII and redacts any secret keys, tokens, card numbers, emails,
 * phone numbers, or passport numbers before sending context to AI or logs.
 */
export function redactPiiAndSecrets(input: string): RedactionResult {
  if (!input) {
    return { sanitizedText: '', redactedCount: 0, secretDetected: false };
  }

  let redactedCount = 0;
  let secretDetected = false;
  let text = input;

  const secretPatterns: Array<{ regex: RegExp; replacement: string }> = [
    // Google / Gemini API keys
    { regex: /\bAIza[0-9A-Za-z_-]{20,}\b/g, replacement: '[REDACTED_GEMINI_KEY]' },
    // Supabase secret / service role keys
    {
      regex: /\bsb_(secret|service_role)_[0-9A-Za-z_-]{10,}\b/g,
      replacement: '[REDACTED_SUPABASE_SECRET]',
    },
    // OpenAI / generic sk- keys
    { regex: /\bsk-[0-9A-Za-z_-]{16,}\b/g, replacement: '[REDACTED_API_KEY]' },
    // Bearer JWTs
    {
      regex: /\bBearer\s+eyJ[0-9A-Za-z_-]+\.[0-9A-Za-z_-]+\.[0-9A-Za-z_-]+\b/g,
      replacement: 'Bearer [REDACTED_JWT]',
    },
    {
      regex: /\beyJ[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}\b/g,
      replacement: '[REDACTED_JWT]',
    },
    // Password assignments
    {
      regex: /\b(password|passwd|secret_key|api_key)\s*[:=]\s*[^\s,;]+/gi,
      replacement: '$1=[REDACTED_SECRET]',
    },
  ];

  for (const { regex, replacement } of secretPatterns) {
    text = text.replace(regex, () => {
      redactedCount += 1;
      secretDetected = true;
      return replacement;
    });
  }

  const piiPatterns: Array<{ regex: RegExp; replacement: string }> = [
    // Credit card numbers (13-19 digits)
    {
      regex: /\b(?:\d[ -]*?){13,19}\b/g,
      replacement: '[REDACTED_CARD_NUMBER]',
    },
    // Email addresses
    {
      regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
      replacement: '[REDACTED_EMAIL]',
    },
    // Phone numbers (+91 ..., etc.)
    {
      regex: /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g,
      replacement: '[REDACTED_PHONE]',
    },
    // Passport MRZ / Government ID
    {
      regex: /\bPASSPORT[-_#: ]+[A-Z0-9]{6,12}\b/gi,
      replacement: '[REDACTED_PASSPORT_ID]',
    },
  ];

  for (const { regex, replacement } of piiPatterns) {
    text = text.replace(regex, () => {
      redactedCount += 1;
      return replacement;
    });
  }

  return {
    sanitizedText: text,
    redactedCount,
    secretDetected,
  };
}

/**
 * Resolves the authoritative actor context solely from the authenticated session,
 * ignoring any untrusted actorId, role, or organizationId claimed by the model.
 */
export function resolveAuthoritativeActorContext(params: {
  sessionActor: SessionActorContext;
  untrustedModelClaimedActorId?: string;
  untrustedModelClaimedRole?: string;
  untrustedModelClaimedOrgId?: string;
}): {
  actor: SessionActorContext;
  spoofAttemptIgnored: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  let spoofAttemptIgnored = false;

  if (
    params.untrustedModelClaimedActorId &&
    params.untrustedModelClaimedActorId !== params.sessionActor.actorId
  ) {
    spoofAttemptIgnored = true;
    warnings.push(
      `Ignored model-supplied actorId "${params.untrustedModelClaimedActorId}"; enforced session actorId "${params.sessionActor.actorId}".`
    );
  }

  if (
    params.untrustedModelClaimedRole &&
    params.untrustedModelClaimedRole !== params.sessionActor.actorRole
  ) {
    spoofAttemptIgnored = true;
    warnings.push(
      `Ignored model-supplied role "${params.untrustedModelClaimedRole}"; enforced session role "${params.sessionActor.actorRole}".`
    );
  }

  if (
    params.untrustedModelClaimedOrgId &&
    params.untrustedModelClaimedOrgId !==
      params.sessionActor.actorOrganizationId
  ) {
    spoofAttemptIgnored = true;
    warnings.push(
      `Ignored model-supplied organizationId "${params.untrustedModelClaimedOrgId}"; enforced session organizationId "${params.sessionActor.actorOrganizationId || 'none'}".`
    );
  }

  return {
    actor: {
      actorId: params.sessionActor.actorId,
      actorRole: params.sessionActor.actorRole,
      actorOrganizationId: params.sessionActor.actorOrganizationId,
      travelerDisplayName: params.sessionActor.travelerDisplayName,
    },
    spoofAttemptIgnored,
    warnings,
  };
}

/**
 * Verifies whether the authenticated session actor is authorized to access
 * or operate on a target JourneySnapshot using Phase 04-A RBAC & tenant isolation.
 */
export function verifyJourneyAccessAuthorization(params: {
  engine: LivingJourneyEngine;
  snapshot: JourneySnapshot;
  sessionActor: SessionActorContext;
}): {
  authorized: boolean;
  errorCategory: AiErrorCategory;
  reason?: string;
} {
  const { engine, snapshot, sessionActor } = params;

  if (
    !sessionActor.actorId ||
    sessionActor.actorRole === 'unauthenticated'
  ) {
    return {
      authorized: false,
      errorCategory: 'UNAUTHORIZED_ACCESS',
      reason: 'Authentication required to access journey intelligence.',
    };
  }

  // Check cross-tenant isolation explicitly for operators/coordinators
  if (
    (sessionActor.actorRole === 'operator' ||
      sessionActor.actorRole === 'coordinator') &&
    snapshot.organizationId &&
    sessionActor.actorOrganizationId &&
    snapshot.organizationId !== sessionActor.actorOrganizationId
  ) {
    return {
      authorized: false,
      errorCategory: 'CROSS_TENANT_DENIED',
      reason: `Cross-tenant access denied: Operator organization "${sessionActor.actorOrganizationId}" cannot access journey in organization "${snapshot.organizationId}".`,
    };
  }

  const allowed = engine.isActorAuthorized(
    snapshot,
    sessionActor.actorId,
    sessionActor.actorRole,
    sessionActor.actorOrganizationId
  );

  if (!allowed) {
    return {
      authorized: false,
      errorCategory:
        sessionActor.actorOrganizationId &&
        snapshot.organizationId &&
        sessionActor.actorOrganizationId !== snapshot.organizationId
          ? 'CROSS_TENANT_DENIED'
          : 'UNAUTHORIZED_ACCESS',
      reason: `Actor "${sessionActor.actorId}" (${sessionActor.actorRole}) is not authorized for journey "${snapshot.journeyId}".`,
    };
  }

  return {
    authorized: true,
    errorCategory: 'NONE',
  };
}
