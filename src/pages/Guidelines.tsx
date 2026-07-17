import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Search,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  FileText,
  UserCheck,
  Cpu,
  Layers,
  ChevronRight,
  Sparkles,
  Trophy,
  Sliders,
  AlertTriangle
} from 'lucide-react';

/* ── Types ───────────────────────────────────────────────────────────── */
interface GuidelineSection {
  id: string;
  category: 'reporting' | 'verification' | 'conduct' | 'moderation' | 'fairness';
  title: string;
  subtitle: string;
  content: string;
  clauses: { title: string; text: string }[];
  complianceStandard: string;
}

interface PipelineStage {
  id: string;
  label: string;
  role: string;
  guidelineCheck: string;
  communityWeight: string;
  description: string;
}

interface Scenario {
  id: number;
  title: string;
  description: string;
  options: { text: string; isCorrect: boolean; explanation: string }[];
}

/* ── Database ────────────────────────────────────────────────────────── */
const GUIDELINES_SECTIONS: GuidelineSection[] = [
  {
    id: 'guide-reporting',
    category: 'reporting',
    title: '1. Infrastructure Reporting Accuracy',
    subtitle: 'Standards for documenting and submitting physical hazards.',
    complianceStandard: 'CPC-Art-1 (Accuracy of Public Records)',
    content: 'All submitted reports must represent active physical infrastructure hazards located on public property. Visual documentation must be clear and direct.',
    clauses: [
      {
        title: '1.1 Public vs Private Boundary',
        text: 'Reports must restrict to public areas (streets, municipal parks, public sewers, utilities). Hazards inside private driveways, residential compounds, or commercial properties are excluded and will be rejected.'
      },
      {
        title: '1.2 Visual Clarity & Noise',
        text: 'Uploaded photographs must clearly capture the structural details of the hazard. Blurry, pitch-black, or irrelevant images will trigger an automatic reject from the AI Perception Agent.'
      },
      {
        title: '1.3 Non-inflation of Severity',
        text: 'Artificially inflating severity (e.g. marking a shallow crack as a critical road blockage) is a policy violation. Severity estimates are audited by AI and Ward admins to preserve dispatch efficiency.'
      }
    ]
  },
  {
    id: 'guide-verification',
    category: 'verification',
    title: '2. Community Peer Verification Integrity',
    subtitle: 'Standards for verifying nearby reported incidents.',
    complianceStandard: 'CPC-Art-2 (Validation Truthfulness)',
    content: 'Verifications allow citizens to vouch for an issue\'s persistence. To avoid gaming the leaderboard, verifications are tied to physical proximity.',
    clauses: [
      {
        title: '2.1 Geofenced Validation',
        text: 'You may only submit verification logs when physically within 150 meters of the reported hazard. Attempts to bypass coordinates verification using emulator spoofing are prohibited.'
      },
      {
        title: '2.2 Frequency Limits',
        text: 'Citizens can verify a specific report once every 24 hours. Multiple consecutive verifications by the same user on a single ticket are ignored for points calculations.'
      },
      {
        title: '2.3 Integrity of Photographic Updates',
        text: 'When verifying an issue, any added photographic update must show the current status of the hazard. Re-uploading original photos or duplicate stock media will result in reputation deductions.'
      }
    ]
  },
  {
    id: 'guide-conduct',
    category: 'conduct',
    title: '3. Community Conduct & Respectful Engagement',
    subtitle: 'Behavioral expectations for description fields and commentary.',
    complianceStandard: 'CPC-Art-3 (Respectful Civic Discourse)',
    content: 'Civic Pulse is a cooperative space. Descriptions, comments, and ward interactions must focus on resolving the infrastructure issue objectively.',
    clauses: [
      {
        title: '3.1 Prohibited Content & Language',
        text: 'Abusive language, political statements, profanity, and harassment directed at ward officers, other citizens, or neighborhoods are strictly prohibited. These inputs are automatically flagged and scrubbed.'
      },
      {
        title: '3.2 Personal Privacy Preservation',
        text: 'Descriptions must not name individuals, private workers, or include personal identifiers. If you are reporting garbage dumping, focus on the hazard itself, not personal finger-pointing.'
      },
      {
        title: '3.3 Ward Official Collaboration',
        text: 'Do not spam comments requesting immediate resolution. Keep commentary constructive (e.g. "Water leak has expanded into left lane since yesterday morning").'
      }
    ]
  },
  {
    id: 'guide-moderation',
    category: 'moderation',
    title: '4. AI Perception Scans & Moderation Workflows',
    subtitle: 'Understanding automated filtering and human admin controls.',
    complianceStandard: 'CPC-Art-4 (Accountability in Moderation)',
    content: 'Reports undergo continuous review. Automated layers filter out bad submissions, and Ward Admins resolve disputes.',
    clauses: [
      {
        title: '4.1 Ephemeral AI Quarantine',
        text: 'The Gemini Perception Agent scans uploads for inappropriate materials, human faces, and irrelevant content. Flagged reports enter a quarantine queue and are invisible on the map pending review.'
      },
      {
        title: '4.2 Admin Override Powers',
        text: 'Ward administrators have final authority to override AI classifications, adjust severity weights, split merged tickets, or dismiss invalid reports.'
      },
      {
        title: '4.3 Dispute Resolution Procedure',
        text: 'If your report was rejected as invalid but you believe the hazard is active and public, you may submit an appeal ticket via the Support FAQ console.'
      }
    ]
  },
  {
    id: 'guide-fairness',
    category: 'fairness',
    title: '5. Leaderboard Fairness & Farming Prevention',
    subtitle: 'Rules to prevent exploitation of the reward points system.',
    complianceStandard: 'CPC-Art-5 (Reputation Fairness)',
    content: 'Reputation points determine leaderboard ranking. We actively monitor and penalize manipulation of report scores.',
    clauses: [
      {
        title: '5.1 Anti-Farming Penalties',
        text: 'Submitting fake reports or coordinating with associates to trigger false peer verifications will lead to a complete points rollback, account suspension, and leaderboard disqualification.'
      },
      {
        title: '5.2 Deduplication Consolidation',
        text: 'If your report is merged into an existing pin, you do not receive the full "New Report" (+50 pts) bounty. Instead, you are awarded a "Verification" (+20 pts) credit. This ensures fair point distribution.'
      },
      {
        title: '5.3 False Verification Deductions',
        text: 'Verifying a hazard as active when it has already been fixed, or claiming an empty lot is a pothole, will penalize your trust rating and deduct up to 100 points per instance.'
      }
    ]
  }
];

