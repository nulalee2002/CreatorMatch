import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, X, MapPin, DollarSign, Calendar, Briefcase } from 'lucide-react';
import { SERVICES } from '../data/rates.js';

const BUDGET_OPTIONS = [
  { id: 'under500',   label: 'Under $500',     min: 0,    max: 500   },
  { id: '500-1500',   label: '$500 – $1,500',  min: 500,  max: 1500  },
  { id: '1500-5000',  label: '$1,500 – $5,000',min: 1500, max: 5000  },
  { id: '5000-10000', label: '$5,000 – $10,000',min:5000, max: 10000 },
  { id: 'over10000',  label: '$10,000+',        min: 10000,max: 999999},
];

const LOCATION_OPTIONS = [
  { id: 'local',  label: 'Local only' },
  { id: 'remote', label: 'Remote is fine' },
  { id: 'either', label: 'Either works' },
];

/**
 * IntentGate — shown when a client tries to contact or book without
 * first submitting a project brief.
 *
 * Props:
 *   dark         — boolean
 *   onClose      — fn (called when user dismisses)
 *   prefillService — optional serviceId to pre-select
 *   mode         — 'modal' (default) | 'inline'
 */
export function IntentGate({ dark, onClose, prefillService, mode = 'modal' }) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    serviceId: prefillService || '',
    description: '',
    budgetId: '',
    timeline: '',
    locationPreference: 'either',
  });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const textSub  = dark ? 'text-charcoal-400' : 'text-gray-500';
  const inputCls = `w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all ${
    dark ? 'bg-charcoal-900 border-charcoal-600 text-white placeholder-charcoal-500 focus:border-gold-500'
         : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gold-500'
  }`;

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = 'Add a project title';
    if (!form.serviceId) e.serviceId = 'Select a service type';
    if (form.description.trim().length < 50) e.description = 'Please describe your project (at least 50 characters)';
    if (!form.budgetId) e.budgetId = 'Select a budget range';
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    const budget = BUDGET_OPTIONS.find(b => b.id === form.budgetId);
    const project = {
      id:                 Date.now().toString() + Math.random(),
      title:              form.title.trim(),
      description:        form.description.trim(),
      serviceId:          form.serviceId,
      budgetMin:          budget?.min ?? 0,
      budgetMax:          budget?.max ?? 999999,
      budgetLabel:        budget?.label || '',
      timeline:           form.timeline,
      locationPreference: form.locationPreference,
      status:             'open',
      applications:       0,
      clientId:           'intent-' + Date.now(),
      clientName:         'Client',
      createdAt:          new Date().toISOString(),
    };

    // Save project to localStorage
    try {
      const all = JSON.parse(localStorage.getItem('cm-projects') || '[]');
      localStorage.setItem('cm-projects', JSON.stringify([project, ...all]));
    } catch {}

    onClose?.();
    navigate(`/matches/${project.id}`);
  }

  const inner = (
    <div className={mode === 'modal' ? 'p-6' : ''}>
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-gold-500/20 flex items-center justify-center">
            <Zap size={15} className="text-gold-400" />
          </div>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>
            Smart Match
          </p>
        </div>
        <h3 className={`font-display font-bold text-xl ${dark ? 'text-white' : 'text-gray-900'}`}>
          Tell us about your project first
        </h3>
        <p className={`text-sm mt-1 ${textSub}`}>
          To connect you with the right creators, we need to understand your needs. This takes about 60 seconds.
        </p>
      </div>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className={`text-xs font-medium block mb-1.5 ${textSub}`}>Project title</label>
          <input
            type="text"
            value={form.title}
            onChange={e => { set('title', e.target.value); setErrors(v => ({ ...v, title: '' })); }}
            placeholder="e.g. Brand video for product launch"
            className={inputCls}
          />
          {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
        </div>

        {/* Service type */}
        <div>
          <label className={`text-xs font-medium block mb-1.5 ${textSub}`}>Service type</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SERVICES).map(([id, svc]) => (
              <button key={id} type="button"
                onClick={() => { set('serviceId', form.serviceId === id ? '' : id); setErrors(v => ({ ...v, serviceId: '' })); }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                  form.serviceId === id
                    ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                    : dark ? 'border-charcoal-700 text-charcoal-400 hover:border-charcoal-500' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                {svc.icon} {svc.name}
              </button>
            ))}
          </div>
          {errors.serviceId && <p className="text-xs text-red-400 mt-1">{errors.serviceId}</p>}
        </div>

        {/* Description */}
        <div>
          <label className={`text-xs font-medium block mb-1.5 ${textSub}`}>
            Brief description
            <span className={`ml-2 font-normal ${form.description.length >= 50 ? 'text-teal-400' : textSub}`}>
              ({form.description.length}/50 min)
            </span>
          </label>
          <textarea
            rows={3}
            value={form.description}
            onChange={e => { set('description', e.target.value); setErrors(v => ({ ...v, description: '' })); }}
            placeholder="What do you need created? Include any style, tone, or deliverable details that matter to you."
            className={`${inputCls} resize-none`}
          />
          {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description}</p>}
        </div>

        {/* Budget */}
        <div>
          <label className={`text-xs font-medium block mb-1.5 ${textSub}`}>
            <DollarSign size={11} className="inline -mt-0.5" /> Budget range
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BUDGET_OPTIONS.map(b => (
              <button key={b.id} type="button"
                onClick={() => { set('budgetId', b.id); setErrors(v => ({ ...v, budgetId: '' })); }}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all text-left ${
                  form.budgetId === b.id
                    ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                    : dark ? 'border-charcoal-700 text-charcoal-400 hover:border-charcoal-500' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                {b.label}
              </button>
            ))}
          </div>
          {errors.budgetId && <p className="text-xs text-red-400 mt-1">{errors.budgetId}</p>}
        </div>

        {/* Timeline + Location in row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`text-xs font-medium block mb-1.5 ${textSub}`}>
              <Calendar size={11} className="inline -mt-0.5" /> Timeline
            </label>
            <input
              type="date"
              value={form.timeline}
              onChange={e => set('timeline', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={`text-xs font-medium block mb-1.5 ${textSub}`}>
              <MapPin size={11} className="inline -mt-0.5" /> Location preference
            </label>
            <select
              value={form.locationPreference}
              onChange={e => set('locationPreference', e.target.value)}
              className={inputCls}>
              {LOCATION_OPTIONS.map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-6">
        {onClose && mode === 'modal' && (
          <button type="button" onClick={onClose}
            className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${dark ? 'border-charcoal-600 text-charcoal-300 hover:text-white' : 'border-gray-200 text-gray-600 hover:text-gray-900'}`}>
            Cancel
          </button>
        )}
        <button type="button" onClick={handleSubmit}
          className="flex-1 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-charcoal-900 text-sm font-bold transition-all flex items-center justify-center gap-2">
          <Zap size={14} /> Find My Creators
        </button>
      </div>
    </div>
  );

  if (mode === 'inline') return inner;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-lg rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto ${dark ? 'bg-charcoal-900 border-charcoal-700' : 'bg-white border-gray-200'}`}>
        {onClose && (
          <button type="button" onClick={onClose}
            className={`absolute top-4 right-4 p-1.5 rounded-lg z-10 ${dark ? 'text-charcoal-400 hover:text-white hover:bg-charcoal-700' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
            <X size={16} />
          </button>
        )}
        {inner}
      </div>
    </div>
  );
}
