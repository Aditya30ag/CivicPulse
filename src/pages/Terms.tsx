import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Shield,
  Eye,
  Info,
  Layers,
  Award,
  Lock,
  Download,
  CheckSquare,
  Square,
  ThumbsUp,
  Cpu,
  MapPin
} from 'lucide-react';

/* ── Types ───────────────────────────────────────────────────────────── */
interface TermsSection {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  subsections: { title: string; text: string }[];
  regulatoryCode: string;
}

interface ComplianceConsent {
  aiVisualScan: boolean;
  geohashDeduplication: boolean;
  leaderboardPublishing: boolean;
  pushNotifications: boolean;
  anonymousReporting: boolean;
}

interface ChangelogEntry {
  version: string;
  date: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
}

/* ── Section Data ────────────────────────────────────────────────────── */
const TERMS_SECTIONS: TermsSection[] = [
  {
    id: 'sec-accounts',
    title: '1. User Accounts & Verification',
    subtitle: 'Citizen identities, Firebase authentication, and reputation tracking.',
    regulatoryCode: 'REG-ACC-2026.1',
    content: 'To participate in the Civic Pulse hazard tracking grid, users must register an account. Account creation and authorization are managed securely. Users are responsible for maintaining the confidentiality of their credentials and all activities occurring under their token.',
    subsections: [
      {
        title: '1.1 Authenticity Requirement',
        text: 'Citizens must register with a valid email. Utilizing temporary, burner, or automated mock email addresses is prohibited. Inactive accounts (no activity for 180 days) may be archived.'
      },
      {
        title: '1.2 Reputation Points Linking',
        text: 'Reputation points earned from accurate reports and verifications are tied to the user profile ID. Points are non-transferable and have no monetary value.'
      },
      {
        title: '1.3 Profile Visibility',
        text: 'By default, profile ranks and names are displayed publicly on the Leaderboard. Users can opt-out of leaderboard listing in their profile configuration, which converts their name to "Anonymous Citizen" on public leaderboards.'
      }
    ]
  },
  {
    id: 'sec-reporting',
    title: '2. Incident Reporting & Perception AI',
    subtitle: 'Standards for hazard media uploads, metadata, and visual processing.',
    regulatoryCode: 'REG-AI-2026.4',
    content: 'Incident reporting requires uploading a photograph of the public infrastructure hazard. Uploads are analyzed by automated computer vision agents to maintain category alignment and prevent spam.',
    subsections: [
      {
        title: '2.1 Image Content Ownership',
        text: 'When you upload an image, you grant Civic Pulse a non-exclusive, royalty-free, perpetual license to host, analyze, crop, and share the image with ward administrators for remediation purposes.'
      },
      {
        title: '2.2 Image Integrity & Safety',
        text: 'Images must show a genuine public hazard. Uploading offensive material, private faces, vehicle license plates, or advertising will trigger automatic account locks by the safety filter.'
      },
      {
        title: '2.3 Perception Agent Severity Auditing',
        text: 'The initial severity score (1-10) is assigned dynamically by our multi-modal Perception Agent (Gemini AI). This score is an estimate based on visual obstruction, traffic safety risk, and category hazard templates. Ward administrators reserve the right to manually override severity scores.'
      }
    ]
  },
  {
    id: 'sec-dedup',
    title: '3. Deduplication & Geohash Mapping',
    subtitle: 'Deduplication boundaries, spatial geohashes, and coordinates sharing.',
    regulatoryCode: 'REG-GEO-2026.8',
    content: 'To prevent clogging ward worker pipelines, Civic Pulse aggregates overlapping reports. Spatial data is converted into geohash indicators to map incident boundaries.',
    subsections: [
      {
        title: '3.1 Deduplication Envelope',
        text: 'Any incoming report of the same category submitted within a 100-meter radius of an active pin is merged automatically. Additional reports are recorded as "upvotes" or "verifications" of the original pin, and their authors are credited with verification points rather than duplicate report points.'
      },
      {
        title: '3.2 Geohash Resolution',
        text: 'We index coordinates using standard 12-character geohash grids. This indexing happens locally before database insertion to optimize lookup speeds and maintain cluster groups.'
      },
      {
        title: '3.3 Spatial Location Accuracy',
        text: 'Users must permit browser geolocation or manually pick the precise coordinates on the map. Intentional reporting of issues outside one\'s physical region (coordinates mismatching image metadata) is classified as spoofing.'
      }
    ]
  },
  {
    id: 'sec-verifications',
    title: '4. Citizen Verifications & Auditing',
    subtitle: 'Rules of geofenced peer reviews, reputation locks, and spam control.',
    regulatoryCode: 'REG-AUD-2026.3',
    content: 'Peer verification is critical to lock in reporting trust. Citizens verify issues on-site to confirm hazard persistence or completion.',
    subsections: [
      {
        title: '4.1 Geofenced Verification Constraints',
        text: 'You may only submit verification for an open pin if your device\'s live GPS coordinates place you within 150 meters of the reported hazard.'
      },
      {
        title: '4.2 Verification Quality Control',
        text: 'Verifications must include a status confirmation (Still Active / Resolved). If a citizen falsely marks issues as resolved to farm verification points, their reputation score will be set to zero and their account suspended.'
      },
      {
        title: '4.3 Dispute Resolution',
        text: 'In cases of conflicting verifications (e.g., one user marks active, another marks resolved), the ticket is flagged for "Ward Audit" and dispatcher routing takes priority.'
      }
    ]
  },
  {
    id: 'sec-dispatch',
    title: '5. Ward Operations & Service SLA',
    subtitle: 'Administrative responsibilities, dispatch routing, and response SLA.',
    regulatoryCode: 'REG-OPS-2026.9',
    content: 'Wards are government or regional administrative entities responsible for fixing reported items. Civic Pulse monitors ward performance telemetry.',
    subsections: [
      {
        title: '5.1 Boundary Limits',
        text: 'Issues are dispatched solely based on ward polygon maps. Wards are only responsible for issues falling inside their geo-boundaries. Wards cannot manually refuse a ticket unless it belongs to another ward.'
      },
      {
        title: '5.2 SLA Targets',
        text: 'Critical severity issues (score 8-10) have a target dispatcher allocation time of 12 hours and resolution target of 48 hours. Moderate issues (score 4-7) target 72 hours. Low severity items are queued at utility schedules.'
      },
      {
        title: '5.3 Public Telemetry Transparency',
        text: 'All response statistics, average repair times, and risk levels of wards are displayed publicly to ensure government accountability and motivate resource efficiency.'
      }
    ]
  },
  {
    id: 'sec-liability',
    title: '6. Limitation of Liability',
    subtitle: 'Service nominality disclaimers, mapping third parties, and safety hazards.',
    regulatoryCode: 'REG-LIA-2026.2',
    content: 'Civic Pulse is an information routing and monitoring application. The operators of Civic Pulse do not directly execute infrastructure repairs.',
    subsections: [
      {
        title: '6.1 Repair Execution Disclaimer',
        text: 'All structural repairs, street lamp replacements, cleanups, and road patching are executed by local municipal bodies, contractor crews, or ward public works departments, not by Civic Pulse software operators.'
      },
      {
        title: '6.2 Navigation Safety Warning',
        text: 'Do not approach active hazards (e.g., live power lines, overflowing sewer lines) to take photographs. Safety takes precedence over reporting. You assume full risk when photographing road cracks or other public hazards.'
      },
      {
        title: '6.3 Third-Party Services Dependencies',
        text: 'Maps and coordinates routing rely on OpenStreetMap and Leaflet libraries. System nominality may fluctuate during outages of these downstream providers or external Firebase backend nodes.'
      }
    ]
  }
];