const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'stage-submit',
    label: '1. Citizen Submission',
    role: 'User Input Verification',
    guidelineCheck: 'Public boundary & Photo clarity check',
    communityWeight: 'N/A (Individual Action)',
    description: 'The report is created. GPS coordinates check boundary alignments, and the description is validated for text policy violations.'
  },
  {
    id: 'stage-ai',
    label: '2. AI Perception Scan',
    role: 'Automated Image Audit',
    guidelineCheck: 'Visual confirmation, categorization & face redaction',
    communityWeight: 'Zero (System Automated)',
    description: 'Gemini AI scans the media. If a face or license plate is detected, it is blurred. If the image is non-compliant, the ticket is quarantined.'
  },
  {
    id: 'stage-dedup',
    label: '3. Deduplication Match',
    role: 'Spatial Adjacency check',
    guidelineCheck: 'Checks 100m geohash radius for similar tickets',
    communityWeight: 'High (Merges duplicates to upvotes)',
    description: 'If another active issue of the same category exists nearby, the reports are combined to prevent dispatch clutter. The second submitter gets verification points.'
  },
  {
    id: 'stage-verify',
    label: '4. Community Validation',
    role: 'Peer Geofenced Audit',
    guidelineCheck: 'Nearby users audit ticket status',
    communityWeight: 'Vouch / Flag weight (Determines urgency)',
    description: 'Nearby citizens verify the issue. Positive vouchers boost severity priority. Negative flags request administrative audit.'
  },
  {
    id: 'stage-dispatch',
    label: '5. Ward Resolution',
    role: 'Official Action & Close',
    guidelineCheck: 'Ward Admin marks ticket resolved',
    communityWeight: 'Post-fix citizen verification (Confirms fix)',
    description: 'Ward crew completes repair. The ticket changes to resolved. Citizens have 7 days to confirm the fix before the ticket archives and photos prune.'
  }
];

