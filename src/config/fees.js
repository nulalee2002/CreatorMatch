export const PLATFORM_FEES = {
  creatorFeePct:     10,   // 10% taken from creator's earnings
  clientFeePct:       5,   // 5% added on top of client's payment
  retainerPct:       50,   // 50% retainer upfront, 50% on delivery
  autoApproveDays:    7,   // Days before auto-approval if client does not respond
  cancellationFeePct: 10,  // Creator keeps 10% if client cancels after retainer paid
};

/**
 * Calculate all fee amounts for a given project total (in dollars).
 * Returns amounts in both dollars and cents.
 */
export function calcFees(projectAmountDollars) {
  const total      = Number(projectAmountDollars) || 0;
  const retainer   = total * (PLATFORM_FEES.retainerPct / 100);
  const final      = total - retainer;

  const clientFeeRetainer  = retainer  * (PLATFORM_FEES.clientFeePct  / 100);
  const clientFeeFinal     = final     * (PLATFORM_FEES.clientFeePct  / 100);
  const creatorFeeRetainer = retainer  * (PLATFORM_FEES.creatorFeePct / 100);
  const creatorFeeFinal    = final     * (PLATFORM_FEES.creatorFeePct / 100);

  return {
    // Dollar amounts (for display)
    projectTotal:          total,
    retainerAmount:        retainer,
    finalAmount:           final,
    clientFeeRetainer,
    clientFeeFinal,
    creatorFeeRetainer,
    creatorFeeFinal,
    retainerClientOwes:    retainer + clientFeeRetainer,
    finalClientOwes:       final    + clientFeeFinal,
    retainerCreatorGets:   retainer - creatorFeeRetainer,
    finalCreatorGets:      final    - creatorFeeFinal,
    totalClientPays:       total + clientFeeRetainer + clientFeeFinal,
    totalCreatorReceives:  total - creatorFeeRetainer - creatorFeeFinal,
    platformRevenue:       clientFeeRetainer + clientFeeFinal + creatorFeeRetainer + creatorFeeFinal,

    // Cent amounts (for Stripe — always integers)
    retainerAmountCents:       Math.round(retainer   * 100),
    finalAmountCents:          Math.round(final       * 100),
    retainerClientOwesCents:   Math.round((retainer + clientFeeRetainer)  * 100),
    finalClientOwesCents:      Math.round((final    + clientFeeFinal)     * 100),
    creatorFeeRetainerCents:   Math.round(creatorFeeRetainer * 100),
    creatorFeeFinalCents:      Math.round(creatorFeeFinal    * 100),
    clientFeeRetainerCents:    Math.round(clientFeeRetainer  * 100),
    clientFeeFinalCents:       Math.round(clientFeeFinal     * 100),
    // application_fee_amount = what the platform keeps from each payment
    retainerAppFeeCents:       Math.round((clientFeeRetainer + creatorFeeRetainer) * 100),
    finalAppFeeCents:          Math.round((clientFeeFinal    + creatorFeeFinal)    * 100),
  };
}

/** Format cents to dollar string: 150000 -> "$1,500.00" */
export function centsToDisplay(cents) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Format dollars to display string */
export function dollarsToDisplay(dollars) {
  return `$${Number(dollars).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Project status labels and badge colors */
export const PROJECT_STATUSES = {
  open:             { label: 'Open',                   color: 'teal'   },
  accepted:         { label: 'Awaiting Retainer',       color: 'gold'   },
  retainer_paid:    { label: 'Retainer Secured',        color: 'teal'   },
  in_progress:      { label: 'In Progress',             color: 'blue'   },
  delivered:        { label: 'Delivered, Awaiting Review', color: 'amber' },
  revision:         { label: 'Revision Requested',      color: 'amber'  },
  approved:         { label: 'Approved',                color: 'green'  },
  final_paid:       { label: 'Payment Released',        color: 'green'  },
  completed:        { label: 'Completed',               color: 'green'  },
  disputed:         { label: 'Disputed',                color: 'red'    },
  cancelled:        { label: 'Cancelled',               color: 'gray'   },
};

export function statusBadgeClass(status, dark) {
  const colorMap = {
    gold:  'bg-gold-500/15 text-gold-400',
    teal:  'bg-teal-500/15 text-teal-400',
    blue:  'bg-blue-500/15 text-blue-400',
    amber: 'bg-amber-500/15 text-amber-400',
    green: 'bg-green-500/15 text-green-400',
    red:   'bg-red-500/15 text-red-400',
    gray:  dark ? 'bg-charcoal-700/50 text-charcoal-400' : 'bg-gray-100 text-gray-500',
  };
  const s = PROJECT_STATUSES[status];
  return s ? colorMap[s.color] : colorMap.gray;
}
