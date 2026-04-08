import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Plus, MapPin, Clock, DollarSign, ChevronRight,
  Check, X, Filter, Search, Tag, Send, ArrowLeft, Users,
  Eye, Star, Calendar, CreditCard, Truck, ThumbsUp, RotateCcw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { SERVICES } from '../data/rates.js';
import { PROJECT_STATUSES, statusBadgeClass } from '../config/fees.js';
import { ProjectTimeline } from '../components/ProjectTimeline.jsx';
import { DisputeModal } from '../components/DisputeModal.jsx';

// ── localStorage helpers ────────────────────────────────────────
function loadProjects() {
  try { return JSON.parse(localStorage.getItem('cm-projects') || '[]'); } catch { return []; }
}
function saveProjects(projects) {
  localStorage.setItem('cm-projects', JSON.stringify(projects));
}
function loadApplications() {
  try { return JSON.parse(localStorage.getItem('cm-applications') || '[]'); } catch { return []; }
}
function saveApplications(apps) {
  localStorage.setItem('cm-applications', JSON.stringify(apps));
}

function loadMyListing(userId) {
  try {
    const all = JSON.parse(localStorage.getItem('creator-directory') || '[]');
    return all.find(c => c.user_id === userId) || null;
  } catch { return null; }
}

function timeAgo(iso) {
  const d = new Date(iso);
  const diff = Date.now() - d;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const BUDGET_RANGES = [
  { id: 'any',        label: 'Any budget' },
  { id: 'under500',   label: 'Under $500',     min: 0,    max: 500   },
  { id: '500-1500',   label: '$500–$1,500',    min: 500,  max: 1500  },
  { id: '1500-5000',  label: '$1,500–$5,000',  min: 1500, max: 5000  },
  { id: 'over5000',   label: '$5,000+',         min: 5000, max: Infinity },
];

// ── Post Job Modal ───────────────────────────────────────────────
function PostProjectModal({ dark, onClose, onPost, user }) {
  const [form, setForm] = useState({
    title: '', description: '', serviceId: '', budgetMin: '', budgetMax: '',
    deadline: '', location: '', remote: true, skills: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const textSub  = dark ? 'text-charcoal-400' : 'text-gray-500';
  const inputCls = `w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all ${
    dark ? 'bg-charcoal-900 border-charcoal-600 text-white placeholder-charcoal-500 focus:border-gold-500'
         : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gold-500'
  }`;

  function handlePost() {
    if (!form.title.trim() || !form.description.trim()) return;
    const project = {
      id:          Date.now().toString() + Math.random(),
      title:       form.title.trim(),
      description: form.description.trim(),
      serviceId:   form.serviceId,
      budgetMin:   parseFloat(form.budgetMin) || null,
      budgetMax:   parseFloat(form.budgetMax) || null,
      deadline:    form.deadline || null,
      location:    form.location.trim(),
      remote:      form.remote,
      skills:      form.skills.split(',').map(s => s.trim()).filter(Boolean),
      clientId:    user?.id || 'anon',
      clientName:  user?.email?.split('@')[0] || 'Anonymous',
      status:      'open',
      applications: 0,
      createdAt:   new Date().toISOString(),
    };
    const all = loadProjects();
    saveProjects([project, ...all]);
    onPost(project);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-lg rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto ${dark ? 'bg-charcoal-900 border-charcoal-700' : 'bg-white border-gray-200'}`}>
        <button type="button" onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-lg ${dark ? 'text-charcoal-400 hover:text-white hover:bg-charcoal-700' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
          <X size={16} />
        </button>
        <div className="p-6">
          <h3 className={`font-display font-bold text-lg mb-5 ${dark ? 'text-white' : 'text-gray-900'}`}>Post a Project</h3>

          <div className="space-y-4">
            <div>
              <p className={`text-xs font-medium mb-1.5 ${textSub}`}>Project Title *</p>
              <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="e.g. Brand photography for new product launch"
                className={inputCls} />
            </div>

            <div>
              <p className={`text-xs font-medium mb-1.5 ${textSub}`}>Description *</p>
              <textarea rows={4} value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Describe the project in detail — what you need, timeline expectations, any creative direction..."
                className={`${inputCls} resize-none`} />
            </div>

            <div>
              <p className={`text-xs font-medium mb-1.5 ${textSub}`}>Service Type</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SERVICES).map(([id, svc]) => (
                  <button key={id} type="button" onClick={() => set('serviceId', form.serviceId === id ? '' : id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                      form.serviceId === id
                        ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                        : dark ? 'border-charcoal-700 text-charcoal-400 hover:border-charcoal-500' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {svc.icon} {svc.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className={`text-xs font-medium mb-1.5 ${textSub}`}>Min Budget ($)</p>
                <input type="number" min={0} value={form.budgetMin} onChange={e => set('budgetMin', e.target.value)}
                  placeholder="500" className={inputCls} />
              </div>
              <div>
                <p className={`text-xs font-medium mb-1.5 ${textSub}`}>Max Budget ($)</p>
                <input type="number" min={0} value={form.budgetMax} onChange={e => set('budgetMax', e.target.value)}
                  placeholder="2000" className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className={`text-xs font-medium mb-1.5 ${textSub}`}>Deadline</p>
                <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)}
                  className={inputCls} />
              </div>
              <div>
                <p className={`text-xs font-medium mb-1.5 ${textSub}`}>Location</p>
                <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
                  placeholder="New York, NY" className={inputCls} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => set('remote', !form.remote)}
                className={`w-10 h-5 rounded-full transition-all relative ${form.remote ? 'bg-teal-500' : dark ? 'bg-charcoal-600' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.remote ? 'left-5' : 'left-0.5'}`} />
              </button>
              <span className={`text-sm ${dark ? 'text-charcoal-300' : 'text-gray-700'}`}>Remote work accepted</span>
            </div>

            <div>
              <p className={`text-xs font-medium mb-1.5 ${textSub}`}>Required Skills (comma-separated)</p>
              <input type="text" value={form.skills} onChange={e => set('skills', e.target.value)}
                placeholder="e.g. Adobe Lightroom, drone photography, product shots"
                className={inputCls} />
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <button type="button" onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${dark ? 'border-charcoal-600 text-charcoal-300 hover:text-white' : 'border-gray-200 text-gray-600 hover:text-gray-900'}`}>
              Cancel
            </button>
            <button type="button" onClick={handlePost}
              disabled={!form.title.trim() || !form.description.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 disabled:opacity-40 text-charcoal-900 text-sm font-bold transition-all flex items-center justify-center gap-2">
              <Briefcase size={14} /> Post Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Apply Modal ──────────────────────────────────────────────────
function ApplyModal({ project, dark, onClose, onApply, creatorListing }) {
  const [proposal, setProposal] = useState('');
  const [rate, setRate]         = useState('');
  const textSub  = dark ? 'text-charcoal-400' : 'text-gray-500';
  const inputCls = `w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-all ${
    dark ? 'bg-charcoal-900 border-charcoal-600 text-white placeholder-charcoal-500 focus:border-gold-500'
         : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gold-500'
  }`;

  function handleApply() {
    if (!proposal.trim()) return;
    const app = {
      id:          Date.now().toString() + Math.random(),
      projectId:   project.id,
      creatorId:   creatorListing?.id || 'unknown',
      creatorName: creatorListing?.businessName || creatorListing?.name || 'Creator',
      creatorAvatar: creatorListing?.avatar || '🎬',
      proposal:    proposal.trim(),
      rate:        parseFloat(rate) || null,
      status:      'pending',
      createdAt:   new Date().toISOString(),
    };
    const all = loadApplications();
    saveApplications([...all, app]);
    // Increment application count
    const projs = loadProjects();
    saveProjects(projs.map(p => p.id === project.id ? { ...p, applications: (p.applications || 0) + 1 } : p));
    onApply(app);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl ${dark ? 'bg-charcoal-900 border-charcoal-700' : 'bg-white border-gray-200'}`}>
        <button type="button" onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-lg ${dark ? 'text-charcoal-400 hover:text-white hover:bg-charcoal-700' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
          <X size={16} />
        </button>
        <div className="p-6">
          <h3 className={`font-display font-bold text-base mb-1 ${dark ? 'text-white' : 'text-gray-900'}`}>Apply to Project</h3>
          <p className={`text-xs mb-5 ${textSub}`}>{project.title}</p>

          <div className="space-y-4">
            <div>
              <p className={`text-xs font-medium mb-1.5 ${textSub}`}>Your Proposed Rate ($)</p>
              <div className="relative">
                <DollarSign size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${textSub}`} />
                <input type="number" min={0} value={rate} onChange={e => setRate(e.target.value)}
                  placeholder={project.budgetMax || '1500'} className={`${inputCls} pl-8`} />
              </div>
            </div>
            <div>
              <p className={`text-xs font-medium mb-1.5 ${textSub}`}>Proposal / Cover Letter *</p>
              <textarea rows={5} value={proposal} onChange={e => setProposal(e.target.value)}
                placeholder="Introduce yourself, explain why you're a great fit, and outline your approach to this project..."
                className={`${inputCls} resize-none`} />
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <button type="button" onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${dark ? 'border-charcoal-600 text-charcoal-300 hover:text-white' : 'border-gray-200 text-gray-600 hover:text-gray-900'}`}>
              Cancel
            </button>
            <button type="button" onClick={handleApply} disabled={!proposal.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 disabled:opacity-40 text-charcoal-900 text-sm font-bold transition-all flex items-center justify-center gap-2">
              <Send size={13} /> Submit Proposal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Action buttons (context-aware by role + status) ──────────────
function ProjectActionButtons({ project, isClient, applied, dark, onApply, onStatusChange, navigate }) {
  const { status } = project;

  function changeStatus(newStatus) {
    const all = JSON.parse(localStorage.getItem('cm-projects') || '[]');
    const updated = all.map(p => p.id === project.id ? { ...p, status: newStatus } : p);
    localStorage.setItem('cm-projects', JSON.stringify(updated));
    onStatusChange?.(project.id, newStatus);
  }

  // Client buttons
  if (isClient) {
    if (status === 'accepted') {
      return (
        <button type="button"
          onClick={e => { e.stopPropagation(); navigate(`/checkout/${project.id}`); }}
          className="w-full py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-charcoal-900 text-xs font-bold transition-all flex items-center justify-center gap-1.5">
          <CreditCard size={11} /> Pay Retainer
        </button>
      );
    }
    if (status === 'delivered') {
      return (
        <div className="flex gap-2">
          <button type="button"
            onClick={e => { e.stopPropagation(); changeStatus('approved'); }}
            className="flex-1 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1">
            <ThumbsUp size={11} /> Approve
          </button>
          <button type="button"
            onClick={e => { e.stopPropagation(); changeStatus('revision'); }}
            className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 ${dark ? 'border-charcoal-600 text-charcoal-300 hover:text-white' : 'border-gray-200 text-gray-600 hover:text-gray-900'}`}>
            <RotateCcw size={11} /> Revision
          </button>
        </div>
      );
    }
    if (status === 'approved') {
      return (
        <button type="button"
          onClick={e => { e.stopPropagation(); navigate(`/checkout/${project.id}?payment=final`); }}
          className="w-full py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5">
          <CreditCard size={11} /> Pay Remaining Balance
        </button>
      );
    }
    return null;
  }

  // Creator buttons
  if (status === 'open') {
    return (
      <button type="button"
        onClick={onApply}
        disabled={applied}
        className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
          applied
            ? 'bg-teal-500/15 text-teal-400 cursor-default'
            : 'bg-gold-500 hover:bg-gold-600 text-charcoal-900'
        }`}>
        {applied ? <span className="flex items-center justify-center gap-1"><Check size={11} /> Applied</span> : 'Apply Now'}
      </button>
    );
  }
  if (status === 'retainer_paid' || status === 'in_progress' || status === 'revision') {
    return (
      <button type="button"
        onClick={e => { e.stopPropagation(); changeStatus('delivered'); }}
        className="w-full py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5">
        <Truck size={11} /> Mark as Delivered
      </button>
    );
  }
  return null;
}

// ── Project Card ─────────────────────────────────────────────────
function ProjectCard({ project, dark, onApply, myApplications, isClient, onView, onStatusChange }) {
  const navigate = useNavigate();
  const svc      = SERVICES[project.serviceId];
  const textSub  = dark ? 'text-charcoal-400' : 'text-gray-500';
  const applied  = myApplications.some(a => a.projectId === project.id);

  const budgetStr = project.budgetMin && project.budgetMax
    ? `$${Number(project.budgetMin).toLocaleString()} – $${Number(project.budgetMax).toLocaleString()}`
    : project.budgetMax ? `Up to $${Number(project.budgetMax).toLocaleString()}`
    : project.budgetMin ? `From $${Number(project.budgetMin).toLocaleString()}`
    : 'Budget TBD';

  const statusInfo = PROJECT_STATUSES[project.status] || PROJECT_STATUSES.open;

  return (
    <div className={`rounded-2xl border p-5 transition-all cursor-pointer ${
      dark ? 'bg-charcoal-800 border-charcoal-700 hover:border-charcoal-500' : 'bg-white border-gray-200 hover:border-gray-300'
    }`} onClick={() => onView(project)}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${dark ? 'bg-charcoal-700' : 'bg-gray-100'}`}>
            {svc?.icon || '📋'}
          </div>
          <div>
            <h3 className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>{project.title}</h3>
            <p className={`text-[11px] ${textSub}`}>by {project.clientName} · {timeAgo(project.createdAt)}</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${statusBadgeClass(project.status, dark)}`}>
          {statusInfo.label}
        </span>
      </div>

      <p className={`text-xs leading-relaxed mb-4 line-clamp-3 ${dark ? 'text-charcoal-300' : 'text-gray-600'}`}>
        {project.description}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`flex items-center gap-1 text-xs font-semibold text-teal-400`}>
          <DollarSign size={11} /> {budgetStr}
        </span>
        {project.deadline && (
          <span className={`flex items-center gap-1 text-xs ${textSub}`}>
            <Calendar size={10} /> {new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        {project.location && (
          <span className={`flex items-center gap-1 text-xs ${textSub}`}>
            <MapPin size={10} /> {project.location}
          </span>
        )}
        {project.remote && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${dark ? 'bg-charcoal-700 text-charcoal-400' : 'bg-gray-100 text-gray-500'}`}>
            Remote OK
          </span>
        )}
        <span className={`flex items-center gap-1 text-xs ${textSub}`}>
          <Users size={10} /> {project.applications || 0} applied
        </span>
      </div>

      {project.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {project.skills.map(skill => (
            <span key={skill} className={`text-[10px] px-2 py-0.5 rounded-full ${dark ? 'bg-charcoal-700 text-charcoal-400' : 'bg-gray-100 text-gray-500'}`}>
              {skill}
            </span>
          ))}
        </div>
      )}

      <ProjectActionButtons
        project={project}
        isClient={isClient}
        applied={applied}
        dark={dark}
        onApply={e => { e.stopPropagation(); onApply(project); }}
        onStatusChange={onStatusChange}
        navigate={navigate}
      />
    </div>
  );
}

