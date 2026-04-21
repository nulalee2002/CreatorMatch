import { useState, useMemo } from 'react';
import { getNewCreatorSpotlight } from '../utils/matchingAlgorithm.js';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Star, X, Plus, Trash2, ArrowRight, Filter, UserPlus, Heart, ExternalLink, BadgeCheck, AlertCircle } from 'lucide-react';
import { SERVICES, RATES } from '../data/rates.js';
import { REGIONS } from '../data/regions.js';
import { SEED_CREATORS, initSeedData, SHOW_DEMO_CREATORS } from '../data/seedCreators.js';
import { zipToRegion, zipToCity } from '../data/zipCodes.js';
import { VerificationBadge } from './VerificationFlow.jsx';
import { LoyaltyBadge } from './LoyaltyBadge.jsx';
import { TierBadge } from './TierBadge.jsx';
import { FastMatch } from './FastMatch.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { supabase, supabaseConfigured } from '../lib/supabase.js';

// Initialize seed data (version-gated — replaces stale seeds automatically)
initSeedData();

// ── LocalStorage helpers ──────────────────────────────────────
function loadListings() {
  try { return JSON.parse(localStorage.getItem('creator-directory') || '[]'); } catch { return []; }
}
function saveListings(list) {
  localStorage.setItem('creator-directory', JSON.stringify(list));
}

function getRotatingPreviewCreators(allCreators) {
  const today = new Date().toISOString().split('T')[0];
  const seed = today.split('-').reduce((acc, val) => acc + parseInt(val), 0);

  const verified = allCreators.filter(c =>
    c.verified ||
    c.verification_status === 'verified' ||
    c.verification_status === 'pro_verified' ||
    c.id?.startsWith('seed-')
  );

  const byNiche = {};
  verified.forEach(c => {
    const niche = c.services?.[0]?.serviceId || c.services?.[0]?.service_id || 'video';
    if (!byNiche[niche]) byNiche[niche] = [];
    byNiche[niche].push(c);
  });

  const niches = Object.keys(byNiche);
  if (niches.length === 0) return verified.slice(0, 3);

  const startIndex = seed % niches.length;
  const todayNiches = [
    niches[startIndex % niches.length],
    niches[(startIndex + 1) % niches.length],
    niches[(startIndex + 2) % niches.length],
  ].filter(Boolean);

  return todayNiches.map(niche => {
    const group = byNiche[niche] || [];
    return group[seed % Math.max(group.length, 1)];
  }).filter(Boolean).slice(0, 3);
}

