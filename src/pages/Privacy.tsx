import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Search,
  Eye,
  Info,
  Layers,
  Lock,
  Download,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  FileText,
  UserCheck,
  Database,
  Cpu,
  Smartphone,
  ChevronRight,
  Sparkles
} from 'lucide-react';

/* ── Types ───────────────────────────────────────────────────────────── */
interface PrivacySection {
  id: string;
  category: 'collection' | 'ai' | 'geohash' | 'erasure' | 'security';
  title: string;
  subtitle: string;
  content: string;
  clauses: { title: string; text: string }[];
  gdprCompliance: string;
}

interface DataPipelineNode {
  id: string;
  label: string;
  role: string;
  encryption: string;
  dataRetained: string;
  thirdParty: boolean;
  description: string;
}

interface AuditQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

/* ── Database ────────────────────────────────────────────────────────── */
const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: 'prv-collection',
    category: 'collection',
    title: '1. User Data Classification & Collection',
    subtitle: 'What data we collect and how we classify citizen inputs.',
    gdprCompliance: 'GDPR-Art-6 (Lawful Processing)',
    content: 'We collect data essential to routing local civic issues to appropriate ward crews. This includes account credentials, visual hazard media, and location coordinates.',
    clauses: [
      {
        title: '1.1 Identity Profiles',
        text: 'When creating an account, we record your email and username. This information is required for authentication and to associate reporting records with leaderboard points.'
      },
      {
        title: '1.2 Visual Hazard Media',
        text: 'Photographs uploaded during report submission are processed to extract structural hazard details. The system scans the image to identify security risks (e.g. personal faces or license plates) and redacts them prior to database write.'
      },
      {
        title: '1.3 Hardware Telemetry',
        text: 'We record basic device parameters (OS, browser type) to optimize interface loading. IP addresses are logged solely for security audits and rate-limiting, and are pruned after 14 days.'
      }
    ]
  },
  {
    id: 'prv-ai',
    category: 'ai',
    title: '2. AI Perception & Image Processing Limits',
    subtitle: 'Security parameters of automated computer vision scanning.',
    gdprCompliance: 'GDPR-Art-22 (Automated Decision Making)',
    content: 'Our Perception Agent (Gemini AI) processes photographs to categorize hazards and estimate visual severity. This processing operates under strict privacy guardrails.',
    clauses: [
      {
        title: '2.1 Non-Retention of Visual IDs',
        text: 'Images are analyzed to detect structural features (e.g. pavement cracking, water flow). The AI model is explicitly configured to ignore and discard human biological features, faces, or personal identifiable signs.'
      },
      {
        title: '2.2 Gemini API Privacy Agreement',
        text: 'Visual prompts processed through Google Gemini models are handled via secure API gateways. We utilize enterprise API tiers which guarantee that submitted images are NOT used to train Google models or retained beyond the analysis duration.'
      },
      {
        title: '2.3 Safety Classification Audits',
        text: 'If the Perception Agent flags an image as containing non-compliant or illegal content, the image is quarantined. Only authorized ward administrators can inspect quarantined images to confirm safety flags.'
      }
    ]
  },
  {
    id: 'prv-geohash',
    category: 'geohash',
    title: '3. Geofenced Anonymization & Geohashing',
    subtitle: 'How we convert coordinates to preserve location privacy.',
    gdprCompliance: 'GDPR-Art-32 (Pseudonymization)',
    content: 'Exact coordinates are necessary for crews to find hazards. However, to preserve citizen privacy, public maps utilize geohashed approximations.',
    clauses: [
      {
        title: '3.1 Geohash Generalization',
        text: 'While the backend records coordinates to route crews, the public live feed maps issues within generalized geohashes. This prevents tracking a specific citizen\'s movement history through their reported items.'
      },
      {
        title: '3.2 Deduplication Aggregation',
        text: 'Overlapping coordinates (within 100m) are merged. The secondary coordinates are stored as a verification upvote, and their author ID is obfuscated on public pins to protect user spatial patterns.'
      },
      {
        title: '3.3 Geofence Verifications',
        text: 'To verify a nearby issue, the app checks if your current GPS matches the pin envelope (150m). Your live coordinates are processed client-side to unlock verification, and are never saved to our database logs.'
      }
    ]
  },
  {
    id: 'prv-erasure',
    category: 'erasure',
    title: '4. Data Erasure & The Right to be Forgotten',
    subtitle: 'How to archive reports, delete accounts, and prune telemetry.',
    gdprCompliance: 'GDPR-Art-17 (Right to Erasure)',
    content: 'Citizens retain full ownership over their user profiles. You can request account deletion or data pruning at any time.',
    clauses: [
      {
        title: '4.1 Account Deactivation',
        text: 'Deactivating your account wipes your email, username, and active token session. Your name on the leaderboard will be purged, and historical points are invalidated.'
      },
      {
        title: '4.2 Report Anonymization',
        text: 'When an account is deleted, historical reports submitted by the user are kept to maintain municipal records, but all user metadata is scrubbed. The report author changes to "Archived User".'
      },
      {
        title: '4.3 Image Deletion Policy',
        text: 'Resolved reports have their associated photos deleted from our Cloudinary storage bucket 90 days after the ward crew marks the issue as resolved.'
      }
    ]
  },
  {
    id: 'prv-security',
    category: 'security',
    title: '5. Security Standards & Encryption Node Map',
    subtitle: 'Cryptographic transport protocols and backend firewall layers.',
    gdprCompliance: 'GDPR-Art-25 (Privacy by Design)',
    content: 'We enforce bank-grade security envelopes to secure transaction data between mobile users, AI agents, and ward servers.',
    clauses: [
      {
        title: '5.1 Transport Security',
        text: 'All communication between client applications, external APIs, and the backend utilizes HTTPS with TLS 1.3 encryption. Unencrypted HTTP traffic is rejected at our gateway.'
      },
      {
        title: '5.2 Firestore Security Envelopes',
        text: 'Our Firebase database operates under strict security rules. User profile nodes can only be written to by their authenticated owner. Ward database nodes are read-only to normal citizens.'
      },
      {
        title: '5.3 Security Logs Audits',
        text: 'Database write activities are logged in an append-only audit trail. This ensures that any status modifications (e.g. marking an issue resolved) can be traced back to authenticated users or ward officials.'
      }
    ]
  }
];

