/**
 * Smart matching algorithm.
 * Scores each creator against a project brief and returns the top 3-5 matches.
 *
 * Brief shape:
 * {
 *   serviceId: 'video' | 'photography' | etc.
 *   serviceType: string (text label)
 *   budgetMin: number (dollars)
 *   budgetMax: number (dollars)
 *   budgetRange: string (text label from quote form)
 *   location: { city, state, country, preference: 'local'|'remote'|'either' }
 *   locationPreference: string
 *   projectDate: string (ISO date)
 *   timeline: string (ISO date or relative)
 *   description: string
 * }
 *
 * Section 5 additions:
 * 5A. Tier cap — no more than 2 creators from same tier in a 5-result set
 * 5B. Availability weighting — unavailable on project date deprioritized
 * 5C. Recency boost — 10% boost for active in last 30 days
 * 5D. New creator spotlight — separate export for recently verified with no bookings
 * 5E. Geographic fairness — local preference prioritizes same city, then state, then region
 * 5F. Weekly featured slot — respects last_featured_at to rotate who gets top billing
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

  const creatorMid = (min + max) / 2;
  const budRange = Math.max(budgetMax - budgetMin, 1);
  const diff = Math.abs(creatorMid - budMid) / budRange;
  return Math.max(0, 30 - diff * 30);
}

/**
 * 5E. Geographic fairness score (0-20)
 * When client specifies local preference, same-city creators score highest.
 */
function scoreLocation(creator, brief) {
  const pref = brief.locationPreference || brief.location?.preference || 'either';

  // Remote/virtual project — location doesn't matter
  if (pref === 'remote' || pref === 'Remote OK') return 20;

  const cl = creator.location || {};
  const bl = brief.location || {};

  // Check project location fields (from new form format)
  const briefCity  = bl.city  || (brief.venueCity  || '').toLowerCase();
  const briefState = bl.state || (brief.venueState || '').toLowerCase();

  if (cl.city  && briefCity  && cl.city.toLowerCase()  === briefCity.toLowerCase())  return 20;
  if (cl.state && briefState && cl.state.toLowerCase() === briefState.toLowerCase()) return 14;
  if (cl.country && bl.country && cl.country.toLowerCase() === bl.country.toLowerCase()) return 8;

  // Local only — foreign creators get 0
  if (pref === 'local' || pref === 'Local only') return 0;

  return 6; // either works = partial credit for out-of-area
}

/**
 * 5B. Availability weighting (0-20)
 * Checks the creator's availability on the project date specifically.
 * A creator who is fully booked on that date should not appear in top results.
 */
