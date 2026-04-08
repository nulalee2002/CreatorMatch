import { useState } from 'react';
import { Plus, Trash2, Check, GripVertical, Package } from 'lucide-react';
import { SERVICES } from '../data/rates.js';

const PACKAGE_TEMPLATES = {
  Basic:    { color: 'text-charcoal-400', bg: 'bg-charcoal-700/50', border: 'border-charcoal-600' },
  Standard: { color: 'text-gold-400',     bg: 'bg-gold-500/10',     border: 'border-gold-500/40' },
  Premium:  { color: 'text-purple-400',   bg: 'bg-purple-500/10',   border: 'border-purple-500/40' },
};

function loadPackages(creatorId) {
  try { return JSON.parse(localStorage.getItem(`creator-packages-${creatorId}`) || '[]'); } catch { return []; }
}
function savePackages(creatorId, pkgs) {
  localStorage.setItem(`creator-packages-${creatorId}`, JSON.stringify(pkgs));
}

function newPackage(name = 'Basic', serviceId = 'photography') {
  return {
    id: Date.now().toString() + Math.random(),
    name,
    serviceId,
    price: '',
    description: '',
    deliverables: [''],
    turnaroundDays: '',
    revisions: 1,
  };
}

export function PackageBuilder({ creatorId, dark, serviceIds = [] }) {
  const [packages, setPackages] = useState(() => {
    const saved = loadPackages(creatorId);
    if (saved.length > 0) return saved;
    // Default 3 packages
    return ['Basic', 'Standard', 'Premium'].map(name =>
      newPackage(name, serviceIds[0] || 'photography')
    );
  });
  const [saved, setSaved] = useState(false);

  const inputCls = `w-full px-3 py-2 text-sm rounded-xl border outline-none transition-all ${
    dark
      ? 'bg-charcoal-900 border-charcoal-600 text-white placeholder-charcoal-500 focus:border-gold-500'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gold-500'
  }`;
  const textSub = dark ? 'text-charcoal-400' : 'text-gray-500';

  function updatePkg(id, field, val) {
    setPackages(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p));
    setSaved(false);
  }

  function updateDeliverable(pkgId, idx, val) {
    setPackages(prev => prev.map(p => {
      if (p.id !== pkgId) return p;
      const d = [...p.deliverables];
      d[idx] = val;
      return { ...p, deliverables: d };
    }));
    setSaved(false);
  }

  function addDeliverable(pkgId) {
    setPackages(prev => prev.map(p =>
      p.id === pkgId ? { ...p, deliverables: [...p.deliverables, ''] } : p
    ));
  }

  function removeDeliverable(pkgId, idx) {
    setPackages(prev => prev.map(p =>
      p.id === pkgId ? { ...p, deliverables: p.deliverables.filter((_, i) => i !== idx) } : p
    ));
    setSaved(false);
  }

  function addPackage() {
    setPackages(prev => [...prev, newPackage(`Package ${prev.length + 1}`, serviceIds[0] || 'photography')]);
    setSaved(false);
  }

  function removePackage(id) {
    setPackages(prev => prev.filter(p => p.id !== id));
    setSaved(false);
  }

  function handleSave() {
    const clean = packages.map(p => ({
      ...p,
      price: parseFloat(p.price) || 0,
      turnaroundDays: parseInt(p.turnaroundDays) || null,
      revisions: parseInt(p.revisions) || 1,
      deliverables: p.deliverables.filter(d => d.trim()),
    }));
    savePackages(creatorId, clean);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className={`rounded-2xl border p-5 ${dark ? 'bg-charcoal-800 border-charcoal-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className={`font-display font-bold text-base flex items-center gap-2 ${dark ? 'text-white' : 'text-gray-900'}`}>
            <Package size={15} className="text-gold-400" /> Package Builder
          </h3>
          <p className={`text-[11px] mt-0.5 ${textSub}`}>
            Create tiered packages clients can choose from
          </p>
        </div>
        <button type="button" onClick={handleSave}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            saved ? 'bg-teal-500 text-white' : 'bg-gold-500 hover:bg-gold-600 text-charcoal-900'
          }`}>
          {saved ? <><Check size={12} /> Saved</> : 'Save Packages'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {packages.map((pkg, pIdx) => {
          const template = PACKAGE_TEMPLATES[pkg.name] || PACKAGE_TEMPLATES.Basic;
          return (
            <div key={pkg.id} className={`rounded-2xl border p-4 ${template.border} ${template.bg}`}>
              {/* Package header */}
              <div className="flex items-center justify-between mb-3">
                <input
                  type="text"
                  value={pkg.name}
                  onChange={e => updatePkg(pkg.id, 'name', e.target.value)}
                  className={`font-display font-bold text-sm bg-transparent border-none outline-none w-full ${template.color}`}
                  placeholder="Package name"
                />
                <button type="button" onClick={() => removePackage(pkg.id)}
                  className={`shrink-0 ml-2 p-1 rounded-lg transition-colors text-red-400 hover:bg-red-400/10`}>
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Service type */}
              {serviceIds.length > 1 && (
                <div className="mb-3">
                  <p className={`text-[10px] font-medium mb-1 ${textSub}`}>Service</p>
                  <select value={pkg.serviceId} onChange={e => updatePkg(pkg.id, 'serviceId', e.target.value)}
                    className={`${inputCls} text-xs`}>
                    {serviceIds.map(sid => (
                      <option key={sid} value={sid}>{SERVICES[sid]?.icon} {SERVICES[sid]?.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Price */}
              <div className="mb-3">
                <p className={`text-[10px] font-medium mb-1 ${textSub}`}>Price *</p>
                <div className="relative">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none ${textSub}`}>$</span>
                  <input type="number" min={0} value={pkg.price}
                    onChange={e => updatePkg(pkg.id, 'price', e.target.value)}
                    placeholder="0"
                    className={`${inputCls} pl-7`} />
                </div>
              </div>

              {/* Description */}
              <div className="mb-3">
                <p className={`text-[10px] font-medium mb-1 ${textSub}`}>Description</p>
                <textarea value={pkg.description} rows={2}
                  onChange={e => updatePkg(pkg.id, 'description', e.target.value)}
                  placeholder="What's included in this package..."
                  className={`${inputCls} resize-none text-xs`} />
              </div>

              {/* Deliverables */}
              <div className="mb-3">
                <p className={`text-[10px] font-medium mb-1.5 ${textSub}`}>What's Included</p>
                <div className="space-y-1.5">
                  {pkg.deliverables.map((d, dIdx) => (
                    <div key={dIdx} className="flex items-center gap-1.5">
                      <Check size={10} className="text-teal-400 shrink-0" />
                      <input type="text" value={d}
                        onChange={e => updateDeliverable(pkg.id, dIdx, e.target.value)}
                        placeholder="e.g. 10 edited photos"
                        className={`flex-1 px-2 py-1.5 text-xs rounded-lg border outline-none transition-all ${
                          dark ? 'bg-charcoal-900 border-charcoal-600 text-white placeholder-charcoal-600 focus:border-gold-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gold-500'
                        }`} />
                      {pkg.deliverables.length > 1 && (
                        <button type="button" onClick={() => removeDeliverable(pkg.id, dIdx)}
                          className="text-red-400/60 hover:text-red-400 transition-colors shrink-0">
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => addDeliverable(pkg.id)}
                    className={`text-[10px] flex items-center gap-1 mt-1 transition-colors ${dark ? 'text-charcoal-500 hover:text-gold-400' : 'text-gray-400 hover:text-gold-500'}`}>
                    <Plus size={10} /> Add item
                  </button>
                </div>
              </div>

              {/* Turnaround + Revisions */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className={`text-[10px] font-medium mb-1 ${textSub}`}>Delivery (days)</p>
                  <input type="number" min={1} value={pkg.turnaroundDays}
                    onChange={e => updatePkg(pkg.id, 'turnaroundDays', e.target.value)}
                    placeholder="7"
                    className={`${inputCls} text-xs`} />
                </div>
                <div>
                  <p className={`text-[10px] font-medium mb-1 ${textSub}`}>Revisions</p>
                  <input type="number" min={0} value={pkg.revisions}
                    onChange={e => updatePkg(pkg.id, 'revisions', e.target.value)}
                    className={`${inputCls} text-xs`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {packages.length < 5 && (
        <button type="button" onClick={addPackage}
          className={`mt-4 w-full py-2.5 rounded-xl border-2 border-dashed text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            dark ? 'border-charcoal-600 text-charcoal-400 hover:border-gold-500/50 hover:text-gold-400' : 'border-gray-300 text-gray-500 hover:border-gold-500/50 hover:text-gold-500'
          }`}>
          <Plus size={13} /> Add Package
        </button>
      )}
    </div>
  );
}