const DATA_PIPELINE_NODES: DataPipelineNode[] = [
  {
    id: 'node-client',
    label: 'Citizen App',
    role: 'Client interface',
    encryption: 'TLS 1.3 / local LocalStorage',
    dataRetained: 'Authentication session token',
    thirdParty: false,
    description: 'The front-end client (React). Captures user location, descriptions, and photographs. Geofenced verification logic runs client-side to protect GPS privacy.'
  },
  {
    id: 'node-gateway',
    label: 'Express API Gateway',
    role: 'Secure middleware proxy',
    encryption: 'HTTPS / JSON Web Tokens',
    dataRetained: 'Rate-limiting IP logs (14 days)',
    thirdParty: false,
    description: 'Secures requests, verifies JWT tokens, and proxies connections to Gemini and Cloudinary, preventing exposure of API keys.'
  },
  {
    id: 'node-cloudinary',
    label: 'Cloudinary',
    role: 'Image hosting cloud',
    encryption: 'SSL at Rest & Transit',
    dataRetained: 'Report photos (Deleted 90 days post-resolution)',
    thirdParty: true,
    description: 'Stores photographs uploaded for reports. Provides optimized content delivery network (CDN) links to ward dashboards.'
  },
  {
    id: 'node-gemini',
    label: 'Gemini AI Agent',
    role: 'Visual Perception Analysis',
    encryption: 'TLS 1.3 / enterprise privacy',
    dataRetained: 'Ephemeral (Zero retention)',
    thirdParty: true,
    description: 'Analyzes photos in real-time. Estimates severity and verifies categories. Images are processed via API tiers that do not retain data for model training.'
  },
  {
    id: 'node-database',
    label: 'Firestore Database',
    role: 'Primary storage core',
    encryption: 'AES-256 at rest',
    dataRetained: 'Active report pins, user profiles',
    thirdParty: true,
    description: 'Stores geohash indexes, active ticket coordinates, verification states, and user points. Protected by strict server-side rules.'
  },
  {
    id: 'node-ward',
    label: 'Ward Dispatch Terminal',
    role: 'Administrative interface',
    encryption: 'Role-based authorization',
    dataRetained: 'Historical resolution telemetry',
    thirdParty: false,
    description: 'The endpoint dashboard visible to ward crews. Displays incoming resolved tickets and handles dispatch coordinates.'
  }
];

