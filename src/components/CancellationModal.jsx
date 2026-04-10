import { useState } from 'react';
import { X, AlertTriangle, DollarSign, ChevronRight } from 'lucide-react';
import { getCancellationFee, CANCELLATION_FEES } from '../config/fees.js';

const STAGE_LABELS = {
  before_acceptance: 'Before creator acceptance',
  after_acceptance:  'After acceptance, before retainer',
  after_retainer:    'After retainer paid, before work started',
  work_in_progress:  'Work in progress',
  after_delivery:    'After work delivered',
};

/**
 * CancellationModal — shown when a client wants to cancel a project.
 * Props: project, dark, onClose, onConfirm(project)
 */
export function CancellationModal({ project, dark, onClose, onConfirm }) {
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason]       = useState('');

  const projectTotal = Number(project?.budgetMax || project?.budgetMin || 0);
  const { stage, feePct, creatorKeepsDollars, clientRefundDollars } = getCancellationFee(projectTotal, project?.status);

  const inputCls = `w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all ${
    dark ? 'bg-charcoal-900 border-charcoal-600 text-white placeholder-charcoal-500 focus:border-gold-500'
         : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gold-500'
  }`;

  const stageEntries = Object.entries(CANCELLATION_FEES);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl ${dark ? 'bg-charcoal-900 border-charcoal-700' : 'bg-white border-gray-200'}`}>
        <button type="button" onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-lg ${dark ? 'text-charcoal-400 hover:text-white hover:bg-charcoal-700' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
          <X size={16} />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <div>
              <h3 className={`font-display font-bold text-base ${dark ? 'text-white' : 'text-gray-900'}`}>Cancel Project</h3>
              <p className={`text-xs ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>{project?.title}</p>
            </div>
          </div>

          {/* Fee breakdown */}
          <div className={`rounded-xl border p-4 mb-4 ${dark ? 'bg-charcoal-800 border-charcoal-700' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider mb-3 ${dark ? 'text-charcoal-500' : 'text-gray-400'}`}>
              Cancellation Fee Schedule
            </p>

            <div className="space-y-1.5 mb-4">
              {stageEntries.map(([s, pct]) => (
                <div key={s} className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition-all ${
                  s === stage
                    ? dark ? 'bg-red-500/15 border border-red-500/30' : 'bg-red-50 border border-red-200'
                    : ''
                }`}>
                  <div className="flex items-center gap-2">
                    {s === stage && <ChevronRight size={10} className="text-red-400 shrink-0" />}
                    <span className={`text-xs ${s === stage ? 'text-red-400 font-semibold' : dark ? 'text-charcoal-400' : 'text-gray-500'}`}>
                      {STAGE_LABELS[s]}
                    </span>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${
                    s === stage ? 'text-red-400' : pct === 0 ? 'text-teal-400' : dark ? 'text-charcoal-300' : 'text-gray-700'
                  }`}>
                    {pct === 0 ? 'Full refund' : `Creator keeps ${pct}%`}
                  </span>
                </div>
              ))}
            </div>

            {/* Current outcome */}
            {projectTotal > 0 ? (
              <div className={`rounded-lg p-3 ${dark ? 'bg-charcoal-700' : 'bg-white border border-gray-200'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>Creator retains ({feePct}%)</span>
                  <span className={`text-sm font-bold text-red-400`}>${creatorKeepsDollars.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-xs ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>Your refund</span>
                  <span className={`text-sm font-bold text-teal-400`}>${clientRefundDollars.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
                </div>
              </div>
            ) : (
              <p className={`text-xs ${dark ? 'text-charcoal-500' : 'text-gray-400'} italic`}>
                Final amounts calculated at payment time.
              </p>
            )}
          </div>

          {/* Reason */}
          <div className="mb-5">
            <label className={`text-xs font-medium block mb-1.5 ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>
              Reason for cancellation (optional)
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Let the creator know why you're cancelling..."
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Warning */}
          <div className={`flex items-start gap-2 p-3 rounded-xl mb-5 ${dark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
            <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
            <p className={`text-xs leading-snug ${dark ? 'text-amber-300' : 'text-amber-700'}`}>
              Cancellations are final. Repeated cancellations may affect your account standing on CreatorMatch.
            </p>
          </div>

          {/* Confirm checkbox */}
          <label className="flex items-start gap-2 mb-5 cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
              className="mt-0.5 accent-gold-500" />
            <span className={`text-xs leading-snug ${dark ? 'text-charcoal-300' : 'text-gray-600'}`}>
              I understand the cancellation fee schedule and confirm I want to cancel this project.
            </span>
          </label>

          {/* Actions */}
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${dark ? 'border-charcoal-600 text-charcoal-300 hover:text-white' : 'border-gray-200 text-gray-600 hover:text-gray-900'}`}>
              Keep Project
            </button>
            <button type="button"
              disabled={!confirmed}
              onClick={() => onConfirm?.(project, reason)}
              className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white text-sm font-bold transition-all">
              Cancel Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
