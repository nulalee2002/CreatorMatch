import { useState, useMemo } from 'react';
import { X, Send, DollarSign, Calendar, FileText, Mail, User, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { SERVICES } from '../data/rates.js';
import { supabase, supabaseConfigured } from '../lib/supabase.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { loadAvailability } from './AvailabilityCalendar.jsx';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function toKey(date) { return date.toISOString().split('T')[0]; }
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function firstDay(y, m)    { return new Date(y, m, 1).getDay(); }

// ── Inline booking calendar ───────────────────────────────────
function BookingCalendar({ creatorId, dark, selectedDate, onSelect }) {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const availability = useMemo(() => loadAvailability(creatorId), [creatorId]);
  const todayKey  = toKey(today);
  const numDays   = daysInMonth(viewYear, viewMonth);
  const startDay  = firstDay(viewYear, viewMonth);
  const hasAvailability = Object.values(availability).some(v => v === 'available');

  const textSub = dark ? 'text-charcoal-400' : 'text-gray-500';

  function prev() {
    if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11); }
    else setViewMonth(m => m-1);
  }
  function next() {
    if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0); }
    else setViewMonth(m => m+1);
  }

  return (
    <div>
      <p className={`text-xs font-medium mb-2 flex items-center gap-1.5 ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>
        <CalendarDays size={13} />
        {hasAvailability ? 'Select a date — green = creator is available' : 'No availability set — any date works'}
      </p>
      <div className={`rounded-xl border p-3 ${dark ? 'border-charcoal-700 bg-charcoal-900/50' : 'border-gray-200 bg-gray-50'}`}>
        {/* Nav */}
        <div className="flex items-center justify-between mb-2">
          <button type="button" onClick={prev} className={`p-1 rounded ${dark ? 'text-charcoal-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
            <ChevronLeft size={13} />
          </button>
          <p className={`text-xs font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{MONTHS[viewMonth]} {viewYear}</p>
          <button type="button" onClick={next} className={`p-1 rounded ${dark ? 'text-charcoal-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
            <ChevronRight size={13} />
          </button>
        </div>
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-0.5">
          {DAYS.map(d => <div key={d} className={`text-center text-[9px] font-medium py-0.5 ${textSub}`}>{d}</div>)}
        </div>
        {/* Days */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: startDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: numDays }).map((_, i) => {
            const day    = i + 1;
            const key    = toKey(new Date(viewYear, viewMonth, day));
            const status = availability[key];
            const isPast = key < todayKey;
            const isAvail  = status === 'available';
            const isBooked = status === 'booked';
            const isSel    = selectedDate === key;
            return (
              <button key={day} type="button"
                disabled={isPast || isBooked || (hasAvailability && !isAvail)}
                onClick={() => onSelect(isSel ? '' : key)}
                className={`
                  aspect-square flex items-center justify-center rounded-lg text-[11px] font-medium transition-all
                  ${isPast || isBooked ? 'opacity-25 cursor-not-allowed ' + (dark ? 'text-charcoal-600' : 'text-gray-300')
                    : isSel ? 'bg-gold-500 text-charcoal-900 font-bold'
                    : isAvail ? 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/40 cursor-pointer'
                    : hasAvailability ? 'opacity-30 cursor-not-allowed ' + (dark ? 'text-charcoal-500' : 'text-gray-400')
                    : dark ? 'text-charcoal-300 hover:bg-charcoal-700 cursor-pointer' : 'text-gray-600 hover:bg-gray-200 cursor-pointer'
                  }
                `}>
                {day}
              </button>
            );
          })}
        </div>
        {selectedDate && (
          <p className="text-[10px] text-gold-400 text-center mt-2 font-medium">
            Selected: {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        )}
      </div>
    </div>
  );
}

export function RequestQuoteModal({ creator, dark, onClose, initialDate = '' }) {
  const { user, profile } = useAuth();
  const [form, setForm] = useState({
    clientName:    profile?.full_name || '',
    clientEmail:   user?.email || '',
    serviceId:     creator?.services?.[0]?.serviceId || '',
    budget:        '',
    preferredDate: initialDate,
    description:   '',
  });
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]       = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inputCls = `w-full px-4 py-3 text-sm rounded-xl border outline-none transition-all ${
    dark
      ? 'bg-charcoal-900 border-charcoal-600 text-white placeholder-charcoal-500 focus:border-gold-500'
      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gold-500'
  }`;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (supabaseConfigured) {
        const { error: dbError } = await supabase.from('quote_requests').insert({
          listing_id:   creator.id,
          client_id:    user?.id || null,
          client_name:  form.clientName,
          client_email: form.clientEmail,
          service_id:   form.serviceId,
          budget:       parseFloat(form.budget) || null,
          description:  form.description,
          timeline:     form.preferredDate || null,
        });
        if (dbError) throw dbError;
      } else {
        const requests = JSON.parse(localStorage.getItem('quote-requests') || '[]');
        requests.push({ ...form, creatorId: creator.id, creatorName: creator.businessName || creator.name, id: Date.now().toString(), createdAt: new Date().toISOString() });
        localStorage.setItem('quote-requests', JSON.stringify(requests));
      }
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl p-8 text-center ${dark ? 'bg-charcoal-900 border-charcoal-700' : 'bg-white border-gray-200'}`}>
          <div className="text-5xl mb-4">✅</div>
          <h3 className={`font-display font-bold text-xl mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>Quote Request Sent!</h3>
          <p className={`text-sm mb-2 ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>
            Your request has been sent to <strong>{creator.businessName || creator.name}</strong>. They'll respond to <strong>{form.clientEmail}</strong> within 24–48 hours.
          </p>
          {form.preferredDate && (
            <p className="text-xs text-gold-400 bg-gold-500/10 rounded-xl px-3 py-2 mb-4 font-medium">
              Requested date: {new Date(form.preferredDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
          <button type="button" onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-charcoal-900 text-sm font-bold transition-all">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-lg rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto ${dark ? 'bg-charcoal-900 border-charcoal-700' : 'bg-white border-gray-200'}`}>
        <button type="button" onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors z-10 ${dark ? 'text-charcoal-400 hover:text-white hover:bg-charcoal-700' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
          <X size={16} />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${dark ? 'bg-charcoal-700' : 'bg-gray-100'}`}>
              {creator.avatar || '🎬'}
            </div>
            <div>
              <h3 className={`font-display font-bold text-base ${dark ? 'text-white' : 'text-gray-900'}`}>
                Request a Quote
              </h3>
              <p className={`text-xs ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>
                from {creator.businessName || creator.name}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Contact info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className={`text-xs font-medium mb-1.5 ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>Your Name *</p>
                <div className="relative">
                  <User size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${dark ? 'text-charcoal-500' : 'text-gray-400'}`} />
                  <input type="text" required value={form.clientName} onChange={e => set('clientName', e.target.value)}
                    placeholder="Jane Smith" className={`${inputCls} pl-9`} />
                </div>
              </div>
              <div>
                <p className={`text-xs font-medium mb-1.5 ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>Your Email *</p>
                <div className="relative">
                  <Mail size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${dark ? 'text-charcoal-500' : 'text-gray-400'}`} />
                  <input type="email" required value={form.clientEmail} onChange={e => set('clientEmail', e.target.value)}
                    placeholder="jane@example.com" className={`${inputCls} pl-9`} />
                </div>
              </div>
            </div>

            {/* Service type */}
            <div>
              <p className={`text-xs font-medium mb-1.5 ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>Service Needed</p>
              <div className="flex flex-wrap gap-2">
                {creator.services?.map(svc => {
                  const def = SERVICES[svc.serviceId];
                  return (
                    <button key={svc.serviceId} type="button" onClick={() => set('serviceId', svc.serviceId)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                        form.serviceId === svc.serviceId
                          ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                          : dark ? 'border-charcoal-700 text-charcoal-400 hover:border-charcoal-500' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      <span>{def?.icon}</span> {def?.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Budget */}
            <div>
              <p className={`text-xs font-medium mb-1.5 ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>Your Budget</p>
              <div className="relative">
                <DollarSign size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${dark ? 'text-charcoal-500' : 'text-gray-400'}`} />
                <input type="number" min={0} value={form.budget} onChange={e => set('budget', e.target.value)}
                  placeholder="e.g. 1500" className={`${inputCls} pl-9`} />
              </div>
            </div>

            {/* Booking calendar */}
            <BookingCalendar
              creatorId={creator.id}
              dark={dark}
              selectedDate={form.preferredDate}
              onSelect={date => set('preferredDate', date)}
            />

            {/* Description */}
            <div>
              <p className={`text-xs font-medium mb-1.5 ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>Project Description *</p>
              <div className="relative">
                <FileText size={13} className={`absolute left-3 top-3 pointer-events-none ${dark ? 'text-charcoal-500' : 'text-gray-400'}`} />
                <textarea required value={form.description} onChange={e => set('description', e.target.value)}
                  rows={4} placeholder="Describe your project, what you need, when it's needed, and any other details..."
                  className={`${inputCls} pl-9 resize-none`} />
              </div>
            </div>

            {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-gold-500 hover:bg-gold-600 text-charcoal-900 text-sm font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              <Send size={14} /> {loading ? 'Sending...' : 'Send Quote Request'}
            </button>

            <p className={`text-center text-[10px] ${dark ? 'text-charcoal-600' : 'text-gray-400'}`}>
              The creator will reply directly to your email. No payment required to request a quote.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
