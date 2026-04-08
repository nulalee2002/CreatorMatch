import { Check } from 'lucide-react';
import { PROJECT_STATUSES } from '../config/fees.js';

const TIMELINE_STEPS = [
  { key: 'open',          label: 'Posted'          },
  { key: 'accepted',      label: 'Accepted'        },
  { key: 'retainer_paid', label: 'Retainer Paid'   },
  { key: 'in_progress',   label: 'In Progress'     },
  { key: 'delivered',     label: 'Delivered'       },
  { key: 'approved',      label: 'Approved'        },
  { key: 'final_paid',    label: 'Payment Released' },
  { key: 'completed',     label: 'Completed'       },
];

const STATUS_ORDER = TIMELINE_STEPS.map(s => s.key);

// Revision and disputed are offshoots, not linear — handled separately
function getStepIndex(status) {
  const idx = STATUS_ORDER.indexOf(status);
  if (idx !== -1) return idx;
  // Map offshoots to nearest linear step
  if (status === 'revision') return STATUS_ORDER.indexOf('delivered');
  if (status === 'disputed') return STATUS_ORDER.indexOf('delivered');
  return 0;
}

/**
 * ProjectTimeline
 * Props:
 *   status — current project status string
 *   dark   — boolean
 */
export function ProjectTimeline({ status, dark }) {
  const currentIdx = getStepIndex(status);
  const textSub = dark ? 'text-charcoal-500' : 'text-gray-400';

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-start min-w-max gap-0 py-2">
        {TIMELINE_STEPS.map((step, i) => {
          const done    = i < currentIdx;
          const active  = i === currentIdx;
          const special = (status === 'revision' || status === 'disputed') && i === currentIdx;

          return (
            <div key={step.key} className="flex items-center">
              {/* Step circle + label */}
              <div className="flex flex-col items-center" style={{ minWidth: 64 }}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  done
                    ? 'bg-teal-500 text-white'
                    : active && status === 'disputed'
                    ? 'bg-red-500 text-white'
                    : active && status === 'revision'
                    ? 'bg-amber-500 text-charcoal-900'
                    : active
                    ? 'bg-gold-500 text-charcoal-900 ring-4 ring-gold-500/20 animate-pulse'
                    : dark ? 'bg-charcoal-700 text-charcoal-500' : 'bg-gray-200 text-gray-400'
                }`}>
                  {done ? <Check size={12} strokeWidth={3} /> : i + 1}
                </div>
                <span className={`text-[9px] mt-1 font-medium text-center leading-tight max-w-[60px] ${
                  active ? (dark ? 'text-white' : 'text-gray-900')
                  : done ? 'text-teal-400'
                  : textSub
                }`}>
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {i < TIMELINE_STEPS.length - 1 && (
                <div className={`h-px w-8 mx-1 mb-4 transition-all ${
                  i < currentIdx ? 'bg-teal-500' : dark ? 'bg-charcoal-700' : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Offshoot badge for revision/dispute */}
      {(status === 'revision' || status === 'disputed') && (
        <div className={`mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
          status === 'disputed'
            ? 'bg-red-500/15 text-red-400'
            : 'bg-amber-500/15 text-amber-400'
        }`}>
          {status === 'disputed' ? 'Under Dispute' : 'Revision Requested'}
        </div>
      )}
    </div>
  );
}
