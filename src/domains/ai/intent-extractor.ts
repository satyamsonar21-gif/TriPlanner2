import type { JourneySnapshot } from '@/domains/journey-engine/types';
import { sanitizeUntrustedExternalText } from './security-guard';
import type {
  AiIntentCategory,
  BudgetPolicyType,
  ExtractedPreferenceField,
  ExtractedTravelerPreferences,
  MorningPreferenceType,
  TimeFlexibilityType,
} from './types';

/**
 * PHASE 05 — NATURAL LANGUAGE INTENT & PREFERENCE EXTRACTION ENGINE
 *
 * Implements Sections 7, 8, 9, 26, and 27:
 * - Classifies natural language into the 19 supported AiIntentCategory values
 * - Separates EXPLICIT preferences (`source: 'EXPLICIT'`) from INFERRED suggestions
 *   (`source: 'INFERRED'`, `requiresUserConfirmation: true`)
 * - Extracts preserve constraints (e.g., "Don't disturb dinner" -> `preserveTargets: ['DINNER']`
 *   and maps them to concrete `protectedItemIds` on the authoritative JourneySnapshot)
 */

export interface IntentExtractionOutput {
  intent: AiIntentCategory;
  confidence: number;
  extractedPreferences: ExtractedTravelerPreferences;
  resolvedProtectedItemIds: string[];
  resolvedProtectedItemTitles: string[];
  clarificationNeeded: boolean;
  clarificationQuestion?: string;
}

const KNOWN_DESTINATIONS: Array<{ keyword: RegExp; canonical: string; id: string }> = [
  { keyword: /\bgoa\b/i, canonical: 'Goa', id: 'dest_goa_01' },
  { keyword: /\bkashmir\b|\bsrinagar\b|\bgulmarg\b/i, canonical: 'Kashmir', id: 'dest_kashmir_01' },
  { keyword: /\brajasthan\b|\bjaipur\b|\budaipur\b/i, canonical: 'Rajasthan', id: 'dest_rajasthan_01' },
  { keyword: /\bdubai\b/i, canonical: 'Dubai', id: 'dest_dubai_01' },
  { keyword: /\bkerala\b|\bmunnar\b|\balleppey\b/i, canonical: 'Kerala', id: 'dest_kerala_01' },
  { keyword: /\bpune\b/i, canonical: 'Pune', id: 'dest_pune_01' },
];

const EXPLICIT_INTEREST_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\badventur(e|ous)\b/i, label: 'Adventure' },
  { pattern: /\bfood(ie)?\b|\bculinary\b|\bcuisine\b|\bdining\b/i, label: 'Food' },
  { pattern: /\bbeach(es)?\b|\bcoastal\b/i, label: 'Beaches' },
  { pattern: /\bcultur(e|al)\b|\bheritage\b|\bhistory\b/i, label: 'Culture' },
  { pattern: /\bnature\b|\beco\b|\bmangrove\b|\bwatersports?\b/i, label: 'Nature' },
  { pattern: /\bluxury\b|\bwellness\b|\bspa\b/i, label: 'Luxury' },
  { pattern: /\brelax(ed|ation|ing)?\b/i, label: 'Relaxation' },
];

