import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Send,
  HelpCircle,
  Activity,
  Globe,
  Shield,
  Cpu,
  Layers,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Terminal
} from 'lucide-react';

/* ── Types ───────────────────────────────────────────────────────────── */
interface FAQItem {
  id: string;
  category: 'reporting' | 'technology' | 'points' | 'wards';
  question: string;
  summary: string;
  answer: string;
  technicalDetail?: string;
}

interface SupportTicket {
  subject: string;
  category: string;
  description: string;
  ward: string;
  email: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface SystemLog {
  timestamp: string;
  agent: 'PerceptionAgent' | 'DeduplicationAgent' | 'Orchestrator' | 'System';
  message: string;
  status: 'info' | 'success' | 'warn' | 'error';
}

/* ── FAQ Database ────────────────────────────────────────────────────── */
const FAQ_DATABASE: FAQItem[] = [
  {
    id: 'FAQ-001',
    category: 'reporting',
    question: 'How do I submit a new civic issue report?',
    summary: 'You can submit issues using the "Report Issue" page by uploading a photo and specifying details.',
    answer: 'To submit a report, navigate to the "Report" tab from either the top navigation bar (desktop) or the center yellow action button (mobile). Upload a clear photograph of the issue (e.g., a pothole, broken street light, water leakage, or piling garbage). Our Perception Agent will automatically analyze the photo to confirm the hazard and estimate its initial severity. You will then confirm the location, add a short description, and submit the ticket.',
    technicalDetail: 'Images uploaded are routed through our secure Express gateway which proxies them to Cloudinary. The image URL is then processed by Google Gemini models in our backend services to parse visual descriptors, extract metadata, and identify safety hazard categories.'
  },
  {
    id: 'FAQ-002',
    category: 'reporting',
    question: 'Can I draft a report offline or save it for later?',
    summary: 'Yes. Civic Pulse supports auto-saving drafts to prevent data loss.',
    answer: 'Yes! The Report form automatically saves your progress locally as you type and upload files. If you accidentally close the app, lose internet connectivity, or navigate away, your inputs (including uploaded images and coordinates) will be restored when you return to the Report section.',
    technicalDetail: 'Draft states are monitored in real-time and debounced before being serialized into the browser localStorage. Once a report is successfully submitted, the local draft is cleared.'
  },
  {
    id: 'FAQ-003',
    category: 'technology',
    question: 'How does the Deduplication Agent merge overlapping reports?',
    summary: 'Reports within 100 meters of each other representing the same hazard are merged to avoid duplicate dispatch.',
    answer: 'When a new report is submitted, our Deduplication Agent checks the surrounding area for existing reports of the same type. If a matching active issue is found within approximately 100 meters, the new report is merged into the existing pin as an "upvote" or "re-verification" rather than creating a duplicate pin. This prevents spamming ward officers with multiple separate tasks for the same pothole or water leak.',
    technicalDetail: 'Deduplication is computed using the geofire-common library to convert latitude and longitude coordinates into 12-character geohash grids. Spatial queries are executed within neighboring geohashes. If the categorizations match, an adjacency algorithm combines the reports into a single parent entity.'
  },
  {
    id: 'FAQ-004',
    category: 'technology',
    question: 'What is the role of the Perception Agent?',
    summary: 'The Perception Agent uses computer vision models to classify reports and verify their severity.',
    answer: 'The Perception Agent is our AI-powered visual analysis system. It inspects submitted photographs in real-time. It determines: 1) whether a genuine infrastructure or safety hazard exists, 2) the specific category (e.g. sanitation, electricity, roads), and 3) the visual severity (e.g. deep pothole posing traffic danger vs. shallow crack). This helps prioritize ward resources without manual filtering.',
    technicalDetail: 'It utilizes multi-modal Gemini LLM APIs with custom prompt structures configured to output strict JSON schemas containing visual confirmation, classification tags, confidence levels, and severity scores ranging from 1 to 10.'
  },
  {
    id: 'FAQ-005',
    category: 'points',
    question: 'How do I earn points and climb the Leaderboard?',
    summary: 'Submit accurate reports, verify open issues, and assist in validating fixes to earn points.',
    answer: 'Civic Pulse operates on a trust-and-verify reputation system. You earn points through three main channels: 1) Submitting a report that gets verified by the community or ward officers (+50 pts), 2) Walking near an active report and submitting a verification/photo update (+20 pts), and 3) Confirming that a completed ward fix is indeed resolved (+30 pts). Spamming or uploading fake reports will result in point deductions.',
    technicalDetail: 'Reputation calculations are processed through transactional backend functions that audit user activity logs. Ranks are compiled and cached in real-time, displayed in the global Leaderboard page.'
  },
  {
    id: 'FAQ-006',
    category: 'points',
    question: 'What is a Verification, and why is it needed?',
    summary: 'Verifications confirm a report is accurate, increasing trust and raising severity attention.',
    answer: 'Before ward crews are dispatched, reports are ideally validated by other citizens nearby. When you see a pin on the map close to your location, you can click "Verify" to upload a fresh photo or add comments confirming the issue is still active. A high verification count increases the urgency score, signaling to ward administrators that the issue is affecting many citizens.',
    technicalDetail: 'The app matches the user\'s live GPS coordinates with the pin\'s coordinate envelope. If the user is within 150m, verification is unlocked, triggering status changes inside the Firebase Firestore database.'
  },
  {
    id: 'FAQ-007',
    category: 'wards',
    question: 'How are issues assigned to Wards?',
    summary: 'Issues are geographically assigned to specific administrative ward units based on boundary maps.',
    answer: 'The city is divided into administrative units called Wards (e.g., Ward 07 - Palace Gdns, Ward 12 - Riverside). When a coordinate is tagged, our Dispatch Orchestrator checks the ward boundary map to see which administration owns that location. The ticket is immediately routed to that specific ward\'s dashboard, alerting their crews.',
    technicalDetail: 'Wards are mapped as GeoJSON polygon layers. The system performs a point-in-polygon (PIP) mathematical query when a report is lodged to automatically map the issue\'s coordinates to the corresponding Ward ID.'
  },
  {
    id: 'FAQ-008',
    category: 'wards',
    question: 'What do the risk levels (Nominal, Moderate, Critical) mean?',
    summary: 'Risk levels reflect the current load of unresolved high-severity reports inside a ward.',
    answer: 'Each ward has a dynamic risk rating shown on the Admin dashboard. "Nominal" indicates very few outstanding severe issues. "Moderate" means there are pending issues but they are being processed normally. "Critical" indicates that severe issues (like open water main breaks or road blockages) are pending without active crew dispatch, requesting immediate attention.',
    technicalDetail: 'Risk levels are calculated hourly by aggregating active severity weights divided by the ward\'s active crew count, providing a real-time bottleneck index.'
  }
];

const MOCK_LOGS: SystemLog[] = [
  { timestamp: '07:20:11', agent: 'System', message: 'Geohash spatial index re-balanced for Ward 07.', status: 'info' },
  { timestamp: '07:20:45', agent: 'PerceptionAgent', message: 'Analyzed report image for CP-10198. Confirmed: Pothole. Confidence: 94%.', status: 'success' },
  { timestamp: '07:21:02', agent: 'DeduplicationAgent', message: 'Duplicate scan for coordinates [28.61, 77.20] completed. No overlapping pins found.', status: 'info' },
  { timestamp: '07:21:05', agent: 'Orchestrator', message: 'Routed ticket CP-10198 to Ward 07 (Palace Gdns) crew queue.', status: 'success' },
  { timestamp: '07:22:30', agent: 'PerceptionAgent', message: 'Analyzed report image for CP-10202. Warning: High noise or blurry image. Re-queue requested.', status: 'warn' },
  { timestamp: '07:23:18', agent: 'DeduplicationAgent', message: 'Matched report CP-10209 with active issue CP-10198 (dist: 34m). Merging reports...', status: 'success' },
  { timestamp: '07:24:00', agent: 'System', message: 'Cron active: Ward risk index re-calculated.', status: 'info' }
];

export default function FAQ() {
  /* ── State ─────────────────────────────────────────────────────────── */
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'reporting' | 'technology' | 'points' | 'wards'>('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  
  // Feedback states
  const [helpfulFeedback, setHelpfulFeedback] = useState<Record<string, 'yes' | 'no'>>(() => {
    try {
      const saved = localStorage.getItem('civic_pulse_faq_feedback');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Ticket form states
  const [ticketForm, setTicketForm] = useState<SupportTicket>({
    subject: '',
    category: 'reporting',
    description: '',
    ward: 'Ward 07',
    email: '',
    priority: 'medium'
  });
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketResult, setTicketResult] = useState<{ success: boolean; id?: string; trace?: string[] } | null>(null);

  // System status states
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>(MOCK_LOGS);
  const [chartData, setChartData] = useState<number[]>([180, 240, 210, 190, 220, 160, 140]);
  const [activeSystemStats, setActiveSystemStats] = useState({
    perceptionConfidence: 91.4,
    dedupMergeRate: 34.2,
    dispatchSLA: 98.7
  });

  /* ── Effects ───────────────────────────────────────────────────────── */
  // Persist helpful feedback
  useEffect(() => {
    localStorage.setItem('civic_pulse_faq_feedback', JSON.stringify(helpfulFeedback));
  }, [helpfulFeedback]);

  // Simulate live logs and changing charts
  useEffect(() => {
    const logInterval = setInterval(() => {
      const agents: Array<SystemLog['agent']> = ['PerceptionAgent', 'DeduplicationAgent', 'Orchestrator', 'System'];
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      
      let msg = '';
      let status: SystemLog['status'] = 'info';
      
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];

      if (randomAgent === 'PerceptionAgent') {
        const types = ['pothole', 'street light', 'trash pile', 'water leak'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        const score = Math.floor(Math.random() * 3) + 7;
        msg = `Analyzed new image stream. Detected: ${randomType}. Severity score: ${score}/10.`;
        status = 'success';
      } else if (randomAgent === 'DeduplicationAgent') {
        const met = Math.floor(Math.random() * 120);
        if (met < 60) {
          msg = `Overlap scan positive. Merged reporting request at distance: ${met}m.`;
          status = 'success';
        } else {
          msg = `Spatial boundary scan negative. Coordinates marked unique.`;
          status = 'info';
        }
      } else if (randomAgent === 'Orchestrator') {
        const w = Math.floor(Math.random() * 15) + 1;
        msg = `Assigned task backlog dispatch payload to Ward ${w.toString().padStart(2, '0')}.`;
        status = 'info';
      } else {
        const metric = (Math.random() * 5 + 95).toFixed(1);
        msg = `Core orchestrator heartbeat nominal. Current service uptime: ${metric}%.`;
        status = 'info';
      }

      setSystemLogs(prev => [
        { timestamp: timeStr, agent: randomAgent, message: msg, status },
        ...prev.slice(0, 15)
      ]);

      // Shift response time chart data randomly
      setChartData(prev => {
        const nextVal = Math.max(100, Math.min(350, prev[prev.length - 1] + Math.floor(Math.random() * 61) - 30));
        return [...prev.slice(1), nextVal];
      });

      // Fluctuate stats
      setActiveSystemStats(prev => ({
        perceptionConfidence: parseFloat((prev.perceptionConfidence + (Math.random() * 0.4 - 0.2)).toFixed(1)),
        dedupMergeRate: parseFloat((prev.dedupMergeRate + (Math.random() * 0.6 - 0.3)).toFixed(1)),
        dispatchSLA: Math.min(100, parseFloat((prev.dispatchSLA + (Math.random() * 0.2 - 0.1)).toFixed(1)))
      }));

    }, 5000);

    return () => clearInterval(logInterval);
  }, []);

  /* ── Computations ──────────────────────────────────────────────────── */
  const filteredFAQs = useMemo(() => {
    return FAQ_DATABASE.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = searchQuery === '' || 
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.technicalDetail && item.technicalDetail.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  /* ── Handlers ──────────────────────────────────────────────────────── */
  const handleToggleFAQ = (id: string) => {
    setExpandedFAQ(prev => (prev === id ? null : id));
  };

  const handleFeedback = (id: string, value: 'yes' | 'no') => {
    setHelpfulFeedback(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.email || !ticketForm.subject || !ticketForm.description) {
      alert('Please fill out all required fields.');
      return;
    }

    setIsSubmittingTicket(true);
    setTicketResult(null);

    // Simulate backend processing
    setTimeout(() => {
      const ticketId = `TKT-${Math.floor(Math.random() * 90000) + 10000}`;
      const now = new Date();
      const time = now.toTimeString().split(' ')[0];
      
      const trace = [
        `[${time}] Dispatcher initialized for ticket ${ticketId}`,
        `[${time}] Parsing subject and description using PerceptionAgent...`,
        `[${time}] Category classified as "${ticketForm.category.toUpperCase()}" with confidence 97.4%`,
        `[${time}] Geocoding ticket payload to boundary coordinates of ${ticketForm.ward}...`,
        `[${time}] Success! Assigned target to dispatch database of ${ticketForm.ward} with priority [${ticketForm.priority.toUpperCase()}]`,
        `[${time}] Confirmation email queued for delivery to ${ticketForm.email}`
      ];

      setTicketResult({
        success: true,
        id: ticketId,
        trace
      });
      setIsSubmittingTicket(false);

      // Append to live logs
      setSystemLogs(prev => [
        { timestamp: time, agent: 'Orchestrator', message: `Citizen ticket ${ticketId} created and dispatched to ${ticketForm.ward}.`, status: 'success' },
        ...prev
      ]);

      // Reset form fields but keep email
      setTicketForm(prev => ({
        ...prev,
        subject: '',
        description: '',
        priority: 'medium'
      }));
    }, 1500);
  };

  return (
    <div className="flex-1 bg-paper text-ink overflow-y-auto" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* ═══════════════════════════════════════════════════════════════
          HEADER — Blueprint Grid Theme
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bp-grid text-white py-12 px-6 lg:px-16 border-b border-grid relative">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-hazard uppercase mb-2">
              <span className="w-2 h-2 rounded-full bg-hazard inline-block animate-pulse" />
              Resource Directory & Citizens Support
            </div>
            <h1 className="text-4xl lg:text-5xl font-display font-black uppercase tracking-wide leading-none">
              Help & <span className="text-hazard">FAQ Center</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-xl mt-2 leading-relaxed font-sans">
              Learn how our multi-agent systems coordinate reporting, deduplicate overlapping issues, and dispatch crews. Submit help requests directly to ward dispatchers below.
            </p>
          </div>

          {/* Quick Stats Block */}
          <div className="flex gap-4 flex-wrap bg-slate-900/40 p-4 border border-grid/60 rounded">
            <div className="text-center px-4 border-r border-grid/40">
              <span className="block text-2xl font-display font-bold text-white">{activeSystemStats.perceptionConfidence}%</span>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">AI Conf.</span>
            </div>
            <div className="text-center px-4 border-r border-grid/40">
              <span className="block text-2xl font-display font-bold text-hazard">{activeSystemStats.dedupMergeRate}%</span>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Merge Rate</span>
            </div>
            <div className="text-center px-4">
              <span className="block text-2xl font-display font-bold text-verified">{activeSystemStats.dispatchSLA}%</span>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">SLA Uptime</span>
            </div>
          </div>
        </div>

        {/* Global Breadcrumb */}
        <div className="max-w-6xl mx-auto mt-6">
          <Link to="/" className="text-xs font-mono text-slate-400 hover:text-white transition no-underline">
            &larr; Return to Landing
          </Link>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SEARCH & FILTER STRIP
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-paper-dim sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search help topics, keywords, AI agents..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-paper-dim rounded focus:border-hazard focus:outline-none bg-paper/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 hover:text-ink"
              >
                Clear
              </button>
            )}
          </div>

          {/* Categories Tab Selector */}
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'All Topics', icon: <HelpCircle className="w-3.5 h-3.5" /> },
              { id: 'reporting', label: 'Reporting', icon: <Globe className="w-3.5 h-3.5" /> },
              { id: 'technology', label: 'AI Technology', icon: <Cpu className="w-3.5 h-3.5" /> },
              { id: 'points', label: 'Reputation', icon: <Layers className="w-3.5 h-3.5" /> },
              { id: 'wards', label: 'Wards Ops', icon: <Activity className="w-3.5 h-3.5" /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition whitespace-nowrap ${
                  selectedCategory === tab.id
                    ? 'bg-ink text-white'
                    : 'bg-paper text-slate-600 hover:bg-paper-dim hover:text-ink'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT — Grid layout FAQ / Form & Dashboard
      ═══════════════════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Accordion FAQs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-display font-extrabold uppercase tracking-wide flex items-center gap-2">
              <Layers className="w-5 h-5 text-hazard" />
              Frequently Asked Questions ({filteredFAQs.length})
            </h2>
            {searchQuery && (
              <span className="text-xs font-mono text-slate-500">
                Filtered results for "{searchQuery}"
              </span>
            )}
          </div>

          {filteredFAQs.length === 0 ? (
            <div className="bg-white border border-paper-dim rounded-md p-10 text-center text-slate-500 space-y-3">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-semibold text-lg text-ink">No matching topics found</p>
              <p className="text-sm max-w-md mx-auto">
                Try modifying your query or selecting "All Topics" to find information on reporting, system operations, and point systems.
              </p>
              <button 
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }} 
                className="btn-secondary py-1.5 px-3 text-xs mt-2"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFAQs.map((faq) => {
                const isExpanded = expandedFAQ === faq.id;
                const feedbackStatus = helpfulFeedback[faq.id];

                return (
                  <div
                    key={faq.id}
                    className="bg-white border border-paper-dim rounded shadow-sm hover:border-slate-300 transition overflow-hidden"
                  >
                    {/* Collapsed view header */}
                    <button
                      onClick={() => handleToggleFAQ(faq.id)}
                      className="w-full text-left p-5 flex justify-between items-center gap-4 cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-paper-dim text-slate-700 uppercase tracking-wider">
                            {faq.id}
                          </span>
                          <span className="font-mono text-[9px] font-bold text-hazard uppercase tracking-wider">
                            {faq.category}
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-ink leading-snug">
                          {faq.question}
                        </h3>
                        {!isExpanded && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-1 font-sans">
                            {faq.summary}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-slate-400 bg-paper p-1 rounded-full">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </button>

                    {/* Expanded Content Panel */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-dashed border-paper-dim bg-slate-50/50">
                        <div className="space-y-4">
                          {/* Core Answer */}
                          <div className="text-sm text-slate-600 leading-relaxed font-sans">
                            {faq.answer}
                          </div>

                          {/* Technical Specification box */}
                          {faq.technicalDetail && (
                            <div className="bg-ink/5 p-4 border-l-2 border-grid rounded-r text-xs text-slate-700 font-mono space-y-1">
                              <span className="font-bold text-ink uppercase text-[9px] tracking-wider block">
                                Technical Specifications & Logic:
                              </span>
                              <p className="leading-relaxed">
                                {faq.technicalDetail}
                              </p>
                            </div>
                          )}

                          {/* Feedback / Rating strip */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-paper-dim/80">
                            <span className="text-[11px] font-mono text-slate-500">
                              Was this explanation helpful to understand how Civic Pulse operates?
                            </span>
                            <div className="flex gap-2">
                              {feedbackStatus ? (
                                <span className="text-xs font-mono text-verified flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Thanks for your response!
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleFeedback(faq.id, 'yes')}
                                    className="flex items-center gap-1 text-[11px] font-semibold border border-paper-dim bg-white px-2.5 py-1 text-slate-600 rounded hover:bg-slate-50 hover:text-ink cursor-pointer transition"
                                  >
                                    <ThumbsUp className="w-3.5 h-3.5 text-verified" />
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => handleFeedback(faq.id, 'no')}
                                    className="flex items-center gap-1 text-[11px] font-semibold border border-paper-dim bg-white px-2.5 py-1 text-slate-600 rounded hover:bg-slate-50 hover:text-ink cursor-pointer transition"
                                  >
                                    <ThumbsDown className="w-3.5 h-3.5 text-signal" />
                                    No
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Support Form & System Status Log Ticker */}
        <div className="space-y-8">
          
          {/* Ticketing Form Panel */}
          <div className="bg-white border border-paper-dim rounded shadow-sm overflow-hidden">
            
            {/* Header banner */}
            <div className="bp-grid text-white p-5 border-b border-grid">
              <h3 className="text-lg font-display font-bold uppercase tracking-wide flex items-center gap-2">
                <Terminal className="w-5 h-5 text-hazard" />
                Submit Citizen Inquiry
              </h3>
              <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                Bypasses agent queue to target ward dispatchers.
              </p>
            </div>

            {/* Form body */}
            <form onSubmit={handleTicketSubmit} className="p-5 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Summary of help request..."
                  className="w-full p-2 text-xs border border-paper-dim rounded bg-paper/20 focus:border-hazard focus:outline-none"
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    className="w-full p-2 text-xs border border-paper-dim rounded bg-white focus:border-hazard focus:outline-none"
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="reporting">Issue Reporting</option>
                    <option value="points">Points & Ranks</option>
                    <option value="deduplication">Deduplication</option>
                    <option value="auth">Account/Auth</option>
                    <option value="other">Other Inquiry</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">
                    Target Ward
                  </label>
                  <select
                    className="w-full p-2 text-xs border border-paper-dim rounded bg-white focus:border-hazard focus:outline-none"
                    value={ticketForm.ward}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, ward: e.target.value }))}
                  >
                    <option value="Ward 07">Ward 07 (Palace Gdns)</option>
                    <option value="Ward 12">Ward 12 (Riverside)</option>
                    <option value="Ward 03">Ward 03 (Market Block)</option>
                    <option value="Ward 09">Ward 09 (Tech Corridor)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  className="w-full p-2 text-xs border border-paper-dim rounded bg-paper/20 focus:border-hazard focus:outline-none"
                  value={ticketForm.email}
                  onChange={(e) => setTicketForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">
                  Priority level
                </label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high', 'critical'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTicketForm(prev => ({ ...prev, priority: p }))}
                      className={`flex-1 py-1 text-[10px] font-mono font-bold uppercase rounded border transition cursor-pointer ${
                        ticketForm.priority === p
                          ? p === 'critical'
                            ? 'bg-signal text-white border-signal'
                            : p === 'high'
                            ? 'bg-hazard text-ink border-hazard font-black'
                            : p === 'medium'
                            ? 'bg-ink text-white border-ink'
                            : 'bg-verified text-white border-verified'
                          : 'border-paper-dim bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain your inquiry in details..."
                  className="w-full p-2 text-xs border border-paper-dim rounded bg-paper/20 focus:border-hazard focus:outline-none font-sans"
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                />
                <span className="text-[10px] font-mono text-slate-400 float-right">
                  {ticketForm.description.length} chars
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmittingTicket}
                className="w-full btn-primary py-2 text-xs flex justify-center items-center gap-2 mt-4 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingTicket ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Orchestrating Dispatch...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Submit Ticket to Ward Crew
                  </>
                )}
              </button>
            </form>

            {/* Ticket Submission Result Console Trace */}
            {ticketResult && (
              <div className="p-5 border-t border-paper-dim bg-slate-900 text-white font-mono text-[10px] space-y-2 select-text">
                <div className="flex justify-between items-center text-hazard font-bold">
                  <span>DISPATCH LOG FOR {ticketResult.id}</span>
                  <span className="text-[8px] bg-verified text-white px-1.5 py-0.5 rounded font-mono uppercase">
                    PROCESSED
                  </span>
                </div>
                <div className="space-y-1 text-slate-300 max-h-48 overflow-y-auto pr-1">
                  {ticketResult.trace?.map((line, idx) => (
                    <div key={idx} className="leading-relaxed">
                      {line}
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-slate-400 font-sans mt-2">
                  Our dispatchers will inspect your ticket CP-10198 overlap indexes. You will receive email notifications at <b>{ticketForm.email}</b>.
                </p>
              </div>
            )}
          </div>

          {/* System Performance Graph and Simulated Log Ticker */}
          <div className="bg-slate-950 border border-slate-800 rounded shadow-lg p-5 text-white space-y-4">
            <div className="flex justify-between items-center border-b border-slate-850 pb-2">
              <span className="text-xs font-mono font-bold text-hazard tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-verified inline-block animate-ping" />
                SYSTEM PERFORMANCE LIVEFEED
              </span>
              <span className="text-[9px] font-mono text-slate-500">
                SWEEP: 5S
              </span>
            </div>

            {/* Custom SVG Sparkline Graph */}
            <div>
              <span className="block text-[10px] font-mono text-slate-400 mb-2">
                API Agent Dispatch Response Time (ms)
              </span>
              <div className="relative h-20 w-full bg-slate-900 border border-slate-800/80 rounded flex items-end px-2 overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 200 80" preserveAspectRatio="none">
                  {/* Grid lines inside graph */}
                  <line x1="0" y1="20" x2="200" y2="20" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                  <line x1="0" y1="40" x2="200" y2="40" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                  <line x1="0" y1="60" x2="200" y2="60" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                  
                  {/* Polyline chart representing response times */}
                  <polyline
                    fill="none"
                    stroke="var(--hazard)"
                    strokeWidth="1.5"
                    points={chartData
                      .map((val, idx) => `${(idx * 200) / 6},${80 - (val / 350) * 85}`)
                      .join(' ')}
                  />
                </svg>
                {/* Labels */}
                <span className="absolute left-2 top-1 text-[8px] font-mono text-slate-500">350ms</span>
                <span className="absolute left-2 bottom-1 text-[8px] font-mono text-slate-500">100ms</span>
                <span className="absolute right-2 bottom-1 text-[9px] font-mono text-hazard font-bold">
                  {chartData[chartData.length - 1]}ms
                </span>
              </div>
            </div>

            {/* Simulated Live Logging Ticker */}
            <div className="space-y-2">
              <span className="block text-[10px] font-mono text-slate-400">
                Agent Operation Console
              </span>
              <div className="bg-slate-900/80 border border-slate-850 rounded p-3 h-44 overflow-y-auto font-mono text-[9px] space-y-2 select-text">
                {systemLogs.map((log, index) => {
                  const agentColor = 
                    log.agent === 'PerceptionAgent' ? 'text-cyan-400' :
                    log.agent === 'DeduplicationAgent' ? 'text-hazard' :
                    log.agent === 'Orchestrator' ? 'text-purple-400' : 'text-slate-400';
                  
                  const statusIndicator = 
                    log.status === 'success' ? 'text-verified' :
                    log.status === 'warn' ? 'text-hazard font-bold' :
                    log.status === 'error' ? 'text-signal font-bold' : 'text-slate-400';

                  return (
                    <div key={index} className="border-b border-slate-850/60 pb-1.5 last:border-0">
                      <div className="flex justify-between text-slate-500 text-[8px] mb-0.5">
                        <span>[{log.timestamp}]</span>
                        <span className={`${agentColor} font-bold`}>{log.agent}</span>
                      </div>
                      <p className="text-slate-300 leading-normal">
                        <span className={`${statusIndicator} mr-1`}>&bull;</span>
                        {log.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER DECK
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border-t border-paper-dim py-6 mt-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div>
            <span>© Civic Pulse Operations. Ward database nodes authenticated.</span>
          </div>
          <div className="flex gap-4">
            <Link to="/home" className="hover:text-ink transition no-underline">Live Feed</Link>
            <span>&bull;</span>
            <Link to="/leaderboard" className="hover:text-ink transition no-underline">Leaderboard</Link>
            <span>&bull;</span>
            <Link to="/report" className="hover:text-ink transition no-underline">Report Incident</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
