import { useReducer, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { formatCurrency } from './utils/pricing.js';
import { Moon, Sun, Zap, RotateCcw, Search, UserPlus, LogIn, LogOut, User, MessageSquare, Briefcase, LayoutDashboard, Users } from 'lucide-react';
import { v4 as uuid } from 'uuid';
import { useAuth } from './contexts/AuthContext.jsx';
import { AuthModal } from './components/auth/AuthModal.jsx';
import { CreatorProfilePage } from './pages/CreatorProfilePage.jsx';
import { CreatorDashboard } from './pages/CreatorDashboard.jsx';
import { MessagesPage } from './pages/MessagesPage.jsx';
import { ProjectBoard } from './pages/ProjectBoard.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { CheckoutPage } from './pages/CheckoutPage.jsx';
import { MatchResultsPage } from './pages/MatchResultsPage.jsx';
import { NetworkingPage } from './pages/NetworkingPage.jsx';
import { TermsModal } from './components/TermsModal.jsx';
import { PrivacyModal } from './components/PrivacyModal.jsx';
import { captureReferralCode } from './components/ReferralSection.jsx';
import { SupportChatbot } from './components/SupportChatbot.jsx';
import { CircuitBackground } from './components/CircuitBackground.jsx';

import { SERVICES, RATES, PACKAGE_TIERS } from './data/rates.js';
import { DEFAULT_EXCHANGE_RATES } from './data/regions.js';
import { getRegionRates, buildQuote, getRate } from './utils/pricing.js';
import { generateQuotePDF } from './utils/pdf.js';

import { StateCitySelector }   from './components/StateCitySelector.jsx';
import { ServiceSelector }     from './components/ServiceSelector.jsx';
import { LineItemBuilder }     from './components/LineItemBuilder.jsx';
import { QuoteOutput }         from './components/QuoteOutput.jsx';
import { RateComparisonChart } from './components/RateComparisonChart.jsx';
import { HealthWidget }        from './components/HealthWidget.jsx';
import { PackageComparison }   from './components/PackageComparison.jsx';
import { SeasonalDemand }      from './components/SeasonalDemand.jsx';
import { PresetManager }       from './components/PresetManager.jsx';
import { CurrencySettings }    from './components/CurrencySettings.jsx';
import { CreatorDirectory }    from './components/CreatorDirectory.jsx';
import { ProfileSettings }     from './components/ProfileSettings.jsx';
import { QuickQuoteMode }      from './components/QuickQuoteMode.jsx';

// ── Initial State ────────────────────────────────────────────
const DEFAULT_STATE = {
  serviceId:              null,
  regionKey:              'us-tier1',
  experienceLevel:        'mid',
  lineItems:              [],
  equipment:              [],
  travelType:             'none',
  travelMiles:            0,
  travelMileRate:         0.67,
  travelFee:              0,
  assistants:             0,
  assistantRate:          0,
  locationFee:            0,
  revisions:              2,
  additionalRevisionRate: 0,
  turnaround:             'standard',
  customTurnaroundPct:    25,
  licensingId:            'personal',
  taxEnabled:             false,
  taxRate:                8.5,
  currency:               'USD',
  exchangeRates:          DEFAULT_EXCHANGE_RATES,
  notes:                  '',
  clientName:             '',
  quoteNumber:            '',
  costInputs:             [],
};

// ── Reducer ───────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {

    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };

    case 'SET_SERVICE': {
      if (action.value === state.serviceId) return state;
      const regionRates = getRegionRates(action.value, state.regionKey, state.experienceLevel);
      const service = SERVICES[action.value];
      const allRateKeys = [...(service.primaryRates || []), ...(service.packageRates || [])];
      const lineItems = allRateKeys.map(rateKey => {
        const rateMeta = RATES[action.value]?.[rateKey];
        if (!rateMeta) return null;
        const regionRate = regionRates[rateKey];
        return {
          id: uuid(),
          rateKey,
          label: rateMeta.label,
          unit: rateMeta.unit,
          active: false,
          value: regionRate?.current ?? 0,
          quantity: 1,
          isCustom: false,
        };
      }).filter(Boolean);
      return { ...state, serviceId: action.value, lineItems, equipment: [] };
    }

    case 'SET_REGION': {
      if (action.value === state.regionKey) return state;
      const newState = { ...state, regionKey: action.value };
      if (state.serviceId) {
        const regionRates = getRegionRates(state.serviceId, action.value, state.experienceLevel);
        newState.lineItems = state.lineItems.map(item => {
          if (item.isCustom) return item;
          const regionRate = regionRates[item.rateKey];
          return { ...item, value: regionRate?.current ?? item.value };
        });
      }
      return newState;
    }

    case 'SET_EXPERIENCE': {
      const newState = { ...state, experienceLevel: action.value };
      if (state.serviceId) {
        const regionRates = getRegionRates(state.serviceId, state.regionKey, action.value);
        newState.lineItems = state.lineItems.map(item => {
          if (item.isCustom) return item;
          const regionRate = regionRates[item.rateKey];
          return { ...item, value: regionRate?.current ?? item.value };
        });
      }
      return newState;
    }

    case 'SET_LINE_ITEM': {
      const exists = state.lineItems.find(l => l.rateKey === action.rateKey);
      if (exists) {
        return {
          ...state,
          lineItems: state.lineItems.map(l =>
            l.rateKey === action.rateKey ? { ...l, [action.field]: action.value } : l
          ),
        };
      }
      return {
        ...state,
        lineItems: [
          ...state.lineItems,
          {
            id: uuid(),
            rateKey: action.rateKey,
            label: action.rateMeta?.label || action.rateKey,
            unit: action.rateMeta?.unit || '',
            active: action.field === 'active' ? action.value : false,
            value: action.field === 'value' ? action.value : (action.regionRate?.current ?? 0),
            quantity: 1,
            isCustom: false,
          },
        ],
      };
    }

    case 'ADD_CUSTOM_LINE':
      return {
        ...state,
        lineItems: [
          ...state.lineItems,
          { id: uuid(), rateKey: null, label: '', unit: '', active: true, value: 0, quantity: 1, isCustom: true },
        ],
      };

    case 'SET_CUSTOM_LINE':
      return {
        ...state,
        lineItems: state.lineItems.map(l =>
          l.id === action.id ? { ...l, [action.field]: action.value } : l
        ),
      };

    case 'REMOVE_CUSTOM_LINE':
      return { ...state, lineItems: state.lineItems.filter(l => l.id !== action.id) };

    case 'SET_EQUIPMENT': {
      const exists = state.equipment.find(e => e.id === action.id);
      if (exists) {
        return {
          ...state,
          equipment: state.equipment.map(e =>
            e.id === action.id ? { ...e, [action.field]: action.value } : e
          ),
        };
      }
      return {
        ...state,
        equipment: [
          ...state.equipment,
          { id: action.id, active: action.field === 'active' ? action.value : false, price: action.defaultPrice || 0, days: 1 },
        ],
      };
    }

    case 'APPLY_PACKAGE': {
      if (!state.serviceId) return state;
      const tierDef = PACKAGE_TIERS[state.serviceId]?.[action.tierKey];
      if (!tierDef) return state;
      const regionRates = getRegionRates(state.serviceId, state.regionKey, state.experienceLevel);
      const service = SERVICES[state.serviceId];
      const allRateKeys = [...(service.primaryRates || []), ...(service.packageRates || [])];
      const packageRateKeys = new Set((tierDef.items || []).map(i => i.rateKey));
      const lineItems = allRateKeys.map(rateKey => {
        const rateMeta = RATES[state.serviceId]?.[rateKey];
        if (!rateMeta) return null;
        const regionRate = regionRates[rateKey];
        const pkgItem = tierDef.items?.find(i => i.rateKey === rateKey);
        return {
          id: uuid(),
          rateKey,
          label: rateMeta.label,
          unit: rateMeta.unit,
          active: packageRateKeys.has(rateKey),
          value: regionRate?.current ?? 0,
          quantity: pkgItem?.quantity ?? 1,
          isCustom: false,
        };
      }).filter(Boolean);
      return { ...state, lineItems };
    }

    case 'LOAD_PRESET':
      return { ...state, ...action.preset };

    case 'RESET':
      return { ...DEFAULT_STATE, currency: state.currency, exchangeRates: state.exchangeRates };

    default:
      return state;
  }
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  const { user, profile: authProfile, signOut } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE, (init) => {
    try {
      const saved = JSON.parse(localStorage.getItem('creator-calc-state') || 'null');
      return saved ? { ...init, ...saved } : init;
    } catch { return init; }
  });

  const [dark, setDark] = useState(() => {
    try { return JSON.parse(localStorage.getItem('creator-calc-dark') ?? 'true'); } catch { return true; }
  });
  const [showAuth, setShowAuth]             = useState(false);
  const [authTab, setAuthTab]               = useState('login');
  const [authRole, setAuthRole]             = useState('client');
  const [quickMode, setQuickMode]           = useState(false);
  const [showTerms, setShowTerms]           = useState(false);
  const [showPrivacy, setShowPrivacy]       = useState(false);
  const [showJoinDropdown, setShowJoinDropdown] = useState(false);
  const joinDropdownRef = useRef(null);
  const [calcLocation, setCalcLocation] = useState(null); // { state, city, regionKey }
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('creator-calc-profile') || '{}'); } catch { return {}; }
  });

  // Derive active tab from URL
  const activeTab = location.pathname.startsWith('/register')   ? 'register'
    : location.pathname.startsWith('/calculator') ? 'calculator'
    : location.pathname.startsWith('/dashboard')  ? 'dashboard'
    : location.pathname.startsWith('/messages')   ? 'messages'
    : location.pathname.startsWith('/projects')   ? 'projects'
    : location.pathname.startsWith('/network')    ? 'network'
    : 'directory';

  // Persist state
  useEffect(() => {
    localStorage.setItem('creator-calc-state', JSON.stringify(state));
  }, [state]);
  useEffect(() => {
    localStorage.setItem('creator-calc-dark', JSON.stringify(dark));
  }, [dark]);
  useEffect(() => {
    localStorage.setItem('creator-calc-profile', JSON.stringify(profile));
  }, [profile]);

  // Apply dark class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // Capture referral code from URL on first load
  useEffect(() => { captureReferralCode(); }, []);

  // Close Join dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (joinDropdownRef.current && !joinDropdownRef.current.contains(e.target)) {
        setShowJoinDropdown(false);
      }
    }
    if (showJoinDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showJoinDropdown]);

  // Listen for open-auth custom event dispatched by guest gate / banners
  useEffect(() => {
    function handleOpenAuth(e) {
      setAuthTab(e.detail?.tab || 'signup');
      setShowAuth(true);
    }
    window.addEventListener('open-auth', handleOpenAuth);
    return () => window.removeEventListener('open-auth', handleOpenAuth);
  }, []);

  function openAuth(tab = 'login') { setAuthTab(tab); setShowAuth(true); }

  const quote = useMemo(() => buildQuote(state), [state]);

  const handleExportPDF = useCallback(async () => {
    await generateQuotePDF(quote, state, profile);
  }, [quote, state, profile]);

  const handleLoadPreset = useCallback((preset) => {
    dispatch({ type: 'LOAD_PRESET', preset });
  }, []);

  const handleSelectPackage = useCallback((tierKey, tierDef) => {
    dispatch({ type: 'APPLY_PACKAGE', tierKey });
  }, []);

  if (quickMode) {
    return <QuickQuoteMode dark={dark} onFullMode={() => setQuickMode(false)} />;
  }

  const bgMain = dark ? '' : 'bg-gray-50';
  const textMain = dark ? 'text-white' : 'text-gray-900';
  const cardCls = `rounded-2xl border ${dark ? 'bg-charcoal-800 border-charcoal-700' : 'bg-white border-gray-200'}`;

  return (
    <div className={`min-h-screen ${bgMain} font-body transition-colors duration-200`} style={{ position: 'relative', zIndex: 1 }}>
      <CircuitBackground />

      {/* ── Top Nav ── */}
      <header className={`sticky top-0 z-20 ${dark ? 'bg-charcoal-900/95 border-charcoal-700' : 'bg-white/95 border-gray-200'} border-b backdrop-blur-sm`}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">

          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0 cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-xl">🎬</span>
            <span className={`font-display font-bold text-base hidden sm:block ${textMain}`}>
              Creator<span className="text-gradient-gold">Match</span>
            </span>
          </div>

          <div className="flex-1" />

          {/* Main tab switcher */}
          <div className={`flex rounded-xl border overflow-hidden ${dark ? 'border-charcoal-600' : 'border-gray-200'}`}>
            {[
              { path: '/',           id: 'directory',  icon: Search,   label: 'Find Creators' },
              { path: '/projects',   id: 'projects',   icon: Briefcase, label: 'Projects' },
              { path: '/network',    id: 'network',    icon: Users,     label: 'Network' },
              { path: '/calculator', id: 'calculator', icon: Zap,      label: 'Rate Calculator' },
            ].map(({ path, id, icon: Icon, label }) => (
              <button key={id} type="button" onClick={() => navigate(path)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === id
                    ? 'bg-gold-500 text-charcoal-900'
                    : dark ? 'text-charcoal-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Icon size={12} /> <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Join dropdown */}
          <div className="relative" ref={joinDropdownRef}>
            <button
              type="button"
              onClick={() => setShowJoinDropdown(d => !d)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors rounded-xl border ${
                activeTab === 'register' || showJoinDropdown
                  ? 'bg-gold-500 text-charcoal-900 border-gold-500'
                  : dark ? 'border-charcoal-600 text-charcoal-300 hover:text-white hover:border-charcoal-500' : 'border-gray-200 text-gray-600 hover:text-gray-900'
              }`}
            >
              <UserPlus size={12} /> <span className="hidden sm:inline">Join</span>
            </button>
            {showJoinDropdown && (
              <div className={`absolute right-0 top-full mt-2 w-56 rounded-xl border shadow-xl z-50 overflow-hidden ${
                dark ? 'bg-charcoal-900 border-charcoal-700' : 'bg-white border-gray-200'
              }`}>
                <button
                  type="button"
                  onClick={() => { navigate('/register'); setShowJoinDropdown(false); }}
                  className={`w-full flex flex-col items-start gap-0.5 px-4 py-3 transition-colors text-left ${
                    dark ? 'hover:bg-charcoal-800' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-xs font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>I am a Creator</span>
                  <span className={`text-[11px] ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>List your services and get hired</span>
                </button>
                <div className={`border-t ${dark ? 'border-charcoal-700' : 'border-gray-100'}`} />
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('signup');
                    setAuthRole('client');
                    setShowAuth(true);
                    setShowJoinDropdown(false);
                  }}
                  className={`w-full flex flex-col items-start gap-0.5 px-4 py-3 transition-colors text-left ${
                    dark ? 'hover:bg-charcoal-800' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-xs font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>I am a Client</span>
                  <span className={`text-[11px] ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>Find and hire verified creators</span>
                </button>
              </div>
            )}
          </div>

          {/* Calculator tools (only when on calculator tab) */}
          {activeTab === 'calculator' && (
            <>
              <button type="button" onClick={() => setQuickMode(true)}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  dark ? 'border-charcoal-600 text-charcoal-300 hover:text-white hover:border-charcoal-500' : 'border-gray-200 text-gray-500 hover:text-gray-900'
                }`}
              >
                <Zap size={12} className="text-gold-400" /> Quick Quote
              </button>
              <ProfileSettings profile={profile} onChange={setProfile} dark={dark} />
              <PresetManager currentState={state} onLoad={handleLoadPreset} dark={dark} />
              <CurrencySettings
                currency={state.currency}
                exchangeRates={state.exchangeRates}
                onCurrencyChange={v => dispatch({ type: 'SET_FIELD', field: 'currency', value: v })}
                onRatesChange={v => dispatch({ type: 'SET_FIELD', field: 'exchangeRates', value: v })}
                dark={dark}
              />
              <button type="button" onClick={() => dispatch({ type: 'RESET' })}
                className={`p-2 rounded-xl transition-colors ${dark ? 'text-charcoal-500 hover:text-white hover:bg-charcoal-700' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
                title="Reset calculator"
              >
                <RotateCcw size={14} />
              </button>
            </>
          )}

          {/* Auth buttons */}
          {user ? (
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => navigate('/messages')}
                className={`p-2 rounded-xl transition-colors ${
                  activeTab === 'messages'
                    ? 'bg-gold-500/20 text-gold-400'
                    : dark ? 'text-charcoal-400 hover:text-white hover:bg-charcoal-700' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
                }`} title="Messages">
                <MessageSquare size={14} />
              </button>
              <button type="button" onClick={() => navigate('/dashboard')}
                className={`p-2 rounded-xl transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-gold-500/20 text-gold-400'
                    : dark ? 'text-charcoal-400 hover:text-white hover:bg-charcoal-700' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
                }`} title="Dashboard">
                <LayoutDashboard size={14} />
              </button>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${dark ? 'bg-gold-500/20 text-gold-400' : 'bg-gold-100 text-gold-600'}`}>
                {(authProfile?.full_name || user.email || 'U')[0].toUpperCase()}
              </div>
              <button type="button" onClick={signOut}
                className={`p-2 rounded-xl transition-colors ${dark ? 'text-charcoal-400 hover:text-white hover:bg-charcoal-700' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
                title="Sign out">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => openAuth('login')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                dark ? 'border-charcoal-600 text-charcoal-300 hover:text-white hover:border-charcoal-500' : 'border-gray-200 text-gray-600 hover:text-gray-900'
              }`}>
              <LogIn size={12} /> Sign In
            </button>
          )}

          {/* Dark mode */}
          <button type="button" onClick={() => setDark(d => !d)}
            className={`p-2 rounded-xl transition-colors ${dark ? 'text-charcoal-400 hover:text-white hover:bg-charcoal-700' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* ── Routes ── */}
      <Routes>
        <Route path="/" element={<CreatorDirectory dark={dark} mode="search" onSwitchToRegister={() => navigate('/register')} />} />
        <Route path="/register" element={<CreatorDirectory dark={dark} mode="register" onSwitchToSearch={() => navigate('/')} />} />
        <Route path="/creator/:id" element={<CreatorProfilePage dark={dark} />} />
        <Route path="/dashboard" element={<CreatorDashboard dark={dark} />} />
        <Route path="/messages" element={<MessagesPage dark={dark} />} />
        <Route path="/projects" element={<ErrorBoundary dark={dark} fallbackMessage="Could not load the Project Board"><ProjectBoard dark={dark} /></ErrorBoundary>} />
        <Route path="/checkout/:projectId" element={<CheckoutPage dark={dark} />} />
        <Route path="/matches/:projectId" element={<MatchResultsPage dark={dark} />} />
        <Route path="/network" element={<NetworkingPage dark={dark} user={user} />} />
        <Route path="/calculator" element={null} />
      </Routes>

      {/* ── Calculator (rendered outside Routes to preserve state) ── */}
      <main className={`max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 ${activeTab !== 'calculator' ? 'hidden' : ''}`}>

        {/* ── Calculator purpose label ── */}
        <div className="col-span-full">
          <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${dark ? 'bg-gold-500/5 border-gold-500/20' : 'bg-gold-50 border-gold-200'}`}>
            <Zap size={15} className="text-gold-400 shrink-0" />
            <p className={`text-sm font-semibold ${dark ? 'text-gold-300' : 'text-gold-700'}`}>
              Creator Pricing Tool
              <span className={`ml-2 font-normal text-xs ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>
                Use this to build and calculate your service rates. This tool is for creators, not for client-facing quotes.
              </span>
            </p>
          </div>
        </div>

        {/* ── LEFT: Config panel ── */}
        <div className="space-y-4 min-w-0">

          {/* Region + Experience row */}
          <div className={`${cardCls} p-4`}>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>
                  Your Market
                </p>
                <StateCitySelector
                  value={calcLocation}
                  onChange={loc => {
                    setCalcLocation(loc);
                    dispatch({ type: 'SET_REGION', value: loc.regionKey });
                  }}
                  dark={dark}
                />
              </div>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>
                  Experience Level
                </p>
                <div className={`flex rounded-xl border overflow-hidden ${dark ? 'border-charcoal-600' : 'border-gray-200'}`}>
                  {[
                    { id: 'entry',  label: '0-2 yrs' },
                    { id: 'mid',    label: '3-6 yrs' },
                    { id: 'senior', label: '7+ yrs'  },
                  ].map(({ id, label }) => (
                    <button key={id} type="button"
                      onClick={() => dispatch({ type: 'SET_EXPERIENCE', value: id })}
                      className={`flex-1 px-2 py-2 text-xs font-semibold transition-colors ${
                        state.experienceLevel === id
                          ? 'bg-gold-500 text-charcoal-900'
                          : dark ? 'text-charcoal-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Service selector */}
          <div className={`${cardCls} p-4`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>
              Service Type
            </p>
            <ServiceSelector
              value={state.serviceId}
              onChange={v => dispatch({ type: 'SET_SERVICE', value: v })}
              dark={dark}
            />
          </div>

          {/* Line Item Builder */}
          {state.serviceId && (
            <div className={`${cardCls} p-4`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>
                Build Your Quote
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className={`text-xs font-medium mb-1 ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>Client Name</p>
                  <input
                    type="text"
                    value={state.clientName}
                    onChange={e => dispatch({ type: 'SET_FIELD', field: 'clientName', value: e.target.value })}
                    placeholder="Client or Project Name"
                    className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all ${
                      dark
                        ? 'bg-charcoal-900 border-charcoal-600 text-white placeholder-charcoal-500 focus:border-gold-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gold-500'
                    }`}
                  />
                </div>
                <div>
                  <p className={`text-xs font-medium mb-1 ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>Quote #</p>
                  <input
                    type="text"
                    value={state.quoteNumber}
                    onChange={e => dispatch({ type: 'SET_FIELD', field: 'quoteNumber', value: e.target.value })}
                    placeholder="e.g. Q-2026-001"
                    className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all ${
                      dark
                        ? 'bg-charcoal-900 border-charcoal-600 text-white placeholder-charcoal-500 focus:border-gold-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gold-500'
                    }`}
                  />
                </div>
              </div>

              <LineItemBuilder state={state} dispatch={dispatch} dark={dark} />

              <div className={`mt-4 border-t pt-4 ${dark ? 'border-charcoal-700' : 'border-gray-200'}`}>
                <p className={`text-xs font-medium mb-1 ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>Notes / Terms</p>
                <textarea
                  value={state.notes}
                  onChange={e => dispatch({ type: 'SET_FIELD', field: 'notes', value: e.target.value })}
                  placeholder={profile?.defaultNotes || 'Add any terms, notes, or special conditions...'}
                  rows={3}
                  className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all resize-none ${
                    dark
                      ? 'bg-charcoal-900 border-charcoal-600 text-white placeholder-charcoal-500 focus:border-gold-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gold-500'
                  }`}
                />
              </div>

              {/* Cost inputs */}
              <div className={`mt-4 border-t pt-4 ${dark ? 'border-charcoal-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-xs font-medium ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>Your Actual Costs (for margin calc)</p>
                  <button type="button"
                    onClick={() => dispatch({ type: 'SET_FIELD', field: 'costInputs', value: [...state.costInputs, { id: uuid(), label: '', value: 0 }] })}
                    className="text-xs text-gold-400 hover:text-gold-300 transition-colors"
                  >
                    + Add cost
                  </button>
                </div>
                <div className="space-y-2">
                  {state.costInputs.map((cost) => (
                    <div key={cost.id} className="flex gap-2">
                      <input type="text" value={cost.label} placeholder="Cost label"
                        onChange={e => dispatch({ type: 'SET_FIELD', field: 'costInputs', value: state.costInputs.map(c => c.id === cost.id ? { ...c, label: e.target.value } : c) })}
                        className={`flex-1 px-3 py-1.5 text-sm rounded-lg border outline-none transition-all ${dark ? 'bg-charcoal-900 border-charcoal-600 text-white placeholder-charcoal-500 focus:border-gold-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gold-500'}`}
                      />
                      <div className="relative flex items-center w-28">
                        <span className={`absolute left-2 text-xs pointer-events-none ${dark ? 'text-charcoal-400' : 'text-gray-400'}`}>$</span>
                        <input type="number" min={0} value={cost.value || ''}
                          onChange={e => dispatch({ type: 'SET_FIELD', field: 'costInputs', value: state.costInputs.map(c => c.id === cost.id ? { ...c, value: parseFloat(e.target.value) || 0 } : c) })}
                          className={`w-full pl-5 pr-2 py-1.5 text-sm rounded-lg border outline-none transition-all ${dark ? 'bg-charcoal-900 border-charcoal-600 text-white focus:border-gold-500' : 'bg-white border-gray-300 text-gray-900 focus:border-gold-500'}`}
                        />
                      </div>
                      <button type="button"
                        onClick={() => dispatch({ type: 'SET_FIELD', field: 'costInputs', value: state.costInputs.filter(c => c.id !== cost.id) })}
                        className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                        x
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {state.serviceId && (
            <PackageComparison
              serviceId={state.serviceId}
              regionKey={state.regionKey}
              currency={state.currency}
              exchangeRates={state.exchangeRates}
              dark={dark}
              onSelectPackage={handleSelectPackage}
            />
          )}

          {state.serviceId && (
            <RateComparisonChart
              serviceId={state.serviceId}
              regionKey={state.regionKey}
              lineItems={state.lineItems}
              dark={dark}
            />
          )}

          {state.serviceId && (
            <SeasonalDemand serviceId={state.serviceId} dark={dark} />
          )}
        </div>

        {/* ── RIGHT: Quote panel ── */}
        <div className="space-y-4">
          <div className="lg:sticky lg:top-20 space-y-4">

            {quote.grandTotal > 0 && (
              <div className={`${cardCls} p-4 glow-gold`}>
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>Total Estimate</p>
                    <p className="font-display text-4xl font-bold text-gradient-gold">
                      {formatCurrency(quote.grandTotal, state.currency, state.exchangeRates)}
                    </p>
                  </div>
                  {quote.profitMargin !== null && (
                    <div className="text-right">
                      <p className={`text-[10px] ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>Margin</p>
                      <p className={`text-xl font-bold ${quote.profitMargin >= 50 ? 'text-green-400' : quote.profitMargin >= 25 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {quote.profitMargin}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <QuoteOutput
              quote={quote}
              state={state}
              onExportPDF={handleExportPDF}
              dark={dark}
              creatorMode={true}
            />

            {/* Post-calculator signup prompt for guests */}
            {!user && quote.grandTotal > 0 && (
              <div className={`${cardCls} p-5 text-center`}>
                <p className={`font-display font-bold text-sm mb-1 ${dark ? 'text-white' : 'text-gray-900'}`}>
                  Ready to put these rates to work?
                </p>
                <p className={`text-xs mb-4 ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>
                  Create a free profile and start getting matched with clients looking for your services.
                </p>
                <button type="button"
                  onClick={() => setShowAuth(true)}
                  className="w-full py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-charcoal-900 text-sm font-bold transition-all">
                  Join as a Creator - It's Free
                </button>
                <p className={`text-[10px] mt-2 ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>
                  No subscription. Creators keep 90% of every project.
                </p>
              </div>
            )}

            {state.serviceId && (
              <HealthWidget
                serviceId={state.serviceId}
                regionKey={state.regionKey}
                lineItems={state.lineItems}
                experienceLevel={state.experienceLevel}
                dark={dark}
              />
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      {activeTab !== 'calculator' && location.pathname.startsWith('/creator') ? null : (
        <footer className={`mt-12 border-t ${dark ? 'border-charcoal-800' : 'border-gray-200'} py-6`}>
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className={`text-xs ${dark ? 'text-charcoal-600' : 'text-gray-400'}`}>
              CreatorBridge - connecting content creators with brands and clients seeking media production and digital content services
            </p>
            <div className={`flex items-center gap-4 text-xs ${dark ? 'text-charcoal-600' : 'text-gray-400'}`}>
              <button type="button" onClick={() => setShowTerms(true)}
                className={`hover:text-gold-400 transition-colors ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>
                Terms of Service
              </button>
              <span className={dark ? 'text-charcoal-700' : 'text-gray-300'}>|</span>
              <button type="button" onClick={() => setShowPrivacy(true)}
                className={`hover:text-gold-400 transition-colors ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>
                Privacy
              </button>
              <span className={dark ? 'text-charcoal-700' : 'text-gray-300'}>|</span>
              <a href="mailto:drl33@creatorbridge.studio" className={`hover:text-gold-400 transition-colors ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>
                {/* TODO: Update to support@creatorbridge.studio once domain email is active */}
                Support
              </a>
            </div>
          </div>
        </footer>
      )}

      {/* Auth modal */}
      {showAuth && (
        <AuthModal
          dark={dark}
          defaultTab={authTab}
          defaultRole={authRole}
          onClose={() => setShowAuth(false)}
          onOpenTerms={() => { setShowAuth(false); setShowTerms(true); }}
          onOpenCreatorRegistration={() => { setShowAuth(false); navigate('/register'); }}
        />
      )}

      {/* Terms modal */}
      {showTerms && (
        <TermsModal dark={dark} onClose={() => setShowTerms(false)} />
      )}

      {/* Privacy modal */}
      {showPrivacy && (
        <PrivacyModal dark={dark} onClose={() => setShowPrivacy(false)} />
      )}

      {/* Global support chatbot */}
      <SupportChatbot dark={dark} />
    </div>
  );
}