const CONDUCT_SCENARIOS: Scenario[] = [
  {
    id: 1,
    title: 'Scenario A: Pothole in Private Driveway',
    description: 'You spot a deep, dangerous pothole inside the entrance driveway of a private apartment complex. It causes minor tire damage to residents.',
    options: [
      {
        text: 'Submit a high-severity report because it causes damage to citizens.',
        isCorrect: false,
        explanation: 'Incorrect. Community Guidelines specify that Civic Pulse only tracks public infrastructure. Private properties are under individual or HOA jurisdiction.'
      },
      {
        text: 'Do not report on Civic Pulse. Instead, notify the building management office.',
        isCorrect: true,
        explanation: 'Correct! Private driveways are not public municipal assets. Reporting this on Civic Pulse leads to administrative rejection and possible trust points penalty.'
      },
      {
        text: 'Report it as a public hazard anyway but mark the description as "Private drive but please fix".',
        isCorrect: false,
        explanation: 'Incorrect. Ward dispatch crews cannot legally spend public funds on private premises, so this will be dismissed.'
      }
    ]
  },
  {
    id: 2,
    title: 'Scenario B: Already Reported Water Leak',
    description: 'You notice water spraying from a municipal pipe. You open the Civic Pulse map and see a blue pin indicating a water leak is already active at this exact spot.',
    options: [
      {
        text: 'Create a new, separate report to make it look urgent.',
        isCorrect: false,
        explanation: 'Incorrect. Multiple separate reports for the same issue create administrative clutter and will be merged anyway, costing you duplication overhead.'
      },
      {
        text: 'Walk close to the pipe, click the pin, and submit a "Verify" update with a new clear picture.',
        isCorrect: true,
        explanation: 'Correct! Verifying the existing report adds community weight, raises its urgency level, and grants you +20 reputation points honestly.'
      },
      {
        text: 'Ignore the leak completely since it is already marked.',
        isCorrect: false,
        explanation: 'Incorrect. While not a violation, verifying it is helpful to let ward crews know the issue is still ongoing and active.'
      }
    ]
  },
  {
    id: 3,
    title: 'Scenario C: Garbage Dumping and Identifying the Culprit',
    description: 'You witness a vendor dumping waste near a market corner. You want to report the sanitation pile and point out the vendor responsible.',
    options: [
      {
        text: 'Take a photo of the waste pile. Describe the location, waste type, and avoid mentioning personal names or photos of individuals.',
        isCorrect: true,
        explanation: 'Correct! Guidelines prohibit posting private personal identifiers or photos showing recognizable faces. Focus purely on the physical hazard.'
      },
      {
        text: 'Upload a picture of the vendor\'s face and state their name in the description to shame them.',
        isCorrect: false,
        explanation: 'Incorrect. This violates the Personal Privacy Preservation guidelines. The Perception Agent or Ward Admin will scrub the report for privacy issues.'
      },
      {
        text: 'Include details of the vendor\'s vehicle license plate in the description.',
        isCorrect: false,
        explanation: 'Incorrect. Publicly exposing license plates or private telemetry is a privacy breach. The system auto-redacts such indicators.'
      }
    ]
  },
  {
    id: 4,
    title: 'Scenario D: Minor Streetlight Flickering',
    description: 'A streetlight is flickering periodically at night. It is still mostly lit, but you want to report it so it gets checked.',
    options: [
      {
        text: 'Submit a report with Severity 10 (Critical) to get immediate emergency response.',
        isCorrect: false,
        explanation: 'Incorrect. Artificially inflating severity for minor issues slows down response to true emergencies (like fallen power cables) and lowers your trust rating.'
      },
      {
        text: 'Submit a report, classify it as streetlight, estimate severity at 3 or 4, and describe that it is flickering periodically.',
        isCorrect: true,
        explanation: 'Correct! Honestly estimating severity preserves system dispatch prioritization and keeps your profile trust grade intact.'
      }
    ]
  }
];