const CHANGELOG: ChangelogEntry[] = [
  { version: 'v2.4.1', date: '2026-06-15', description: 'Updated deduplication algorithms to use a strict 100m geohash envelope, reducing duplicate ticket creations by 34%.', impact: 'medium' },
  { version: 'v2.3.0', date: '2026-04-10', description: 'Introduced reputation penalty locks for users submitting false verifications or spoofed locations.', impact: 'high' },
  { version: 'v2.1.2', date: '2026-02-01', description: 'Added multi-modal safety filters to block images containing private faces or license plates.', impact: 'low' },
  { version: 'v2.0.0', date: '2025-11-20', description: 'Initial release of the multi-agent dispatch orchestrator and ward-level boundary routing system.', impact: 'high' }
];

export default function Terms() {
  /* ── State ─────────────────────────────────────────────────────────── */
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('sec-accounts');
  
  // Consent preferences
  const [consent, setConsent] = useState<ComplianceConsent>(() => {
    try {
      const saved = localStorage.getItem('civic_pulse_terms_consent');
      return saved ? JSON.parse(saved) : {
        aiVisualScan: true,
        geohashDeduplication: true,
        leaderboardPublishing: true,
        pushNotifications: false,
        anonymousReporting: false
      };
    } catch {
      return {
        aiVisualScan: true,
        geohashDeduplication: true,
        leaderboardPublishing: true,
        pushNotifications: false,
        anonymousReporting: false
      };
    }
  });

  // Section read progress trackers
  const [readSections, setReadSections] = useState<string[]>([]);
  const [showConsentToast, setShowConsentToast] = useState(false);

  // Custom Agreement Builder state
  const [builderWardName, setBuilderWardName] = useState('Central Ward');
  const [builderIncludesAI, setBuilderIncludesAI] = useState(true);
  const [builderIncludesDedup, setBuilderIncludesDedup] = useState(true);
  const [builderIncludesReputation, setBuilderIncludesReputation] = useState(true);
  const [builderIncludesSLA, setBuilderIncludesSLA] = useState(true);
  const [builderOutput, setBuilderOutput] = useState('');

  // Refs for scrolling
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  /* ── Effects ───────────────────────────────────────────────────────── */
  // Save consent preference
  useEffect(() => {
    localStorage.setItem('civic_pulse_terms_consent', JSON.stringify(consent));
  }, [consent]);

  // Regenerate Custom Ward Agreement Draft
  useEffect(() => {
    const timeStamp = new Date().toLocaleDateString();
    let draft = `## CIVIC PULSE COMPLIANCE COVENANT: ${builderWardName.toUpperCase()}\n`;
    draft += `*Generated Draft Version: 2.4.1-custom | Date: ${timeStamp}*\n\n`;
    draft += `This document outlines the local administrative compliance parameters for the operational jurisdiction of **${builderWardName}**.\n\n`;
    
    if (builderIncludesAI) {
      draft += `### Clause A: Automated Hazard Perception (ACTIVE)\n`;
      draft += `All uploaded reports inside ${builderWardName} boundaries are subject to real-time AI visual analysis. Images are scanned for category verification and safety compliance. Personal faces and license plate identifiers are scrubbed locally.\n\n`;
    }
    
    if (builderIncludesDedup) {
      draft += `### Clause B: Spatial Deduplication & Geohashing (ACTIVE)\n`;
      draft += `To prevent queue flooding, ${builderWardName} enforces a 100-meter deduplication envelope. Overlapping incidents are consolidated under active pins. Peer reports within this boundary count as verifications.\n\n`;
    }

    if (builderIncludesReputation) {
      draft += `### Clause C: Citizen Reputation Audits (ACTIVE)\n`;
      draft += `${builderWardName} recognizes and awards reputation points to citizens verifying open hazards (+20 pts) and validating completed repairs (+30 pts). Point exploits or false reporting will result in profile bans.\n\n`;
    }

    if (builderIncludesSLA) {
      draft += `### Clause D: Operational SLA Requirements (ACTIVE)\n`;
      draft += `Critical hazards (risk score 8-10) must be evaluated within 12 hours of dispatch. Moderate hazards (score 4-7) must be resolved within 72 hours. Low severity items are integrated into regular maintenance sweeps.\n\n`;
    }

    draft += `*By deploying this compliance configuration, ${builderWardName} agrees to bind its administrative dispatch queue to the Civic Pulse core network nodes.*`;
    
    setBuilderOutput(draft);
  }, [builderWardName, builderIncludesAI, builderIncludesDedup, builderIncludesReputation, builderIncludesSLA]);

  // Scroll spy simulation
  const handleScrollToSection = (id: string) => {
    setActiveSection(id);
    const target = sectionRefs.current[id];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  /* ── Computations ──────────────────────────────────────────────────── */
  const filteredSections = useMemo(() => {
    if (!searchQuery) return TERMS_SECTIONS;
    return TERMS_SECTIONS.filter(section => {
      const q = searchQuery.toLowerCase();
      const matchesMain = section.title.toLowerCase().includes(q) ||
        section.content.toLowerCase().includes(q) ||
        section.regulatoryCode.toLowerCase().includes(q);
      
      const matchesSub = section.subsections.some(sub => 
        sub.title.toLowerCase().includes(q) || sub.text.toLowerCase().includes(q)
      );

      return matchesMain || matchesSub;
    });
  }, [searchQuery]);

  /* ── Handlers ──────────────────────────────────────────────────────── */
  const toggleConsent = (key: keyof ComplianceConsent) => {
    setConsent(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveConsent = () => {
    setShowConsentToast(true);
    setTimeout(() => setShowConsentToast(false), 3000);
  };

  const markSectionRead = (id: string) => {
    if (!readSections.includes(id)) {
      setReadSections(prev => [...prev, id]);
    }
  };

  const handleCopyAgreement = () => {
    navigator.clipboard.writeText(builderOutput);
    alert('Custom agreement draft copied to clipboard!');
  };

  return (
    <div className="flex-1 bg-paper text-ink overflow-y-auto" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      
      {/* ═══════════════════════════════════════════════════════════════
          HEADER Banner — Blueprint grid style
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bp-grid text-white py-12 px-6 lg:px-16 border-b border-grid relative">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-hazard uppercase mb-2">
              <Shield className="w-4 h-4 text-hazard" />
              Operational Regulations & Compliance
            </div>
            <h1 className="text-4xl lg:text-5xl font-display font-black uppercase tracking-wide leading-none">
              Terms of <span className="text-hazard">Service</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-xl mt-2 leading-relaxed font-sans">
              Civic Pulse is governed by geofenced reporting ethics, automated deduplication policies, and peer-to-peer verification requirements. Read the regulations below.
            </p>
          </div>

          <div className="bg-slate-900/60 p-4 border border-grid rounded flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-verified animate-pulse" />
            <div className="font-mono text-xs">
              <span className="block text-slate-400">ACTIVE REGULATOR:</span>
              <span className="text-white font-bold">NODE-v2.4.1 (GPL-3.0)</span>
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
          MAIN LAYOUT — Left: Navigation, Center: Documents, Right: Tools
      ═══════════════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Column: Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Search bar inside Sidebar */}
          <div className="bg-white border border-paper-dim rounded p-4 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
              Search Regulations
            </h4>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Find sections, laws..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-paper-dim rounded focus:border-hazard focus:outline-none bg-paper/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Table of Contents */}
          <div className="bg-white border border-paper-dim rounded p-4 shadow-sm space-y-2 sticky top-4">
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider font-mono mb-3">
              Table of Contents
            </h4>
            <nav className="space-y-1">
              {filteredSections.map(sec => {
                const isSelected = activeSection === sec.id;
                const isRead = readSections.includes(sec.id);
                return (
                  <button
                    key={sec.id}
                    onClick={() => handleScrollToSection(sec.id)}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded flex items-center justify-between cursor-pointer transition ${
                      isSelected 
                        ? 'bg-ink text-white' 
                        : 'text-slate-600 hover:bg-paper hover:text-ink'
                    }`}
                  >
                    <span className="truncate">{sec.title.split('. ')[1]}</span>
                    <div className="flex items-center gap-1">
                      {isRead && <span className="text-[9px] text-verified font-mono">READ</span>}
                      <ChevronRight className="w-3 h-3 opacity-50" />
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

        </div>

        {/* Center Columns: Documents Scroll Area */}
        <div className="lg:col-span-2 space-y-8">
          
          {filteredSections.length === 0 ? (
            <div className="bg-white border border-paper-dim rounded-md p-10 text-center text-slate-500">
              <Info className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-lg text-ink">No sections match your search</p>
              <p className="text-xs max-w-sm mx-auto mt-1">
                Try searching for keywords like "Points", "AI", "Deduplication", or "firebase".
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredSections.map(section => (
                <div
                  key={section.id}
                  ref={el => (sectionRefs.current[section.id] = el)}
                  className="bg-white border border-paper-dim rounded p-6 shadow-sm space-y-4 hover:border-slate-300 transition"
                  onMouseEnter={() => markSectionRead(section.id)}
                >
                  {/* Title & Metadata */}
                  <div className="flex justify-between items-start gap-4 border-b border-paper-dim pb-3">
                    <div>
                      <h2 className="text-lg font-bold text-ink leading-tight">
                        {section.title}
                      </h2>
                      <p className="text-xs text-slate-500 font-sans mt-0.5">
                        {section.subtitle}
                      </p>
                    </div>
                    <span className="font-mono text-[9px] bg-paper-dim text-slate-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      {section.regulatoryCode}
                    </span>
                  </div>

                  {/* Core intro block */}
                  <p className="text-sm text-slate-700 leading-relaxed font-sans font-medium">
                    {section.content}
                  </p>

                  {/* Subsections list */}
                  <div className="space-y-4 pt-2">
                    {section.subsections.map((sub, i) => (
                      <div key={i} className="bg-paper/30 p-4 border-l border-grid/40 rounded-r space-y-1">
                        <h4 className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-hazard" />
                          {sub.title}
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed font-sans">
                          {sub.text}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Confirm read marker */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => markSectionRead(section.id)}
                      className={`text-[10px] font-mono font-bold uppercase px-3 py-1 rounded transition ${
                        readSections.includes(section.id)
                          ? 'bg-verified/10 text-verified border border-verified/30'
                          : 'bg-paper text-slate-500 border border-paper-dim hover:text-ink cursor-pointer'
                      }`}
                    >
                      {readSections.includes(section.id) ? '✓ Section Audited' : 'Mark as Read'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Changelog Timeline */}
          <div className="bg-white border border-paper-dim rounded p-6 shadow-sm space-y-6">
            <h3 className="text-base font-display font-extrabold uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-5 h-5 text-hazard" />
              Changelog & Policy Updates
            </h3>
            
            <div className="relative border-l-2 border-paper-dim pl-6 space-y-6 ml-2 font-sans">
              {CHANGELOG.map((log, idx) => (
                <div key={idx} className="relative">
                  {/* Timeline dot */}
                  <span className="absolute -left-[31px] top-1 bg-white border-2 border-grid w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-hazard" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs font-bold text-ink">{log.version}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{log.date}</span>
                      <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.2 rounded ${
                        log.impact === 'high' ? 'bg-signal/15 text-signal' : log.impact === 'medium' ? 'bg-hazard/15 text-ink' : 'bg-verified/15 text-verified'
                      }`}>
                        {log.impact} impact
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {log.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Interactive Consent & Ward compliance builders */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Consent Toggles Panel */}
          <div className="bg-white border border-paper-dim rounded shadow-sm overflow-hidden">
            <div className="bp-grid text-white p-4 border-b border-grid">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-hazard flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Data Consent Settings
              </h3>
            </div>
            
            <div className="p-4 space-y-4">
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                Adjust how your operational, telemetry, and camera inputs are processed across nodes.
              </p>

              <div className="space-y-3">
                {[
                  { key: 'aiVisualScan', label: 'AI Visual Parsing', desc: 'Permit computer vision severity checks.' },
                  { key: 'geohashDeduplication', label: 'Deduplicate Reports', desc: 'Scan and merge overlap index.' },
                  { key: 'leaderboardPublishing', label: 'Leaderboard Listing', desc: 'Show profile points in rank view.' },
                  { key: 'pushNotifications', label: 'Ward Alert Sync', desc: 'Notify on local status shifts.' },
                  { key: 'anonymousReporting', label: 'Force Anonymous', desc: 'Mask profile handles globally.' }
                ].map(item => {
                  const isActive = (consent as any)[item.key];
                  return (
                    <button
                      key={item.key}
                      onClick={() => toggleConsent(item.key as any)}
                      className="w-full flex items-start gap-2.5 text-left cursor-pointer p-1.5 hover:bg-slate-50 rounded transition"
                    >
                      <div className="mt-0.5 text-slate-400">
                        {isActive ? (
                          <CheckSquare className="w-4 h-4 text-verified" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-ink">{item.label}</span>
                        <span className="text-[10px] text-slate-500 leading-tight block">{item.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleSaveConsent}
                className="w-full btn-primary py-1.5 text-xs mt-2 cursor-pointer"
              >
                Save Preferences
              </button>

              {showConsentToast && (
                <div className="p-2 bg-verified/15 text-verified rounded text-[10px] font-mono text-center flex items-center justify-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Telemetry configuration saved!
                </div>
              )}
            </div>
          </div>

          {/* Interactive Custom Agreement Exporter */}
          <div className="bg-slate-950 text-white border border-slate-800 rounded p-4 shadow-lg space-y-4">
            <h3 className="text-xs font-mono font-bold text-hazard uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-2">
              <MapPin className="w-3.5 h-3.5" />
              Ward Policy Exporter
            </h3>
            
            <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
              Generate a local administrative compliance draft for regional ward integration.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[9px] text-slate-400 uppercase tracking-widest mb-1">
                  Ward Region Name
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs focus:outline-none focus:border-hazard text-white"
                  value={builderWardName}
                  onChange={(e) => setBuilderWardName(e.target.value)}
                />
              </div>

              {/* Toggles */}
              <div className="space-y-1.5 text-[10px] pt-1">
                {[
                  { state: builderIncludesAI, setter: setBuilderIncludesAI, label: 'Perception AI Scanning' },
                  { state: builderIncludesDedup, setter: setBuilderIncludesDedup, label: 'Geohash Deduplication' },
                  { state: builderIncludesReputation, setter: setBuilderIncludesReputation, label: 'Reputation Scoring' },
                  { state: builderIncludesSLA, setter: setBuilderIncludesSLA, label: 'Ward SLA Thresholds' }
                ].map((toggle, idx) => (
                  <label key={idx} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={toggle.state}
                      onChange={(e) => toggle.setter(e.target.checked)}
                      className="accent-hazard"
                    />
                    <span>{toggle.label}</span>
                  </label>
                ))}
              </div>

              {/* Preview Box */}
              <div>
                <span className="block text-[9px] text-slate-400 uppercase tracking-widest mb-1">
                  Draft Preview (Markdown)
                </span>
                <textarea
                  readOnly
                  rows={6}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-[9px] text-slate-300 focus:outline-none select-all font-mono"
                  value={builderOutput}
                />
              </div>

              <button
                onClick={handleCopyAgreement}
                className="w-full btn-primary bg-hazard text-ink font-bold py-1.5 text-xs flex justify-center items-center gap-1.5 cursor-pointer hover:bg-hazard/90"
              >
                <Download className="w-3.5 h-3.5" />
                Copy Config Draft
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border-t border-paper-dim py-6 mt-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div>
            <span>© Civic Pulse Network Regulations. Node agreement versions active.</span>
          </div>
          <div className="flex gap-4">
            <Link to="/home" className="hover:text-ink transition no-underline">Live Feed</Link>
            <span>&bull;</span>
            <Link to="/leaderboard" className="hover:text-ink transition no-underline">Leaderboard</Link>
            <span>&bull;</span>
            <Link to="/faq" className="hover:text-ink transition no-underline">Help FAQ</Link>
          </div>
        </div>
      </div>

    </div>
  );
}