const AUDIT_QUESTIONS: AuditQuestion[] = [
  {
    id: 1,
    question: 'How are reported coordinates shared publicly on the Live Map?',
    options: [
      'They are shown exactly down to the centimeter.',
      'They are generalized into geohash grids to hide exact user patterns.',
      'They are kept completely hidden from the map.',
      'They are sent to social media platforms.'
    ],
    correctIndex: 1,
    explanation: 'Civic Pulse converts exact coordinates to generalized geohash grids for public map view. This prevents tracking users based on their reporting history.'
  },
  {
    id: 2,
    question: 'Does the Gemini AI Perception Agent use your photos to train public models?',
    options: [
      'Yes, all photos train public Google models.',
      'Only if the photo gets verified.',
      'No, the enterprise API tier guarantees zero retention for model training.',
      'Yes, but only for advertising.'
    ],
    correctIndex: 2,
    explanation: 'We connect to Gemini using secure enterprise API tiers. Submitted hazard images are processed ephemerally and are not retained or used for training.'
  },
  {
    id: 3,
    question: 'What happens to your photographs after an issue is resolved?',
    options: [
      'They are kept on the server forever.',
      'They are sold to third parties.',
      'They are permanently deleted from Cloudinary storage after 90 days.',
      'They are converted to NFT badges.'
    ],
    correctIndex: 3,
    explanation: 'To minimize storage footprint and respect privacy, photographs of resolved reports are permanently deleted from Cloudinary storage 90 days after closure.'
  },
  {
    id: 4,
    question: 'Under what conditions is your device location checked for verifications?',
    options: [
      'We track your location in the background continuously.',
      'Location is verified client-side to ensure you are within 150m of the pin.',
      'Location is never checked.',
      'Location is sent to database logs every hour.'
    ],
    correctIndex: 1,
    explanation: 'Verifications are geofenced. Location check runs client-side to verify if you are within 150m of the pin. Your exact GPS coordinates are not saved to database logs.'
  }
];

