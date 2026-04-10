import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Zap, ChevronRight, MessageSquare } from 'lucide-react';
import { matchCreators, loadAllCreatorsForMatching } from '../utils/matchingAlgorithm.js';
import { SERVICES } from '../data/rates.js';
import { REGIONS } from '../data/regions.js';
import { TierBadge } from '../components/TierBadge.jsx';
import { VerificationBadge } from '../components/VerificationFlow.jsx';
import { LoyaltyBadge } from '../components/LoyaltyBadge.jsx';

function loadProject(projectId) {
  try {
    const all = JSON.parse(localStorage.getItem('cm-projects') || '[]');
    return all.find(p => p.id === projectId) || null;
  } catch { return null; }
}

function MatchPct({ pct, dark }) {
  const color = pct >= 90 ? 'text-teal-400' : pct >= 75 ? 'text-gold-400' : 'text-charcoal-400';
  return (
    <div className="flex flex-col items-center">
      <span className={`font-display text-2xl font-bold ${color}`}>{pct}%</span>
      <span className={`text-[9px] font-bold uppercase tracking-wider ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>match</span>
    </div>
  );
}

function MatchCard({ match, dark, onViewProfile, onRequestQuote }) {
  const { creator, matchPct, rateRange } = match;
  const location = creator.location || {};
  const locationStr = [location.city, location.state].filter(Boolean).join(', ');
  const region = REGIONS[location.regionKey];
  const textSub = dark ? 'text-charcoal-400' : 'text-gray-500';

  return (
    <div className={`rounded-2xl border transition-all hover:shadow-lg ${
      dark ? 'bg-charcoal-800 border-charcoal-700 hover:border-gold-500/30' : 'bg-white border-gray-200 hover:border-gold-300'
    }`}>
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 ${dark ? 'bg-charcoal-700' : 'bg-gray-100'}`}>
            {creator.avatar || '🎬'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className={`font-display font-bold text-base truncate ${dark ? 'text-white' : 'text-gray-900'}`}>
                  {creator.businessName || creator.name}
                </h3>
                {creator.businessName && creator.name && (
                  <p className={`text-xs truncate ${textSub}`}>{creator.name}</p>
                )}
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className={`text-xs flex items-center gap-1 ${textSub}`}>
                    <MapPin size={10} />{locationStr}{region && ` ${region.flag}`}
                  </span>
                </div>
              </div>
              <MatchPct pct={matchPct} dark={dark} />
            </div>
          </div>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {creator.verification_status && creator.verification_status !== 'unverified' && (
            <VerificationBadge status={creator.verification_status} />
          )}
          {creator.tier && creator.tier !== 'launch' && (
            <TierBadge tierId={creator.tier} />
          )}
          {creator.completed_projects > 0 && (
            <LoyaltyBadge completedProjects={creator.completed_projects} />
          )}
        </div>

        {/* Rating */}
        {creator.rating && (
          <div className="flex items-center gap-1.5 mt-3">
            <div className="flex">
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={12}
                  className={s <= Math.round(creator.rating) ? 'text-gold-400 fill-gold-400' : dark ? 'text-charcoal-600' : 'text-gray-300'} />
              ))}
            </div>
            <span className={`text-xs font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{creator.rating}</span>
            <span className={`text-xs ${textSub}`}>({creator.reviewCount || creator.review_count || 0})</span>
          </div>
        )}

        {/* Rate range */}
        {rateRange && (
          <div className={`mt-3 pt-3 border-t ${dark ? 'border-charcoal-700' : 'border-gray-100'}`}>
            <p className={`text-xs ${textSub}`}>
              Rate range:{' '}
              <span className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
                ${rateRange.min.toLocaleString()} – ${rateRange.max.toLocaleString()}
              </span>
            </p>
          </div>
        )}

        {/* Tags */}
        {creator.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {creator.tags.slice(0, 4).map(tag => (
              <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full ${dark ? 'bg-charcoal-700 text-charcoal-400' : 'bg-gray-100 text-gray-500'}`}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className={`flex gap-2 p-4 pt-0`}>
        <button type="button" onClick={() => onViewProfile(creator.id)}
          className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
            dark ? 'border-charcoal-600 text-charcoal-300 hover:text-white hover:border-charcoal-400' : 'border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'
          }`}>
          View Profile
        </button>
        <button type="button" onClick={() => onRequestQuote(creator)}
          className="flex-1 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-charcoal-900 text-xs font-bold transition-all flex items-center justify-center gap-1.5">
          <MessageSquare size={12} /> Request Quote
        </button>
      </div>
    </div>
  );
}

export function MatchResultsPage({ dark }) {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const textSub = dark ? 'text-charcoal-400' : 'text-gray-500';

  useEffect(() => {
    const proj = loadProject(projectId);
    setProject(proj);

    if (proj) {
      const creators = loadAllCreatorsForMatching();
      const brief = {
        serviceId: proj.serviceId || proj.service,
        budgetMin: proj.budgetMin || 0,
        budgetMax: proj.budgetMax || 999999,
        location: {
          city: proj.location?.city || '',
          state: proj.location?.state || '',
          country: proj.location?.country || 'US',
          preference: proj.locationPreference || 'either',
        },
        timeline: proj.timeline,
      };
      const results = matchCreators(creators, brief);
      setMatches(results);
    }
    setLoading(false);
  }, [projectId]);

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${dark ? 'bg-charcoal-950' : 'bg-gray-50'}`}>
        <div className="relative w-16 h-16">
          <div className="animate-spin w-16 h-16 border-2 border-gold-500/30 border-t-gold-500 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap size={20} className="text-gold-500" />
          </div>
        </div>
        <p className={`text-sm font-medium ${textSub}`}>Finding your best matches...</p>
      </div>
    );
  }

  const serviceLabel = project?.serviceId
    ? (SERVICES[project.serviceId]?.name || project.serviceId)
    : 'your project';

  return (
    <div className={`min-h-screen ${dark ? 'bg-charcoal-950' : 'bg-gray-50'}`}>
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Back */}
        <button type="button" onClick={() => navigate('/projects')}
          className={`flex items-center gap-2 text-sm mb-6 transition-colors ${dark ? 'text-charcoal-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
          <ArrowLeft size={15} /> Back to projects
        </button>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-500/15 text-gold-400 text-xs font-bold mb-4">
            <Zap size={12} /> Smart Match
          </div>
          <h1 className={`font-display text-3xl font-bold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
            We found your best matches
          </h1>
          <p className={`text-sm ${textSub}`}>
            Based on your project needs, budget, and timeline — curated for {serviceLabel}
          </p>
          {project?.title && (
            <p className={`text-xs mt-1 ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>
              Project: {project.title}
            </p>
          )}
        </div>

        {/* Match cards */}
        {matches.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {matches.map((match, i) => (
              <div key={match.creator.id} className="relative">
                {i === 0 && (
                  <div className="absolute -top-2.5 left-4 z-10 px-2.5 py-0.5 rounded-full bg-gold-500 text-charcoal-900 text-[10px] font-bold">
                    Best Match
                  </div>
                )}
                <MatchCard
                  match={match}
                  dark={dark}
                  onViewProfile={id => navigate(`/creator/${id}`)}
                  onRequestQuote={creator => navigate(`/creator/${creator.id}`)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className={`text-center py-16 rounded-2xl border ${dark ? 'bg-charcoal-800 border-charcoal-700' : 'bg-white border-gray-200'}`}>
            <p className="text-3xl mb-3">🔍</p>
            <p className={`font-bold text-base mb-1 ${dark ? 'text-white' : 'text-gray-900'}`}>No exact matches found</p>
            <p className={`text-sm ${textSub} mb-4`}>Try expanding your budget or choosing "remote" for location.</p>
            <Link to="/" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold-500 text-charcoal-900 text-sm font-bold">
              Browse all creators <ChevronRight size={14} />
            </Link>
          </div>
        )}

        {/* Browse all link */}
        {matches.length > 0 && (
          <div className="text-center">
            <Link to="/"
              className={`inline-flex items-center gap-1 text-sm transition-colors ${dark ? 'text-charcoal-400 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}>
              Browse all creators <ChevronRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