export function extractIntentAndPreferences(params: {
  userMessage: string;
  snapshot?: JourneySnapshot;
}): IntentExtractionOutput {
  const { sanitizedData: text } = sanitizeUntrustedExternalText(
    params.userMessage || ''
  );
  const lower = text.toLowerCase().trim();

  const interests: Array<ExtractedPreferenceField<string>> = [];
  const removedInterests: string[] = [];
  const activities: Array<ExtractedPreferenceField<string>> = [];
  const avoidances: string[] = [];
  const specialRequests: string[] = [];
  const preserveTargets: string[] = [];

  // 1. Extract Destination
  let destination: ExtractedPreferenceField<string> | undefined;
  for (const dest of KNOWN_DESTINATIONS) {
    if (dest.keyword.test(text)) {
      destination = {
        value: dest.canonical,
        source: 'EXPLICIT',
        confidence: 0.96,
        requiresUserConfirmation: false,
      };
      break;
    }
  }

  // 2. Extract Duration (e.g. "5 day", "5-day", "7 days")
  let durationDays: ExtractedPreferenceField<number> | undefined;
  const durationMatch = text.match(/\b(\d{1,2})\s*[- ]?\s*days?\b/i);
  if (durationMatch) {
    const parsedDays = Number.parseInt(durationMatch[1], 10);
    if (parsedDays >= 1 && parsedDays <= 60) {
      durationDays = {
        value: parsedDays,
        source: 'EXPLICIT',
        confidence: 0.95,
        requiresUserConfirmation: false,
      };
    }
  }

  // 3. Extract Traveler Count (e.g. "for 2 people", "for two people", "4 travelers")
  let travelerCount: ExtractedPreferenceField<number> | undefined;
  const wordToNum: Record<string, number> = {
    one: 1,
    solo: 1,
    two: 2,
    couple: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
  };
  const numericTravelersMatch = text.match(
    /\b(?:for\s+)?(\d{1,2})\s*(?:people|persons?|travelers?|guests?|adults?)\b/i
  );
  const wordTravelersMatch = text.match(
    /\b(?:for\s+)?(one|solo|two|couple|three|four|five|six)\s*(?:people|persons?|travelers?|guests?|of\s+us)?\b/i
  );
  if (numericTravelersMatch) {
    const count = Number.parseInt(numericTravelersMatch[1], 10);
    if (count >= 1 && count <= 50) {
      travelerCount = {
        value: count,
        source: 'EXPLICIT',
        confidence: 0.95,
        requiresUserConfirmation: false,
      };
    }
  } else if (wordTravelersMatch) {
    const mapped = wordToNum[wordTravelersMatch[1].toLowerCase()];
    if (mapped) {
      travelerCount = {
        value: mapped,
        source: 'EXPLICIT',
        confidence: 0.93,
        requiresUserConfirmation: false,
      };
    }
  }

  // 4. Extract Budget & Currency (e.g., "40k", "₹40,000", "40000", "under 45k")
  let budget: ExtractedPreferenceField<number> | undefined;
  let currency: ExtractedPreferenceField<string> | undefined;

  const kBudgetMatch = text.match(/(?:₹|inr|rs\.?\s*)?(\d{1,3}(?:\.\d+)?)\s*k\b/i);
  const fullBudgetMatch = text.match(
    /(?:₹|inr|rs\.?\s*|around\s+|under\s+|budget\s+(?:of\s+)?)(\d{1,3}(?:,\d{2,3})+|\d{4,7})\b/i
  );

  if (kBudgetMatch) {
    const val = Math.round(Number.parseFloat(kBudgetMatch[1]) * 1000);
    if (val > 0) {
      budget = {
        value: val,
        source: 'EXPLICIT',
        confidence: 0.95,
        requiresUserConfirmation: false,
      };
      currency = {
        value: 'INR',
        source: 'EXPLICIT',
        confidence: 0.95,
        requiresUserConfirmation: false,
      };
    }
  } else if (fullBudgetMatch) {
    const rawDigits = fullBudgetMatch[1].replace(/,/g, '');
    const val = Number.parseInt(rawDigits, 10);
    if (val > 0) {
      budget = {
        value: val,
        source: 'EXPLICIT',
        confidence: 0.95,
        requiresUserConfirmation: false,
      };
      currency = {
        value: 'INR',
        source: 'EXPLICIT',
        confidence: 0.95,
        requiresUserConfirmation: false,
      };
    }
  }

  // 5. Extract Budget Policy ("don't increase my budget", "within budget", "under budget")
  let budgetPolicy: BudgetPolicyType = 'UNSPECIFIED';
  if (
    /\b(don'?t|do\s+not|no|avoid|without)\s+(increase|increasing|exceed|exceeding|raising)\s+(my\s+|the\s+)?budget\b/i.test(
      text
    ) ||
    /\bno\s+budget\s+increase\b/i.test(text) ||
    /\bstay\s+within\s+(my\s+|the\s+)?budget\b/i.test(text)
  ) {
    budgetPolicy = 'NO_INCREASE';
  } else if (/\b(under|strict|cap|maximum)\b.*\bbudget\b/i.test(text) || budget) {
    budgetPolicy = 'STRICT_CAP';
  }

  // 6. Extract Morning / Pace / Driving Preferences
  let morningPreference: ExtractedPreferenceField<MorningPreferenceType> | undefined;
  let pace: ExtractedPreferenceField<'relaxed' | 'balanced' | 'fast-paced'> | undefined;

  if (
    /\b(hate|avoid|no|don'?t\s+want)\s+(early|rushed)\s+mornings?\b/i.test(text) ||
    /\b(relaxed|slow|easy|unhurried)\s+mornings?\b/i.test(text) ||
    /\bkeep\s+mornings?\s+relaxed\b/i.test(text)
  ) {
    morningPreference = {
      value: 'AVOID_EARLY_START',
      source: 'EXPLICIT',
      confidence: 0.96,
      requiresUserConfirmation: false,
    };
    pace = {
      value: 'relaxed',
      source: 'EXPLICIT',
      confidence: 0.92,
      requiresUserConfirmation: false,
    };
  } else if (/\brelaxed\s+pace\b|\bslow\s+pace\b/i.test(text)) {
    pace = {
      value: 'relaxed',
      source: 'EXPLICIT',
      confidence: 0.92,
      requiresUserConfirmation: false,
    };
  } else if (/\bfast[- ]?paced\b|\bpacked\s+schedule\b/i.test(text)) {
    pace = {
      value: 'fast-paced',
      source: 'EXPLICIT',
      confidence: 0.92,
      requiresUserConfirmation: false,
    };
  }

  let transportPreference: ExtractedPreferenceField<string> | undefined;
  if (
    /\b(don'?t\s+want|avoid|no|less)\s+(too\s+much\s+)?(driving|long\s+drives?|commut(e|ing))\b/i.test(
      text
    ) ||
    /\bcloser\s+to\s+(the\s+)?(hotel|resort)\b/i.test(text)
  ) {
    transportPreference = {
      value: 'SHORT_TRANSFERS_PREFERRED',
      source: 'EXPLICIT',
      confidence: 0.92,
      requiresUserConfirmation: false,
    };
    avoidances.push('LONG_DRIVING_TRANSFERS');
  }

  // 7. Extract Explicit vs Inferred Interests
  for (const item of EXPLICIT_INTEREST_PATTERNS) {
    const removeRegex = new RegExp(
      `\\b(remove|no|avoid|don'?t\\s+want)\\s+${item.label.toLowerCase()}\\b`,
      'i'
    );
    if (removeRegex.test(text)) {
      removedInterests.push(item.label);
      avoidances.push(item.label.toUpperCase());
    } else if (item.pattern.test(text)) {
      if (!interests.some((i) => i.value === item.label)) {
        interests.push({
          value: item.label,
          source: 'EXPLICIT',
          confidence: 0.95,
          requiresUserConfirmation: false,
        });
      }
    }
  }

  // Check if user mentions a specific activity (e.g. "scuba diving", "kayaking") without explicit interest
  if (/\bscuba(\s+diving)?\b/i.test(text)) {
    activities.push({
      value: 'Scuba Diving',
      source: 'EXPLICIT',
      confidence: 0.94,
      requiresUserConfirmation: false,
    });
    if (!interests.some((i) => i.value === 'Adventure')) {
      interests.push({
        value: 'Water Activities',
        source: 'INFERRED',
        confidence: 0.72,
        requiresUserConfirmation: true,
        rationale:
          'This may indicate an interest in water activities based on mentioning scuba diving; labeled as inferred until confirmed.',
      });
    }
  }
  if (/\bkayak(ing)?\b/i.test(text)) {
    activities.push({
      value: 'Kayaking',
      source: 'EXPLICIT',
      confidence: 0.95,
      requiresUserConfirmation: false,
    });
  }

  // 8. Extract Preserve Constraints ("keep dinner unchanged", "don't disturb dinner", "don't disturb the airport transfer")
  if (
    /\b(don'?t\s+disturb|keep|preserve|protect|do\s+not\s+change|unchanged)\b.*\bdinner\b/i.test(
      text
    ) ||
    /\bdinner\b.*\b(unchanged|untouched|as\s+is|intact)\b/i.test(text)
  ) {
    preserveTargets.push('DINNER');
  }
  if (
    /\b(don'?t\s+disturb|keep|preserve|protect|do\s+not\s+change)\b.*\b(airport\s+transfer|transfer|flight)\b/i.test(
      text
    )
  ) {
    preserveTargets.push('AIRPORT_TRANSFER');
  }
  if (
    /\b(don'?t\s+disturb|keep|preserve|protect|do\s+not\s+change)\b.*\b(cruise|sunset\s+cruise)\b/i.test(
      text
    )
  ) {
    preserveTargets.push('SUNSET_CRUISE');
  }
  if (
    /\b(don'?t\s+disturb|keep|preserve|protect|do\s+not\s+change)\b.*\b(hotel|resort|check[- ]?in)\b/i.test(
      text
    )
  ) {
    preserveTargets.push('HOTEL_RESORT');
  }
  if (
    /\b(don'?t\s+disturb|keep|preserve|protect|do\s+not\s+change)\b.*\b(fontainhas|heritage\s+walk|cafe|café)\b/i.test(
      text
    )
  ) {
    preserveTargets.push('FONTAINHAS_HERITAGE');
  }

  // Map preserveTargets to concrete item IDs in `snapshot` if available
  const resolvedProtectedItemIds: string[] = [];
  const resolvedProtectedItemTitles: string[] = [];

  if (params.snapshot && preserveTargets.length > 0) {
    for (const item of params.snapshot.items) {
      if (item.status === 'cancelled') continue;
      const itemTitleLower = `${item.title} ${item.subtitle}`.toLowerCase();

      const matchesDinnerOrCruise =
        preserveTargets.includes('DINNER') &&
        (itemTitleLower.includes('dinner') ||
          itemTitleLower.includes('cruise') ||
          item.type === 'meal' ||
          item.id.includes('cruise') ||
          item.id.includes('cafe'));

      const matchesTransfer =
        preserveTargets.includes('AIRPORT_TRANSFER') &&
        (itemTitleLower.includes('transfer') ||
          itemTitleLower.includes('airport') ||
          itemTitleLower.includes('flight') ||
          item.type === 'flight' ||
          item.type === 'transfer');

      const matchesCruise =
        preserveTargets.includes('SUNSET_CRUISE') &&
        itemTitleLower.includes('cruise');

      const matchesHotel =
        preserveTargets.includes('HOTEL_RESORT') &&
        (item.type === 'accommodation' || itemTitleLower.includes('resort'));

      const matchesFontainhas =
        preserveTargets.includes('FONTAINHAS_HERITAGE') &&
        (itemTitleLower.includes('fontainhas') ||
          itemTitleLower.includes('heritage'));

      if (
        matchesDinnerOrCruise ||
        matchesTransfer ||
        matchesCruise ||
        matchesHotel ||
        matchesFontainhas
      ) {
        if (!resolvedProtectedItemIds.includes(item.id)) {
          resolvedProtectedItemIds.push(item.id);
          resolvedProtectedItemTitles.push(item.title);
        }
      }
    }
  }

  const timeFlexibility: TimeFlexibilityType =
    preserveTargets.length > 0
      ? 'STRICT'
      : /\bmove\s+.*\s+(later|evening|afternoon)\b/i.test(text)
      ? 'FLEXIBLE'
      : 'MODERATE';

  // 9. Classify Primary Intent Category
  let intent: AiIntentCategory = 'UNKNOWN';
  let confidence = 0.88;
  let clarificationNeeded = false;
  let clarificationQuestion: string | undefined;

  if (
    /\b(plan|create|build|design)\b.*\b(trip|journey|itinerary|days?|getaway|vacation)\b/i.test(
      lower
    ) ||
    (Boolean(destination) && Boolean(durationDays) && Boolean(budget))
  ) {
    intent = 'PLAN_TRIP';
    confidence = 0.95;
  } else if (
    /\b(cancel(led)?|replace|disrupt(ed|ion)?|swell|delayed|alternatives?|swap|change\s+the\s+activity|move\s+the\s+activity|keep\s+the\s+trip\s+adventurous)\b/i.test(
      lower
    ) &&
    !/\bwhy\s+did\b/i.test(lower)
  ) {
    intent = 'ADAPT_JOURNEY';
    confidence = 0.94;
  } else if (
    /\b(why\s+did\s+you\s+recommend|why\s+is\s+.*\s+recommended|explain\s+.*\s+alternative|why\s+kayak(ing)?|score\s+breakdown)\b/i.test(
      lower
    )
  ) {
    intent = 'EXPLAIN_ALTERNATIVE';
    confidence = 0.94;
  } else if (
    /\b(what\s+changed|why\s+did\s+my\s+(itinerary|trip|journey)\s+change|explain\s+(the\s+)?change)\b/i.test(
      lower
    )
  ) {
    intent = 'EXPLAIN_CHANGE';
    confidence = 0.93;
  } else if (
    /\b(impact|affected|downstream|enough\s+time\s+between|conflict|schedule\s+conflict)\b/i.test(
      lower
    ) &&
    !/\bwhich\s+tours\b/i.test(lower)
  ) {
    intent = 'SHOW_IMPACT';
    confidence = 0.91;
  } else if (
    /\b(which\s+tours?\s+need\s+attention|operator\s+summary|daily\s+operations|pending\s+approvals|at[- ]?risk\s+journeys|operational\s+issues|draft\s+customer\s+message|customer\s+communication)\b/i.test(
      lower
    )
  ) {
    intent = 'ASK_OPERATION_STATUS';
    confidence = 0.95;
  } else if (
    /\b(what\s+bookings?\s+are\s+confirmed|booking\s+status|where\s+am\s+i\s+staying|hotel\s+confirmation|reservation\s+status)\b/i.test(
      lower
    )
  ) {
    intent = 'ASK_BOOKING_STATUS';
    confidence = 0.93;
  } else if (
    /\b(payment\s+status|did\s+my\s+payment|refund\s+status|invoice)\b/i.test(
      lower
    )
  ) {
    intent = 'ASK_PAYMENT_STATUS';
    confidence = 0.91;
  } else if (
    /\b(how\s+much\s+am\s+i\s+spending|will\s+this\s+change\s+increase\s+my\s+budget|current\s+budget|remaining\s+budget|cost\s+of)\b/i.test(
      lower
    )
  ) {
    intent = 'CHANGE_BUDGET';
    confidence = 0.92;
  } else if (
    /\b(what\s+is\s+my\s+plan|my\s+itinerary|schedule\s+tomorrow|next\s+activity|day\s+\d+\s+plan)\b/i.test(
      lower
    )
  ) {
    intent = 'ASK_ITINERARY';
    confidence = 0.93;
  } else if (
    /\b(summarize\s+(my\s+)?(journey|trip)|journey\s+summary|overview\s+of\s+my\s+trip)\b/i.test(
      lower
    )
  ) {
    intent = 'SUMMARIZE_JOURNEY';
    confidence = 0.92;
  } else if (removedInterests.length > 0) {
    intent = 'REMOVE_INTEREST';
    confidence = 0.9;
  } else if (
    morningPreference !== undefined ||
    transportPreference !== undefined ||
    pace !== undefined
  ) {
    intent = 'UPDATE_PREFERENCES';
    confidence = 0.9;
  } else if (interests.some((i) => i.source === 'EXPLICIT')) {
    intent = 'ADD_INTEREST';
    confidence = 0.89;
  } else if (/\bfind\s+destination|where\s+should\s+i\s+go\b/i.test(lower)) {
    intent = 'FIND_DESTINATION';
    confidence = 0.88;
  } else if (/\bfind\s+activity|things\s+to\s+do\b/i.test(lower)) {
    intent = 'FIND_ACTIVITY';
    confidence = 0.88;
  } else if (/\bhelp|support|contact\s+coordinator|emergency\b/i.test(lower)) {
    intent = 'ASK_SUPPORT';
    confidence = 0.9;
  } else {
    intent = 'UNKNOWN';
    confidence = 0.35;
    clarificationNeeded = true;
    clarificationQuestion =
      'Could you clarify whether you would like to review your current itinerary, evaluate alternatives for a disrupted activity, check booking/budget status, or plan a new trip?';
  }

  const extractedPreferences: ExtractedTravelerPreferences = {
    destination,
    durationDays,
    travelerCount,
    budget,
    currency,
    transportPreference,
    interests,
    removedInterests,
    activities,
    foodPreference: interests.some((i) => i.value === 'Food')
      ? {
          value: 'Local & Coastal Cuisine',
          source: 'EXPLICIT',
          confidence: 0.92,
          requiresUserConfirmation: false,
        }
      : undefined,
    pace,
    morningPreference,
    eveningPreference: preserveTargets.includes('DINNER')
      ? {
          value: 'PROTECT_DINNER_EVENING',
          source: 'EXPLICIT',
          confidence: 0.95,
          requiresUserConfirmation: false,
        }
      : undefined,
    avoidances,
    specialRequests,
    budgetPolicy,
    timeFlexibility,
    preserveTargets,
  };

  return {
    intent,
    confidence,
    extractedPreferences,
    resolvedProtectedItemIds,
    resolvedProtectedItemTitles,
    clarificationNeeded,
    clarificationQuestion,
  };
}
