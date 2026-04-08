import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard, Eye, MessageSquare, Heart, Star, TrendingUp,
  Package, Edit3, ExternalLink, Check, Clock, ChevronRight,
  Plus, Trash2, AlertCircle, Bell, BarChart2, Calendar, DollarSign,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { supabase, supabaseConfigured } from '../lib/supabase.js';
import { SERVICES } from '../data/rates.js';
import { PackageBuilder } from '../components/PackageBuilder.jsx';
import { AvailabilityEditor } from '../components/AvailabilityCalendar.jsx';
import { StripeOnboarding } from '../components/StripeOnboarding.jsx';
import { EarningsTab } from '../components/EarningsTab.jsx';
import { dollarsToDisplay, statusBadgeClass, PROJECT_STATUSES } from '../config/fees.js';

// ── Data helpers ────────────────────────────────────────────────
function loadMyListing(userId) {
  try {
    const all = JSON.parse(localStorage.getItem('creator-directory') || '[]');
    return all.find(c => c.user_id === userId) || null;
  } catch { return null; }
}
function loadQuoteRequests(creatorId) {
  try {
    const all = JSON.parse(localStorage.getItem('quote-requests') || '[]');
    return all.filter(q => q.creatorId === creatorId);
  } catch { return []; }
}
function loadFavCount(creatorId) {
  try {
    const favs = JSON.parse(localStorage.getItem('creator-favorites') || '[]');
    return favs.filter(f => f === creatorId).length;
  } catch { return 0; }
}

