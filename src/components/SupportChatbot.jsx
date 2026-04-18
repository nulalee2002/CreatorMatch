import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader, ChevronDown } from 'lucide-react';

// ── Platform knowledge system prompt ─────────────────────────────
const SYSTEM_PROMPT = `You are a helpful support assistant for CreatorMatch, a platform that connects content creators (videographers, photographers, drone operators, podcast producers, social media creators) with clients who need creative work done.

Key platform facts:
- Creators list their services and set their own rates
- Clients browse creators and submit quote requests
- Platform fees: creators pay 10% (drops to 8% after 10 projects, 6% after 25). Clients pay a 5% booking fee
- Payment structure: 50% retainer paid upfront, 50% paid on delivery approval
- 72-hour auto-approval: if a client does not approve or dispute within 72 hours of delivery, payment releases automatically
- Delivered files are stored for 7 days. Re-delivery requests cost $30
- Creators have 4 tiers: Launch, Proven, Elite, Signature
- Verification: unverified, verified, pro_verified
- Anti-poaching policy: creator contact info is hidden until retainer is paid
- Referral program: creators and clients can refer others for fee reductions and tier boosts
- Dispute resolution: clients have 72 hours after delivery to open a dispute
- Cancellation: retainer is refundable before work begins, minus a cancellation fee
- Insurance: CreatorMatch does not verify creator insurance. Clients should confirm coverage directly with their creator
- Support email: Nulalee2002@gmail.com
- No em dashes in responses, use regular dashes or commas instead

Answer questions clearly and concisely. If you do not know the answer or the question is about a specific account issue, direct users to support at Nulalee2002@gmail.com. Do not make up information. Keep responses under 150 words unless the question genuinely requires more detail.`;

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

async function sendToAnthropic(messages) {
  if (!ANTHROPIC_KEY) {
    // Demo mode fallback
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

  if (q.includes('how does this platform work') || q.includes('how does creatormatch work') || (q.includes('how does') && q.includes('work'))) {
    return 'CreatorMatch connects clients with verified media creators. Clients post a project brief and get matched with 3 to 5 curated creators based on their budget, location, and needs. You pay a 50% retainer to get started, and the remaining 50% is released when you approve the final delivery. Creators keep 90% of every project.';
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
    return 'Clients have 72 hours after delivery to request a revision (2 free revisions included) or open a dispute. Disputes freeze the payment and are reviewed by the CreatorMatch team to reach a fair resolution.';
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
    return 'CreatorMatch does not verify creator insurance. For on-site projects, confirm coverage directly with your creator before booking.';
  }
  return 'Great question. I can help with questions about fees, payments, how matching works, verification, cancellations, and getting started on CreatorMatch. Try asking me about any of those topics, or email Nulalee2002@gmail.com for account-specific help.';
}

// ── Main component ───────────────────────────────────────────────
export function SupportChatbot({ dark = true }) {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am the CreatorMatch support assistant. Ask me anything about how the platform works.' },
  ]);
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [open, messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setInput('');
    setLoading(true);
    setError('');

    try {
      // Build messages array for API (exclude initial assistant greeting from history)
      const apiMessages = nextMsgs
        .filter(m => !(m.role === 'assistant' && m === messages[0]))
        .map(m => ({ role: m.role, content: m.content }));

      const reply = await sendToAnthropic(apiMessages);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e) {
      setError('Could not reach support. Try emailing Nulalee2002@gmail.com');
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

  const bgPanel   = dark ? 'bg-charcoal-900 border-charcoal-700' : 'bg-white border-gray-200';
  const bgUser    = 'bg-gold-500 text-charcoal-900';
  const bgAssist  = dark ? 'bg-charcoal-800 text-charcoal-100' : 'bg-gray-100 text-gray-800';
  const textSub   = dark ? 'text-charcoal-400' : 'text-gray-500';

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className={`fixed bottom-20 right-4 sm:right-6 z-50 w-80 sm:w-96 rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${bgPanel}`}
          style={{ maxHeight: '480px' }}>
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${dark ? 'border-charcoal-700 bg-charcoal-800' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gold-500 flex items-center justify-center">
                <MessageCircle size={13} className="text-charcoal-900" />
              </div>
              <div>
                <p className={`text-xs font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>CreatorMatch Support</p>
                <p className={`text-[10px] ${textSub}`}>Powered by AI - usually instant</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)}
              className={`p-1 rounded-lg transition-colors ${dark ? 'text-charcoal-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0" style={{ maxHeight: '320px' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  msg.role === 'user' ? bgUser : bgAssist
                } ${msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className={`rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-1.5 ${bgAssist}`}>
                  <Loader size={11} className="animate-spin text-gold-400" />
                  <span className="text-xs">Thinking...</span>
                </div>
              </div>
            )}
            {error && (
              <p className="text-[11px] text-red-400 text-center">{error}</p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className={`px-3 py-2.5 border-t flex gap-2 ${dark ? 'border-charcoal-700' : 'border-gray-200'}`}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask a question..."
              className={`flex-1 text-xs px-3 py-2 rounded-xl border outline-none transition-all ${
                dark
                  ? 'bg-charcoal-800 border-charcoal-600 text-white placeholder-charcoal-500 focus:border-gold-500'
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gold-500'
              }`}
            />
            <button type="button" onClick={handleSend} disabled={!input.trim() || loading}
              className="w-8 h-8 rounded-xl bg-gold-500 hover:bg-gold-600 disabled:opacity-40 flex items-center justify-center transition-all shrink-0">
              <Send size={13} className="text-charcoal-900" />
            </button>
          </div>
        </div>
      )}

      {/* Floating bubble */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-4 right-4 sm:right-6 z-50 w-12 h-12 rounded-full bg-gold-500 hover:bg-gold-600 shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        aria-label="Open support chat">
        {open
          ? <X size={20} className="text-charcoal-900" />
          : <MessageCircle size={20} className="text-charcoal-900" />
        }
      </button>
    </>
  );
}
