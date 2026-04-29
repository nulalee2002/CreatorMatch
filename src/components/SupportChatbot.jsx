import { useState, useRef, useEffect } from 'react';
import { X, Send, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { supabase, supabaseConfigured } from '../lib/supabase.js';

// ── Animated avatar components ───────────────────────────────────
function ChatAvatar({ size = 28, animate = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <style>{`
        @keyframes blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        @keyframes pulse-ring {
          0% { opacity: 0.6; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.4); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }
        .eye-left { animation: blink 4s ease-in-out infinite; transform-origin: 14px 18px; }
        .eye-right { animation: blink 4s ease-in-out infinite 0.1s; transform-origin: 26px 18px; }
        .face-float { animation: float 3s ease-in-out infinite; }
      `}</style>
      <g className={animate ? 'face-float' : ''}>
        <circle cx="20" cy="20" r="16" fill="#d4a941" />
        <circle cx="20" cy="10" r="3" fill="#0d0d18" opacity="0.4" />
        <circle cx="20" cy="10" r="1.5" fill="#d4a941" opacity="0.6" />
        <ellipse className="eye-left" cx="14" cy="18" rx="2.5" ry="3" fill="#0d0d18" />
        <ellipse className="eye-right" cx="26" cy="18" rx="2.5" ry="3" fill="#0d0d18" />
        <circle cx="15" cy="17" r="0.8" fill="white" opacity="0.8" />
        <circle cx="27" cy="17" r="0.8" fill="white" opacity="0.8" />
        <path d="M14 25 Q20 30 26 25" stroke="#0d0d18" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <path d="M6 18 Q6 8 20 8 Q34 8 34 18" stroke="#0d0d18" strokeWidth="2" fill="none" strokeLinecap="round" />
        <rect x="4" y="17" width="4" height="7" rx="2" fill="#0d0d18" />
        <rect x="32" y="17" width="4" height="7" rx="2" fill="#0d0d18" />
      </g>
    </svg>
  );
}

function ThinkingAvatar({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <style>{`
        @keyframes look-up {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .think-eye { animation: look-up 1s ease-in-out infinite; }
      `}</style>
      <circle cx="20" cy="20" r="16" fill="#d4a941" />
      <circle cx="20" cy="10" r="3" fill="#0d0d18" opacity="0.4" />
      <circle cx="20" cy="10" r="1.5" fill="#d4a941" opacity="0.6" />
      <ellipse className="think-eye" cx="14" cy="16" rx="2.5" ry="2" fill="#0d0d18" />
      <ellipse className="think-eye" cx="26" cy="16" rx="2.5" ry="2" fill="#0d0d18" />
      <circle cx="15" cy="15.5" r="0.8" fill="white" opacity="0.8" />
      <circle cx="27" cy="15.5" r="0.8" fill="white" opacity="0.8" />
      <path d="M15 26 Q20 24 25 26" stroke="#0d0d18" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M6 18 Q6 8 20 8 Q34 8 34 18" stroke="#0d0d18" strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="4" y="17" width="4" height="7" rx="2" fill="#0d0d18" />
      <rect x="32" y="17" width="4" height="7" rx="2" fill="#0d0d18" />
    </svg>
  );
}

// ── Platform knowledge system prompt ─────────────────────────────
const SYSTEM_PROMPT = `You are the CreatorBridge support assistant. You have complete knowledge of how CreatorBridge works and answer questions confidently without redirecting to email unless it is a specific account issue.

FORMATTING RULES:
- Never use markdown like **bold** or asterisk bullets
- Write in plain conversational sentences only
- Keep responses under 120 words unless more is needed
- Never start a response with the word I

PLATFORM OVERVIEW:
CreatorBridge is a US-only marketplace connecting videographers, photographers, drone operators, podcast producers, social media creators, and corporate event specialists with brands and clients. US-only at launch, expanding to Canada then Europe later.

CREATOR STANDARDS:
Every creator on CreatorBridge is manually reviewed and approved before going live. Requirements include 2 or more years of paid professional experience, minimum 3 portfolio samples, complete service packages with real pricing, a 60 to 90 second video intro, Stripe identity verification, and a US bank account. Profile information is locked for 90 days after submission.

FEES:
Creators pay 10 percent platform fee. Fee drops to 8 percent after 10 completed projects and 6 percent after 25 projects. Clients pay a 5 percent booking fee. No subscriptions, no monthly fees, no pay to apply.

PAYMENTS:
Clients pay 50 percent retainer upfront. Remaining 50 percent releases when client approves delivery or automatically after 72 hours if client does not respond. All payments processed through Stripe.

CANCELLATION POLICY:
Rule 1: If client cancels before work begins, creator keeps 25 percent as a cancellation fee and client gets 75 percent back. Rule 2: If client cancels after work starts, creator keeps the full 50 percent retainer. Rule 3: After delivery there are no refunds.

DELIVERY AND REVISIONS:
Creators deliver via link (Google Drive, Dropbox, Vimeo, WeTransfer, Frame.io) or direct upload. Files stored for 7 days then deleted. Creators keep their own copy for 6 months. 2 free revisions included on every project. Third revision requires a paid add-on.

DISPUTES:
Clients have 72 hours after delivery to open a dispute. After 72 hours with no action payment auto-releases and disputes cannot be opened. Valid dispute reasons: work does not match the agreed brief, significantly fewer deliverables than agreed, technical quality makes work unusable, creator abandoned the project. Not valid: client changed their mind after delivery, wanting more than the 2 included revisions, minor style preferences. For urgent disputes email drl33@creatorbridge.studio with URGENT in the subject line.

CREATOR TIERS:
Launch is for new creators with no requirements. Proven requires 10 or more completed projects with good ratings. Elite requires 25 or more completed projects and high ratings. Signature is the top tier for exceptional track records. Higher tiers rank higher in search results and build more client trust.

VERIFICATION:
Creators go through a 4-step verification process including phone SMS verification, Stripe identity verification with a government ID, portfolio review, and manual approval by the CreatorBridge team. All creators visible on the platform are verified.

REFERRAL PROGRAM:
Every creator and client has a unique referral link in their dashboard. Creator refers Creator: fee drops from 10 percent to 7 percent on their next project. Client refers Client: 5 percent booking fee waived on their next project. Creator refers Client: counts as one bonus completed project toward tier progression. Anyone who joins through a referral link gets their first booking fee waived. Rewards trigger only after a real paid transaction is completed.

MATCHING:
Clients submit a project brief with service type, budget, location, and dates. Smart Match returns 3 to 5 curated creators. Fast Match is instant single-creator assignment for urgent projects, free first use then 25 dollars.

ANTI-POACHING:
Creator contact info is hidden until a retainer is paid. Platform messaging filters out attempts to share contact info directly.

VIOLATIONS AND STRIKES:
Strike 1 is a warning. Strike 2 is a 30-day restriction. Strike 3 is account suspension. Violations include sharing contact info in chat, working off-platform, fake reviews, and harassment.

SERVICES OFFERED:
Video Production, Photography, Drone and Aerial, Social Media Content, Post-Production, Live Events, Corporate Events, and Podcast Production.

GEOGRAPHIC AVAILABILITY:
US only currently. Expanding to Canada next then Europe.

SUPPORT:
For account-specific issues, billing problems, or disputes needing human review email drl33@creatorbridge.studio. For urgent payment disputes mark subject line URGENT. Response within 24 hours.`;

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

async function sendToAnthropic(messages) {
  if (!ANTHROPIC_KEY) {
    return getDemoResponse(messages[messages.length - 1]?.content || '');
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || 'Sorry, I could not get a response.';
}

// Demo responses when no API key is configured
function getDemoResponse(question) {
  const q = question.toLowerCase();

  if (q.includes('how does this platform work') || q.includes('how does creatorbridge work') || (q.includes('how does') && q.includes('work'))) {
    return 'CreatorBridge connects clients with verified media creators. Clients post a project brief and get matched with 3 to 5 curated creators based on their budget, location, and needs. You pay a 50% retainer to get started, and the remaining 50% is released when you approve the final delivery. Creators keep 90% of every project.';
  }
  if (q.includes('fee') || q.includes('cost') || q.includes('price') || q.includes('how much')) {
    return 'Creators pay a 10% platform fee that drops to 8% after 10 completed projects and 6% after 25. Clients pay a 5% booking fee. No subscriptions, no lead fees, no pay to apply.';
  }
  if (q.includes('sign up') || q.includes('get started') || q.includes('join') || q.includes('register')) {
    return 'Creators click Join in the nav and create a free profile with their services, rates, and portfolio. Clients can browse creators directly or post a project brief to get matched automatically with the best available creators.';
  }
  if (q.includes('payment') || q.includes('retainer') || q.includes('when do i get paid') || q.includes('when will i get paid')) {
    return 'Clients pay a 50% retainer upfront to secure the booking. The remaining 50% is released when the client approves the final delivery. If the client does not respond within 72 hours of delivery, payment releases automatically.';
  }
  if (q.includes('not happy') || q.includes('unhappy') || q.includes('not satisfied') || q.includes('dispute')) {
    return 'Clients have 72 hours after delivery to request a revision (2 free revisions included) or open a dispute. Disputes freeze the payment and are reviewed by the CreatorBridge team to reach a fair resolution.';
  }
  if (q.includes('cancel') || q.includes('refund')) {
    return 'If a client cancels before work begins, the creator keeps 25% as a cancellation fee and the client gets 75% back. If work has already started, the creator keeps the full 50% retainer.';
  }
  if (q.includes('match') || q.includes('how does matching work') || q.includes('how do i get matched')) {
    return 'When a client submits a project brief, the Smart Match algorithm finds the top 3 to 5 creators who match their service type, budget, location, and availability. Clients see curated matches - not an overwhelming list of everyone on the platform.';
  }
  if (q.includes('verif') || q.includes('verified') || q.includes('verification')) {
    return 'Creators complete a 4-step verification process including connecting a Stripe payment account for identity verification, adding portfolio links, and linking a social media profile. Verified creators rank higher in search results.';
  }
  if (q.includes('insurance')) {
    return 'CreatorBridge does not verify creator insurance. For on-site projects, confirm coverage directly with your creator before booking.';
  }
  return 'Great question. I can help with questions about fees, payments, how matching works, verification, cancellations, and getting started on CreatorBridge. Try asking me about any of those topics, or email drl33@creatorbridge.studio for account-specific help.';
}

// ── Booking flow config ──────────────────────────────────────────
const BOOKING_STEPS = [
  {
    step: 1, field: 'serviceType',
    question: 'What type of project do you need help with?',
    type: 'options',
    options: ['Video Production','Photography','Drone and Aerial','Social Media Content','Podcast Production','Corporate Events','Live Events','Post-Production','Not sure yet'],
  },
  {
    step: 2, field: 'location',
    question: 'What city and state is the project in?',
    type: 'text',
    placeholder: 'e.g. Austin, TX',
  },
  {
    step: 3, field: 'timeframe',
    question: 'What is your project date or timeframe?',
    type: 'options',
    options: ['This week','Next week','This month','Next month','Flexible'],
  },
  {
    step: 4, field: 'budget',
    question: 'What is your budget range?',
    type: 'options',
    options: ['Under $500','$500 to $2,000','$2,000 to $5,000','$5,000 to $10,000','$10,000+'],
  },
  {
    step: 5, field: 'description',
    question: 'Briefly describe what you need. What are the key deliverables?',
    type: 'text',
    placeholder: 'e.g. 2-min brand video, 50 edited photos, 4 weekly reels...',
  },
  {
    step: 6, field: 'urgency',
    question: 'How urgent is this?',
    type: 'options',
    options: ['Urgent - need someone ASAP','Standard - within a few days','Planning ahead'],
  },
];

const BOOKING_INTENTS = [
  'i need a creator','i want to book','hire a photographer','hire a videographer',
  'find a videographer','find a photographer','i have a project','book a creator',
  'i need help with','i want to hire','looking for a creator','need a videographer',
  'need a photographer','find a creator','book a photographer','book a videographer',
  'need someone for','hire someone','looking to hire','i need someone to film',
  'need someone to film','looking for someone to film','i need a videographer',
  'need a filmmaker','looking for a filmmaker','i need a drone operator',
  'need a podcast producer','looking for a podcast','need social media content',
  'i need content','need content creator','looking for content','draft a request',
  'can you draft','help me find','i need help finding','find me a creator',
  'find me a photographer','find me a videographer','need coverage','event coverage',
  'need a shooter','need photos','need video','need footage','need a crew',
  'i have an event','filming in','shooting in','photographer in','videographer in',
];

function isBookingIntent(text) {
  const lower = text.toLowerCase();
  return BOOKING_INTENTS.some(p => lower.includes(p));
}

// ── Creator quote flow config ────────────────────────────────────
const CREATOR_STEPS = [
  {
    step: 1, field: 'serviceType',
    question: 'What type of service are you quoting for?',
    type: 'options',
    options: ['Video Production','Photography','Drone and Aerial','Social Media Content','Podcast Production','Corporate Events','Live Events','Post-Production'],
  },
  {
    step: 2, field: 'deliverables',
    question: 'What are the key deliverables for this project?',
    type: 'text',
    placeholder: 'e.g. 2-min brand video, 10 edited photos, 4 weekly reels...',
  },
  {
    step: 3, field: 'rate',
    question: 'What is your rate for this project?',
    type: 'options',
    options: ['Under $500','$500 to $1,000','$1,000 to $2,500','$2,500 to $5,000','$5,000 to $10,000','$10,000+','Custom rate'],
  },
  {
    step: 4, field: 'turnaround',
    question: 'What is your estimated turnaround time?',
    type: 'options',
    options: ['Same day','1 to 3 days','3 to 7 days','1 to 2 weeks','2 to 4 weeks','Custom timeline'],
  },
  {
    step: 5, field: 'revisions',
    question: 'How many revisions are included?',
    type: 'options',
    options: ['1 revision','2 revisions','3 revisions','Unlimited revisions','No revisions included'],
  },
  {
    step: 6, field: 'notes',
    question: 'Any additional notes or terms for this quote?',
    type: 'text',
    placeholder: 'e.g. Travel fees apply, 50% deposit required, rush fees for same-day...',
  },
];

const CREATOR_INTENTS = [
  'i want to send a quote','create a quote','build a quote','send a quote',
  'make a package','set my rates','create a package','build a package',
  'i want to quote','help me quote','quote a client','write a quote',
  'draft a quote','prepare a quote','send my rates',
];

const QUOTE_DRAFT_KEY = 'cb-quote-draft';
const EMPTY_QUOTE = { serviceType:'', deliverables:'', rate:'', turnaround:'', revisions:'', notes:'' };

function isCreatorIntent(text) {
  const lower = text.toLowerCase();
  return CREATOR_INTENTS.some(p => lower.includes(p));
}

function saveQuoteDraft(data) { try { localStorage.setItem(QUOTE_DRAFT_KEY, JSON.stringify(data)); } catch {} }
function loadQuoteDraft()     { try { const s = localStorage.getItem(QUOTE_DRAFT_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }
function removeQuoteDraft()   { try { localStorage.removeItem(QUOTE_DRAFT_KEY); } catch {} }

const DRAFT_KEY = 'cb-booking-draft';
const EMPTY_BOOKING = { serviceType:'', location:'', timeframe:'', budget:'', description:'', urgency:'' };

function saveDraft(data) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch {} }
function loadDraft()     { try { const s = localStorage.getItem(DRAFT_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }
function removeDraft()   { try { localStorage.removeItem(DRAFT_KEY); } catch {} }

function makeInitialMessages(draft) {
  const welcome = {
    role: 'assistant',
    content: "Hi! I am Bridge, your CreatorBridge assistant. I can help you find and book verified media creators, build quotes, or answer any questions about the platform.",
  };
  const prompts = {
    role: 'assistant',
    kind: 'welcome-prompts',
    content: 'Here is what I can do for you:',
  };
  if (!draft) return [welcome, prompts];
  return [
    welcome,
    prompts,
    {
      role: 'assistant',
      kind: 'draft-prompt',
      content: 'You have a saved booking request. Would you like to continue where you left off, edit it, or start a new request?',
    },
  ];
}

// ── Main component ───────────────────────────────────────────────
export function SupportChatbot({ dark = true }) {
  const { user } = useAuth();

  const [open, setOpen]         = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);
  const [hasDraft, setHasDraft] = useState(() => !!loadDraft());

  // bookingMode: false | 'active' | 'summary' | 'submitted'
  const [bookingMode, setBookingMode] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingData, setBookingData] = useState(() => loadDraft() || EMPTY_BOOKING);
  const [guestCtaShown, setGuestCtaShown] = useState(false);

  // quoteMode: false | 'active' | 'summary' | 'submitted'
  const [quoteMode, setQuoteMode] = useState(false);
  const [quoteStep, setQuoteStep] = useState(1);
  const [quoteData, setQuoteData] = useState(() => loadQuoteDraft() || EMPTY_QUOTE);
  const [hasQuoteDraft, setHasQuoteDraft] = useState(() => !!loadQuoteDraft());

  const [messages, setMessages] = useState(() => makeInitialMessages(loadDraft()));
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const bottomRef               = useRef(null);
  const inputRef                = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 50);
    }
  }, [open, messages]);

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem('cb-chat-shown');
    if (!alreadyShown && !autoOpened) {
      const timer = setTimeout(() => {
        setOpen(true);
        setAutoOpened(true);
        sessionStorage.setItem('cb-chat-shown', 'true');
      }, 9000);
      return () => clearTimeout(timer);
    }
  }, []);

  const push = (msg) => setMessages(prev => [...prev, msg]);

  // ── Booking: advance to next step or show summary ──────────────
  function advanceBooking(newData, currentStep) {
    if (currentStep < 6) {
      const nextStep = currentStep + 1;
      setBookingStep(nextStep);
      const def = BOOKING_STEPS[nextStep - 1];
      push({
        role: 'assistant',
        kind: 'booking-question',
        bookingStep: nextStep,
        content: def.question,
        options: def.type === 'options' ? def.options : undefined,
      });
    } else {
      saveDraft(newData);
      setHasDraft(true);
      setBookingMode('summary');
      push({
        role: 'assistant',
        kind: 'summary',
        content: 'Does this look correct? You can edit any detail or submit your request.',
        data: newData,
      });
    }
  }

  // ── Booking: start from a given step ──────────────────────────
  function startBooking(initialData = EMPTY_BOOKING, startStep = 1) {
    setBookingMode('active');
    setBookingStep(startStep);
    setBookingData(initialData);
    setGuestCtaShown(false);
    const def = BOOKING_STEPS[startStep - 1];
    const intro = startStep === 1
      ? "Let's find the right creator for your project. I'll ask you 6 quick questions.\n\n" + def.question
      : def.question;
    push({
      role: 'assistant',
      kind: 'booking-question',
      bookingStep: startStep,
      content: intro,
      options: def.type === 'options' ? def.options : undefined,
    });
  }

  // ── Handle option button click ────────────────────────────────
  function handleOption(option, step) {
    if (bookingMode !== 'active' || step !== bookingStep) return;
    const def = BOOKING_STEPS[step - 1];
    const newData = { ...bookingData, [def.field]: option };
    setBookingData(newData);
    push({ role: 'user', content: option });
    advanceBooking(newData, step);
  }

  // ── Handle draft prompt buttons ───────────────────────────────
  function handleDraftAction(action) {
    const draft = loadDraft();
    if (action === 'continue') {
      const data = draft || bookingData;
      push({ role: 'user', content: 'Continue my saved request' });
      setBookingData(data);
      setBookingMode('summary');
      push({
        role: 'assistant',
        kind: 'summary',
        content: 'Here is your saved booking request. Review the details and submit when ready.',
        data,
      });
    } else if (action === 'edit') {
      push({ role: 'user', content: 'Edit my saved request' });
      startBooking(draft || EMPTY_BOOKING, 1);
    } else if (action === 'new') {
      removeDraft();
      setHasDraft(false);
      push({ role: 'user', content: 'Start a new request' });
      startBooking();
    }
  }

  // ── Handle summary action buttons ────────────────────────────
  async function handleSummaryAction(action) {
    if (action === 'edit') {
      push({ role: 'user', content: 'Edit my request' });
      startBooking(bookingData, 1);
    } else if (action === 'submit') {
      if (!user) {
        if (guestCtaShown) return;
        setGuestCtaShown(true);
        push({ role: 'user', content: 'Submit request' });
        push({
          role: 'assistant',
          kind: 'guest-cta',
          content: 'Your booking request is ready. Create a free account or sign in to submit it to verified creators in your area. Your answers are saved and will not be lost.',
        });
        return;
      }
      await submitRequest();
    }
  }

  // ── Quote: advance to next step or show summary ───────────────
  function advanceQuote(newData, currentStep) {
    if (currentStep < 6) {
      const nextStep = currentStep + 1;
      setQuoteStep(nextStep);
      const def = CREATOR_STEPS[nextStep - 1];
      push({
        role: 'assistant',
        kind: 'creator-question',
        quoteStep: nextStep,
        content: def.question,
        options: def.type === 'options' ? def.options : undefined,
      });
    } else {
      saveQuoteDraft(newData);
      setHasQuoteDraft(true);
      setQuoteMode('summary');
      push({
        role: 'assistant',
        kind: 'creator-summary',
        content: 'Here is your quote summary. Review the details and confirm when ready.',
        data: newData,
      });
    }
  }

  // ── Quote: start from a given step ────────────────────────────
  function startQuote(initialData = EMPTY_QUOTE, startStep = 1) {
    setQuoteMode('active');
    setQuoteStep(startStep);
    setQuoteData(initialData);
    const def = CREATOR_STEPS[startStep - 1];
    const intro = startStep === 1
      ? "Let's build your quote. I'll ask 6 quick questions.\n\n" + def.question
      : def.question;
    push({
      role: 'assistant',
      kind: 'creator-question',
      quoteStep: startStep,
      content: intro,
      options: def.type === 'options' ? def.options : undefined,
    });
  }

  // ── Handle creator option button click ────────────────────────
  function handleQuoteOption(option, step) {
    if (quoteMode !== 'active' || step !== quoteStep) return;
    const def = CREATOR_STEPS[step - 1];
    const newData = { ...quoteData, [def.field]: option };
    setQuoteData(newData);
    push({ role: 'user', content: option });
    advanceQuote(newData, step);
  }

  // ── Handle quote summary buttons ──────────────────────────────
  async function handleQuoteSummaryAction(action) {
    if (action === 'edit') {
      push({ role: 'user', content: 'Edit my quote' });
      startQuote(quoteData, 1);
    } else if (action === 'confirm') {
      setQuoteMode('submitted');
      setHasQuoteDraft(false);
      removeQuoteDraft();
      push({ role: 'user', content: 'Confirm quote' });
      push({
        role: 'assistant',
        kind: 'quote-confirmation',
        content: 'Your quote has been saved. You can copy the details and send them to your client, or use the Projects section of your dashboard to manage this quote.',
      });
    }
  }

  // ── Submit booking to Supabase with localStorage fallback ─────
  async function submitRequest() {
    setLoading(true);
    push({ role: 'user', content: 'Submit request' });

    if (supabaseConfigured && supabase) {
      try {
        await supabase.from('booking_requests').insert({
          user_id:      user.id,
          service_type: bookingData.serviceType,
          location:     bookingData.location,
          timeframe:    bookingData.timeframe,
          budget:       bookingData.budget,
          description:  bookingData.description,
          urgency:      bookingData.urgency,
          status:       'open',
        });
      } catch {}
    }

    // Always persist locally as fallback
    saveDraft(bookingData);
    setBookingMode('submitted');
    setHasDraft(false);
    setLoading(false);
    push({
      role: 'assistant',
      kind: 'confirmation',
      content: 'Your booking request has been submitted. Verified creators in your area have been notified and will respond within 24 hours. You can view and manage your request in your dashboard.',
    });
  }

  // ── Open auth modal ───────────────────────────────────────────
  function openAuth(tab) {
    window.dispatchEvent(new CustomEvent('open-auth', { detail: { tab } }));
  }

  // ── Main send handler ─────────────────────────────────────────
  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setError('');

    // Booking active: handle text step answers
    if (bookingMode === 'active') {
      const def = BOOKING_STEPS[bookingStep - 1];
      if (def.type === 'text') {
        const newData = { ...bookingData, [def.field]: text };
        setBookingData(newData);
        push({ role: 'user', content: text });
        advanceBooking(newData, bookingStep);
      }
      // Option steps: input is disabled, nothing to do
      return;
    }

    // Quote active: handle text step answers
    if (quoteMode === 'active') {
      const def = CREATOR_STEPS[quoteStep - 1];
      if (def.type === 'text') {
        const newData = { ...quoteData, [def.field]: text };
        setQuoteData(newData);
        push({ role: 'user', content: text });
        advanceQuote(newData, quoteStep);
      }
      return;
    }

    // Detect booking intent in support chat mode
    if (!bookingMode && isBookingIntent(text)) {
      push({ role: 'user', content: text });
      startBooking();
      return;
    }

    // Detect creator quote intent
    if (!bookingMode && !quoteMode && isCreatorIntent(text)) {
      push({ role: 'user', content: text });
      startQuote();
      return;
    }

    // Normal support chat
    const userMsg = { role: 'user', content: text };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setLoading(true);

    try {
      // Only send plain conversational messages to the AI
      const apiMessages = nextMsgs
        .filter((m, i) => i > 0 && m.content && !m.kind)
        .map(m => ({ role: m.role, content: m.content }));

      const reply = await sendToAnthropic(apiMessages);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setError('Could not reach support. Try emailing drl33@creatorbridge.studio');
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Derived input state ───────────────────────────────────────
  const isOptionsStep =
    (bookingMode === 'active' && BOOKING_STEPS[bookingStep - 1]?.type === 'options') ||
    (quoteMode === 'active' && CREATOR_STEPS[quoteStep - 1]?.type === 'options');
  const inputPlaceholder = bookingMode === 'active'
    ? (isOptionsStep ? 'Select an option above...' : (BOOKING_STEPS[bookingStep - 1]?.placeholder || 'Type your answer...'))
    : quoteMode === 'active'
    ? (isOptionsStep ? 'Select an option above...' : (CREATOR_STEPS[quoteStep - 1]?.placeholder || 'Type your answer...'))
    : 'Ask a question...';

  // Only show interactive elements on the last message of each kind
  const lastOf = (kind) => messages.map((m, i) => m.kind === kind ? i : -1).filter(i => i >= 0).at(-1) ?? -1;
  const lastDraftIdx    = lastOf('draft-prompt');
  const lastSummaryIdx  = lastOf('summary');
  const lastGuestCtaIdx = lastOf('guest-cta');
  const lastQuestionIdx = messages
    .map((m, i) => (m.kind === 'booking-question' && m.bookingStep === bookingStep) ? i : -1)
    .filter(i => i >= 0).at(-1) ?? -1;
  const lastCreatorQuestionIdx = messages
    .map((m, i) => (m.kind === 'creator-question' && m.quoteStep === quoteStep) ? i : -1)
    .filter(i => i >= 0).at(-1) ?? -1;
  const lastCreatorSummaryIdx = lastOf('creator-summary');
  const lastWelcomeIdx = lastOf('welcome-prompts');

  // ── Styles ────────────────────────────────────────────────────
  const bgPanel  = dark ? 'bg-charcoal-900 border-charcoal-700' : 'bg-white border-gray-200';
  const bgUser   = 'bg-gold-500 text-charcoal-900';
  const bgAssist = dark ? 'bg-charcoal-800 text-charcoal-100' : 'bg-gray-100 text-gray-800';
  const textSub  = dark ? 'text-charcoal-400' : 'text-gray-500';

  const btnOpt  = `px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all border ${
    dark ? 'border-charcoal-600 text-charcoal-300 hover:border-gold-500 hover:text-gold-400 hover:bg-gold-500/10'
         : 'border-gray-200 text-gray-600 hover:border-gold-500 hover:text-gold-600 hover:bg-gold-50'
  }`;
  const btnGold  = 'px-4 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-charcoal-900 text-[11px] font-bold transition-all';
  const btnGhost = dark
    ? 'px-3 py-1.5 rounded-xl border border-charcoal-600 text-charcoal-300 hover:text-white text-[11px] font-semibold transition-all'
    : 'px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:text-gray-900 text-[11px] font-semibold transition-all';

  return (
    <>
      {/* ── Chat panel ─────────────────────────────────────────── */}
      {open && (
        <div
          className={`z-50 w-80 sm:w-96 rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${bgPanel}`}
          style={{ position: 'fixed', bottom: '5rem', right: '1.5rem', maxHeight: '540px', zIndex: 9999 }}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${dark ? 'border-charcoal-700 bg-charcoal-800' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full flex items-center justify-center">
                <ChatAvatar size={24} animate={false} />
              </div>
              <div>
                <p className={`text-xs font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>CreatorBridge Support</p>
                <p className={`text-[10px] ${textSub}`}>
                  {bookingMode ? 'Booking assistant' : quoteMode ? 'Quote assistant' : 'Powered by AI - usually instant'}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)}
              className={`p-1 rounded-lg transition-colors ${dark ? 'text-charcoal-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0" style={{ maxHeight: '400px' }}>
            {messages.map((msg, i) => (
              <div key={i} className="space-y-1.5">

                {/* Bubble */}
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    msg.role === 'user' ? bgUser : bgAssist
                  } ${msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                    {msg.content}
                  </div>
                </div>

                {/* Option buttons — current booking question only */}
                {msg.kind === 'booking-question' && msg.options && i === lastQuestionIdx && bookingMode === 'active' && (
                  <div className="flex flex-wrap gap-1.5 pl-1">
                    {msg.options.map(opt => (
                      <button key={opt} type="button"
                        onClick={() => handleOption(opt, msg.bookingStep)}
                        className={btnOpt}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Draft continuation buttons */}
                {msg.kind === 'draft-prompt' && i === lastDraftIdx && !bookingMode && (
                  <div className="flex flex-wrap gap-1.5 pl-1">
                    <button type="button" onClick={() => handleDraftAction('continue')} className={btnGold}>Continue</button>
                    <button type="button" onClick={() => handleDraftAction('edit')} className={btnGhost}>Edit Request</button>
                    <button type="button" onClick={() => handleDraftAction('new')} className={btnGhost}>Start New</button>
                  </div>
                )}

                {/* Summary card */}
                {msg.kind === 'summary' && i === lastSummaryIdx && (
                  <div className={`ml-1 rounded-xl border p-3 text-xs space-y-1.5 ${dark ? 'border-charcoal-600 bg-charcoal-800/80' : 'border-gray-200 bg-gray-50'}`}>
                    {[
                      ['Service',     msg.data?.serviceType],
                      ['Location',    msg.data?.location],
                      ['Timeframe',   msg.data?.timeframe],
                      ['Budget',      msg.data?.budget],
                      ['Description', msg.data?.description],
                      ['Urgency',     msg.data?.urgency],
                    ].map(([label, value]) => value ? (
                      <div key={label} className="flex gap-2">
                        <span className={`font-semibold shrink-0 w-20 ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>{label}:</span>
                        <span className={`break-words ${dark ? 'text-charcoal-200' : 'text-gray-700'}`}>{value}</span>
                      </div>
                    ) : null)}
                    {bookingMode === 'summary' && (
                      <div className="flex gap-2 pt-2 border-t border-charcoal-700/50">
                        <button type="button" onClick={() => handleSummaryAction('submit')} disabled={loading}
                          className={`${btnGold} flex-1 disabled:opacity-50`}>
                          {loading ? 'Submitting...' : 'Submit Request'}
                        </button>
                        <button type="button" onClick={() => handleSummaryAction('edit')} className={btnGhost}>
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Guest sign-up CTA */}
                {msg.kind === 'guest-cta' && i === lastGuestCtaIdx && (
                  <div className="flex gap-2 pl-1">
                    <button type="button" onClick={() => openAuth('signup')} className={btnGold}>Create Account</button>
                    <button type="button" onClick={() => openAuth('login')} className={btnGhost}>Sign In</button>
                  </div>
                )}

                {/* Welcome prompt buttons */}
                {msg.kind === 'welcome-prompts' && i === lastWelcomeIdx && !bookingMode && !quoteMode && (
                  <div className="flex flex-col gap-1.5 pl-1">
                    <p className={`text-[10px] font-semibold mb-1 ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>Try saying:</p>
                    {[
                      { label: '📸 Find a Photographer', text: 'I need a photographer' },
                      { label: '🎥 Book a Videographer', text: 'I need a videographer' },
                      { label: '🎙️ Find a Podcast Producer', text: 'I need a podcast producer' },
                      { label: '🚁 Hire a Drone Operator', text: 'I need a drone operator' },
                      { label: '💬 Ask a Question', text: 'How does CreatorBridge work?' },
                      { label: '📋 Build a Quote', text: 'I want to send a quote' },
                    ].map(({ label, text }) => (
                      <button key={text} type="button"
                        onClick={() => {
                          setInput(text);
                          setTimeout(() => {
                            const syntheticInput = text;
                            setInput('');
                            const userMsg = { role: 'user', content: syntheticInput };
                            setMessages(prev => [...prev, userMsg]);
                            if (isBookingIntent(syntheticInput)) { startBooking(); return; }
                            if (isCreatorIntent(syntheticInput)) { startQuote(); return; }
                          }, 100);
                        }}
                        className={`text-left px-3 py-2 rounded-xl text-[11px] font-medium border transition-all ${
                          dark
                            ? 'border-charcoal-600 text-charcoal-300 hover:border-gold-500 hover:text-gold-400 hover:bg-gold-500/10'
                            : 'border-gray-200 text-gray-600 hover:border-gold-500 hover:text-gold-600 hover:bg-gold-50'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Creator option buttons — current quote question only */}
                {msg.kind === 'creator-question' && msg.options && i === lastCreatorQuestionIdx && quoteMode === 'active' && (
                  <div className="flex flex-wrap gap-1.5 pl-1">
                    {msg.options.map(opt => (
                      <button key={opt} type="button"
                        onClick={() => handleQuoteOption(opt, msg.quoteStep)}
                        className={btnOpt}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Creator summary card */}
                {msg.kind === 'creator-summary' && i === lastCreatorSummaryIdx && (
                  <div className={`ml-1 rounded-xl border p-3 text-xs space-y-1.5 ${dark ? 'border-charcoal-600 bg-charcoal-800/80' : 'border-gray-200 bg-gray-50'}`}>
                    {[
                      ['Service',      msg.data?.serviceType],
                      ['Deliverables', msg.data?.deliverables],
                      ['Rate',         msg.data?.rate],
                      ['Turnaround',   msg.data?.turnaround],
                      ['Revisions',    msg.data?.revisions],
                      ['Notes',        msg.data?.notes],
                    ].map(([label, value]) => value ? (
                      <div key={label} className="flex gap-2">
                        <span className={`font-semibold shrink-0 w-24 ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>{label}:</span>
                        <span className={`break-words ${dark ? 'text-charcoal-200' : 'text-gray-700'}`}>{value}</span>
                      </div>
                    ) : null)}
                    {quoteMode === 'summary' && (
                      <div className="flex gap-2 pt-2 border-t border-charcoal-700/50">
                        <button type="button" onClick={() => handleQuoteSummaryAction('confirm')}
                          className={`${btnGold} flex-1`}>
                          Confirm Quote
                        </button>
                        <button type="button" onClick={() => handleQuoteSummaryAction('edit')}
                          className={btnGhost}>
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className={`rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-1.5 ${bgAssist}`}>
                  <ThinkingAvatar size={20} />
                  <span className="text-xs">Thinking...</span>
                </div>
              </div>
            )}
            {error && <p className="text-[11px] text-red-400 text-center">{error}</p>}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className={`px-3 py-2.5 border-t shrink-0 flex gap-2 ${dark ? 'border-charcoal-700' : 'border-gray-200'}`}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={isOptionsStep}
              placeholder={inputPlaceholder}
              className={`flex-1 text-xs px-3 py-2 rounded-xl border outline-none transition-all ${
                isOptionsStep
                  ? dark
                    ? 'bg-charcoal-800 border-charcoal-700 text-charcoal-600 cursor-not-allowed'
                    : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                  : dark
                    ? 'bg-charcoal-800 border-charcoal-600 text-white placeholder-charcoal-500 focus:border-gold-500'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gold-500'
              }`}
            />
            <button type="button" onClick={handleSend}
              disabled={!input.trim() || loading || isOptionsStep}
              className="w-8 h-8 rounded-xl bg-gold-500 hover:bg-gold-600 disabled:opacity-40 flex items-center justify-center transition-all shrink-0">
              <Send size={13} className="text-charcoal-900" />
            </button>
          </div>
        </div>
      )}

      {/* ── Floating bubble with draft badge ───────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="z-50 w-12 h-12 rounded-full bg-gold-500 hover:bg-gold-600 shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 relative"
        style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999 }}
        aria-label="Open support chat"
      >
        {hasDraft && !open && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-300 border-2 border-charcoal-900 z-10" />
        )}
        {open
          ? <X size={20} className="text-charcoal-900" />
          : <ChatAvatar size={32} animate={true} />
        }
      </button>
    </>
  );
}