// ── Stat Card ───────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'text-gold-400', dark }) {
  return (
    <div className={`rounded-2xl border p-4 ${dark ? 'bg-charcoal-800 border-charcoal-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon size={18} className={color} />
        <span className={`text-[10px] font-medium uppercase tracking-wider ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>{label}</span>
      </div>
      <p className={`font-display text-3xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>{sub}</p>}
    </div>
  );
}

// ── Quote request row ───────────────────────────────────────────
function QuoteRow({ quote, dark, onMarkRead }) {
  const textSub = dark ? 'text-charcoal-400' : 'text-gray-500';
  const svc = SERVICES[quote.serviceId];
  const date = quote.preferredDate
    ? new Date(quote.preferredDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
      !quote.read
        ? dark ? 'border-gold-500/40 bg-gold-500/5' : 'border-gold-400/40 bg-gold-50'
        : dark ? 'border-charcoal-700 bg-charcoal-900/30' : 'border-gray-200 bg-gray-50'
    }`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${dark ? 'bg-charcoal-700' : 'bg-gray-200'}`}>
        {svc?.icon || '📝'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{quote.clientName}</p>
          {!quote.read && <span className="w-1.5 h-1.5 rounded-full bg-gold-400 shrink-0" />}
          <span className={`text-xs ${textSub}`}>{svc?.name}</span>
        </div>
        <p className={`text-xs mt-0.5 line-clamp-2 ${textSub}`}>{quote.description}</p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {quote.budget && (
            <span className={`text-[11px] font-semibold text-teal-400`}>Budget: ${Number(quote.budget).toLocaleString()}</span>
          )}
          {date && (
            <span className={`text-[11px] flex items-center gap-1 ${textSub}`}>
              <Calendar size={9} /> {date}
            </span>
          )}
          <span className={`text-[11px] ${textSub}`}>{quote.clientEmail}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className={`text-[10px] ${dark ? 'text-charcoal-600' : 'text-gray-400'}`}>
          {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
        </span>
        {!quote.read && (
          <button type="button" onClick={() => onMarkRead(quote.id)}
            className="text-[10px] text-gold-400 hover:text-gold-300 transition-colors font-medium">
            Mark read
          </button>
        )}
        <a href={`mailto:${quote.clientEmail}`}
          className="text-[10px] text-teal-400 hover:text-teal-300 transition-colors font-medium">
          Reply
        </a>
      </div>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────
export function CreatorDashboard({ dark }) {
  const { user, profile: authProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [creator, setCreator]     = useState(null);
  const [quotes, setQuotes]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const textSub = dark ? 'text-charcoal-400' : 'text-gray-500';
  const cardCls = `rounded-2xl border ${dark ? 'bg-charcoal-800 border-charcoal-700' : 'bg-white border-gray-200'}`;

  // Handle Stripe return from onboarding
  useEffect(() => {
    const stripeParam = searchParams.get('stripe');
    if (stripeParam === 'success') setActiveTab('overview');
    if (stripeParam === 'refresh') setActiveTab('overview');
  }, [searchParams]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    if (supabaseConfigured) {
      const { data } = await supabase
        .from('creator_listings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setCreator(data);
        const { data: qData } = await supabase
          .from('quote_requests')
          .select('*')
          .eq('listing_id', data.id)
          .order('created_at', { ascending: false });
        setQuotes(qData || []);
      }
    } else {
      const found = loadMyListing(user.id);
      setCreator(found);
      if (found) setQuotes(loadQuoteRequests(found.id));
    }
    setLoading(false);
  }

  function markRead(quoteId) {
    const updated = quotes.map(q => q.id === quoteId ? { ...q, read: true } : q);
    setQuotes(updated);
    // Persist to localStorage
    try {
      const all = JSON.parse(localStorage.getItem('quote-requests') || '[]');
      const patched = all.map(q => q.id === quoteId ? { ...q, read: true } : q);
      localStorage.setItem('quote-requests', JSON.stringify(patched));
    } catch {}
  }

  // Stats
  const unreadCount  = quotes.filter(q => !q.read).length;
  const favCount     = creator ? loadFavCount(creator.id) : 0;
  const viewCount    = creator?.view_count || 0;
  const avgRating    = creator?.rating || 0;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${dark ? 'bg-charcoal-950' : 'bg-gray-50'}`}>
        <div className="animate-spin w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${dark ? 'bg-charcoal-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <LayoutDashboard size={40} className="text-gold-400" />
        <h2 className="font-display text-xl font-bold">Sign in to access your Dashboard</h2>
        <p className={`text-sm ${textSub}`}>You need to be logged in to manage your creator profile.</p>
        <button type="button" onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-xl bg-gold-500 text-charcoal-900 font-bold text-sm">
          Go Home
        </button>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${dark ? 'bg-charcoal-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <Package size={40} className="text-gold-400" />
        <h2 className="font-display text-xl font-bold">No Listing Found</h2>
        <p className={`text-sm ${textSub} text-center max-w-xs`}>
          You haven't created a creator listing yet. Join as a creator to start receiving quote requests.
        </p>
        <button type="button" onClick={() => navigate('/register')}
          className="px-5 py-2.5 rounded-xl bg-gold-500 text-charcoal-900 font-bold text-sm flex items-center gap-2">
          <Plus size={14} /> Create Your Listing
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview',     label: 'Overview',    icon: BarChart2 },
    { id: 'quotes',       label: `Quotes${unreadCount ? ` (${unreadCount})` : ''}`, icon: MessageSquare },
    { id: 'packages',     label: 'Packages',    icon: Package },
    { id: 'availability', label: 'Availability', icon: Calendar },
    { id: 'earnings',     label: 'Earnings',    icon: DollarSign },
  ];

  const serviceIds = (creator.services || []).map(s => s.serviceId || s.service_id).filter(Boolean);

  return (
    <div className={`min-h-screen ${dark ? 'bg-charcoal-950' : 'bg-gray-50'}`}>
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${dark ? 'bg-charcoal-800' : 'bg-white border border-gray-200'}`}>
              {creator.avatar || '🎬'}
            </div>
            <div>
              <h1 className={`font-display font-bold text-xl ${dark ? 'text-white' : 'text-gray-900'}`}>
                Creator Dashboard
              </h1>
              <p className={`text-sm ${textSub}`}>{creator.businessName || creator.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold-500/15 text-gold-400 text-xs font-bold">
                <Bell size={12} /> {unreadCount} new {unreadCount === 1 ? 'request' : 'requests'}
              </span>
            )}
            <button type="button" onClick={() => navigate(`/creator/${creator.id}`)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                dark ? 'border-charcoal-600 text-charcoal-300 hover:text-white' : 'border-gray-200 text-gray-600 hover:text-gray-900'
              }`}>
              <ExternalLink size={12} /> View Profile
            </button>
            <button type="button" onClick={() => navigate('/register')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-charcoal-900 text-xs font-bold transition-all">
              <Edit3 size={12} /> Edit Listing
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className={`flex gap-1 p-1 rounded-xl border mb-6 w-fit ${dark ? 'bg-charcoal-800 border-charcoal-700' : 'bg-gray-100 border-gray-200'}`}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === id
                  ? 'bg-gold-500 text-charcoal-900'
                  : dark ? 'text-charcoal-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {/* ── Stripe Onboarding Banner ── */}
        <div className="mb-5">
          <StripeOnboarding
            creator={creator}
            dark={dark}
            onStatusChange={(update) => setCreator(prev => ({ ...prev, ...update }))}
          />
        </div>

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Eye}          label="Profile Views"   value={viewCount || '—'}  sub="All time"              color="text-teal-400"   dark={dark} />
              <StatCard icon={MessageSquare} label="Quote Requests"  value={quotes.length}      sub={`${unreadCount} unread`} color="text-gold-400"   dark={dark} />
              <StatCard icon={Heart}         label="Saved by Clients" value={favCount || '—'}  sub="In shortlists"          color="text-red-400"    dark={dark} />
              <StatCard icon={Star}          label="Avg Rating"      value={avgRating || '—'}   sub={`${creator.review_count || 0} reviews`} color="text-purple-400" dark={dark} />
            </div>

            {/* Profile completion */}
            <ProfileCompletion creator={creator} dark={dark} navigate={navigate} />

            {/* Recent quote requests */}
            <div className={`${cardCls} p-5`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`font-display font-bold text-base ${dark ? 'text-white' : 'text-gray-900'}`}>
                  Recent Quote Requests
                </h2>
                {quotes.length > 3 && (
                  <button type="button" onClick={() => setActiveTab('quotes')}
                    className={`text-xs font-medium flex items-center gap-1 ${dark ? 'text-gold-400' : 'text-gold-600'}`}>
                    View all <ChevronRight size={12} />
                  </button>
                )}
              </div>
              {quotes.length === 0 ? (
                <div className={`text-center py-8 ${textSub}`}>
                  <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No quote requests yet.</p>
                  <p className="text-xs mt-1 opacity-70">Share your profile to start getting inquiries.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {quotes.slice(0, 3).map(q => (
                    <QuoteRow key={q.id} quote={q} dark={dark} onMarkRead={markRead} />
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className={`${cardCls} p-5`}>
              <h2 className={`font-display font-bold text-base mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: Package,  label: 'Manage Packages',   sub: 'Edit your Basic/Standard/Premium tiers',  tab: 'packages'     },
                  { icon: Calendar, label: 'Set Availability',  sub: 'Mark days you are available for bookings', tab: 'availability' },
                  { icon: Edit3,    label: 'Edit Listing',      sub: 'Update bio, services, portfolio',          path: '/register'   },
                  { icon: ExternalLink, label: 'View Public Profile', sub: 'See how clients see you',            profile: true       },
                ].map(({ icon: Icon, label, sub, tab, path, profile: isProfile }) => (
                  <button key={label} type="button"
                    onClick={() => tab ? setActiveTab(tab) : isProfile ? navigate(`/creator/${creator.id}`) : navigate(path)}
                    className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                      dark ? 'border-charcoal-700 hover:border-charcoal-500 bg-charcoal-900/30' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                    }`}>
                    <Icon size={16} className="text-gold-400 shrink-0 mt-0.5" />
                    <div>
                      <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{label}</p>
                      <p className={`text-xs mt-0.5 ${textSub}`}>{sub}</p>
                    </div>
                    <ChevronRight size={14} className={`${textSub} ml-auto shrink-0 mt-0.5`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Quotes Tab ── */}
        {activeTab === 'quotes' && (
          <div className={`${cardCls} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-display font-bold text-base ${dark ? 'text-white' : 'text-gray-900'}`}>
                All Quote Requests
              </h2>
              <span className={`text-xs px-2 py-1 rounded-full ${dark ? 'bg-charcoal-700 text-charcoal-400' : 'bg-gray-100 text-gray-500'}`}>
                {quotes.length} total
              </span>
            </div>
            {quotes.length === 0 ? (
              <div className={`text-center py-12 ${textSub}`}>
                <MessageSquare size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No quote requests yet</p>
                <p className="text-xs mt-1 opacity-70">Share your profile link to start receiving inquiries</p>
                <button type="button"
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/creator/${creator.id}`); }}
                  className="mt-4 px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-charcoal-900 text-xs font-bold transition-all">
                  Copy Profile Link
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {quotes.map(q => <QuoteRow key={q.id} quote={q} dark={dark} onMarkRead={markRead} />)}
              </div>
            )}
          </div>
        )}

        {/* ── Packages Tab ── */}
        {activeTab === 'packages' && (
          <PackageBuilder
            creatorId={creator.id}
            dark={dark}
            serviceIds={serviceIds.length > 0 ? serviceIds : ['photography']}
          />
        )}

        {/* ── Availability Tab ── */}
        {activeTab === 'availability' && (
          <AvailabilityEditor creatorId={creator.id} dark={dark} />
        )}

        {/* ── Earnings Tab ── */}
        {activeTab === 'earnings' && (
          <EarningsTab creator={creator} dark={dark} />
        )}

      </div>
    </div>
  );
}

// ── Profile Completion widget ───────────────────────────────────
function ProfileCompletion({ creator, dark, navigate }) {
  const checks = [
    { label: 'Profile photo / avatar',      done: !!creator.avatar },
    { label: 'Bio written',                  done: !!(creator.bio?.length > 20) },
    { label: 'At least one service added',   done: (creator.services?.length || 0) > 0 },
    { label: 'Portfolio item added',         done: (creator.portfolio?.length || 0) > 0 },
    { label: 'Contact info provided',        done: !!(creator.contact?.email || creator.email) },
    { label: 'Availability set',             done: false }, // would need to check localStorage
  ];
  const score = checks.filter(c => c.done).length;
  const pct   = Math.round((score / checks.length) * 100);
  const textSub = dark ? 'text-charcoal-400' : 'text-gray-500';
  const cardCls = `rounded-2xl border p-5 ${dark ? 'bg-charcoal-800 border-charcoal-700' : 'bg-white border-gray-200'}`;

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`font-display font-bold text-base ${dark ? 'text-white' : 'text-gray-900'}`}>
          Profile Strength
        </h2>
        <span className={`text-sm font-bold ${pct >= 80 ? 'text-teal-400' : pct >= 50 ? 'text-gold-400' : 'text-red-400'}`}>
          {pct}%
        </span>
      </div>
      {/* Progress bar */}
      <div className={`h-2 rounded-full mb-4 ${dark ? 'bg-charcoal-700' : 'bg-gray-200'}`}>
        <div
          className={`h-2 rounded-full transition-all duration-500 ${pct >= 80 ? 'bg-teal-400' : pct >= 50 ? 'bg-gold-500' : 'bg-red-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {checks.map(({ label, done }) => (
          <div key={label} className={`flex items-center gap-2 text-xs ${done ? (dark ? 'text-charcoal-300' : 'text-gray-600') : textSub}`}>
            {done
              ? <Check size={12} className="text-teal-400 shrink-0" />
              : <AlertCircle size={12} className="text-charcoal-600 shrink-0" />
            }
            <span className={done ? '' : 'opacity-60'}>{label}</span>
          </div>
        ))}
      </div>
      {pct < 100 && (
        <button type="button" onClick={() => navigate('/register')}
          className="mt-4 w-full py-2 rounded-xl border-2 border-dashed text-xs font-semibold transition-all border-gold-500/40 text-gold-400 hover:border-gold-500 hover:bg-gold-500/10">
          Complete Your Profile
        </button>
      )}
    </div>
  );
}
