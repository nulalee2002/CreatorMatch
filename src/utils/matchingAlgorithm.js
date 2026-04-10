/**
 * Smart matching algorithm.
 * Scores each creator against a project brief and returns the top 3-5 matches.
 *
 * Brief shape:
 * {
 *   serviceId: 'video' | 'photography' | etc.
 *   budgetMin: number (dollars)
 *   budgetMax: number (dollars)
 *   location: { city, state, country, preference: 'local'|'remote'|'either' }
 *   timeline: string (ISO date or relative)
 *   description: string
 * }
 */

const TIER_RANK = { launch: 0, proven: 1, elite: 2, signature: 3 };
const VERIFICATION_RANK = { unverified: 0, verified: 1, pro_verified: 2 };

/**
 * Extract the minimum and maximum rates from a creator's matching service.
 * Returns { min, max } in dollars, or null if service not found.
 */
function getCreatorRateRange(creator, serviceId) {
  const svc = (creator.services || []).find(
    s => (s.serviceId || s.service_id) === serviceId
  );
  if (!svc) return null;
  const vals = Object.values(svc.rates || {}).map(Number).filter(v => v > 0);
  if (!vals.length) {
    // Fall back to package prices
    const pkgs = (creator.packages || []).filter(
      p => (p.serviceId || p.service_id) === serviceId
    );
    const prices = pkgs.map(p => Number(p.price)).filter(v => v > 0);
    if (!prices.length) return null;
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

/** Budget alignment score (0-30) */
function scoreBudget(creator, serviceId, budgetMin, budgetMax) {
  const range = getCreatorRateRange(creator, serviceId);
  if (!range) return 0;

  const { min, max } = range;
  const budMid = (budgetMin + budgetMax) / 2;

  // Hard filter: creator min > client max * 1.2 → no match
  if (min > budgetMax * 1.2) return -Infinity;
  // Hard filter: creator max < client min * 0.5 → no match
  if (max < budgetMin * 0.5) return -Infinity;

  // Score: how well the creator's midpoint fits the budget midpoint
  const creatorMid = (min + max) / 2;
  const budRange = Math.max(budgetMax - budgetMin, 1);
  const diff = Math.abs(creatorMid - budMid) / budRange;
  return Math.max(0, 30 - diff * 30);
}

/** Location proximity score (0-20) */
function scoreLocation(creator, brief) {
  if (brief.location?.preference === 'remote') return 20; // remote = anyone qualifies equally
  const cl = creator.location || {};
  const bl = brief.location || {};

  if (cl.city && bl.city && cl.city.toLowerCase() === bl.city.toLowerCase()) return 20;
  if (cl.state && bl.state && cl.state.toLowerCase() === bl.state.toLowerCase()) return 14;
  if (cl.country && bl.country && cl.country.toLowerCase() === bl.country.toLowerCase()) return 8;
  if (brief.location?.preference === 'either') return 8; // remote-friendly gets partial credit
  return 4;
}

/** Availability score (0-15) — simple check */
function scoreAvailability(creator) {
  if (creator.availability === 'available') return 15;
  if (creator.availability === 'limited') return 8;
  return 0;
}

/** Rating score (0-15) */
function scoreRating(creator) {
  const r = creator.rating || 0;
  return Math.min(15, (r / 5) * 15);
}

/** Verification score (0-10) */
function scoreVerification(creator) {
  const rank = VERIFICATION_RANK[creator.verification_status] ?? (creator.verified ? 1 : 0);
  return (rank / 2) * 10;
}

/** Tier score (0-10) */
function scoreTier(creator) {
  const rank = TIER_RANK[creator.tier || 'launch'] ?? 0;
  return (rank / 3) * 10;
}

/**
 * Score a single creator against a brief.
 * Returns a score (0-100) or -Infinity if the creator fails hard filters.
 */
export function scoreCreator(creator, brief) {
  const { serviceId, budgetMin = 0, budgetMax = Infinity } = brief;

  // Must offer the requested service
  const hasService = (creator.services || []).some(
    s => (s.serviceId || s.service_id) === serviceId
  );
  if (!hasService) return -Infinity;

  const budget = scoreBudget(creator, serviceId, budgetMin, budgetMax);
  if (budget === -Infinity) return -Infinity;

  const total =
    budget +
    scoreLocation(creator, brief) +
    scoreAvailability(creator) +
    scoreRating(creator) +
    scoreVerification(creator) +
    scoreTier(creator);

  return Math.round(Math.min(100, total));
}

/**
 * Run the matching algorithm against a list of creators.
 *
 * Returns an array of { creator, score, matchPct } sorted by score desc,
 * with 3-5 results. If fewer than 3 pass strict filters, budget tolerance
 * is relaxed to fill up to 3 results.
 */
export function matchCreators(creators, brief) {
  // First pass: strict filters
  let scored = creators
    .map(c => ({ creator: c, score: scoreCreator(c, brief) }))
    .filter(r => r.score !== -Infinity)
    .sort((a, b) => b.score - a.score);

  // If fewer than 3, relax budget tolerance (widen by 50%)
  if (scored.length < 3 && brief.budgetMin != null && brief.budgetMax != null) {
    const relaxedBrief = {
      ...brief,
      budgetMin: brief.budgetMin * 0.5,
      budgetMax: brief.budgetMax * 1.5,
    };
    scored = creators
      .map(c => ({ creator: c, score: scoreCreator(c, relaxedBrief) }))
      .filter(r => r.score !== -Infinity)
      .sort((a, b) => b.score - a.score);
  }

  // Return 3-5 results
  const results = scored.slice(0, 5);
  const topScore = results[0]?.score || 100;

  return results.map(r => ({
    creator: r.creator,
    score: r.score,
    // Normalize match % so top result is always high (85-99%)
    matchPct: Math.round(70 + (r.score / topScore) * 29),
    rateRange: getCreatorRateRange(r.creator, brief.serviceId),
  }));
}

/** Load all creators from localStorage */
export function loadAllCreatorsForMatching() {
  try {
    return JSON.parse(localStorage.getItem('creator-directory') || '[]');
  } catch { return []; }
}
