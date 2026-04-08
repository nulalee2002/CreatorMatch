import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { RATES, SERVICES, EQUIPMENT_ITEMS, LICENSING_OPTIONS, TURNAROUND_OPTIONS } from '../data/rates.js';
import { getRegionRates } from '../utils/pricing.js';
import { CurrencyInput } from './CurrencyInput.jsx';
import { Tooltip } from './Tooltip.jsx';

function SectionHeader({ title, open, onToggle, dark }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center justify-between py-2.5 border-b ${dark ? 'border-charcoal-700 text-white' : 'border-gray-200 text-gray-900'} font-semibold text-sm`}
    >
      {title}
      {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
    </button>
  );
}

export function LineItemBuilder({ state, dispatch, dark = true }) {
  const {
    serviceId, regionKey, lineItems, equipment, travelType, travelMiles, travelMileRate,
    travelFee, assistants, assistantRate, locationFee, revisions, additionalRevisionRate,
    turnaround, customTurnaroundPct, licensingId, taxEnabled, taxRate,
    experienceLevel,
  } = state;

  const [sections, setSections] = useState({
    rates: true, equipment: false, travel: false,
    crew: false, turnaround: false, licensing: false, tax: false,
  });

  const toggleSection = (key) => setSections(s => ({ ...s, [key]: !s[key] }));

  const service = SERVICES[serviceId];
  const regionRates = serviceId && regionKey ? getRegionRates(serviceId, regionKey, experienceLevel) : {};
  const serviceRateConfig = serviceId ? RATES[serviceId] : {};
  const sym = '$';

  const inputCls = dark
    ? 'bg-charcoal-900 border-charcoal-600 text-white placeholder-charcoal-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500/40'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gold-500';
  const labelCls = `text-xs font-medium ${dark ? 'text-charcoal-300' : 'text-gray-500'}`;

  if (!serviceId) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 gap-3 ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>
        <span className="text-4xl">👆</span>
        <p className="text-sm">Select a service type to start building your quote</p>
      </div>
    );
  }

  const allRateKeys = [
    ...(service.primaryRates || []),
    ...(service.packageRates || []),
  ];

  return (
    <div className="space-y-1">
      {/* ── Rates / Line Items ─── */}
      <SectionHeader title="Service Rates" open={sections.rates} onToggle={() => toggleSection('rates')} dark={dark} />
      {sections.rates && (
        <div className="py-3 space-y-4">
          {allRateKeys.map(rateKey => {
            const rateMeta = serviceRateConfig[rateKey];
            if (!rateMeta) return null;
            const regionRate = regionRates[rateKey];
            const item = lineItems.find(l => l.rateKey === rateKey);
            const active = item?.active ?? false;
            const currentVal = item?.value ?? regionRate?.current ?? 0;
            const qty = item?.quantity ?? 1;

            return (
              <div key={rateKey} className={`rounded-xl border p-3 transition-all ${
                active
                  ? dark ? 'border-gold-500/40 bg-charcoal-900/60' : 'border-gold-500/40 bg-gold-50/30'
                  : dark ? 'border-charcoal-700 bg-charcoal-800/30 opacity-60' : 'border-gray-200 bg-gray-50/50 opacity-60'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={e => dispatch({ type: 'SET_LINE_ITEM', rateKey, field: 'active', value: e.target.checked, rateMeta, regionRate })}
                    className="accent-gold-500 w-4 h-4 rounded cursor-pointer"
                  />
                  <span className={`text-sm font-medium flex-1 ${dark ? 'text-white' : 'text-gray-900'}`}>
                    {rateMeta.label}
                  </span>
                  <Tooltip content={rateMeta.tooltip} position="left">
                    <span />
                  </Tooltip>
                </div>
                {active && (
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <CurrencyInput
                      label="Rate"
                      unit={rateMeta.unit}
                      value={currentVal}
                      range={regionRate}
                      dark={dark}
                      currencySymbol={sym}
                      onChange={v => dispatch({ type: 'SET_LINE_ITEM', rateKey, field: 'value', value: v, rateMeta, regionRate })}
                    />
                    <div className="flex flex-col gap-1">
                      <label className={labelCls}>Quantity</label>
                      <input
                        type="number"
                        min={0}
                        value={qty}
                        onChange={e => dispatch({ type: 'SET_LINE_ITEM', rateKey, field: 'quantity', value: parseFloat(e.target.value) || 1, rateMeta, regionRate })}
                        className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all ${inputCls}`}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Custom line item */}
          <button
            type="button"
            onClick={() => dispatch({ type: 'ADD_CUSTOM_LINE' })}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed text-sm transition-colors ${
              dark ? 'border-charcoal-600 text-charcoal-400 hover:border-gold-500/50 hover:text-gold-400' : 'border-gray-300 text-gray-400 hover:border-gold-500/50 hover:text-gold-500'
            }`}
          >
            <Plus size={14} /> Add Custom Line Item
          </button>

          {lineItems.filter(l => l.isCustom).map((item, idx) => (
            <div key={item.id} className={`rounded-xl border p-3 ${dark ? 'border-charcoal-700 bg-charcoal-900/60' : 'border-gray-200 bg-white'}`}>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Description"
                  value={item.label || ''}
                  onChange={e => dispatch({ type: 'SET_CUSTOM_LINE', id: item.id, field: 'label', value: e.target.value })}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border outline-none transition-all ${inputCls}`}
                />
                <button type="button" onClick={() => dispatch({ type: 'REMOVE_CUSTOM_LINE', id: item.id })}
                  className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <CurrencyInput label="Rate" value={item.value} dark={dark} currencySymbol={sym}
                  onChange={v => dispatch({ type: 'SET_CUSTOM_LINE', id: item.id, field: 'value', value: v })} />
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Quantity</label>
                  <input type="number" min={0} value={item.quantity || 1}
                    onChange={e => dispatch({ type: 'SET_CUSTOM_LINE', id: item.id, field: 'quantity', value: parseFloat(e.target.value) || 1 })}
                    className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all ${inputCls}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Equipment ─── */}
      <SectionHeader title="Equipment & Gear" open={sections.equipment} onToggle={() => toggleSection('equipment')} dark={dark} />
      {sections.equipment && (
        <div className="py-3 space-y-2">
          {EQUIPMENT_ITEMS.map(eq => {
            const item = equipment.find(e => e.id === eq.id);
            const active = item?.active ?? false;
            const price = item?.price ?? eq.defaultPrice;
            const days = item?.days ?? 1;
            return (
              <div key={eq.id} className={`rounded-xl border px-3 py-2.5 transition-all ${
                active
                  ? dark ? 'border-teal-500/40 bg-charcoal-900/60' : 'border-teal-500/40 bg-teal-50/30'
                  : dark ? 'border-charcoal-700 opacity-60' : 'border-gray-200 opacity-60'
              }`}>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={active}
                    onChange={e => dispatch({ type: 'SET_EQUIPMENT', id: eq.id, field: 'active', value: e.target.checked, defaultPrice: eq.defaultPrice })}
                    className="accent-teal-400 w-4 h-4 cursor-pointer" />
                  <span className="text-sm">{eq.icon}</span>
                  <span className={`flex-1 text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>{eq.label}</span>
                  {active && (
                    <div className="flex items-center gap-2">
                      <div className="relative flex items-center">
                        <span className={`absolute left-2 text-xs pointer-events-none ${dark ? 'text-charcoal-400' : 'text-gray-400'}`}>{sym}</span>
                        <input type="number" min={0} value={price}
                          onChange={e => dispatch({ type: 'SET_EQUIPMENT', id: eq.id, field: 'price', value: parseFloat(e.target.value) || 0 })}
                          className={`w-24 pl-5 pr-2 py-1.5 text-sm rounded-lg border outline-none transition-all ${inputCls}`} />
                      </div>
                      <input type="number" min={1} value={days}
                        onChange={e => dispatch({ type: 'SET_EQUIPMENT', id: eq.id, field: 'days', value: parseInt(e.target.value) || 1 })}
                        className={`w-14 px-2 py-1.5 text-sm rounded-lg border outline-none transition-all text-center ${inputCls}`} />
                      <span className={`text-xs shrink-0 ${dark ? 'text-charcoal-400' : 'text-gray-400'}`}>days</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Travel ─── */}
      <SectionHeader title="Travel" open={sections.travel} onToggle={() => toggleSection('travel')} dark={dark} />
      {sections.travel && (
        <div className="py-3 space-y-3">
          <div className="flex gap-2">
            {['mileage', 'flat', 'none'].map(t => (
              <button key={t} type="button"
                onClick={() => dispatch({ type: 'SET_FIELD', field: 'travelType', value: t })}
                className={`flex-1 py-2 text-sm rounded-xl border font-medium transition-all ${
                  travelType === t
                    ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                    : dark ? 'border-charcoal-600 text-charcoal-400 hover:border-charcoal-500' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {t === 'mileage' ? '🚗 Mileage' : t === 'flat' ? '💵 Flat Fee' : '✕ None'}
              </button>
            ))}
          </div>
          {travelType === 'mileage' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Miles</label>
                <input type="number" min={0} value={travelMiles || ''}
                  onChange={e => dispatch({ type: 'SET_FIELD', field: 'travelMiles', value: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all ${inputCls}`} />
              </div>
              <CurrencyInput label="Rate per mile" value={travelMileRate || 0.67} dark={dark} currencySymbol={sym}
                onChange={v => dispatch({ type: 'SET_FIELD', field: 'travelMileRate', value: v })} />
            </div>
          )}
          {travelType === 'flat' && (
            <CurrencyInput label="Flat travel fee" value={travelFee || 0} dark={dark} currencySymbol={sym}
              onChange={v => dispatch({ type: 'SET_FIELD', field: 'travelFee', value: v })} />
          )}
        </div>
      )}

      {/* ── Crew ─── */}
      <SectionHeader title="Crew & Location" open={sections.crew} onToggle={() => toggleSection('crew')} dark={dark} />
      {sections.crew && (
        <div className="py-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Assistants / 2nd Shooters</label>
              <input type="number" min={0} value={assistants || ''}
                onChange={e => dispatch({ type: 'SET_FIELD', field: 'assistants', value: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all ${inputCls}`} />
            </div>
            <CurrencyInput label="Rate per person/day" value={assistantRate || 0} dark={dark} currencySymbol={sym}
              onChange={v => dispatch({ type: 'SET_FIELD', field: 'assistantRate', value: v })} />
          </div>
          <CurrencyInput label="Location / Permit Fee (flat)" value={locationFee || 0} dark={dark} currencySymbol={sym}
            onChange={v => dispatch({ type: 'SET_FIELD', field: 'locationFee', value: v })} />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Revisions included</label>
              <input type="number" min={0} value={revisions ?? 2}
                onChange={e => dispatch({ type: 'SET_FIELD', field: 'revisions', value: parseInt(e.target.value) || 0 })}
                className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all ${inputCls}`} />
            </div>
            <CurrencyInput label="Cost per extra revision" value={additionalRevisionRate || 0} dark={dark} currencySymbol={sym}
              onChange={v => dispatch({ type: 'SET_FIELD', field: 'additionalRevisionRate', value: v })} />
          </div>
        </div>
      )}

      {/* ── Turnaround ─── */}
      <SectionHeader title="Turnaround" open={sections.turnaround} onToggle={() => toggleSection('turnaround')} dark={dark} />
      {sections.turnaround && (
        <div className="py-3 space-y-2">
          {TURNAROUND_OPTIONS.map(opt => (
            <button key={opt.id} type="button"
              onClick={() => dispatch({ type: 'SET_FIELD', field: 'turnaround', value: opt.id })}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left text-sm transition-all ${
                turnaround === opt.id
                  ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                  : dark ? 'border-charcoal-700 text-charcoal-300 hover:border-charcoal-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <div>
                <span className="font-medium">{opt.label}</span>
                <span className={`ml-2 text-xs ${dark ? 'text-charcoal-400' : 'text-gray-400'}`}>{opt.days}</span>
              </div>
              <span className={`text-xs font-semibold ${turnaround === opt.id ? 'text-gold-400' : dark ? 'text-charcoal-400' : 'text-gray-400'}`}>
                {opt.description}
              </span>
            </button>
          ))}
          {turnaround === 'custom' && (
            <div className="flex flex-col gap-1 mt-2">
              <label className={labelCls}>Custom rush % (added to subtotal)</label>
              <div className="relative flex items-center">
                <input type="number" min={0} max={200} value={customTurnaroundPct || ''}
                  onChange={e => dispatch({ type: 'SET_FIELD', field: 'customTurnaroundPct', value: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className={`w-full pl-3 pr-8 py-2 text-sm rounded-lg border outline-none transition-all ${inputCls}`} />
                <span className={`absolute right-3 text-xs pointer-events-none ${dark ? 'text-charcoal-400' : 'text-gray-400'}`}>%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Licensing ─── */}
      <SectionHeader title="Licensing / Usage Rights" open={sections.licensing} onToggle={() => toggleSection('licensing')} dark={dark} />
      {sections.licensing && (
        <div className="py-3 space-y-2">
          {LICENSING_OPTIONS.map(opt => (
            <button key={opt.id} type="button"
              onClick={() => dispatch({ type: 'SET_FIELD', field: 'licensingId', value: opt.id })}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left text-sm transition-all ${
                licensingId === opt.id
                  ? 'border-teal-500/60 bg-teal-500/10 text-teal-400'
                  : dark ? 'border-charcoal-700 text-charcoal-300 hover:border-charcoal-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <div>
                <span className="font-medium">{opt.label}</span>
                <span className={`ml-2 text-xs ${dark ? 'text-charcoal-400' : 'text-gray-400'}`}>{opt.description}</span>
              </div>
              <span className={`text-xs font-bold ${licensingId === opt.id ? 'text-teal-400' : dark ? 'text-charcoal-500' : 'text-gray-400'}`}>
                ×{opt.multiplier.toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Tax ─── */}
      <SectionHeader title="Tax" open={sections.tax} onToggle={() => toggleSection('tax')} dark={dark} />
      {sections.tax && (
        <div className="py-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-sm ${dark ? 'text-charcoal-300' : 'text-gray-600'}`}>Apply sales tax / VAT</span>
            <button type="button"
              onClick={() => dispatch({ type: 'SET_FIELD', field: 'taxEnabled', value: !taxEnabled })}
              className={`relative w-10 h-5 rounded-full transition-colors ${taxEnabled ? 'bg-gold-500' : dark ? 'bg-charcoal-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${taxEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {taxEnabled && (
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Tax rate (%)</label>
              <div className="relative flex items-center">
                <input type="number" min={0} max={50} step={0.1} value={taxRate || ''}
                  onChange={e => dispatch({ type: 'SET_FIELD', field: 'taxRate', value: parseFloat(e.target.value) || 0 })}
                  placeholder="8.5"
                  className={`w-full pl-3 pr-8 py-2 text-sm rounded-lg border outline-none transition-all ${inputCls}`} />
                <span className={`absolute right-3 text-xs pointer-events-none ${dark ? 'text-charcoal-400' : 'text-gray-400'}`}>%</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