function scoreAvailability(creator, brief) {
  const projectDate = brief.projectDate || brief.timeline;
  if (projectDate) {
    // Check creator's availability calendar for that specific date
    try {
      const avail = JSON.parse(
        localStorage.getItem(`availability-${creator.id}`) || '{}'
      );
      const dateStatus = avail[projectDate];
      if (dateStatus === 'booked') return -Infinity; // Hard exclude if booked on that date
      if (dateStatus === 'available') return 20;       // Explicitly available — top score
    } catch {}
  }

  // Fall back to general availability status
  if (creator.availability === 'available') return 15;
  if (creator.availability === 'limited')   return 8;
  if (creator.availability === 'unavailable') return 0;
  return 10; // default
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
 * 5C. Recency boost — 10% bonus for creators active in last 30 days.
 * Active means: logged in, completed a project, responded to a message,
 * or updated their profile within 30 days.
 */
function getRecencyBoost(creator, baseScore) {
  const lastActive = creator.last_active_at || creator.updated_at || creator.createdAt;
  if (!lastActive) return 0;
  const daysSinceActive = (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceActive <= 30) return baseScore * 0.10;
  return 0;
}

/**
 * 5F. Weekly featured slot weighting.
 * Creators who were recently featured get a slight negative adjustment
 * so others get a turn. Featured = appeared in top 3 of results in last 7 days.
 */
function getFeaturedPenalty(creator) {
  const lastFeatured = creator.last_featured_at;
  if (!lastFeatured) return 0;
  const daysSinceFeatured = (Date.now() - new Date(lastFeatured).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceFeatured < 7) return -5; // slight penalty to let others rotate in
  return 0;
}

/**
 * Score a single creator against a brief.
 * Returns a score (0-100+) or -Infinity if the creator fails hard filters.
 */
export function scoreCreator(creator, brief) {
  // Handle new serviceType field (text) or old serviceId field
  const serviceId = brief.serviceId;
  const { budgetMin = 0, budgetMax = Infinity } = brief;

  // Must offer the requested service (if serviceId provided)
  if (serviceId) {
    const hasService = (creator.services || []).some(
      s => (s.serviceId || s.service_id) === serviceId
    );
    if (!hasService) return -Infinity;
  }

  const budget = scoreBudget(creator, serviceId, budgetMin, budgetMax);
  if (budget === -Infinity) return -Infinity;

  const availability = scoreAvailability(creator, brief);
  if (availability === -Infinity) return -Infinity; // Booked on project date — hard exclude

  const base =
    budget +
    scoreLocation(creator, brief) +
    availability +
    scoreRating(creator) +
    scoreVerification(creator) +
    scoreTier(creator);

  // 5C. Recency boost
  const recencyBoost = getRecencyBoost(creator, base);

  // 5F. Featured rotation penalty
  const featuredPenalty = getFeaturedPenalty(creator);

  return Math.round(Math.min(100, base + recencyBoost + featuredPenalty));
}

/**
 * 5A. Tier cap enforcement.
 * Ensures no more than 2 creators from the same tier appear in a 5-result set.
 * If the top 5 are dominated by one tier, replace over-represented creators
 * with the next highest scoring creators from other tiers.
 */
function enforceTierCap(scored, maxPerTier = 2) {
  const tierCounts = {};
  const result = [];
  const overflow = [];

  for (const entry of scored) {
    const tier = entry.creator.tier || 'launch';
    const count = tierCounts[tier] || 0;
    if (count < maxPerTier) {
      result.push(entry);
      tierCounts[tier] = count + 1;
    } else {
      overflow.push(entry);
    }
    if (result.length === 5) break;
  }

  // If we don't have 5 results yet, fill from overflow in score order
  if (result.length < 5) {
    const needed = 5 - result.length;
    result.push(...overflow.slice(0, needed));
    result.sort((a, b) => b.score - a.score);
  }

  return result;
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
    .filter(r => r.score !== -Infinity && r.score >= 0)
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
      .filter(r => r.score !== -Infinity && r.score >= 0)
      .sort((a, b) => b.score - a.score);
  }

  // 5A. Apply tier cap — no more than 2 from same tier in top 5
  const capped = enforceTierCap(scored, 2);

  // Return 3-5 results
  const results = capped.slice(0, 5);
  const topScore = results[0]?.score || 100;

  return results.map(r => ({
    creator: r.creator,
    score: r.score,
    matchPct: Math.round(70 + (r.score / topScore) * 29),
    rateRange: getCreatorRateRange(r.creator, brief.serviceId),
  }));
}

/**
 * 5D. New creator spotlight.
 * Returns up to 3 recently verified creators who have not yet had their first booking.
 * Rotated weekly using a deterministic week-based seed.
 */
export function getNewCreatorSpotlight(creators, count = 3) {
  const newCreators = creators.filter(c => {
    const isVerified = c.verified || c.verification_status === 'verified' || c.verification_status === 'pro_verified';
    const hasNoBookings = !c.completed_projects || c.completed_projects === 0;
    const isNew = c.createdAt
      ? (Date.now() - new Date(c.createdAt).getTime()) < 60 * 24 * 60 * 60 * 1000 // last 60 days
      : true;
    return isVerified && hasNoBookings && isNew;
  });

  if (newCreators.length === 0) return [];

  // Rotate weekly by using week number as seed for ordering
  const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const shuffled = [...newCreators].sort((a, b) => {
    // Deterministic shuffle based on week number + creator ID
    const hashA = (weekNumber * 31 + a.id?.charCodeAt(0)) % newCreators.length;
    const hashB = (weekNumber * 31 + b.id?.charCodeAt(0)) % newCreators.length;
    return hashA - hashB;
  });

  return shuffled.slice(0, count);
}

/** Load all creators from localStorage */
export function loadAllCreatorsForMatching() {
  try {
    return JSON.parse(localStorage.getItem('creator-directory') || '[]');
  } catch { return []; }
}

/**
 * Parse budget range string from new quote form format.
 * Returns { budgetMin, budgetMax } in dollars.
 */
export function parseBudgetRange(budgetRange) {
  if (!budgetRange) return { budgetMin: 0, budgetMax: 999999 };
  if (budgetRange === 'Under $500')          return { budgetMin: 0,     budgetMax: 500 };
  if (budgetRange === '$500 to $1,500')      return { budgetMin: 500,   budgetMax: 1500 };
  if (budgetRange === '$1,500 to $5,000')    return { budgetMin: 1500,  budgetMax: 5000 };
  if (budgetRange === '$5,000 to $10,000')   return { budgetMin: 5000,  budgetMax: 10000 };
  if (budgetRange === '$10,000+')            return { budgetMin: 10000, budgetMax: 999999 };
  return { budgetMin: 0, budgetMax: 999999 };
}
