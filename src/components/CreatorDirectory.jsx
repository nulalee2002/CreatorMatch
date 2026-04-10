import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Star, ChevronDown, ChevronUp, X, Globe, Mail, Phone, Instagram, Plus, Trash2, ArrowRight, Filter, UserPlus, Heart, ExternalLink, BadgeCheck } from 'lucide-react';
import { SERVICES, RATES } from '../data/rates.js';
import { REGIONS } from '../data/regions.js';
import { SEED_CREATORS, initSeedData, SHOW_DEMO_CREATORS } from '../data/seedCreators.js';
import { zipToRegion, zipToCity } from '../data/zipCodes.js';
import { VerificationBadge } from './VerificationFlow.jsx';
import { LoyaltyBadge } from './LoyaltyBadge.jsx';

// Initialize seed data (version-gated — replaces stale seeds automatically)
initSeedData();

// ── LocalStorage helpers ──────────────────────────────────────
function loadListings() {
  try { return JSON.parse(localStorage.getItem('creator-directory') || '[]'); } catch { return []; }
}
function saveListings(list) {
  localStorage.setItem('creator-directory', JSON.stringify(list));
}

// ── Creator Profile Card ─────────────────────────────────────
function CreatorCard({ creator, dark, searchServiceId, budget, onDelete }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  // Favorites
  const [isFav, setIsFav] = useState(() => {
    const favs = JSON.parse(localStorage.getItem('creator-favorites') || '[]');
    return favs.includes(creator.id);
  });
  function toggleFav(e) {
    e.stopPropagation();
    const favs = JSON.parse(localStorage.getItem('creator-favorites') || '[]');
    const updated = isFav ? favs.filter(f => f !== creator.id) : [...favs, creator.id];
    localStorage.setItem('creator-favorites', JSON.stringify(updated));
    setIsFav(f => !f);
  }

  // Find matching service for the current search
  const matchingService = searchServiceId
    ? creator.services?.find(s => s.serviceId === searchServiceId)
    : creator.services?.[0];

  const allServices = creator.services || [];
  const location = creator.location || {};
  const contact = creator.contact || {};
  const portfolio = creator.portfolio || [];
  const expLabel = { entry: '0-2 yrs', mid: '3-6 yrs', senior: '7+ yrs' }[creator.experience] || '';

  // Location display
  const locationStr = [location.city, location.state, location.country].filter(Boolean).join(', ');

  // Budget match indicator
  const budgetMatch = useMemo(() => {
    if (!budget || !matchingService?.rates) return null;
    const rates = Object.values(matchingService.rates).filter(Boolean);
    if (rates.length === 0) return null;
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    if (budget >= min && budget <= max) return 'perfect';
    if (budget >= min * 0.7 && budget <= max * 1.5) return 'close';
    if (budget < min) return 'below';
    return 'above';
  }, [budget, matchingService]);

  const budgetColors = {
    perfect: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    close: 'text-gold-400 bg-gold-500/10 border-gold-500/30',
    below: 'text-charcoal-400 bg-charcoal-700/30 border-charcoal-600',
    above: 'text-teal-300 bg-teal-500/5 border-teal-500/20',
  };

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      dark ? 'bg-charcoal-800 border-charcoal-700 hover:border-charcoal-500' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
    }`}>
      <div className="p-5">
        {/* Header: Avatar + Name + Rating */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${dark ? 'bg-charcoal-700' : 'bg-gray-100'}`}>
            {creator.avatar || '🎬'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <h3 className={`font-display font-bold text-base leading-tight ${dark ? 'text-white' : 'text-gray-900'}`}>
                {creator.businessName || creator.name}
              </h3>
              {creator.verification_status && creator.verification_status !== 'unverified' ? (
                <VerificationBadge status={creator.verification_status} />
              ) : creator.verified ? (
                <BadgeCheck size={14} className="text-teal-400 shrink-0 mt-0.5" title="Verified creator" />
              ) : null}
              {creator.completed_projects > 0 && (
                <LoyaltyBadge completedProjects={creator.completed_projects} />
              )}
            </div>
            {creator.businessName && creator.name && (
              <p className={`text-xs ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>{creator.name}</p>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs flex items-center gap-1 ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>
                <MapPin size={10} /> {locationStr}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${dark ? 'bg-charcoal-700 text-charcoal-400' : 'bg-gray-100 text-gray-500'}`}>
                {expLabel}
              </span>
              {creator.availability === 'available' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/15 text-teal-400 font-medium">
                  Available
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            <button type="button" onClick={toggleFav}
              className={`p-1.5 rounded-lg transition-all ${isFav ? 'text-red-400' : dark ? 'text-charcoal-600 hover:text-red-400' : 'text-gray-300 hover:text-red-400'}`}
              title={isFav ? 'Remove from favorites' : 'Save to favorites'}>
              <Heart size={14} className={isFav ? 'fill-current' : ''} />
            </button>
            {creator.rating && (
              <div className="flex items-center gap-1 justify-end">
                <Star size={12} className="text-gold-400 fill-gold-400" />
                <span className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{creator.rating}</span>
                {creator.reviewCount && (
                  <span className={`text-[10px] ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>({creator.reviewCount})</span>
                )}
              </div>
            )}
            {budgetMatch && budget > 0 && (
              <div className={`text-[10px] px-2 py-0.5 rounded-full border ${budgetColors[budgetMatch]}`}>
                {budgetMatch === 'perfect' ? 'In budget' : budgetMatch === 'close' ? 'Near budget' : budgetMatch === 'below' ? 'Above budget' : 'Under budget'}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        <p className={`text-xs leading-relaxed ${expanded ? '' : 'line-clamp-2'} ${dark ? 'text-charcoal-300' : 'text-gray-600'}`}>
          {creator.bio}
        </p>

        {/* Tags */}
        {creator.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {creator.tags.slice(0, expanded ? undefined : 5).map(tag => (
              <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full ${dark ? 'bg-charcoal-700 text-charcoal-300' : 'bg-gray-100 text-gray-600'}`}>
                {tag}
              </span>
            ))}
            {!expanded && creator.tags.length > 5 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>
                +{creator.tags.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Services + Rates */}
        <div className={`mt-3 space-y-2`}>
          {(expanded ? allServices : [matchingService].filter(Boolean)).map((svc, i) => {
            const serviceDef = SERVICES[svc.serviceId];
            const rates = Object.entries(svc.rates || {});
            const serviceRates = RATES[svc.serviceId] || {};
            return (
              <div key={i} className={`rounded-xl border px-3 py-2.5 ${dark ? 'bg-charcoal-900/60 border-charcoal-700' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm">{serviceDef?.icon || '🎬'}</span>
                  <span className={`text-xs font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{serviceDef?.name || svc.serviceId}</span>
                  {svc.subtypes?.length > 0 && (
                    <span className={`text-[10px] ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>
                      {svc.subtypes.join(' / ')}
                    </span>
                  )}
                </div>
                {svc.description && expanded && (
                  <p className={`text-[11px] mb-2 ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>{svc.description}</p>
                )}
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  {rates.slice(0, expanded ? undefined : 3).map(([rateKey, rateVal]) => {
                    const meta = serviceRates[rateKey];
                    const isBudgetMatch = budget > 0 && Math.abs(rateVal - budget) / budget < 0.3;
                    return (
                      <div key={rateKey} className={`flex justify-between items-baseline gap-2 py-0.5 rounded px-1 ${
                        isBudgetMatch ? (dark ? 'bg-teal-500/10' : 'bg-teal-50') : ''
                      }`}>
                        <span className={`text-[11px] truncate ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>
                          {meta?.label || rateKey}
                        </span>
                        <span className={`text-xs font-semibold shrink-0 ${isBudgetMatch ? 'text-teal-400' : dark ? 'text-white' : 'text-gray-900'}`}>
                          ${rateVal?.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {!expanded && rates.length > 3 && (
                  <p className={`text-[10px] mt-1 ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>+{rates.length - 3} more rates</p>
                )}
              </div>
            );
          })}
          {!expanded && allServices.length > 1 && (
            <p className={`text-[10px] ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>
              +{allServices.length - 1} more service{allServices.length > 2 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Portfolio (expanded) */}
        {expanded && portfolio.length > 0 && (
          <div className={`mt-3 border-t pt-3 ${dark ? 'border-charcoal-700' : 'border-gray-200'}`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>Portfolio</p>
            <div className="space-y-1.5">
              {portfolio.map((item, i) => (
                <div key={i} className={`flex items-start gap-2 px-2 py-1.5 rounded-lg ${dark ? 'bg-charcoal-900/40' : 'bg-gray-50'}`}>
                  <span className="text-xs">{SERVICES[item.serviceId]?.icon || '🎬'}</span>
                  <div>
                    <p className={`text-xs font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{item.title}</p>
                    <p className={`text-[10px] ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expand toggle */}
        <button type="button" onClick={() => setExpanded(e => !e)}
          className={`mt-2 text-[11px] flex items-center gap-1 ${dark ? 'text-charcoal-400 hover:text-gold-400' : 'text-gray-400 hover:text-gold-500'} transition-colors`}>
          {expanded ? <><ChevronUp size={11} /> Show less</> : <><ChevronDown size={11} /> View full profile</>}
        </button>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <button type="button" onClick={() => navigate(`/creator/${creator.id}`)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-charcoal-900 font-bold transition-all">
            <ExternalLink size={12} /> View Profile
          </button>
          {contact.email && (
            <a href={`mailto:${contact.email}`}
              className={`flex items-center justify-center gap-1.5 text-xs py-2 px-3 rounded-xl border font-semibold transition-all ${
                dark ? 'border-charcoal-600 text-charcoal-300 hover:border-charcoal-500 hover:text-white' : 'border-gray-200 text-gray-600 hover:text-gray-900'
              }`} title="Send email">
              <Mail size={12} />
            </a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`}
              className={`flex items-center justify-center gap-1.5 text-xs py-2 px-3 rounded-xl border font-semibold transition-all ${
                dark ? 'border-charcoal-600 text-charcoal-300 hover:border-charcoal-500 hover:text-white' : 'border-gray-200 text-gray-600 hover:text-gray-900'
              }`} title="Call">
              <Phone size={12} />
            </a>
          )}
          {contact.website && (
            <a href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
              target="_blank" rel="noreferrer"
              className={`flex items-center justify-center gap-1.5 text-xs py-2 px-3 rounded-xl border font-semibold transition-all ${
                dark ? 'border-charcoal-600 text-charcoal-300 hover:border-charcoal-500 hover:text-white' : 'border-gray-200 text-gray-600 hover:text-gray-900'
              }`} title="Website">
              <Globe size={12} />
            </a>
          )}
          {contact.instagram && (
            <a href={`https://instagram.com/${contact.instagram.replace('@','')}`}
              target="_blank" rel="noreferrer"
              className={`flex items-center justify-center gap-1.5 text-xs py-2 px-3 rounded-xl border font-semibold transition-all ${
                dark ? 'border-charcoal-600 text-charcoal-300 hover:border-charcoal-500 hover:text-white' : 'border-gray-200 text-gray-600 hover:text-gray-900'
              }`} title="Instagram">
              <Instagram size={12} />
            </a>
          )}
        </div>

        {/* Delete for user-added listings */}
        {onDelete && (
          <button type="button" onClick={() => onDelete(creator.id)}
            className="mt-2 text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
            <Trash2 size={10} /> Remove listing
          </button>
        )}
      </div>
    </div>
  );
}

// ── Register Form ────────────────────────────────────────────
function RegisterForm({ onSave, dark, onCancel }) {
  const [form, setForm] = useState({
    name: '', businessName: '', bio: '', experience: 'mid',
    avatar: '', tags: '',
    location: { city: '', state: '', country: 'US', zip: '' },
    services: [{ serviceId: 'photography', subtypes: '', rates: {}, description: '' }],
    portfolio: [],
    contact: { email: '', phone: '', website: '', instagram: '' },
    rating: '', reviewCount: '',
  });
  const [step, setStep] = useState(1);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));
  const setLocation = (field, val) => setForm(f => ({ ...f, location: { ...f.location, [field]: val } }));
  const setContact = (field, val) => setForm(f => ({ ...f, contact: { ...f.contact, [field]: val } }));

  const updateService = (idx, field, val) => {
    setForm(f => {
      const services = [...f.services];
      services[idx] = { ...services[idx], [field]: val };
      return { ...f, services };
    });
  };
  const setServiceRate = (idx, key, val) => {
    setForm(f => {
      const services = [...f.services];
      services[idx] = { ...services[idx], rates: { ...services[idx].rates, [key]: parseFloat(val) || 0 } };
      return { ...f, services };
    });
  };
  const addService = () => {
    setForm(f => ({
      ...f,
      services: [...f.services, { serviceId: 'video', subtypes: '', rates: {}, description: '' }],
    }));
  };
  const removeService = (idx) => {
    setForm(f => ({ ...f, services: f.services.filter((_, i) => i !== idx) }));
  };
  const addPortfolio = () => {
    setForm(f => ({
      ...f,
      portfolio: [...f.portfolio, { title: '', description: '', serviceId: f.services[0]?.serviceId || 'photography' }],
    }));
  };
  const updatePortfolio = (idx, field, val) => {
    setForm(f => {
      const portfolio = [...f.portfolio];
      portfolio[idx] = { ...portfolio[idx], [field]: val };
      return { ...f, portfolio };
    });
  };
  const removePortfolio = (idx) => {
    setForm(f => ({ ...f, portfolio: f.portfolio.filter((_, i) => i !== idx) }));
  };

  const inputCls = dark
    ? 'bg-charcoal-900 border-charcoal-600 text-white placeholder-charcoal-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500/40'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gold-500';
  const labelCls = `text-xs font-medium ${dark ? 'text-charcoal-400' : 'text-gray-500'} mb-1`;

  const handleSubmit = () => {
    if (!form.name || !form.contact.email) return;
    const regionKey = zipToRegion(form.location.zip) || 'us-tier2';
    const city = zipToCity(form.location.zip) || form.location.city;
    const listing = {
      ...form,
      id: Date.now().toString(),
      location: { ...form.location, city: city || form.location.city, regionKey },
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      services: form.services.map(s => ({
        ...s,
        subtypes: typeof s.subtypes === 'string' ? s.subtypes.split(',').map(t => t.trim()).filter(Boolean) : s.subtypes,
      })),
      rating: parseFloat(form.rating) || null,
      reviewCount: parseInt(form.reviewCount) || null,
      availability: 'available',
      createdAt: new Date().toISOString(),
    };
    onSave(listing);
  };

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex gap-2">
        {[
          { n: 1, label: 'About You' },
          { n: 2, label: 'Services & Rates' },
          { n: 3, label: 'Portfolio' },
          { n: 4, label: 'Contact' },
        ].map(({ n, label }) => (
          <div key={n} className="flex items-center gap-1.5 flex-1">
            <button type="button" onClick={() => setStep(n)}
              className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
                n <= step ? 'bg-gold-500 text-charcoal-900' : dark ? 'bg-charcoal-700 text-charcoal-500' : 'bg-gray-200 text-gray-400'
              }`}>{n}</button>
            <span className={`text-[10px] hidden sm:inline ${n === step ? 'text-gold-400 font-medium' : dark ? 'text-charcoal-500' : 'text-gray-400'}`}>
              {label}
            </span>
            {n < 4 && <div className={`flex-1 h-px ${n < step ? 'bg-gold-500/50' : dark ? 'bg-charcoal-700' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: About */}
      {step === 1 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className={labelCls}>Your Name *</p>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Marcus Chen"
                className={`w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all ${inputCls}`} />
            </div>
            <div>
              <p className={labelCls}>Business Name</p>
              <input type="text" value={form.businessName} onChange={e => set('businessName', e.target.value)} placeholder="e.g. Elevation Films"
                className={`w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all ${inputCls}`} />
            </div>
          </div>
          <div>
            <p className={labelCls}>Bio *</p>
            <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={3}
              placeholder="Tell clients what you specialize in, your style, and what makes you stand out..."
              className={`w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all resize-none ${inputCls}`} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className={labelCls}>City</p>
              <input type="text" value={form.location.city} onChange={e => setLocation('city', e.target.value)} placeholder="Los Angeles"
                className={`w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all ${inputCls}`} />
            </div>
            <div>
              <p className={labelCls}>State / Region</p>
              <input type="text" value={form.location.state} onChange={e => setLocation('state', e.target.value)} placeholder="CA"
                className={`w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all ${inputCls}`} />
            </div>
            <div>
              <p className={labelCls}>ZIP Code</p>
              <input type="text" maxLength={5} value={form.location.zip} onChange={e => setLocation('zip', e.target.value.replace(/\D/g, ''))}
                placeholder="90028"
                className={`w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all ${inputCls}`} />
              {form.location.zip.length >= 3 && zipToCity(form.location.zip) && (
                <p className="text-[10px] text-teal-400 mt-1">{zipToCity(form.location.zip)}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className={labelCls}>Country</p>
              <select value={form.location.country} onChange={e => setLocation('country', e.target.value)}
                className={`w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all ${inputCls}`}>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="UK">United Kingdom</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="ES">Spain</option>
                <option value="IT">Italy</option>
                <option value="SE">Scandinavia</option>
                <option value="NL">Netherlands</option>
              </select>
            </div>
            <div>
              <p className={labelCls}>Experience Level</p>
              <div className={`flex rounded-xl border overflow-hidden h-[42px] ${dark ? 'border-charcoal-600' : 'border-gray-200'}`}>
                {[['entry','0-2y'],['mid','3-6y'],['senior','7+y']].map(([id, lbl]) => (
                  <button key={id} type="button" onClick={() => set('experience', id)}
                    className={`flex-1 text-xs font-medium transition-colors ${
                      form.experience === id ? 'bg-gold-500 text-charcoal-900' : dark ? 'text-charcoal-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                    }`}>{lbl}</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <p className={labelCls}>Tags (comma-separated)</p>
            <input type="text" value={form.tags} onChange={e => set('tags', e.target.value)}
              placeholder="Corporate, Wedding, Drone, UGC, Real Estate"
              className={`w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all ${inputCls}`} />
          </div>
        </div>
      )}

      {/* Step 2: Services & Rates */}
      {step === 2 && (
        <div className="space-y-4">
          {form.services.map((svc, sIdx) => {
            const serviceDef = SERVICES[svc.serviceId];
            const serviceRates = RATES[svc.serviceId] || {};
            const allRateKeys = serviceDef ? [...(serviceDef.primaryRates || []), ...(serviceDef.packageRates || [])] : [];
            return (
              <div key={sIdx} className={`rounded-xl border p-4 ${dark ? 'border-charcoal-700 bg-charcoal-900/40' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-xs font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Service {sIdx + 1}</p>
                  {form.services.length > 1 && (
                    <button type="button" onClick={() => removeService(sIdx)}
                      className="text-red-400 hover:text-red-300 transition-colors"><Trash2 size={12} /></button>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 mb-3">
                  {Object.values(SERVICES).map(s => (
                    <button key={s.id} type="button" onClick={() => updateService(sIdx, 'serviceId', s.id)}
                      className={`flex flex-col items-center gap-0.5 p-2 rounded-xl border text-center transition-all ${
                        svc.serviceId === s.id
                          ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                          : dark ? 'border-charcoal-700 text-charcoal-400 hover:border-charcoal-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      <span className="text-base">{s.icon}</span>
                      <span className="text-[9px] font-medium leading-tight">{s.name}</span>
                    </button>
                  ))}
                </div>
                <div className="mb-3">
                  <p className={labelCls}>Specialties (comma-separated)</p>
                  <input type="text" value={svc.subtypes} onChange={e => updateService(sIdx, 'subtypes', e.target.value)}
                    placeholder={serviceDef?.subtypes?.join(', ')}
                    className={`w-full px-3 py-2 text-sm rounded-xl border outline-none transition-all ${inputCls}`} />
                </div>
                <div className="mb-3">
                  <p className={labelCls}>Description</p>
                  <textarea value={svc.description} onChange={e => updateService(sIdx, 'description', e.target.value)} rows={2}
                    placeholder="Describe what's included in your service..."
                    className={`w-full px-3 py-2 text-sm rounded-xl border outline-none transition-all resize-none ${inputCls}`} />
                </div>
                <p className={labelCls}>Your Rates ($)</p>
                <div className="space-y-1.5">
                  {allRateKeys.map(key => {
                    const meta = serviceRates[key];
                    if (!meta) return null;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className={`text-xs flex-1 truncate ${dark ? 'text-charcoal-300' : 'text-gray-600'}`}>{meta.label}</span>
                        <div className="relative flex items-center w-28 shrink-0">
                          <span className={`absolute left-2 text-xs pointer-events-none ${dark ? 'text-charcoal-400' : 'text-gray-400'}`}>$</span>
                          <input type="number" min={0} value={svc.rates[key] || ''}
                            onChange={e => setServiceRate(sIdx, key, e.target.value)} placeholder="0"
                            className={`w-full pl-5 pr-2 py-1.5 text-sm rounded-lg border outline-none transition-all ${inputCls}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <button type="button" onClick={addService}
            className={`w-full py-2.5 rounded-xl border-2 border-dashed text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              dark ? 'border-charcoal-600 text-charcoal-400 hover:border-gold-500/50 hover:text-gold-400' : 'border-gray-300 text-gray-500 hover:border-gold-500/50 hover:text-gold-500'
            }`}>
            <Plus size={14} /> Add Another Service
          </button>
        </div>
      )}

      {/* Step 3: Portfolio */}
      {step === 3 && (
        <div className="space-y-3">
          <p className={`text-xs ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>
            Show off your best work. These help clients understand what you can deliver.
          </p>
          {form.portfolio.map((item, i) => (
            <div key={i} className={`rounded-xl border p-3 ${dark ? 'border-charcoal-700 bg-charcoal-900/40' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex gap-2 mb-2">
                <input type="text" value={item.title} onChange={e => updatePortfolio(i, 'title', e.target.value)}
                  placeholder="Project title" className={`flex-1 px-3 py-2 text-sm rounded-lg border outline-none transition-all ${inputCls}`} />
                <select value={item.serviceId} onChange={e => updatePortfolio(i, 'serviceId', e.target.value)}
                  className={`px-2 py-2 text-xs rounded-lg border outline-none transition-all ${inputCls}`}>
                  {form.services.map((s, si) => (
                    <option key={si} value={s.serviceId}>{SERVICES[s.serviceId]?.icon} {SERVICES[s.serviceId]?.name}</option>
                  ))}
                </select>
                <button type="button" onClick={() => removePortfolio(i)}
                  className="text-red-400 hover:text-red-300 p-1 transition-colors"><Trash2 size={12} /></button>
              </div>
              <input type="text" value={item.description} onChange={e => updatePortfolio(i, 'description', e.target.value)}
                placeholder="Brief description of the project"
                className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all ${inputCls}`} />
            </div>
          ))}
          <button type="button" onClick={addPortfolio}
            className={`w-full py-2.5 rounded-xl border-2 border-dashed text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              dark ? 'border-charcoal-600 text-charcoal-400 hover:border-gold-500/50 hover:text-gold-400' : 'border-gray-300 text-gray-500 hover:border-gold-500/50 hover:text-gold-500'
            }`}>
            <Plus size={14} /> Add Portfolio Item
          </button>
        </div>
      )}

      {/* Step 4: Contact */}
      {step === 4 && (
        <div className="space-y-3">
          {[
            { key: 'email',     label: 'Email *',          placeholder: 'hello@yourstudio.com',    icon: Mail },
            { key: 'phone',     label: 'Phone',            placeholder: '(555) 000-0000',          icon: Phone },
            { key: 'website',   label: 'Website',          placeholder: 'yourstudio.com',          icon: Globe },
            { key: 'instagram', label: 'Instagram Handle', placeholder: '@yourstudio',             icon: Instagram },
          ].map(({ key, label, placeholder, icon: Icon }) => (
            <div key={key}>
              <p className={labelCls}>{label}</p>
              <div className="relative flex items-center">
                <Icon size={14} className={`absolute left-3 pointer-events-none ${dark ? 'text-charcoal-400' : 'text-gray-400'}`} />
                <input type="text" value={form.contact[key]} onChange={e => setContact(key, e.target.value)} placeholder={placeholder}
                  className={`w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border outline-none transition-all ${inputCls}`} />
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className={labelCls}>Your Rating (optional)</p>
              <input type="number" min={0} max={5} step={0.1} value={form.rating} onChange={e => set('rating', e.target.value)} placeholder="4.8"
                className={`w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all ${inputCls}`} />
            </div>
            <div>
              <p className={labelCls}># of Reviews (optional)</p>
              <input type="number" min={0} value={form.reviewCount} onChange={e => set('reviewCount', e.target.value)} placeholder="47"
                className={`w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all ${inputCls}`} />
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2">
        {step > 1 && (
          <button type="button" onClick={() => setStep(s => s - 1)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${dark ? 'border-charcoal-600 text-charcoal-300 hover:text-white' : 'border-gray-200 text-gray-600 hover:text-gray-900'}`}>
            Back
          </button>
        )}
        {step < 4 ? (
          <button type="button" onClick={() => setStep(s => s + 1)}
            disabled={step === 1 && !form.name}
            className="flex-1 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-charcoal-900 text-xs font-bold disabled:opacity-40 transition-all flex items-center justify-center gap-1.5">
            Next <ArrowRight size={12} />
          </button>
        ) : (
          <button type="button" onClick={handleSubmit}
            disabled={!form.name || !form.contact.email}
            className="flex-1 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-500 text-charcoal-900 text-xs font-bold disabled:opacity-40 transition-all">
            Publish My Profile
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────
export function CreatorDirectory({ dark = true, mode = 'search', onSwitchToRegister, onSwitchToSearch }) {
  const [listings, setListings] = useState(loadListings);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [budget, setBudget] = useState('');
  const [zip, setZip] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [showFilters, setShowFilters] = useState(false);

  const budgetNum = parseFloat(budget) || 0;
  const zipRegion = zip.length >= 3 ? zipToRegion(zip) : null;
  const zipCity = zip.length >= 3 ? zipToCity(zip) : null;

  // Filter and sort creators
  const filtered = useMemo(() => {
    let list = [...listings];

    // Service filter
    if (serviceFilter !== 'all') {
      list = list.filter(c =>
        c.services?.some(s => s.serviceId === serviceFilter)
      );
    }

    // Text search (name, bio, tags, location)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => {
        const searchable = [
          c.name, c.businessName, c.bio,
          ...(c.tags || []),
          c.location?.city, c.location?.state, c.location?.country,
          ...(c.services?.flatMap(s => [
            SERVICES[s.serviceId]?.name,
            ...(s.subtypes || []),
          ]) || []),
        ].filter(Boolean).join(' ').toLowerCase();
        return searchable.includes(q);
      });
    }

    // ZIP/region filter
    if (zipRegion) {
      const tier = REGIONS[zipRegion]?.tier;
      list = list.filter(c => {
        const cRegion = c.location?.regionKey;
        const cTier = REGIONS[cRegion]?.tier;
        return Math.abs((cTier || 0) - (tier || 0)) <= 1;
      });
    }

    // Budget filter
    if (budgetNum > 0 && serviceFilter !== 'all') {
      list = list.filter(c => {
        const svc = c.services?.find(s => s.serviceId === serviceFilter);
        if (!svc?.rates) return true;
        const rates = Object.values(svc.rates).filter(Boolean);
        if (rates.length === 0) return true;
        const min = Math.min(...rates);
        return min <= budgetNum * 2.5;
      });
    }

    // Sort
    switch (sortBy) {
      case 'rating':
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'reviews':
        list.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
        break;
      case 'price_asc': {
        const getMin = (c) => {
          const svc = serviceFilter !== 'all' ? c.services?.find(s => s.serviceId === serviceFilter) : c.services?.[0];
          const rates = Object.values(svc?.rates || {}).filter(Boolean);
          return rates.length > 0 ? Math.min(...rates) : Infinity;
        };
        list.sort((a, b) => getMin(a) - getMin(b));
        break;
      }
      case 'price_desc': {
        const getMax = (c) => {
          const svc = serviceFilter !== 'all' ? c.services?.find(s => s.serviceId === serviceFilter) : c.services?.[0];
          const rates = Object.values(svc?.rates || {}).filter(Boolean);
          return rates.length > 0 ? Math.max(...rates) : 0;
        };
        list.sort((a, b) => getMax(b) - getMax(a));
        break;
      }
      case 'match':
        if (budgetNum > 0 && serviceFilter !== 'all') {
          list.sort((a, b) => {
            const aRate = Object.values(a.services?.find(s => s.serviceId === serviceFilter)?.rates || {});
            const bRate = Object.values(b.services?.find(s => s.serviceId === serviceFilter)?.rates || {});
            const aDist = aRate.length ? Math.min(...aRate.map(r => Math.abs(r - budgetNum))) : Infinity;
            const bDist = bRate.length ? Math.min(...bRate.map(r => Math.abs(r - budgetNum))) : Infinity;
            return aDist - bDist;
          });
        }
        break;
    }

    // Apply verification ranking boost on top of all sorts:
    // Pro Verified > Verified > Unverified, then by rating, then by completed_projects
    const verificationRank = (c) => {
      if (c.verification_status === 'pro_verified') return 2;
      if (c.verification_status === 'verified') return 1;
      return 0;
    };
    list.sort((a, b) => {
      const vDiff = verificationRank(b) - verificationRank(a);
      if (vDiff !== 0) return vDiff;
      const rDiff = (b.rating || 0) - (a.rating || 0);
      if (rDiff !== 0) return rDiff;
      return (b.completed_projects || 0) - (a.completed_projects || 0);
    });

    return list;
  }, [listings, serviceFilter, searchQuery, budgetNum, zipRegion, sortBy]);

  const handleSaveListing = (listing) => {
    const updated = [listing, ...listings];
    setListings(updated);
    saveListings(updated);
    if (onSwitchToSearch) onSwitchToSearch();
  };

  const handleDelete = (id) => {
    const updated = listings.filter(l => l.id !== id);
    setListings(updated);
    saveListings(updated);
  };

  const textSub = dark ? 'text-charcoal-400' : 'text-gray-500';
  const inputCls = dark
    ? 'bg-charcoal-900 border-charcoal-600 text-white placeholder-charcoal-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500/40'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gold-500';

  // ── Register mode ──
  if (mode === 'register') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className={`font-display text-3xl font-bold mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
            Join <span className="text-gradient-gold">CreatorMatch</span>
          </h1>
          <p className={`text-sm ${textSub} max-w-lg mx-auto`}>
            List your services, set your rates, and let clients find you. Creators from all over the world are signing up.
          </p>
        </div>

        <div className={`rounded-2xl border p-6 ${dark ? 'bg-charcoal-800 border-charcoal-700' : 'bg-white border-gray-200'}`}>
          <RegisterForm onSave={handleSaveListing} dark={dark} />
        </div>

        {/* Stats */}
        <div className={`mt-6 grid grid-cols-3 gap-4 text-center`}>
          {[
            { n: listings.length, label: 'Creators listed' },
            { n: Object.keys(SERVICES).length, label: 'Service types' },
            { n: new Set(listings.map(l => l.location?.country).filter(Boolean)).size, label: 'Countries' },
          ].map(({ n, label }) => (
            <div key={label} className={`rounded-xl border p-3 ${dark ? 'border-charcoal-700 bg-charcoal-800' : 'border-gray-200 bg-white'}`}>
              <p className="font-display text-xl font-bold text-gradient-gold">{n}</p>
              <p className={`text-[10px] ${textSub}`}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Search mode (default) ──
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Hero search */}
      <div className="text-center mb-6">
        <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>
          The creator marketplace
        </p>
        <h1 className={`font-display text-3xl sm:text-4xl font-bold mb-3 leading-tight ${dark ? 'text-white' : 'text-gray-900'}`}>
          Hire the right creator.<br className="hidden sm:block" />
          <span className="text-gradient-gold">Fast.</span>
        </h1>
        <p className={`text-sm ${textSub} max-w-xl mx-auto mb-5`}>
          Browse verified videographers, photographers, podcast producers, drone operators, and more from around the world. Compare portfolios, see real rates, and book directly.
        </p>

        {/* Main search bar */}
        <div className={`max-w-2xl mx-auto flex rounded-2xl border overflow-hidden ${dark ? 'border-charcoal-600 bg-charcoal-800' : 'border-gray-200 bg-white'} shadow-lg`}>
          <div className="relative flex-1 flex items-center">
            <Search size={16} className={`absolute left-4 pointer-events-none ${dark ? 'text-charcoal-400' : 'text-gray-400'}`} />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, service, location, or specialty..."
              className={`w-full pl-11 pr-4 py-3.5 text-sm bg-transparent outline-none ${dark ? 'text-white placeholder-charcoal-500' : 'text-gray-900 placeholder-gray-400'}`}
            />
          </div>
          <button type="button" onClick={() => setShowFilters(f => !f)}
            className={`px-4 flex items-center gap-1.5 text-xs font-semibold border-l transition-colors ${
              showFilters
                ? 'bg-gold-500 text-charcoal-900'
                : dark ? 'border-charcoal-600 text-charcoal-400 hover:text-white' : 'border-gray-200 text-gray-500 hover:text-gray-900'
            }`}>
            <Filter size={12} /> Filters
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className={`max-w-2xl mx-auto mb-6 rounded-2xl border p-4 ${dark ? 'bg-charcoal-800 border-charcoal-700' : 'bg-white border-gray-200'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <p className={`text-xs font-medium mb-1 ${textSub}`}>Budget</p>
              <div className="relative flex items-center">
                <span className={`absolute left-3 text-sm pointer-events-none ${dark ? 'text-charcoal-400' : 'text-gray-400'}`}>$</span>
                <input type="number" min={0} value={budget} onChange={e => setBudget(e.target.value)}
                  placeholder="e.g. 500"
                  className={`w-full pl-7 pr-3 py-2.5 text-sm rounded-xl border outline-none transition-all ${inputCls}`} />
              </div>
            </div>
            <div>
              <p className={`text-xs font-medium mb-1 ${textSub}`}>Your ZIP Code</p>
              <div className="relative flex items-center">
                <MapPin size={14} className={`absolute left-3 pointer-events-none ${dark ? 'text-charcoal-400' : 'text-gray-400'}`} />
                <input type="text" maxLength={5} value={zip} onChange={e => setZip(e.target.value.replace(/\D/g,''))}
                  placeholder="e.g. 90210"
                  className={`w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border outline-none transition-all ${inputCls}`} />
              </div>
              {zipCity && <p className="text-[10px] text-teal-400 mt-1">{zipCity}</p>}
            </div>
            <div>
              <p className={`text-xs font-medium mb-1 ${textSub}`}>Sort By</p>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className={`w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all ${inputCls}`}>
                <option value="rating">Top Rated</option>
                <option value="reviews">Most Reviews</option>
                <option value="match">Best Budget Match</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Service type pills */}
      <div className="flex flex-wrap gap-2 mb-5 justify-center">
        <button type="button" onClick={() => setServiceFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            serviceFilter === 'all'
              ? 'bg-gold-500 text-charcoal-900'
              : dark ? 'bg-charcoal-800 text-charcoal-400 border border-charcoal-700 hover:border-charcoal-500' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
          }`}>
          All Services
        </button>
        {Object.values(SERVICES).map(s => (
          <button key={s.id} type="button" onClick={() => setServiceFilter(s.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
              serviceFilter === s.id
                ? 'bg-gold-500 text-charcoal-900'
                : dark ? 'bg-charcoal-800 text-charcoal-400 border border-charcoal-700 hover:border-charcoal-500' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
            }`}>
            <span>{s.icon}</span> {s.name}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className={`text-xs ${textSub}`}>
          {filtered.length} creator{filtered.length !== 1 ? 's' : ''} found
          {budgetNum > 0 && ` matching ~$${budgetNum.toLocaleString()} budget`}
          {zipCity && ` near ${zipCity}`}
        </p>
      </div>

      {/* Results grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(creator => (
            <CreatorCard
              key={creator.id}
              creator={creator}
              dark={dark}
              searchServiceId={serviceFilter !== 'all' ? serviceFilter : null}
              budget={budgetNum}
              onDelete={!creator.id.startsWith('seed-') ? () => handleDelete(creator.id) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className={`rounded-2xl border p-12 text-center ${dark ? 'border-charcoal-700 text-charcoal-500' : 'border-gray-200 text-gray-400'}`}>
          <p className="text-4xl mb-3">
            {searchQuery ? '🔍' : '🎬'}
          </p>
          <p className={`text-sm font-medium ${dark ? 'text-charcoal-300' : 'text-gray-600'}`}>
            No creators found for these filters.
          </p>
          <p className={`text-xs mt-1 ${textSub}`}>
            Try adjusting your search, service type, or budget range.
          </p>
        </div>
      )}

      {/* CTA to register */}
      <div className={`mt-8 rounded-2xl border border-dashed p-8 text-center ${dark ? 'border-charcoal-600' : 'border-gray-300'}`}>
        <p className={`font-display text-lg font-bold mb-1 ${dark ? 'text-white' : 'text-gray-900'}`}>
          Are you a content creator?
        </p>
        <p className={`text-xs mb-4 ${textSub} max-w-md mx-auto`}>
          List your services and rates so clients worldwide can find you. It's free to join.
        </p>
        <button type="button" onClick={onSwitchToRegister}
          className="px-6 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-charcoal-900 text-sm font-bold transition-all flex items-center gap-2 mx-auto">
          <UserPlus size={14} /> Join as Creator
        </button>
      </div>
    </div>
  );
}