// ── Creator Profile Card ─────────────────────────────────────
function CreatorCard({ creator, dark, onDelete, onViewProfile }) {
  const navigate = useNavigate();

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

  const location = creator.location || {};
  const expLabel = { entry: '0-2 yrs', mid: '3-6 yrs', senior: '7+ yrs' }[creator.experience] || '';
  const locationStr = [location.city, location.state, location.country].filter(Boolean).join(', ');

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      dark ? 'bg-charcoal-800 border-charcoal-700 hover:border-charcoal-500' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
    }`}>
      <div className="p-5">
        {/* Top row: Avatar + Name/Badges + Fav */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${dark ? 'bg-charcoal-700' : 'bg-gray-100'}`}>
            {creator.avatar || '🎬'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <h3 className={`font-display font-bold text-base leading-tight ${dark ? 'text-white' : 'text-gray-900'}`}>
                {creator.businessName || creator.name}
              </h3>
              {creator.verification_status && creator.verification_status !== 'unverified' ? (
                <VerificationBadge status={creator.verification_status} />
              ) : creator.verified ? (
                <BadgeCheck size={14} className="text-teal-400 shrink-0 mt-0.5" title="Verified creator" />
              ) : null}
              {creator.tier && creator.tier !== 'launch' && <TierBadge tierId={creator.tier} />}
              {creator.completed_projects > 0 && <LoyaltyBadge completedProjects={creator.completed_projects} />}
            </div>
            {creator.businessName && creator.name && (
              <p className={`text-xs ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>{creator.name}</p>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {locationStr && (
                <span className={`text-xs flex items-center gap-1 ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>
                  <MapPin size={10} /> {locationStr}
                </span>
              )}
              {expLabel && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${dark ? 'bg-charcoal-700 text-charcoal-400' : 'bg-gray-100 text-gray-500'}`}>
                  {expLabel}
                </span>
              )}
              {creator.availability === 'available' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/15 text-teal-400 font-medium">
                  Available
                </span>
              )}
            </div>
          </div>
          <button type="button" onClick={toggleFav}
            className={`p-1.5 rounded-lg transition-all shrink-0 ${isFav ? 'text-red-400' : dark ? 'text-charcoal-600 hover:text-red-400' : 'text-gray-300 hover:text-red-400'}`}
            title={isFav ? 'Remove from favorites' : 'Save to favorites'}>
            <Heart size={14} className={isFav ? 'fill-current' : ''} />
          </button>
        </div>

        {/* Bio: always 2 lines max */}
        <p className={`text-xs leading-relaxed line-clamp-2 ${dark ? 'text-charcoal-300' : 'text-gray-600'}`}>
          {creator.bio}
        </p>

        {/* Tags: max 4, no expand */}
        {creator.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {creator.tags.slice(0, 4).map(tag => (
              <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full ${dark ? 'bg-charcoal-700 text-charcoal-300' : 'bg-gray-100 text-gray-600'}`}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Bottom row: rating left, View Profile right */}
        <div className="flex items-center justify-between mt-3">
          <div>
            {creator.rating ? (
              <div className="flex items-center gap-1">
                <Star size={12} className="text-gold-400 fill-gold-400" />
                <span className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{creator.rating}</span>
                {creator.reviewCount && (
                  <span className={`text-[10px] ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>({creator.reviewCount})</span>
                )}
              </div>
            ) : <span />}
          </div>
          <button
            type="button"
            onClick={onViewProfile ?? (() => navigate(`/creator/${creator.id}`))}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gold-500 hover:bg-gold-600 text-charcoal-900 font-bold transition-all"
          >
            <ExternalLink size={11} /> View Profile
          </button>
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
function RegisterForm({ onSave, dark, onCancel, user }) {
  const navigate = useNavigate();

  // Check if user already has a profile
  const existingProfile = useMemo(() => {
    if (!user?.id) return null;
    const all = loadListings();
    return all.find(c => c.user_id === user.id) || null;
  }, [user?.id]);

  const [serviceLimit, setServiceLimit] = useState('');
  const [form, setForm] = useState({
    name: '', businessName: '', bio: '', experience: 'mid',
    avatar: '', tags: '',
    location: { city: '', state: '', country: 'US', zip: '' },
    services: [{ serviceId: 'photography', subtypes: '', rates: {}, description: '' }],
    portfolio: [],
    contact: { email: '', phone: '', website: '', instagram: '' },
    rating: '', reviewCount: '',
    insuranceAck: false,
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
    setForm(f => {
      if (f.services.length >= 3) {
        setServiceLimit('CreatorMatch encourages creators to focus on their strongest services. You can list a maximum of 3 service specialties. This helps clients find the right creator faster and helps you stand out in your strongest areas.');
        return f;
      }
      return {
        ...f,
        services: [...f.services, { serviceId: 'video', subtypes: '', rates: {}, description: '' }],
      };
    });
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

  // If user already has a profile, show message instead of form
  if (existingProfile) {
    return (
      <div className={`rounded-2xl border p-6 text-center space-y-4 ${dark ? 'bg-charcoal-800 border-charcoal-700' : 'bg-white border-gray-200'}`}>
        <AlertCircle size={36} className="text-gold-400 mx-auto" />
        <h3 className={`font-display font-bold text-lg ${dark ? 'text-white' : 'text-gray-900'}`}>
          You already have a CreatorMatch profile.
        </h3>
        <p className={`text-sm ${dark ? 'text-charcoal-300' : 'text-gray-600'}`}>
          Each creator can only have one profile on the platform. Click below to edit your existing profile.
        </p>
        <button type="button" onClick={() => navigate('/dashboard')}
          className="px-6 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-charcoal-900 font-bold text-sm transition-all">
          Go to My Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Platform info */}
      <div className={`rounded-xl border p-3 text-xs ${dark ? 'border-charcoal-600 bg-charcoal-900/40 text-charcoal-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
        CreatorMatch is a curated platform. Each creator has one profile showcasing their best work.
      </div>

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
          {serviceLimit && (
            <div className={`rounded-xl border p-3 text-xs ${dark ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
              {serviceLimit}
            </div>
          )}
          {form.services.length < 3 && (
            <button type="button" onClick={addService}
              className={`w-full py-2.5 rounded-xl border-2 border-dashed text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                dark ? 'border-charcoal-600 text-charcoal-400 hover:border-gold-500/50 hover:text-gold-400' : 'border-gray-300 text-gray-500 hover:border-gold-500/50 hover:text-gold-500'
              }`}>
              <Plus size={14} /> Add Another Service
            </button>
          )}
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
            { key: 'email',     label: 'Email *',          placeholder: 'hello@yourstudio.com',  type: 'email' },
            { key: 'phone',     label: 'Phone',            placeholder: '(555) 000-0000',        type: 'tel' },
            { key: 'website',   label: 'Website',          placeholder: 'yourstudio.com',        type: 'text' },
            { key: 'instagram', label: 'Instagram Handle', placeholder: '@yourstudio',           type: 'text' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <p className={labelCls}>{label}</p>
              <input type={type} value={form.contact[key]} onChange={e => setContact(key, e.target.value)} placeholder={placeholder}
                className={`w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all ${inputCls}`} />
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

          {/* Insurance and liability acknowledgment */}
          <div className={`rounded-xl border p-3 ${dark ? 'border-amber-500/30 bg-amber-500/8' : 'border-amber-200 bg-amber-50'}`}>
            <p className={`text-xs font-semibold mb-2 ${dark ? 'text-amber-300' : 'text-amber-700'}`}>Insurance and Liability</p>
            <p className={`text-xs mb-3 ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>
              CreatorMatch does not require insurance, but many clients -- especially for on-site work -- will ask about your coverage. We recommend carrying general liability insurance for in-person projects.
            </p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.insuranceAck}
                onChange={e => set('insuranceAck', e.target.checked)}
                className="mt-0.5 accent-gold-500"
              />
              <span className={`text-xs ${dark ? 'text-charcoal-300' : 'text-gray-700'}`}>
                I understand that CreatorMatch does not verify or require insurance. I am responsible for disclosing my coverage to clients who ask, and I acknowledge I may be required to show proof of insurance before some bookings.
              </span>
            </label>
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
            disabled={!form.name || !form.contact.email || !form.insuranceAck}
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
  const { user } = useAuth();
  const [listings, setListings] = useState(loadListings);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [budget, setBudget] = useState('');
  const [zip, setZip] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [showFilters, setShowFilters] = useState(false);
  const [showGuestGate, setShowGuestGate] = useState(false);

  const isGuest = !user;

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

  const displayListings = isGuest ? getRotatingPreviewCreators(listings) : filtered;

  // 5D. New creator spotlight — recently verified with no bookings, rotated weekly
  const spotlightCreators = useMemo(() => getNewCreatorSpotlight(listings, 3), [listings]);

  const handleSaveListing = (listing) => {
    // Attach user_id to the listing if a user is logged in
    const enriched = { ...listing, user_id: user?.id || null };
    const updated = [enriched, ...listings];
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
      <div className="max-w-7xl mx-auto px-6 py-8">
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
          <RegisterForm onSave={handleSaveListing} dark={dark} user={user} />
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

  const FEE_ROWS = [
    { label: 'Creator fee',          cm: '10% → 6%',   fiv: '20%',     up: '10-20%',  tt: 'Pay to bid' },
    { label: 'Client fee',           cm: '5% booking', fiv: '5.5%+',   up: '3-5%',    tt: 'Free' },
    { label: 'Payment protection',   cm: 'Yes',        fiv: 'Yes',     up: 'Yes',     tt: 'No' },
    { label: 'Verified creators',    cm: 'Yes',        fiv: 'Partial', up: 'Partial', tt: 'No' },
    { label: 'Fee drops w/ loyalty', cm: 'Yes',        fiv: 'No',      up: 'No',      tt: 'No' },
  ];

  const TAB_STYLE_BASE = {
    padding: '14px 20px',
    fontSize: '11px',
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    fontFamily: 'inherit',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'color 0.2s, border-color 0.2s',
  };

  const cardBg = dark
    ? { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }
    : { background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.08)' };

  return (
    <div className="w-full">

      {/* 1. Service filter bar */}
      <div
        className="w-full overflow-x-auto no-scrollbar"
        style={{ borderBottom: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)' }}
      >
        <div className="flex min-w-max px-10">
          <button
            type="button"
            onClick={() => setServiceFilter('all')}
            className={serviceFilter === 'all' ? 'text-gold-400' : 'text-charcoal-500 hover:text-charcoal-300'}
            style={{ ...TAB_STYLE_BASE, borderBottom: serviceFilter === 'all' ? '2px solid #d4a941' : '2px solid transparent' }}
          >
            All Services
          </button>
          {Object.values(SERVICES).map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setServiceFilter(s.id)}
              className={serviceFilter === s.id ? 'text-gold-400' : 'text-charcoal-500 hover:text-charcoal-300'}
              style={{ ...TAB_STYLE_BASE, borderBottom: serviceFilter === s.id ? '2px solid #d4a941' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>{s.icon}</span>{s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Page content wrapper */}
      <div className="max-w-7xl mx-auto px-6">

        {/* 2. Two-column hero */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 py-10 sm:py-14">

          {/* Left column */}
          <div className="flex flex-col justify-center">
            <p
              className="text-gold-400 mb-5"
              style={{ fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase' }}
            >
              Media Production and Digital Content Services
            </p>
            <h1
              className={`leading-tight mb-5 ${dark ? 'text-white' : 'text-gray-900'}`}
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontWeight: 400, fontSize: 'clamp(26px, 3.5vw, 42px)' }}
            >
              Where creators meet{' '}
              <em className="text-gold-400">brands and clients.</em>
            </h1>
            <p className={`mb-8 ${textSub}`} style={{ fontSize: '14px', maxWidth: '420px', lineHeight: '1.7' }}>
              CreatorMatch connects videographers, photographers, podcast producers, drone operators, and digital content specialists with brands and clients who need their work.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => document.getElementById('creator-search')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                className="bg-gold-500 hover:bg-gold-600 text-charcoal-900 font-bold transition-all"
                style={{ padding: '14px 28px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', borderRadius: 0, border: 'none', cursor: 'pointer' }}
              >
                Find Creators
              </button>
              <button
                type="button"
                onClick={onSwitchToRegister}
                className={`font-bold transition-all ${dark ? 'text-white hover:text-gold-400' : 'text-gray-900 hover:text-gold-500'}`}
                style={{ padding: '14px 28px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', borderRadius: 0, background: 'none', border: dark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.2)', cursor: 'pointer' }}
              >
                Join as Creator
              </button>
            </div>
          </div>

          {/* Right column — stat cards */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between" style={{ ...cardBg, padding: '20px 24px', borderRadius: 0 }}>
              <div>
                <p style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6b6b8a', marginBottom: '4px' }}>For Creators</p>
                <p className={`text-sm font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>Keep more of what you earn</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-gold-400 font-bold" style={{ fontSize: '22px', lineHeight: 1 }}>10%</p>
                <p style={{ fontSize: '11px', color: '#6b6b8a', marginTop: '2px' }}>platform fee, drops to 6%</p>
              </div>
            </div>

            <div className="flex items-center justify-between" style={{ ...cardBg, padding: '20px 24px', borderRadius: 0 }}>
              <div>
                <p style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6b6b8a', marginBottom: '4px' }}>For Clients</p>
                <p className={`text-sm font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>Stress-free booking</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-gold-400 font-bold" style={{ fontSize: '22px', lineHeight: 1 }}>5%</p>
                <p style={{ fontSize: '11px', color: '#6b6b8a', marginTop: '2px' }}>booking fee only</p>
              </div>
            </div>

            <div className="flex items-center justify-between" style={{ ...cardBg, padding: '20px 24px', borderRadius: 0 }}>
              <div>
                <p style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#6b6b8a', marginBottom: '4px' }}>Payment Protection</p>
                <p className={`text-sm font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>50% retainer, 50% on delivery</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-gold-400 font-bold" style={{ fontSize: '14px', lineHeight: 1 }}>Always</p>
                <p style={{ fontSize: '11px', color: '#6b6b8a', marginTop: '2px' }}>secured by Stripe</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Fast Match */}
        <div className="flex justify-center mb-3">
          <FastMatch dark={dark} />
        </div>

        {/* 4. Search bar (logged-in only) / Guest banner */}
        {isGuest ? (
          <div className="rounded-xl border border-gold-500/40 bg-gold-500/8 p-4 mb-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-bold text-gold-400 mb-1">Browsing as a guest</p>
              <p className="text-xs text-charcoal-400">
                You are seeing 3 verified creators today. These rotate daily. Create a free account to browse all creators, view full profiles, packages, and rates.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-auth', { detail: { tab: 'signup' } }))}
              className="shrink-0 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-charcoal-900 text-xs font-bold rounded-xl transition-all">
              Create Free Account
            </button>
          </div>
        ) : (
          <>
            <div
              id="creator-search"
              className={`flex overflow-hidden mb-3 shadow-sm ${dark ? 'bg-charcoal-800' : 'bg-white'}`}
              style={{ border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.12)' }}
            >
              <div className="relative flex-1 flex items-center">
                <Search size={16} className={`absolute left-4 pointer-events-none ${dark ? 'text-charcoal-400' : 'text-gray-400'}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name, service, location, or specialty..."
                  className={`w-full pl-11 pr-4 py-3 text-sm bg-transparent outline-none ${dark ? 'text-white placeholder-charcoal-500' : 'text-gray-900 placeholder-gray-400'}`}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(f => !f)}
                className={`px-4 flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                  showFilters
                    ? 'bg-gold-500 text-charcoal-900'
                    : dark ? 'text-charcoal-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
                style={{ borderLeft: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)' }}
              >
                <Filter size={12} /> Filters
              </button>
            </div>

            {showFilters && (
              <div className={`mb-3 p-4 ${dark ? 'bg-charcoal-800 border-charcoal-700' : 'bg-white border-gray-200'}`} style={{ border: '1px solid', borderColor: dark ? '#2a2a45' : '#e5e7eb' }}>
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
          </>
        )}

        {/* 5. Spotlight */}
        {spotlightCreators.length > 0 && (
          <div className="mt-4 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <BadgeCheck size={15} className="text-teal-400" />
              <h2 className={`font-display font-bold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>
                Recently Verified Creators
              </h2>
            </div>
            <p className={`text-xs mb-3 ${textSub}`}>Fresh talent, verified and ready to work.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
              {spotlightCreators.map(creator => (
                <CreatorCard key={creator.id} creator={creator} dark={dark} />
              ))}
            </div>
          </div>
        )}

        {/* Results count (logged-in only) */}
        {!isGuest && (
          <div className="flex items-center justify-between mt-2 mb-3">
            <p className={`text-xs ${textSub}`}>
              {filtered.length} creator{filtered.length !== 1 ? 's' : ''} found
              {budgetNum > 0 && ` matching ~$${budgetNum.toLocaleString()} budget`}
              {zipCity && ` near ${zipCity}`}
            </p>
          </div>
        )}

        {/* 6. Creator cards grid */}
        {displayListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {displayListings.map(creator => (
              <CreatorCard
                key={creator.id}
                creator={creator}
                dark={dark}
                onViewProfile={isGuest ? () => setShowGuestGate(true) : undefined}
                onDelete={!isGuest && !creator.id?.startsWith('seed-') ? () => handleDelete(creator.id) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className={`border p-10 text-center ${dark ? 'border-charcoal-700 text-charcoal-500' : 'border-gray-200 text-gray-400'}`}>
            <p className="text-4xl mb-2">{searchQuery ? '🔍' : '🎬'}</p>
            <p className={`text-sm font-medium ${dark ? 'text-charcoal-300' : 'text-gray-600'}`}>
              No creators found for these filters.
            </p>
            <p className={`text-xs mt-1 ${textSub}`}>
              Try adjusting your search, service type, or budget range.
            </p>
          </div>
        )}

        {/* 7. CTA */}
        <div
          className={`mt-8 p-6 text-center`}
          style={{ border: dark ? '1px dashed rgba(255,255,255,0.12)' : '1px dashed rgba(0,0,0,0.15)' }}
        >
          <p className={`font-display text-base font-bold mb-1 ${dark ? 'text-white' : 'text-gray-900'}`}>
            Are you a content creator?
          </p>
          <p className={`text-xs mb-4 ${textSub} max-w-md mx-auto`}>
            List your services and rates so clients worldwide can find you. It is free to join.
          </p>
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="bg-gold-500 hover:bg-gold-600 text-charcoal-900 text-sm font-bold transition-all flex items-center gap-2 mx-auto"
            style={{ padding: '12px 24px', borderRadius: 0, border: 'none', cursor: 'pointer' }}
          >
            <UserPlus size={14} /> Join as Creator
          </button>
        </div>

      </div>

      {/* Guest gate modal */}
      {showGuestGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowGuestGate(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-charcoal-700 bg-charcoal-900 p-8 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-gold-500/15 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎬</span>
            </div>
            <h2 className="font-display font-bold text-xl text-white mb-2">
              Join CreatorMatch to continue
            </h2>
            <p className="text-sm text-charcoal-400 mb-6 leading-relaxed">
              CreatorMatch is a verified professional marketplace. Create a free account to view full creator profiles, packages, rates, and submit project requests. It takes less than 2 minutes.
            </p>
            <button type="button"
              onClick={() => {
                setShowGuestGate(false);
                window.dispatchEvent(new CustomEvent('open-auth', { detail: { tab: 'signup' } }));
              }}
              className="w-full py-3 rounded-xl bg-gold-500 hover:bg-gold-600 text-charcoal-900 font-bold text-sm mb-3 transition-all">
              Create Free Account
            </button>
            <button type="button"
              onClick={() => {
                setShowGuestGate(false);
                window.dispatchEvent(new CustomEvent('open-auth', { detail: { tab: 'login' } }));
              }}
              className="text-sm text-charcoal-400 hover:text-white transition-colors">
              Already have an account? Sign in
            </button>
          </div>
        </div>
      )}

      {/* 8. Two-column bottom: fee table + value props */}
      <div
        className="max-w-7xl mx-auto px-6 py-12"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-12 items-start">

          {/* Left: compact fee comparison table */}
          <div>
            <p className="text-gold-400 mb-2" style={{ fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase' }}>
              Transparent Pricing
            </p>
            <p
              className={`mb-6 ${dark ? 'text-white' : 'text-gray-900'}`}
              style={{ fontFamily: "'Georgia','Times New Roman',serif", fontSize: '18px', fontStyle: 'italic', fontWeight: 400 }}
            >
              How our fees compare
            </p>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {[
                    { label: 'Feature',       gold: false },
                    { label: 'CreatorMatch',  gold: true  },
                    { label: 'Fiverr',        gold: false },
                    { label: 'Upwork',        gold: false },
                    { label: 'Thumbtack',     gold: false },
                  ].map(({ label, gold }, i) => (
                    <th
                      key={label}
                      style={{
                        fontSize: '10px',
                        letterSpacing: '1.5px',
                        textTransform: 'uppercase',
                        color: gold ? '#d4a941' : '#6b6b8a',
                        fontWeight: 700,
                        textAlign: i === 0 ? 'left' : 'center',
                        paddingBottom: '10px',
                        paddingTop: 0,
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEE_ROWS.map(row => (
                  <tr key={row.label} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ fontSize: '12px', color: dark ? '#a0a0b8' : '#555', padding: '8px 0', textAlign: 'left' }}>{row.label}</td>
                    <td style={{ fontSize: '12px', color: '#d4a941', fontWeight: 600, padding: '8px 4px', textAlign: 'center' }}>{row.cm}</td>
                    <td style={{ fontSize: '12px', color: dark ? '#6b6b8a' : '#888', padding: '8px 4px', textAlign: 'center' }}>{row.fiv}</td>
                    <td style={{ fontSize: '12px', color: dark ? '#6b6b8a' : '#888', padding: '8px 4px', textAlign: 'center' }}>{row.up}</td>
                    <td style={{ fontSize: '12px', color: dark ? '#6b6b8a' : '#888', padding: '8px 4px', textAlign: 'center' }}>{row.tt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right: value props */}
          <div>
            <div className="space-y-6">
              {[
                { headline: 'Built for media professionals',    desc: 'Not a general gig platform. Every creator is a verified media specialist.' },
                { headline: 'Your fee drops the more you work', desc: 'Start at 10%, earn down to 6% as your completed projects grow.' },
                { headline: 'Protected payments, every time',   desc: '50% retainer upfront, 50% on delivery approval. Never chase an invoice again.' },
                { headline: 'Curated matches, not a crowd',     desc: 'Smart Match finds your top 3 to 5 fits. No scrolling through hundreds of unqualified profiles.' },
              ].map(({ headline, desc }) => (
                <div key={headline} className="flex gap-3">
                  <span className="text-gold-400 shrink-0 mt-0.5" style={{ fontSize: '14px', lineHeight: 1 }}>&#8212;</span>
                  <div>
                    <p className={`text-sm font-bold mb-0.5 ${dark ? 'text-white' : 'text-gray-900'}`}>{headline}</p>
                    <p style={{ fontSize: '12px', color: '#6b6b8a', lineHeight: 1.55 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className={`mt-8 font-bold transition-all ${dark ? 'text-white hover:text-gold-400' : 'text-gray-900 hover:text-gold-500'}`}
              style={{ padding: '12px 24px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', background: 'none', border: dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.15)', borderRadius: 0, cursor: 'pointer' }}
            >
              See How It Works
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
