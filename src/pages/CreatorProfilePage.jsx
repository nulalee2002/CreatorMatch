import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, Globe, Mail, Phone, Instagram, Heart, Share2, Check, ExternalLink, Package, MessageSquare, BadgeCheck } from 'lucide-react';
import { SERVICES, RATES } from '../data/rates.js';
import { REGIONS } from '../data/regions.js';
import { supabase, supabaseConfigured } from '../lib/supabase.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { RequestQuoteModal } from '../components/RequestQuoteModal.jsx';
import { ReviewsSection } from '../components/ReviewsSection.jsx';
import { AvailabilityMini, AvailabilityEditor } from '../components/AvailabilityCalendar.jsx';
import { SimilarCreators } from '../components/SimilarCreators.jsx';

function loadAllListings() {
  try { return JSON.parse(localStorage.getItem('creator-directory') || '[]'); } catch { return []; }
}

export function CreatorProfilePage({ dark }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [creator, setCreator]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [isFav, setIsFav]         = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [copied, setCopied]       = useState(false);
  const [activeService, setActiveService] = useState(0);
  const [quoteDate, setQuoteDate] = useState('');

  const isOwnProfile = user && creator && creator.user_id === user.id;

  useEffect(() => {
    loadCreator();
    checkFavorite();
  }, [id]);

  async function loadCreator() {
    setLoading(true);
    if (supabaseConfigured) {
      const { data } = await supabase
        .from('creator_listings')
        .select(`*, creator_services(*), portfolio_items(*), packages(*), reviews(*)`)
        .eq('id', id)
        .single();
      if (data) {
        // Normalize to same shape as localStorage format
        setCreator({
          ...data,
          location: { city: data.city, state: data.state, country: data.country, zip: data.zip, regionKey: data.region_key },
          contact: { email: data.email, phone: data.phone, website: data.website, instagram: data.instagram },
          services: data.creator_services?.map(s => ({ ...s, serviceId: s.service_id, rates: s.rates || {} })) || [],
          portfolio: data.portfolio_items || [],
          tags: data.tags || [],
        });
        // Increment view count
        supabase.from('creator_listings').update({ view_count: (data.view_count || 0) + 1 }).eq('id', id);
      }
    } else {
      const all = loadAllListings();
      const found = all.find(c => c.id === id);
      setCreator(found || null);
    }
    setLoading(false);
  }

  async function checkFavorite() {
    if (!user || !supabaseConfigured) {
      const favs = JSON.parse(localStorage.getItem('creator-favorites') || '[]');
      setIsFav(favs.includes(id));
      return;
    }
    const { data } = await supabase.from('favorites').select('id').eq('user_id', user.id).eq('listing_id', id).single();
    setIsFav(!!data);
  }

  async function toggleFavorite() {
    if (supabaseConfigured && user) {
      if (isFav) {
        await supabase.from('favorites').delete().eq('user_id', user.id).eq('listing_id', id);
      } else {
        await supabase.from('favorites').insert({ user_id: user.id, listing_id: id });
      }
    } else {
      const favs = JSON.parse(localStorage.getItem('creator-favorites') || '[]');
      const updated = isFav ? favs.filter(f => f !== id) : [...favs, id];
      localStorage.setItem('creator-favorites', JSON.stringify(updated));
    }
    setIsFav(f => !f);
  }

  function shareProfile() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${dark ? 'bg-charcoal-950' : 'bg-gray-50'}`}>
        <div className="animate-spin w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${dark ? 'bg-charcoal-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <p className="text-4xl mb-4">😕</p>
        <h2 className="font-display text-xl font-bold mb-2">Creator not found</h2>
        <button type="button" onClick={() => navigate('/')}
          className="mt-4 px-5 py-2.5 rounded-xl bg-gold-500 text-charcoal-900 font-bold text-sm">
          Back to Directory
        </button>
      </div>
    );
  }

  const location = creator.location || {};
  const contact  = creator.contact || {};
  const services = creator.services || [];
  const portfolio = creator.portfolio || [];
  const currentService = services[activeService];
  const locationStr = [location.city, location.state, location.country].filter(Boolean).join(', ');
  const region = REGIONS[location.regionKey];
  const expLabel = { entry: '0–2 yrs', mid: '3–6 yrs', senior: '7+ yrs' }[creator.experience] || '';

  const textSub = dark ? 'text-charcoal-400' : 'text-gray-500';
  const cardCls = `rounded-2xl border ${dark ? 'bg-charcoal-800 border-charcoal-700' : 'bg-white border-gray-200'}`;

  return (
    <div className={`min-h-screen ${dark ? 'bg-charcoal-950' : 'bg-gray-50'}`}>
      {/* Back button */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <button type="button" onClick={() => navigate(-1)}
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${dark ? 'text-charcoal-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
          <ArrowLeft size={16} /> Back to directory
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-5">

          {/* Profile header */}
          <div className={`${cardCls} p-6`}>
            <div className="flex items-start gap-4">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shrink-0 ${dark ? 'bg-charcoal-700' : 'bg-gray-100'}`}>
                {creator.avatar || '🎬'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className={`font-display font-bold text-2xl ${dark ? 'text-white' : 'text-gray-900'}`}>
                        {creator.businessName || creator.name}
                      </h1>
                      {creator.verified && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 text-[10px] font-bold">
                          <BadgeCheck size={11} /> Verified
                        </span>
                      )}
                    </div>
                    {creator.businessName && creator.name && (
                      <p className={`text-sm ${textSub}`}>{creator.name}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className={`text-sm flex items-center gap-1 ${textSub}`}>
                        <MapPin size={13} /> {locationStr}
                        {region && <span className="ml-1">{region.flag}</span>}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${dark ? 'bg-charcoal-700 text-charcoal-400' : 'bg-gray-100 text-gray-500'}`}>
                        {expLabel}
                      </span>
                      {creator.availability === 'available' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 font-medium">
                          Available Now
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <button type="button" onClick={toggleFavorite}
                      className={`p-2 rounded-xl border transition-all ${
                        isFav
                          ? 'border-red-500/50 bg-red-500/10 text-red-400'
                          : dark ? 'border-charcoal-600 text-charcoal-400 hover:text-red-400' : 'border-gray-200 text-gray-400 hover:text-red-400'
                      }`} title={isFav ? 'Remove from favorites' : 'Save to favorites'}>
                      <Heart size={16} className={isFav ? 'fill-current' : ''} />
                    </button>
                    <button type="button" onClick={shareProfile}
                      className={`p-2 rounded-xl border transition-all ${dark ? 'border-charcoal-600 text-charcoal-400 hover:text-white' : 'border-gray-200 text-gray-400 hover:text-gray-900'}`}
                      title="Copy profile link">
                      {copied ? <Check size={16} className="text-teal-400" /> : <Share2 size={16} />}
                    </button>
                  </div>
                </div>

                {/* Rating */}
                {creator.rating && (
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={14}
                          className={s <= Math.round(creator.rating) ? 'text-gold-400 fill-gold-400' : dark ? 'text-charcoal-600' : 'text-gray-300'} />
                      ))}
                    </div>
                    <span className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{creator.rating}</span>
                    <span className={`text-sm ${textSub}`}>({creator.reviewCount || creator.review_count || 0} reviews)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bio */}
            <p className={`mt-4 text-sm leading-relaxed ${dark ? 'text-charcoal-300' : 'text-gray-600'}`}>{creator.bio}</p>

            {/* Tags */}
            {creator.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {creator.tags.map(tag => (
                  <span key={tag} className={`text-xs px-2.5 py-1 rounded-full ${dark ? 'bg-charcoal-700 text-charcoal-300' : 'bg-gray-100 text-gray-600'}`}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Services tabs */}
          {services.length > 0 && (
            <div className={`${cardCls} p-5`}>
              <h2 className={`font-display font-bold text-base mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>Services & Rates</h2>

              {/* Service tabs */}
              {services.length > 1 && (
                <div className="flex gap-2 mb-4 flex-wrap">
                  {services.map((svc, i) => {
                    const def = SERVICES[svc.serviceId];
                    return (
                      <button key={i} type="button" onClick={() => setActiveService(i)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                          activeService === i
                            ? 'bg-gold-500 text-charcoal-900 border-gold-500'
                            : dark ? 'border-charcoal-700 text-charcoal-400 hover:border-charcoal-500' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}>
                        <span>{def?.icon}</span> {def?.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {currentService && (
                <div>
                  {currentService.subtypes?.length > 0 && (
                    <p className={`text-xs mb-3 ${textSub}`}>
                      <span className="font-medium">Specialties:</span> {currentService.subtypes.join(' · ')}
                    </p>
                  )}
                  {currentService.description && (
                    <p className={`text-sm mb-4 ${dark ? 'text-charcoal-300' : 'text-gray-600'}`}>{currentService.description}</p>
                  )}
                  <div className={`rounded-xl border ${dark ? 'border-charcoal-700 bg-charcoal-900/40' : 'border-gray-200 bg-gray-50'} p-4`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-3 ${textSub}`}>Rate Sheet</p>
                    <div className="space-y-2">
                      {Object.entries(currentService.rates || {}).map(([key, val]) => {
                        const meta = RATES[currentService.serviceId]?.[key];
                        return (
                          <div key={key} className="flex items-center justify-between gap-4">
                            <div>
                              <span className={`text-sm ${dark ? 'text-charcoal-300' : 'text-gray-700'}`}>{meta?.label || key}</span>
                              {meta?.unit && <span className={`text-xs ml-1 ${textSub}`}>/ {meta.unit}</span>}
                            </div>
                            <span className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
                              ${Number(val).toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Packages */}
          {(creator.packages?.length > 0) && (
            <div className={`${cardCls} p-5`}>
              <h2 className={`font-display font-bold text-base mb-4 flex items-center gap-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
                <Package size={16} className="text-gold-400" /> Packages
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {creator.packages.map((pkg, i) => (
                  <div key={i} className={`rounded-xl border p-4 ${
                    i === 1
                      ? 'border-gold-500/50 bg-gold-500/5'
                      : dark ? 'border-charcoal-700 bg-charcoal-900/40' : 'border-gray-200 bg-gray-50'
                  }`}>
                    {i === 1 && <p className="text-[10px] font-bold text-gold-400 uppercase tracking-wider mb-2">Most Popular</p>}
                    <p className={`font-bold text-base ${dark ? 'text-white' : 'text-gray-900'}`}>{pkg.name}</p>
                    <p className="font-display text-2xl font-bold text-gradient-gold mt-1">${Number(pkg.price).toLocaleString()}</p>
                    {pkg.turnaround_days && (
                      <p className={`text-xs mt-1 ${textSub}`}>{pkg.turnaround_days} day delivery</p>
                    )}
                    {pkg.revisions && (
                      <p className={`text-xs ${textSub}`}>{pkg.revisions} revision{pkg.revisions !== 1 ? 's' : ''}</p>
                    )}
                    {pkg.deliverables?.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {pkg.deliverables.map((d, di) => (
                          <li key={di} className={`text-xs flex items-center gap-1.5 ${dark ? 'text-charcoal-300' : 'text-gray-600'}`}>
                            <Check size={10} className="text-teal-400 shrink-0" /> {d}
                          </li>
                        ))}
                      </ul>
                    )}
                    {pkg.description && (
                      <p className={`text-xs mt-2 ${textSub}`}>{pkg.description}</p>
                    )}
                    <button type="button" onClick={() => setShowQuote(true)}
                      className="mt-3 w-full py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-charcoal-900 text-xs font-bold transition-all">
                      Get This Package
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Portfolio */}
          {portfolio.length > 0 && (
            <div className={`${cardCls} p-5`}>
              <h2 className={`font-display font-bold text-base mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>Portfolio</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {portfolio.map((item, i) => {
                  const def = SERVICES[item.serviceId || item.service_id];
                  return (
                    <div key={i} className={`rounded-xl border p-4 ${dark ? 'border-charcoal-700 bg-charcoal-900/40' : 'border-gray-200 bg-gray-50'}`}>
                      {item.image_url && (
                        <img src={item.image_url} alt={item.title}
                          className="w-full h-32 object-cover rounded-lg mb-3" />
                      )}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{def?.icon || '🎬'}</span>
                        <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{item.title}</p>
                      </div>
                      <p className={`text-xs ${textSub}`}>{item.description}</p>
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noreferrer"
                          className={`mt-2 inline-flex items-center gap-1 text-xs text-gold-400 hover:text-gold-300 transition-colors`}>
                          <ExternalLink size={10} /> View project
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reviews */}
          <ReviewsSection creator={creator} dark={dark} />

          {/* Similar Creators */}
          <SimilarCreators creator={creator} dark={dark} />
        </div>

        {/* ── RIGHT COLUMN (sticky) ── */}
        <div className="space-y-4">
          <div className="lg:sticky lg:top-20 space-y-4">

            {/* CTA card */}
            <div className={`${cardCls} p-5`}>
              <button type="button" onClick={() => setShowQuote(true)}
                className="w-full py-3 rounded-xl bg-gold-500 hover:bg-gold-600 text-charcoal-900 text-sm font-bold transition-all flex items-center justify-center gap-2 mb-3">
                <MessageSquare size={15} /> {quoteDate ? `Book for ${new Date(quoteDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Request a Quote'}
              </button>
              <p className={`text-center text-[10px] ${textSub}`}>Free to request. No payment until you hire.</p>

              {/* Contact links */}
              <div className={`mt-4 border-t pt-4 space-y-2 ${dark ? 'border-charcoal-700' : 'border-gray-200'}`}>
                {contact.email && (
                  <a href={`mailto:${contact.email}`}
                    className={`flex items-center gap-2 text-xs transition-colors ${dark ? 'text-charcoal-400 hover:text-gold-400' : 'text-gray-500 hover:text-gold-500'}`}>
                    <Mail size={13} /> {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`}
                    className={`flex items-center gap-2 text-xs transition-colors ${dark ? 'text-charcoal-400 hover:text-gold-400' : 'text-gray-500 hover:text-gold-500'}`}>
                    <Phone size={13} /> {contact.phone}
                  </a>
                )}
                {contact.website && (
                  <a href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                    target="_blank" rel="noreferrer"
                    className={`flex items-center gap-2 text-xs transition-colors ${dark ? 'text-charcoal-400 hover:text-gold-400' : 'text-gray-500 hover:text-gold-500'}`}>
                    <Globe size={13} /> {contact.website}
                  </a>
                )}
                {contact.instagram && (
                  <a href={`https://instagram.com/${contact.instagram.replace('@','')}`}
                    target="_blank" rel="noreferrer"
                    className={`flex items-center gap-2 text-xs transition-colors ${dark ? 'text-charcoal-400 hover:text-gold-400' : 'text-gray-500 hover:text-gold-500'}`}>
                    <Instagram size={13} /> {contact.instagram}
                  </a>
                )}
              </div>
            </div>

            {/* Availability calendar */}
            {isOwnProfile ? (
              <AvailabilityEditor creatorId={creator.id} dark={dark} />
            ) : (
              <AvailabilityMini
                creatorId={creator.id}
                dark={dark}
                selectedDate={quoteDate}
                onSelectDate={(d) => { setQuoteDate(d); setShowQuote(true); }}
              />
            )}

            {/* Quick stats */}
            <div className={`${cardCls} p-4`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-3 ${textSub}`}>Quick Stats</p>
              <div className="space-y-2">
                {[
                  { label: 'Experience', value: expLabel },
                  { label: 'Location', value: locationStr },
                  { label: 'Services', value: `${services.length} service type${services.length !== 1 ? 's' : ''}` },
                  { label: 'Portfolio', value: `${portfolio.length} project${portfolio.length !== 1 ? 's' : ''}` },
                  ...(creator.view_count ? [{ label: 'Profile Views', value: creator.view_count.toLocaleString() }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className={`text-xs ${textSub}`}>{label}</span>
                    <span className={`text-xs font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Plan badge */}
            {creator.plan && creator.plan !== 'free' && (
              <div className={`${cardCls} p-3 text-center`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                  creator.plan === 'studio'
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-gold-500/20 text-gold-400'
                }`}>
                  {creator.plan === 'studio' ? '🏢 Studio Member' : '⭐ Pro Member'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quote modal */}
      {showQuote && <RequestQuoteModal creator={creator} dark={dark} initialDate={quoteDate} onClose={() => setShowQuote(false)} />}
    </div>
  );
}