// ── Project Detail Modal ─────────────────────────────────────────
function ProjectDetailModal({ project, dark, onClose, onApply, myApplications, applications, isClient, onStatusChange }) {
  const navigate    = useNavigate();
  const svc         = SERVICES[project.serviceId];
  const textSub     = dark ? 'text-charcoal-400' : 'text-gray-500';
  const applied     = myApplications.some(a => a.projectId === project.id);
  const projectApps = applications.filter(a => a.projectId === project.id);
  const [showDispute, setShowDispute] = useState(false);

  const budgetStr = project.budgetMin && project.budgetMax
    ? `$${Number(project.budgetMin).toLocaleString()} – $${Number(project.budgetMax).toLocaleString()}`
    : project.budgetMax ? `Up to $${Number(project.budgetMax).toLocaleString()}`
    : project.budgetMin ? `From $${Number(project.budgetMin).toLocaleString()}`
    : 'Budget TBD';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-xl rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto ${dark ? 'bg-charcoal-900 border-charcoal-700' : 'bg-white border-gray-200'}`}>
        <button type="button" onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-lg z-10 ${dark ? 'text-charcoal-400 hover:text-white hover:bg-charcoal-700' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
          <X size={16} />
        </button>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${dark ? 'bg-charcoal-700' : 'bg-gray-100'}`}>
              {svc?.icon || '📋'}
            </div>
            <div className="flex-1">
              <h2 className={`font-display font-bold text-lg ${dark ? 'text-white' : 'text-gray-900'}`}>{project.title}</h2>
              <p className={`text-xs ${textSub}`}>Posted by {project.clientName} · {timeAgo(project.createdAt)}</p>
            </div>
          </div>

          {/* Details grid */}
          <div className={`grid grid-cols-2 gap-3 p-4 rounded-xl mb-4 ${dark ? 'bg-charcoal-800' : 'bg-gray-50'}`}>
            {[
              { icon: DollarSign, label: 'Budget', value: budgetStr, color: 'text-teal-400' },
              { icon: Users,      label: 'Applications', value: `${project.applications || 0} proposals`, color: textSub },
              ...(project.deadline ? [{ icon: Calendar, label: 'Deadline', value: new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), color: textSub }] : []),
              ...(project.location ? [{ icon: MapPin, label: 'Location', value: project.location + (project.remote ? ' (Remote OK)' : ''), color: textSub }] : []),
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label}>
                <p className={`text-[10px] font-medium mb-0.5 ${textSub}`}>{label}</p>
                <p className={`text-sm font-semibold flex items-center gap-1 ${color}`}><Icon size={12} /> {value}</p>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="mb-4">
            <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${textSub}`}>Project Status</p>
            <div className={`p-3 rounded-xl border overflow-x-auto ${dark ? 'border-charcoal-700 bg-charcoal-800' : 'border-gray-200 bg-gray-50'}`}>
              <ProjectTimeline status={project.status} dark={dark} />
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${textSub}`}>Project Description</p>
            <p className={`text-sm leading-relaxed ${dark ? 'text-charcoal-300' : 'text-gray-600'}`}>{project.description}</p>
          </div>

          {/* Skills */}
          {project.skills?.length > 0 && (
            <div className="mb-4">
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${textSub}`}>Required Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {project.skills.map(skill => (
                  <span key={skill} className={`text-xs px-2.5 py-1 rounded-full ${dark ? 'bg-charcoal-700 text-charcoal-300' : 'bg-gray-100 text-gray-700'}`}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Applications (client view) */}
          {isClient && projectApps.length > 0 && (
            <div className="mb-4">
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${textSub}`}>Proposals Received ({projectApps.length})</p>
              <div className="space-y-2">
                {projectApps.map(app => (
                  <div key={app.id} className={`p-3 rounded-xl border ${dark ? 'border-charcoal-700 bg-charcoal-800' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{app.creatorAvatar}</span>
                      <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{app.creatorName}</p>
                      {app.rate && <span className="text-xs font-bold text-teal-400">${Number(app.rate).toLocaleString()}</span>}
                    </div>
                    <p className={`text-xs ${dark ? 'text-charcoal-400' : 'text-gray-500'} line-clamp-2`}>{app.proposal}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <ProjectActionButtons
              project={project}
              isClient={isClient}
              applied={applied}
              dark={dark}
              onApply={() => { onClose(); onApply(project); }}
              onStatusChange={onStatusChange}
              navigate={navigate}
            />
            {/* Dispute button — shown for active projects */}
            {isClient && ['retainer_paid', 'in_progress', 'delivered', 'revision'].includes(project.status) && (
              <button type="button" onClick={() => setShowDispute(true)}
                className={`w-full py-2 rounded-xl border text-xs font-medium transition-all text-red-400 border-red-500/30 hover:bg-red-500/10`}>
                Open a Dispute
              </button>
            )}
          </div>
          {showDispute && (
            <DisputeModal
              project={project}
              dark={dark}
              onClose={() => setShowDispute(false)}
              onSubmitted={() => { setShowDispute(false); onStatusChange?.(project.id, 'disputed'); onClose(); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Project Board ───────────────────────────────────────────
export function ProjectBoard({ dark }) {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [projects, setProjects]         = useState([]);
  const [applications, setApplications] = useState([]);
  const [creatorListing, setCreatorListing] = useState(null);
  const [showPost, setShowPost]         = useState(false);
  const [applyTarget, setApplyTarget]   = useState(null);
  const [viewTarget, setViewTarget]     = useState(null);

  function handleStatusChange(projectId, newStatus) {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
    setViewTarget(prev => prev?.id === projectId ? { ...prev, status: newStatus } : prev);
  }
  const [search, setSearch]             = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterBudget, setFilterBudget] = useState('any');
  const [tab, setTab]                   = useState('browse'); // 'browse' | 'my_projects' | 'my_applications'

  const textSub = dark ? 'text-charcoal-400' : 'text-gray-500';

  useEffect(() => {
    setProjects(loadProjects());
    setApplications(loadApplications());
    if (user) {
      setCreatorListing(loadMyListing(user.id));
    }
  }, [user]);

  // Seed some demo projects if empty
  useEffect(() => {
    const existing = loadProjects();
    if (existing.length === 0) {
      const demos = [
        {
          id: 'demo-1', title: 'Product Photography for E-Commerce Launch',
          description: 'We\'re launching a new skincare line and need a professional photographer to shoot 30+ products with clean white backgrounds and lifestyle shots for our website and marketing materials.',
          serviceId: 'photography', budgetMin: 800, budgetMax: 1500, deadline: '2026-05-01',
          location: 'New York, NY', remote: false, skills: ['product photography', 'Adobe Lightroom', 'white background'],
          clientId: 'client-1', clientName: 'BeautyBrand Co', status: 'open', applications: 3,
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          id: 'demo-2', title: 'YouTube Channel Intro Video (30 sec)',
          description: 'Looking for a motion graphics designer to create a punchy 30-second intro animation for a tech review YouTube channel. Should include logo animation, sound effects, and a modern aesthetic.',
          serviceId: 'video', budgetMin: 300, budgetMax: 600, deadline: '2026-04-20',
          location: '', remote: true, skills: ['After Effects', 'motion graphics', 'logo animation'],
          clientId: 'client-2', clientName: 'TechReviewPro', status: 'open', applications: 7,
          createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        },
        {
          id: 'demo-3', title: 'Social Media Content Package — Real Estate',
          description: 'Boutique real estate agency needs monthly social media content: 12 Instagram posts, 4 Reels, and 8 Stories per month. Luxury properties, aspirational lifestyle aesthetic. Must have experience in real estate marketing.',
          serviceId: 'socialmedia', budgetMin: 1200, budgetMax: 2500, deadline: null,
          location: 'Los Angeles, CA', remote: true, skills: ['Instagram', 'Canva', 'real estate', 'copywriting'],
          clientId: 'client-3', clientName: 'LuxRealty Group', status: 'open', applications: 12,
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        },
        {
          id: 'demo-4', title: 'Podcast Production & Editing (Weekly)',
          description: 'Established weekly business podcast (200+ episodes) seeking reliable audio editor. Tasks: noise reduction, leveling, intro/outro insertion, chapter markers. ~45 min raw audio per week. Long-term contract preferred.',
          serviceId: 'podcast', budgetMin: 150, budgetMax: 300, deadline: null,
          location: '', remote: true, skills: ['Adobe Audition', 'podcast editing', 'Descript'],
          clientId: 'client-4', clientName: 'The Business Pod', status: 'open', applications: 5,
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        },
      ];
      saveProjects(demos);
      setProjects(demos);
    }
  }, []);

  function handleApplied(app) {
    setApplications(prev => [...prev, app]);
    setApplyTarget(null);
  }

  function handlePosted(project) {
    setProjects(prev => [project, ...prev]);
    setShowPost(false);
  }

  const myApplications = applications.filter(a => a.creatorId === creatorListing?.id);
  const myProjects      = projects.filter(p => p.clientId === user?.id);

  const isCreator = !!creatorListing;
  const isClient  = !!user; // Anyone logged in can post

  // Filter browse list
  const browsed = projects.filter(p => {
    if (tab !== 'browse') return true;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterService && p.serviceId !== filterService) return false;
    if (filterBudget !== 'any') {
      const range = BUDGET_RANGES.find(r => r.id === filterBudget);
      const mid = ((p.budgetMin || 0) + (p.budgetMax || p.budgetMin || 0)) / 2 || p.budgetMax || p.budgetMin || 0;
      if (range && (mid < range.min || mid > range.max)) return false;
    }
    return true;
  });

  const displayProjects = tab === 'my_projects' ? myProjects
    : tab === 'my_applications' ? projects.filter(p => myApplications.some(a => a.projectId === p.id))
    : browsed;

  const tabs = [
    { id: 'browse',           label: `Browse (${projects.filter(p => p.status === 'open').length})` },
    ...(user ? [
      { id: 'my_projects',      label: `My Posts (${myProjects.length})` },
      ...(isCreator ? [{ id: 'my_applications', label: `Applied (${myApplications.length})` }] : []),
    ] : []),
  ];

  return (
    <div className={`min-h-screen ${dark ? 'bg-charcoal-950' : 'bg-gray-50'}`}>
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className={`font-display font-bold text-2xl ${dark ? 'text-white' : 'text-gray-900'}`}>
              Project Board
            </h1>
            <p className={`text-sm mt-0.5 ${textSub}`}>
              {isCreator ? 'Browse projects and submit proposals' : 'Post a project and find the right creator'}
            </p>
          </div>
          {user && (
            <button type="button" onClick={() => setShowPost(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-charcoal-900 text-sm font-bold transition-all">
              <Plus size={14} /> Post a Project
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 p-1 rounded-xl border mb-5 w-fit ${dark ? 'bg-charcoal-800 border-charcoal-700' : 'bg-gray-100 border-gray-200'}`}>
          {tabs.map(({ id, label }) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                tab === id ? 'bg-gold-500 text-charcoal-900' : dark ? 'text-charcoal-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Filters (browse only) */}
        {tab === 'browse' && (
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="relative flex-1 min-w-48">
              <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${textSub}`} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search projects..."
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border outline-none transition-all ${
                  dark ? 'bg-charcoal-800 border-charcoal-700 text-white placeholder-charcoal-500 focus:border-gold-500'
                       : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gold-500'
                }`} />
            </div>
            <select value={filterService} onChange={e => setFilterService(e.target.value)}
              className={`px-3 py-2 text-sm rounded-xl border outline-none transition-all ${
                dark ? 'bg-charcoal-800 border-charcoal-700 text-white focus:border-gold-500'
                     : 'bg-white border-gray-200 text-gray-900 focus:border-gold-500'
              }`}>
              <option value="">All services</option>
              {Object.entries(SERVICES).map(([id, svc]) => (
                <option key={id} value={id}>{svc.icon} {svc.name}</option>
              ))}
            </select>
            <select value={filterBudget} onChange={e => setFilterBudget(e.target.value)}
              className={`px-3 py-2 text-sm rounded-xl border outline-none transition-all ${
                dark ? 'bg-charcoal-800 border-charcoal-700 text-white focus:border-gold-500'
                     : 'bg-white border-gray-200 text-gray-900 focus:border-gold-500'
              }`}>
              {BUDGET_RANGES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
        )}

        {/* Project grid */}
        {displayProjects.length === 0 ? (
          <div className={`text-center py-16 ${textSub}`}>
            <Briefcase size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">
              {tab === 'my_projects' ? "You haven't posted any projects yet"
               : tab === 'my_applications' ? "You haven't applied to any projects yet"
               : "No projects match your filters"}
            </p>
            <p className="text-xs mt-1 opacity-70">
              {tab === 'browse' ? 'Try adjusting your filters' : ''}
            </p>
            {tab === 'my_projects' && user && (
              <button type="button" onClick={() => setShowPost(true)}
                className="mt-4 px-5 py-2.5 rounded-xl bg-gold-500 text-charcoal-900 font-bold text-sm">
                Post Your First Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {displayProjects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                dark={dark}
                onApply={setApplyTarget}
                myApplications={myApplications}
                isClient={p.clientId === user?.id}
                onView={setViewTarget}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showPost && (
        <PostProjectModal dark={dark} onClose={() => setShowPost(false)} onPost={handlePosted} user={user} />
      )}
      {applyTarget && creatorListing && (
        <ApplyModal
          project={applyTarget}
          dark={dark}
          onClose={() => setApplyTarget(null)}
          onApply={handleApplied}
          creatorListing={creatorListing}
        />
      )}
      {viewTarget && (
        <ProjectDetailModal
          project={viewTarget}
          dark={dark}
          onClose={() => setViewTarget(null)}
          onApply={setApplyTarget}
          myApplications={myApplications}
          applications={applications}
          isClient={viewTarget.clientId === user?.id}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