export default function Privacy() {
  /* ── State ─────────────────────────────────────────────────────────── */
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'collection' | 'ai' | 'geohash' | 'erasure' | 'security'>('all');
  
  // Pipeline inspect node
  const [selectedNode, setSelectedNode] = useState<DataPipelineNode | null>(DATA_PIPELINE_NODES[0]);

  // Retention Simulator Sliders
  const [retentionImages, setRetentionImages] = useState(90); // 10 to 365 days
  const [retentionGPS, setRetentionGPS] = useState(30); // 1 to 180 days
  const [retentionLogs, setRetentionLogs] = useState(14); // 7 to 90 days

  // Audit Wizard states
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [wizardCompleted, setWizardCompleted] = useState(false);
  const [wizardScore, setWizardScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  /* ── Computations ──────────────────────────────────────────────────── */
  const filteredSections = useMemo(() => {
    return PRIVACY_SECTIONS.filter(section => {
      const matchesCategory = selectedCategory === 'all' || section.category === selectedCategory;
      const matchesSearch = !searchQuery || 
        section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.gdprCompliance.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.clauses.some(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.text.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const privacyGrade = useMemo(() => {
    const totalDays = retentionImages + retentionGPS + retentionLogs;
    if (totalDays <= 50) return { grade: 'A+', color: 'text-verified', desc: 'Maximum Privacy Protection. Data lifespans are minimized.' };
    if (totalDays <= 120) return { grade: 'A', color: 'text-verified', desc: 'Strong Privacy Safeguards. Normal cleanup schedules.' };
    if (totalDays <= 220) return { grade: 'B', color: 'text-hazard', desc: 'Balanced Privacy. Recommended for normal debugging.' };
    return { grade: 'C-', color: 'text-signal', desc: 'Relaxed Retention. Higher data storage risk.' };
  }, [retentionImages, retentionGPS, retentionLogs]);

  /* ── Handlers ──────────────────────────────────────────────────────── */
  const handleOptionSelect = (idx: number) => {
    if (showExplanation) return;
    setSelectedOptionIdx(idx);
    setShowExplanation(true);
    if (idx === AUDIT_QUESTIONS[currentQuestionIdx].correctIndex) {
      setWizardScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOptionIdx(null);
    setShowExplanation(false);
    if (currentQuestionIdx < AUDIT_QUESTIONS.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      setWizardCompleted(true);
    }
  };

  const resetWizard = () => {
    setCurrentQuestionIdx(0);
    setSelectedOptionIdx(null);
    setWizardCompleted(false);
    setWizardScore(0);
    setShowExplanation(false);
  };

  return (
    <div className="flex-1 bg-paper text-ink overflow-y-auto" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      
      {/* ═══════════════════════════════════════════════════════════════
          HEADER — Blueprint Grid Layout
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bp-grid text-white py-12 px-6 lg:px-16 border-b border-grid relative">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-hazard uppercase mb-2">
              <Lock className="w-4 h-4 text-hazard inline-block" />
              Citizen Privacy Charter & Telemetry Rules
            </div>
            <h1 className="text-4xl lg:text-5xl font-display font-black uppercase tracking-wide leading-none">
              Privacy <span className="text-hazard">Policy</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-xl mt-2 leading-relaxed font-sans">
              Learn how we anonymize geohash coordinates, secure visual uploads, and guarantee your data rights on the Civic Pulse grid.
            </p>
          </div>

          <div className="bg-slate-900/60 p-4 border border-grid rounded flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-verified inline-block animate-pulse" />
            <div className="font-mono text-xs">
              <span className="block text-slate-400">DATA STANDARD:</span>
              <span className="text-white font-bold">GDPR & CCPA COMPLIANT</span>
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
          INTERACTIVE DATA PIPELINE DIAGRAM
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-950 text-white border-b border-slate-800 py-8 px-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center md:text-left">
            <h2 className="text-xl font-display font-extrabold uppercase tracking-wide flex items-center justify-center md:justify-start gap-2">
              <Sparkles className="w-5 h-5 text-hazard" />
              Interactive Data Flow Pipeline
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-1">
              Click on the pipeline nodes below to trace where your data travels, how it is encrypted, and where it is scrubbed.
            </p>
          </div>

          {/* SVG Pipeline */}
          <div className="bg-slate-900 border border-slate-800/80 rounded p-6">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center justify-center relative">
              
              {DATA_PIPELINE_NODES.map((node, i) => {
                const isSelected = selectedNode?.id === node.id;
                const icon = 
                  node.id === 'node-client' ? <Smartphone className="w-4 h-4" /> :
                  node.id === 'node-gateway' ? <Lock className="w-4 h-4" /> :
                  node.id === 'node-cloudinary' ? <FileText className="w-4 h-4" /> :
                  node.id === 'node-gemini' ? <Cpu className="w-4 h-4" /> :
                  node.id === 'node-database' ? <Database className="w-4 h-4" /> :
                  <Smartphone className="w-4 h-4" />;

                return (
                  <div key={node.id} className="flex flex-col items-center relative">
                    <button
                      onClick={() => setSelectedNode(node)}
                      className={`w-full max-w-[150px] p-3 rounded border text-center transition cursor-pointer select-none ${
                        isSelected 
                          ? 'bg-hazard text-ink border-hazard font-bold shadow-md shadow-hazard/10 scale-105' 
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex justify-center mb-1 text-inherit">
                        {icon}
                      </div>
                      <span className="block text-xs font-mono truncate">{node.label}</span>
                      <span className="block text-[8px] text-slate-500 uppercase tracking-wider truncate mt-0.5">
                        {node.thirdParty ? 'Third Party' : 'Core Node'}
                      </span>
                    </button>
                    
                    {/* Connecting arrow (hidden on mobile, last node) */}
                    {i < DATA_PIPELINE_NODES.length - 1 && (
                      <div className="hidden md:block absolute -right-[15px] top-1/2 -translate-y-1/2 text-slate-600 font-mono text-[10px]">
                        &rarr;
                      </div>
                    )}
                  </div>
                );
              })}

            </div>

            {/* Node Inspector Details Box */}
            {selectedNode && (
              <div className="bg-slate-950 border border-slate-800 rounded p-4 mt-6 text-xs font-mono grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold text-hazard uppercase mb-1">
                    Node Inspect: {selectedNode.label}
                  </h4>
                  <p className="text-slate-300 text-[11px] leading-relaxed font-sans mb-3">
                    {selectedNode.description}
                  </p>
                  <span className="block text-[9px] text-slate-500 uppercase tracking-widest">
                    Operational Role
                  </span>
                  <span className="text-white text-[11px] font-bold block">{selectedNode.role}</span>
                </div>
                
                <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-800/80 pt-3 md:pt-0 md:pl-4">
                  <div>
                    <span className="block text-[9px] text-slate-500 uppercase tracking-widest">
                      Encryption Protocol
                    </span>
                    <span className="text-white text-[11px] block">{selectedNode.encryption}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-500 uppercase tracking-widest">
                      Data Retention Limit
                    </span>
                    <span className="text-white text-[11px] block">{selectedNode.dataRetained}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SEARCH & CATEGORY TABS
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-paper-dim sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search privacy topics, cookies, right to erase..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-paper-dim rounded focus:border-hazard focus:outline-none bg-paper/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'All Policy' },
              { id: 'collection', label: 'Collection' },
              { id: 'ai', label: 'AI perception' },
              { id: 'geohash', label: 'Geohashing' },
              { id: 'erasure', label: 'Erasure rights' },
              { id: 'security', label: 'Node Security' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition whitespace-nowrap ${
                  selectedCategory === tab.id
                    ? 'bg-ink text-white'
                    : 'bg-paper text-slate-600 hover:bg-paper-dim hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT AREA — Left: Privacy Clauses, Right: interactive Simulator
      ═══════════════════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Privacy Policy Clauses */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-display font-extrabold uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-5 h-5 text-hazard" />
            Privacy Clauses & Regulatory Alignments ({filteredSections.length})
          </h2>

          {filteredSections.length === 0 ? (
            <div className="bg-white border border-paper-dim rounded p-10 text-center text-slate-500">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-lg text-ink font-mono">No matching sections found</p>
              <button 
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                className="btn-secondary py-1 px-3 text-xs mt-2"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredSections.map(section => (
                <div
                  key={section.id}
                  className="bg-white border border-paper-dim rounded p-6 shadow-sm space-y-4 hover:border-slate-300 transition"
                >
                  <div className="flex justify-between items-start gap-4 border-b border-paper-dim pb-3">
                    <div>
                      <h3 className="font-bold text-base text-ink leading-tight">
                        {section.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-sans mt-0.5">{section.subtitle}</p>
                    </div>
                    <span className="font-mono text-[9px] bg-paper-dim text-slate-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      {section.gdprCompliance}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-sans font-medium">
                    {section.content}
                  </p>

                  <div className="space-y-3 pt-2">
                    {section.clauses.map((clause, idx) => (
                      <div key={idx} className="bg-paper/30 p-4 border-l border-grid/40 rounded-r space-y-1">
                        <h4 className="text-xs font-bold text-ink uppercase tracking-wide">
                          {clause.title}
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-sans">
                          {clause.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Interactive Simulators */}
        <div className="space-y-8">
          
          {/* Data Retention Simulator */}
          <div className="bg-white border border-paper-dim rounded shadow-sm overflow-hidden">
            <div className="bp-grid text-white p-4 border-b border-grid">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-hazard flex items-center gap-1.5">
                <Database className="w-4 h-4 text-hazard" />
                Retention Lifetime Simulator
              </h3>
            </div>
            <div className="p-5 space-y-5">
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                Adjust sliders to model different data cleanup intervals and observe how it shifts your simulated privacy grading index.
              </p>

              {/* Sliders */}
              <div className="space-y-4 font-mono text-xs">
                
                <div>
                  <div className="flex justify-between mb-1.5 text-[11px]">
                    <span className="font-bold text-ink">Image Retention</span>
                    <span className="text-slate-500">{retentionImages} Days</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="365"
                    className="w-full accent-hazard cursor-pointer"
                    value={retentionImages}
                    onChange={(e) => setRetentionImages(parseInt(e.target.value))}
                  />
                  <span className="text-[9px] text-slate-400 leading-tight block">Time before resolved photos are deleted from Cloudinary.</span>
                </div>

                <div>
                  <div className="flex justify-between mb-1.5 text-[11px]">
                    <span className="font-bold text-ink">Exact GPS Coordinates</span>
                    <span className="text-slate-500">{retentionGPS} Days</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="180"
                    className="w-full accent-hazard cursor-pointer"
                    value={retentionGPS}
                    onChange={(e) => setRetentionGPS(parseInt(e.target.value))}
                  />
                  <span className="text-[9px] text-slate-400 leading-tight block">Time before coordinates generalization to geohash.</span>
                </div>

                <div>
                  <div className="flex justify-between mb-1.5 text-[11px]">
                    <span className="font-bold text-ink">API Access Log File</span>
                    <span className="text-slate-500">{retentionLogs} Days</span>
                  </div>
                  <input
                    type="range"
                    min="7"
                    max="90"
                    className="w-full accent-hazard cursor-pointer"
                    value={retentionLogs}
                    onChange={(e) => setRetentionLogs(parseInt(e.target.value))}
                  />
                  <span className="text-[9px] text-slate-400 leading-tight block">Lifetime of server access logs and IP records.</span>
                </div>

              </div>

              {/* Simulated Output Index */}
              <div className="bg-paper p-3 rounded border border-paper-dim space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-bold text-ink uppercase tracking-wide font-mono">Privacy Grade Score</span>
                  <span className={`text-2xl font-black font-display ${privacyGrade.color}`}>{privacyGrade.grade}</span>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed font-sans">
                  {privacyGrade.desc}
                </p>
              </div>

            </div>
          </div>

          {/* Privacy Audit Questionnaire Wizard */}
          <div className="bg-slate-950 text-white border border-slate-800 rounded p-5 shadow-lg space-y-4">
            <h3 className="text-xs font-mono font-bold text-hazard uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-2">
              <UserCheck className="w-4 h-4 text-hazard" />
              Privacy Audit Wizard
            </h3>

            {!wizardCompleted ? (
              <div className="space-y-4 font-mono text-xs">
                <div className="flex justify-between text-[9px] text-slate-500 uppercase tracking-widest">
                  <span>Question {currentQuestionIdx + 1} of {AUDIT_QUESTIONS.length}</span>
                  <span>Score: {wizardScore}</span>
                </div>

                <p className="font-bold text-slate-200 text-[11px] leading-snug font-sans">
                  {AUDIT_QUESTIONS[currentQuestionIdx].question}
                </p>

                <div className="space-y-2">
                  {AUDIT_QUESTIONS[currentQuestionIdx].options.map((opt, idx) => {
                    const isSelected = selectedOptionIdx === idx;
                    const isCorrect = idx === AUDIT_QUESTIONS[currentQuestionIdx].correctIndex;
                    
                    let btnStyle = 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600';
                    if (showExplanation) {
                      if (isCorrect) btnStyle = 'border-verified bg-verified/10 text-verified font-bold';
                      else if (isSelected) btnStyle = 'border-signal bg-signal/10 text-signal';
                    }

                    return (
                      <button
                        key={idx}
                        disabled={showExplanation}
                        onClick={() => handleOptionSelect(idx)}
                        className={`w-full text-left p-2.5 rounded border text-[10px] transition cursor-pointer disabled:cursor-not-allowed ${btnStyle}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {showExplanation && (
                  <div className="bg-slate-900 border border-slate-800 rounded p-3 text-[10px] space-y-2">
                    <p className="text-slate-300 leading-normal font-sans">
                      {AUDIT_QUESTIONS[currentQuestionIdx].explanation}
                    </p>
                    <button
                      onClick={handleNextQuestion}
                      className="w-full btn-primary bg-hazard text-ink py-1 text-[10px] flex justify-center items-center gap-1"
                    >
                      <span>Next Question</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 space-y-4">
                <CheckCircle className="w-12 h-12 text-verified mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold font-mono">Audit Completed!</h4>
                  <p className="text-[10px] text-slate-400 font-sans">
                    You scored <b>{wizardScore} / {AUDIT_QUESTIONS.length}</b>. You now understand how Civic Pulse protects your location and visuals.
                  </p>
                </div>
                <button
                  onClick={resetWizard}
                  className="btn-secondary text-[10px] text-white py-1 px-3"
                >
                  Restart Audit
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border-t border-paper-dim py-6 mt-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div>
            <span>© Civic Pulse Network Charter. Privacy compliance nodes fully active.</span>
          </div>
          <div className="flex gap-4">
            <Link to="/home" className="hover:text-ink transition no-underline">Live Feed</Link>
            <span>&bull;</span>
            <Link to="/terms" className="hover:text-ink transition no-underline">Terms of Service</Link>
            <span>&bull;</span>
            <Link to="/faq" className="hover:text-ink transition no-underline">Help FAQ</Link>
          </div>
        </div>
      </div>

    </div>
  );
}
