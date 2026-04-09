import { useState } from 'react';
import { ArrowRight, ArrowLeft, Zap } from 'lucide-react';
import { SERVICES, PACKAGE_TIERS, RATES } from '../data/rates.js';
import { REGIONS } from '../data/regions.js';
import { getRate, formatCurrency } from '../utils/pricing.js';
import { RegionSelector } from './RegionSelector.jsx';

const STEPS = ['Service', 'Options', 'Quote'];

export function QuickQuoteMode({ dark = true, onFullMode }) {
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState(null);
  const [regionKey, setRegionKey] = useState('us-tier1');
  const [tier, setTier] = useState('standard');
  const [currency] = useState('USD');

  const service = SERVICES[serviceId];
  const tiers = serviceId ? PACKAGE_TIERS[serviceId] : null;
  const region = REGIONS[regionKey];
  const serviceRates = serviceId ? RATES[serviceId] : null;

  const calcTotal = () => {
    if (!tiers || !tier || !serviceRates) return 0;
    const tierDef = tiers[tier];
    if (!tierDef) return 0;
    return (tierDef.items || []).reduce((sum, item) => {
      const range = getRate(serviceId, item.rateKey, regionKey);
      if (!range) return sum;
      return sum + range.mid * item.quantity;
    }, 0);
  };

  const total = calcTotal();
  const fmt = (v) => formatCurrency(v, currency);

  const bg = dark ? 'bg-charcoal-900' : 'bg-gray-50';
  const card = dark ? 'bg-charcoal-800 border-charcoal-700' : 'bg-white border-gray-200';
  const textMain = dark ? 'text-white' : 'text-gray-900';
  const textSub = dark ? 'text-charcoal-400' : 'text-gray-500';

  const canNext = (step === 0 && serviceId) || (step === 1 && regionKey) || step === 2;

  return (
    <div className={`min-h-screen ${bg} flex flex-col`}>
      {/* Header */}
      <div className={`px-4 py-4 border-b ${dark ? 'border-charcoal-700' : 'border-gray-200'} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-gold-400" />
          <span className={`font-display font-bold text-sm ${textMain}`}>Quick Quote</span>
        </div>
        <button type="button" onClick={onFullMode} className={`text-xs ${textSub} hover:text-gold-400 transition-colors`}>
          Full Rate Calculator →
        </button>
      </div>

      {/* Progress */}
      <div className="px-4 py-3 flex gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
              i < step ? 'bg-teal-400 text-charcoal-900' :
              i === step ? 'bg-gold-500 text-charcoal-900' :
              dark ? 'bg-charcoal-700 text-charcoal-500' : 'bg-gray-200 text-gray-400'
            }`}>{i < step ? '✓' : i + 1}</div>
            <span className={`text-xs font-medium ${i === step ? 'text-gold-400' : textSub}`}>{s}</span>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px ${i < step ? 'bg-teal-400/50' : dark ? 'bg-charcoal-700' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">

        {/* Step 0: Service */}
        {step === 0 && (
          <div className="space-y-3 animate-fade-in">
            <h2 className={`font-display font-bold text-xl ${textMain}`}>What are you quoting?</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(SERVICES).map(svc => (
                <button key={svc.id} type="button" onClick={() => setServiceId(svc.id)}
                  className={`flex flex-col items-start gap-2 p-4 rounded-2xl border text-left transition-all ${
                    serviceId === svc.id
                      ? 'border-gold-500 bg-gold-500/10'
                      : dark ? 'border-charcoal-700 bg-charcoal-800' : 'border-gray-200 bg-white'
                  }`}
                >
                  <span className="text-2xl">{svc.icon}</span>
                  <span className={`text-sm font-semibold ${serviceId === svc.id ? 'text-gold-400' : textMain}`}>{svc.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Options */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className={`font-display font-bold text-xl ${textMain}`}>Where & what package?</h2>

            <div>
              <p className={`text-xs font-medium mb-2 ${textSub}`}>Region</p>
              <RegionSelector value={regionKey} onChange={setRegionKey} dark={dark} />
            </div>

            {tiers && (
              <div>
                <p className={`text-xs font-medium mb-2 ${textSub}`}>Package</p>
                <div className="space-y-2">
                  {Object.entries(tiers).map(([key, def]) => {
                    const t = calcTotal.call({ tier: key });
                    const tierTotal = (() => {
                      const sRates = RATES[serviceId];
                      if (!sRates) return 0;
                      return (def.items || []).reduce((sum, item) => {
                        const range = getRate(serviceId, item.rateKey, regionKey);
                        if (!range) return sum;
                        return sum + range.mid * item.quantity;
                      }, 0);
                    })();

                    return (
                      <button key={key} type="button" onClick={() => setTier(key)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                          tier === key
                            ? 'border-gold-500 bg-gold-500/10'
                            : dark ? 'border-charcoal-700 bg-charcoal-800' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div>
                          <p className={`text-sm font-bold ${tier === key ? 'text-gold-400' : textMain}`}>{def.name}</p>
                          <p className={`text-xs ${textSub}`}>{def.description}</p>
                        </div>
                        <p className={`text-sm font-bold ${tier === key ? 'text-gold-400' : textMain}`}>{fmt(tierTotal)}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Quote */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className={`font-display font-bold text-xl ${textMain}`}>Your Estimate</h2>

            <div className={`rounded-2xl border p-5 ${card}`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{service?.icon}</span>
                <div>
                  <p className={`text-xs ${textSub}`}>{region?.flag} {region?.name}</p>
                  <p className={`font-bold ${textMain}`}>{service?.name} — {tiers?.[tier]?.name}</p>
                </div>
              </div>

              <div className={`rounded-xl p-4 mb-4 ${dark ? 'bg-charcoal-900/60' : 'bg-gray-50'}`}>
                <p className={`text-xs uppercase tracking-wider ${textSub}`}>Estimated Total</p>
                <p className="font-display text-4xl font-bold text-gradient-gold mt-1">{fmt(total)}</p>
                <p className={`text-xs mt-1 ${textSub}`}>Based on market mid rates for {region?.name}</p>
              </div>

              <ul className="space-y-1.5 mb-4">
                {tiers?.[tier]?.includes?.map((inc, i) => (
                  <li key={i} className={`text-sm flex gap-2 ${dark ? 'text-charcoal-300' : 'text-gray-600'}`}>
                    <span className="text-teal-400">✓</span> {inc}
                  </li>
                ))}
              </ul>

              <p className={`text-xs ${textSub}`}>This is a market-rate estimate. Use the Rate Calculator to customize and export a PDF quote.</p>
            </div>

            <button type="button" onClick={onFullMode}
              className="w-full py-3 rounded-xl bg-gold-500 hover:bg-gold-600 text-charcoal-900 font-bold text-sm transition-all">
              Customize in Rate Calculator →
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className={`px-4 py-4 border-t ${dark ? 'border-charcoal-700' : 'border-gray-200'} flex gap-3`}>
        {step > 0 && (
          <button type="button" onClick={() => setStep(s => s - 1)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${dark ? 'border-charcoal-600 text-charcoal-300' : 'border-gray-200 text-gray-600'} text-sm font-medium transition-all`}>
            <ArrowLeft size={14} /> Back
          </button>
        )}
        {step < 2 && (
          <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canNext}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-charcoal-900 text-sm font-bold disabled:opacity-40 transition-all">
            Next <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