export default function Guidelines() {
  /* ── State ─────────────────────────────────────────────────────────── */
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'reporting' | 'verification' | 'conduct' | 'moderation' | 'fairness'>('all');
  
  // Pipeline inspect stage
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(PIPELINE_STAGES[0]);

  // Reputation Simulator States
  const [reportsSubmitted, setReportsSubmitted] = useState(15);
  const [verificationAccuracy, setVerificationAccuracy] = useState(90); // percentage
  const [flagsTriggered, setFlagsTriggered] = useState(2);
  const [rejectionCount, setRejectionCount] = useState(1);

  // Conduct Simulator States
  const [currentScenarioIdx, setCurrentScenarioIdx] = useState(0);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [simulatorCompleted, setSimulatorCompleted] = useState(false);
  const [simulatorScore, setSimulatorScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  /* ── Computations ──────────────────────────────────────────────────── */
  const filteredSections = useMemo(() => {
    return GUIDELINES_SECTIONS.filter(section => {
      const matchesCategory = selectedCategory === 'all' || section.category === selectedCategory;
      const matchesSearch = !searchQuery || 
        section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.complianceStandard.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.clauses.some(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.text.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const trustRating = useMemo(() => {
    // Basic formula: Base score of 100.
    // +10 per report.
    // Proximity accuracy acts as multiplier.
    // -30 per rejection.
    // +25 per helpful flag.
    const rawScore = 100 + (reportsSubmitted * 10) + (flagsTriggered * 25) - (rejectionCount * 30);
    const accuracyMultiplier = verificationAccuracy / 100;
    const finalScore = Math.max(0, Math.floor(rawScore * accuracyMultiplier));

    if (finalScore >= 500 && rejectionCount === 0) return { tier: 'Platinum Sentinel', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30', multiplier: '1.5x', desc: 'Highest trust rank. Instant AI bypass for verified categories.' };
    if (finalScore >= 300 && rejectionCount <= 1) return { tier: 'Gold Guardian', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30', multiplier: '1.3x', desc: 'Highly reliable user. Upvote validations carry 2x weight.' };
    if (finalScore >= 120 && rejectionCount <= 3) return { tier: 'Active Sentinel', color: 'text-hazard', bg: 'bg-yellow-500/10 border-yellow-500/30', multiplier: '1.1x', desc: 'Trustworthy citizen. Standard report and verification weights.' };
    if (finalScore < 60 || rejectionCount > 4) return { tier: 'Probation Tier', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/30', multiplier: '0.5x', desc: 'Caution rating. All reports undergo mandatory manual review.' };
    return { tier: 'Standard Citizen', color: 'text-slate-300', bg: 'bg-slate-800/40 border-slate-700/60', multiplier: '1.0x', desc: 'Basic user account. Normal reporting queues.' };
  }, [reportsSubmitted, verificationAccuracy, flagsTriggered, rejectionCount]);

  /* ── Handlers ──────────────────────────────────────────────────────── */
  const handleOptionSelect = (idx: number) => {
    if (showExplanation) return;
    setSelectedOptionIdx(idx);
    setShowExplanation(true);
    if (CONDUCT_SCENARIOS[currentScenarioIdx].options[idx].isCorrect) {
      setSimulatorScore(prev => prev + 1);
    }
  };

  const handleNextScenario = () => {
    setSelectedOptionIdx(null);
    setShowExplanation(false);
    if (currentScenarioIdx < CONDUCT_SCENARIOS.length - 1) {
      setCurrentScenarioIdx(prev => prev + 1);
    } else {
      setSimulatorCompleted(true);
    }
  };

  const resetSimulator = () => {
    setCurrentScenarioIdx(0);
    setSelectedOptionIdx(null);
    setSimulatorCompleted(false);
    setSimulatorScore(0);
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
              <Shield className="w-4 h-4 text-hazard inline-block" />
              Citizen Conduct Charter & Safety Guidelines
            </div>
            <h1 className="text-4xl lg:text-5xl font-display font-black uppercase tracking-wide leading-none">
              Community <span className="text-hazard">Guidelines</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-xl mt-2 leading-relaxed font-sans">
              Rules of engagement for Civic Pulse. Understand the standards for reporting hazards, validating issues, and maintaining community integrity.
            </p>
          </div>

          <div className="bg-slate-900/60 p-4 border border-grid rounded flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-verified inline-block animate-pulse" />
            <div className="font-mono text-xs">
              <span className="block text-slate-400">CONDUCT MATRIX:</span>
              <span className="text-white font-bold">ACTIVE AUDITING SECURED</span>
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
          INTERACTIVE GUIDELINES PIPELINE STAGES
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-950 text-white border-b border-slate-800 py-8 px-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="text-center md:text-left">
            <h2 className="text-xl font-display font-extrabold uppercase tracking-wide flex items-center justify-center md:justify-start gap-2">
              <Sparkles className="w-5 h-5 text-hazard" />
              Incident Audit Life Cycle
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-1">
              Select any stage below to inspect the guideline standards applied from report submission to resolution.
            </p>
          </div>

          {/* Interactive Flow */}
          <div className="bg-slate-900 border border-slate-800/80 rounded p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center justify-center relative">
              
              {PIPELINE_STAGES.map((stage, i) => {
                const isSelected = selectedStage?.id === stage.id;
                
                return (
                  <div key={stage.id} className="flex flex-col items-center relative">
                    <button
                      onClick={() => setSelectedStage(stage)}
                      className={`w-full p-3 rounded border text-center transition cursor-pointer select-none ${
                        isSelected 
                          ? 'bg-hazard text-ink border-hazard font-bold shadow-md shadow-hazard/10 scale-105' 
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <span className="block text-xs font-mono font-bold truncate">{stage.label}</span>
                      <span className="block text-[8px] text-slate-500 uppercase tracking-wider truncate mt-1">
                        {stage.role}
                      </span>
                    </button>
                    
                    {/* Connecting arrow */}
                    {i < PIPELINE_STAGES.length - 1 && (
                      <div className="hidden md:block absolute -right-[15px] top-1/2 -translate-y-1/2 text-slate-600 font-mono text-[10px]">
                        &rarr;
                      </div>
                    )}
                  </div>
                );
              })}

            </div>

            {/* Stage Details Inspector */}
            {selectedStage && (
              <div className="bg-slate-950 border border-slate-800 rounded p-4 mt-6 text-xs font-mono grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold text-hazard uppercase mb-1">
                    Stage Guidelines: {selectedStage.label}
                  </h4>
                  <p className="text-slate-300 text-[11px] leading-relaxed font-sans mb-3">
                    {selectedStage.description}
                  </p>
                  <span className="block text-[9px] text-slate-500 uppercase tracking-widest">
                    Role in System
                  </span>
                  <span className="text-white text-[11px] font-bold block">{selectedStage.role}</span>
                </div>
                
                <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-800/80 pt-3 md:pt-0 md:pl-4">
                  <div>
                    <span className="block text-[9px] text-slate-500 uppercase tracking-widest">
                      Guideline Checkpoint
                    </span>
                    <span className="text-white text-[11px] block">{selectedStage.guidelineCheck}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-500 uppercase tracking-widest">
                      Community Vote Impact
                    </span>
                    <span className="text-white text-[11px] block">{selectedStage.communityWeight}</span>
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
              placeholder="Search guidelines, rules, conduct policies..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-paper-dim rounded focus:border-hazard focus:outline-none bg-paper/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'All Guidelines' },
              { id: 'reporting', label: 'Reporting Standards' },
              { id: 'verification', label: 'Verifications' },
              { id: 'conduct', label: 'Conduct' },
              { id: 'moderation', label: 'Moderation' },
              { id: 'fairness', label: 'Reputation Fair' }
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
          MAIN CONTENT AREA
      ═══════════════════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Guidelines clauses */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-display font-extrabold uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-5 h-5 text-hazard" />
            Core Conduct Clauses & Standards ({filteredSections.length})
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
                      {section.complianceStandard}
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

        {/* Right Column: Simulators & Conduct Resolver */}
        <div className="space-y-8">
          
          {/* Trust Score Estimator */}
          <div className="bg-white border border-paper-dim rounded shadow-sm overflow-hidden">
            <div className="bp-grid text-white p-4 border-b border-grid">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-hazard flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-hazard" />
                Trust Level & Points Estimator
              </h3>
            </div>
            <div className="p-5 space-y-5">
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                Adjust sliders to model a user\'s behavior footprint and estimate their relative Trust Tier classification.
              </p>

              {/* Sliders */}
              <div className="space-y-4 font-mono text-xs">
                
                <div>
                  <div className="flex justify-between mb-1.5 text-[11px]">
                    <span className="font-bold text-ink">Reports Submitted</span>
                    <span className="text-slate-500">{reportsSubmitted} Tickets</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    className="w-full accent-hazard cursor-pointer"
                    value={reportsSubmitted}
                    onChange={(e) => setReportsSubmitted(parseInt(e.target.value))}
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1.5 text-[11px]">
                    <span className="font-bold text-ink">Verification Proximity Rate</span>
                    <span className="text-slate-500">{verificationAccuracy}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    className="w-full accent-hazard cursor-pointer"
                    value={verificationAccuracy}
                    onChange={(e) => setVerificationAccuracy(parseInt(e.target.value))}
                  />
                  <span className="text-[9px] text-slate-400 leading-tight block">Percentage of peer validations verified as physically present.</span>
                </div>

                <div>
                  <div className="flex justify-between mb-1.5 text-[11px]">
                    <span className="font-bold text-ink">Admin Rejection Penalty</span>
                    <span className="text-slate-500">{rejectionCount} Rejections</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    className="w-full accent-hazard cursor-pointer"
                    value={rejectionCount}
                    onChange={(e) => setRejectionCount(parseInt(e.target.value))}
                  />
                  <span className="text-[9px] text-slate-400 leading-tight block">Number of reports flagged as private, duplicate, or spam.</span>
                </div>

                <div>
                  <div className="flex justify-between mb-1.5 text-[11px]">
                    <span className="font-bold text-ink">Accurate Duplicates Tagged</span>
                    <span className="text-slate-500">{flagsTriggered} Flags</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    className="w-full accent-hazard cursor-pointer"
                    value={flagsTriggered}
                    onChange={(e) => setFlagsTriggered(parseInt(e.target.value))}
                  />
                  <span className="text-[9px] text-slate-400 leading-tight block">Accurate flagging of nearby items instead of double-posting.</span>
                </div>

              </div>

              {/* Trust Badge Display */}
              <div className={`p-4 rounded border ${trustRating.bg} space-y-1 transition-colors duration-200`}>
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-bold text-ink uppercase tracking-wide font-mono">Assigned Tier</span>
                  <span className={`text-sm font-bold font-mono ${trustRating.color}`}>{trustRating.tier}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 border-t border-slate-200/50 pt-2 mt-2">
                  <span>Score Multiplier:</span>
                  <span className="font-bold text-ink">{trustRating.multiplier}</span>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed font-sans mt-2">
                  {trustRating.desc}
                </p>
              </div>

            </div>
          </div>

          {/* Conduct Simulator Case Wizard */}
          <div className="bg-slate-950 text-white border border-slate-800 rounded p-5 shadow-lg space-y-4">
            <h3 className="text-xs font-mono font-bold text-hazard uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-2">
              <Trophy className="w-4 h-4 text-hazard" />
              Citizen Conduct Simulator
            </h3>

            {!simulatorCompleted ? (
              <div className="space-y-4 font-mono text-xs">
                <div className="flex justify-between text-[9px] text-slate-500 uppercase tracking-widest">
                  <span>Scenario {currentScenarioIdx + 1} of {CONDUCT_SCENARIOS.length}</span>
                  <span>Score: {simulatorScore}</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded p-3 text-[10px] font-bold text-slate-200 leading-snug font-sans">
                  <h4 className="text-hazard font-mono text-[9px] uppercase tracking-wider mb-1">
                    {CONDUCT_SCENARIOS[currentScenarioIdx].title}
                  </h4>
                  {CONDUCT_SCENARIOS[currentScenarioIdx].description}
                </div>

                <div className="space-y-2">
                  {CONDUCT_SCENARIOS[currentScenarioIdx].options.map((opt, idx) => {
                    const isSelected = selectedOptionIdx === idx;
                    const isCorrect = opt.isCorrect;
                    
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
                        {opt.text}
                      </button>
                    );
                  })}
                </div>

                {showExplanation && (
                  <div className="bg-slate-900 border border-slate-800 rounded p-3 text-[10px] space-y-2">
                    <div className="flex items-start gap-1.5">
                      {CONDUCT_SCENARIOS[currentScenarioIdx].options[selectedOptionIdx!].isCorrect ? (
                        <CheckCircle className="w-4 h-4 text-verified flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-signal flex-shrink-0" />
                      )}
                      <p className="text-slate-300 leading-normal font-sans">
                        {CONDUCT_SCENARIOS[currentScenarioIdx].options[selectedOptionIdx!].explanation}
                      </p>
                    </div>
                    <button
                      onClick={handleNextScenario}
                      className="w-full btn-primary bg-hazard text-ink py-1 text-[10px] flex justify-center items-center gap-1 mt-2"
                    >
                      <span>Next Scenario</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 space-y-4">
                <CheckCircle className="w-12 h-12 text-verified mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold font-mono">Conduct Audit Passed!</h4>
                  <p className="text-[10px] text-slate-400 font-sans px-2">
                    You scored <b>{simulatorScore} / {CONDUCT_SCENARIOS.length}</b>. You understand the Civic Pulse community guidelines and routing standards.
                  </p>
                </div>
                <button
                  onClick={resetSimulator}
                  className="btn-secondary text-[10px] text-white py-1 px-3"
                >
                  Restart Simulator
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
            <span>© Civic Pulse Conduct Board. Guidelines verified by citizen consensus.</span>
          </div>
          <div className="flex gap-4">
            <Link to="/home" className="hover:text-ink transition no-underline">Live Feed</Link>
            <span>&bull;</span>
            <Link to="/terms" className="hover:text-ink transition no-underline">Terms of Service</Link>
            <span>&bull;</span>
            <Link to="/privacy" className="hover:text-ink transition no-underline">Privacy Policy</Link>
          </div>
        </div>
      </div>

    </div>
  );
}
