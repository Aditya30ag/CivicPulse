/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar';
import {
  Info,
  Users,
  Award,
  ShieldAlert,
  Cpu,
  Layers,
  GitPullRequest,
  ArrowRight,
  Vote,
  Check,
  Sparkles,
  AlertCircle,
  Heart,
  Star,
  Send,
  Play,
  Terminal,
  Activity,
  ThumbsUp,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

/* ── Types & Interfaces ────────────────────────────────────────────────── */
interface TeamMember {
  name: string;
  role: string;
  avatar: string;
  bio: string;
  contribution: string;
  github: string;
}

interface RoadmapItem {
  id: string;
  title: string;
  quarter: string;
  description: string;
  votes: number;
  status: 'planning' | 'in-progress' | 'deployed';
  category: 'AI Agents' | 'Citizen Experience' | 'Ward Administration';
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

/* ── Constants & Mock Data ──────────────────────────────────────────────── */
const TEAM_MEMBERS: TeamMember[] = [
  {
    name: 'Aditya Agrawal',
    role: 'Lead Architect & Core Systems',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200&h=200',
    bio: 'Specializes in multi-agent orchestration, spatial indexing, and high-performance server architectures.',
    contribution: 'Designed the original geohash spatial deduplication algorithm and orchestrator core.',
    github: 'https://github.com/Aditya30ag'
  },
  {
    name: 'Dipanshu Batra',
    role: 'Frontend Architect & UI Developer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200',
    bio: 'Passionate about crafting pixel-perfect, responsive web applications with rich user feedback loops.',
    contribution: 'Authored the design system, interactive landing pages, status dashboard, and the FAQ view.',
    github: 'https://github.com/dipanshubatra'
  },
  {
    name: 'Perception Agent',
    role: 'Cognitive Vision Subsystem',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200&h=200',
    bio: 'A state-of-the-art vision model that works 24/7 to classify hazard images and evaluate incident severity.',
    contribution: 'Processes incoming uploads, strips EXIF metadata, and outputs JSON classification matrices.',
    github: '#'
  },
  {
    name: 'Deduplication Agent',
    role: 'Spatial Adjacency Manager',
    avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=200&h=200',
    bio: 'An autonomous microservice utilizing geofire indexing to cluster overlapping local hazard reports.',
    contribution: 'Merges incident reports within 100 meters, converting secondary issues into status upvotes.',
    github: '#'
  }
];

const ROADMAP_ITEMS: RoadmapItem[] = [
  {
    id: 'RD-01',
    title: 'Automated Drone Hazard Scan',
    quarter: 'Q3 2026',
    description: 'Deploys localized drone paths to audit critical roads for new potholes and structural damage.',
    votes: 342,
    status: 'planning',
    category: 'AI Agents'
  },
  {
    id: 'RD-02',
    title: 'WhatsApp Incident Dispatcher',
    quarter: 'Q3 2026',
    description: 'Enables citizens to submit photos, geotags, and voice notes directly through a WhatsApp chatbot.',
    votes: 518,
    status: 'in-progress',
    category: 'Citizen Experience'
  },
  {
    id: 'RD-03',
    title: 'Dynamic Routing for Ward Trucks',
    quarter: 'Q4 2026',
    description: 'Integrates real-time hazard severity weights with navigation tools to optimize municipal truck dispatch.',
    votes: 219,
    status: 'planning',
    category: 'Ward Administration'
  },
  {
    id: 'RD-04',
    title: 'Automated SMS Emergency Alerts',
    quarter: 'Q4 2026',
    description: 'Broadcasts immediate SMS updates to citizens living within 500m of a newly verified critical hazard.',
    votes: 184,
    status: 'planning',
    category: 'Citizen Experience'
  },
  {
    id: 'RD-05',
    title: 'Geohash Visual Heatmap Overlays',
    quarter: 'Q2 2026',
    description: 'Visualizes high-density risk clusters on the admin maps using fully interactive WebGL heatmaps.',
    votes: 412,
    status: 'deployed',
    category: 'Ward Administration'
  }
];

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: 'How far apart must two similar issues be reported to be considered unique rather than merged?',
    options: [
      'More than 10 meters',
      'More than 100 meters',
      'More than 500 meters',
      'They are never merged automatically'
    ],
    correctIndex: 1,
    explanation: 'CivicPulse merges similar hazard reports within 100 meters to keep ward dispatch lines clear of clutter.'
  },
  {
    question: 'Which agent in the CivicPulse ecosystem is responsible for analyzing hazard photos for classification?',
    options: [
      'Deduplication Agent',
      'Orchestrator Agent',
      'Perception Agent',
      'Ward Agent'
    ],
    correctIndex: 2,
    explanation: 'The Perception Agent uses multimodal models to parse visual details, extract safety tags, and grade hazard severity.'
  },
  {
    question: 'How do users gain reputation points in CivicPulse?',
    options: [
      'By logging in daily',
      'By submitting accurate reports and verifying nearby issues',
      'By writing forum comments',
      'By paying a subscription fee'
    ],
    correctIndex: 1,
    explanation: 'You earn points for verified reports (+50 pts), validating nearby active pins (+20 pts), and verifying completed fixes (+30 pts).'
  },
  {
    question: 'What spatial formatting system does CivicPulse use to query coordinate grids?',
    options: [
      'H3 Hexagons',
      'S2 Geometry',
      'Geohash String Grids',
      'UTM Zones'
    ],
    correctIndex: 2,
    explanation: 'The system serializes latitude and longitude coordinates into 12-character geohash strings for rapid localized database queries.'
  }
];

export default function About() {
  /* ── State ───────────────────────────────────────────────────────────── */
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>(() => {
    try {
      const saved = localStorage.getItem('civic_pulse_roadmap');
      return saved ? JSON.parse(saved) : ROADMAP_ITEMS;
    } catch {
      return ROADMAP_ITEMS;
    }
  });

  const [votedItems, setVotedItems] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('civic_pulse_voted_roadmap');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Quiz States
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizAnswersRecord, setQuizAnswersRecord] = useState<boolean[]>([]);

  // Simulation Status States
  const [activeTab, setActiveTab] = useState<'agents' | 'story' | 'technology'>('agents');
  const [systemLoad, setSystemLoad] = useState(48);
  const [simulatedNodes, setSimulatedNodes] = useState([
    { id: 'N-01', name: 'Delhi Central', active: true, ping: 42 },
    { id: 'N-02', name: 'Dwarka Sector', active: true, ping: 55 },
    { id: 'N-03', name: 'Noida Hub', active: true, ping: 61 },
    { id: 'N-04', name: 'Gurugram Ops', active: false, ping: 0 },
    { id: 'N-05', name: 'Rohini Dispatch', active: true, ping: 48 }
  ]);

  /* ── Effects ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    localStorage.setItem('civic_pulse_roadmap', JSON.stringify(roadmap));
  }, [roadmap]);

  useEffect(() => {
    localStorage.setItem('civic_pulse_voted_roadmap', JSON.stringify(votedItems));
  }, [votedItems]);

  // Simulate server load fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemLoad(prev => Math.max(15, Math.min(95, prev + Math.floor(Math.random() * 15) - 7)));
      setSimulatedNodes(prev =>
        prev.map(node =>
          node.active
            ? { ...node, ping: Math.max(20, Math.min(150, node.ping + Math.floor(Math.random() * 11) - 5)) }
            : node
        )
      );
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  /* ── Handlers ────────────────────────────────────────────────────────── */
  const handleVote = (id: string) => {
    if (votedItems.includes(id)) {
      // Remove vote
      setRoadmap(prev =>
        prev.map(item => (item.id === id ? { ...item, votes: item.votes - 1 } : item))
      );
      setVotedItems(prev => prev.filter(v => v !== id));
    } else {
      // Add vote
      setRoadmap(prev =>
        prev.map(item => (item.id === id ? { ...item, votes: item.votes + 1 } : item))
      );
      setVotedItems(prev => [...prev, id]);
    }
  };

  const handleQuizAnswer = (idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    
    const isCorrect = idx === QUIZ_QUESTIONS[currentQuizIndex].correctIndex;
    if (isCorrect) {
      setQuizScore(prev => prev + 1);
    }
    setQuizAnswersRecord(prev => [...prev, isCorrect]);
  };

  const handleNextQuiz = () => {
    setSelectedAnswer(null);
    if (currentQuizIndex < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
    } else {
      setQuizCompleted(true);
    }
  };

  const resetQuiz = () => {
    setCurrentQuizIndex(0);
    setSelectedAnswer(null);
    setQuizScore(0);
    setQuizCompleted(false);
    setQuizAnswersRecord([]);
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col font-sans" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <LandingNavbar />

      {/* ═══════════════════════════════════════════════════════════════
          HERO BANNER — Blueprint Grid Theme
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bp-grid text-white py-16 px-6 lg:px-16 border-b border-grid relative">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-hazard uppercase mb-2">
              <span className="w-2 h-2 rounded-full bg-hazard inline-block animate-pulse" />
              Decentralized Municipal Safety Orchestration
            </div>
            <h1 className="text-4xl lg:text-5xl font-display font-black uppercase tracking-wide leading-none">
              About <span className="text-hazard">CivicPulse</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl mt-3 leading-relaxed">
              We build open infrastructure combining computer vision models with geofire algorithms to solve the communication gap between citizens and local ward administrations.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-900/60 p-4 border border-grid/60 rounded">
            <div className="text-center px-4 border-r border-grid/45">
              <span className="block text-xl font-mono font-bold text-white">{systemLoad}%</span>
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Sys Load</span>
            </div>
            <div className="text-center px-4">
              <span className="block text-xl font-mono font-bold text-verified">
                {simulatedNodes.filter(n => n.active).length}/{simulatedNodes.length}
              </span>
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Nodes Up</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          INTERACTIVE NAV TABS — Story, Architecture, and Tech Specs
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-paper-dim sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 flex justify-start gap-4">
          {[
            { id: 'agents', label: 'Multi-Agent Network', icon: <Cpu className="w-4 h-4" /> },
            { id: 'story', label: 'Our Philosophy', icon: <Info className="w-4 h-4" /> },
            { id: 'technology', label: 'Technical Stack', icon: <Layers className="w-4 h-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 px-3 text-sm font-bold border-b-2 transition cursor-pointer ${
                activeTab === tab.id
                  ? 'border-hazard text-ink'
                  : 'border-transparent text-slate-500 hover:text-ink'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TAB PANELS CONTENT
      ═══════════════════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-6 py-12 flex-1">
        
        {/* Panel 1: Multi-Agent Network */}
        {activeTab === 'agents' && (
          <div className="space-y-12">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-display font-black uppercase text-ink mb-3">
                Decentralized Municipal Dispatch
              </h2>
              <p className="text-slate-600 leading-relaxed text-sm">
                CivicPulse is not just a ticketing database. It utilizes autonomous AI agents that verify coordinates, analyze image validity, catalog severity, and route municipal crews dynamically without human intervention.
              </p>
            </div>

            {/* Agent Visualization Board */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Perception Agent */}
              <div className="bg-white border border-paper-dim rounded shadow-sm p-6 hover:border-slate-350 transition relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-50 rounded-bl-full flex items-center justify-center transition group-hover:bg-cyan-100">
                  <Cpu className="w-5 h-5 text-cyan-600" />
                </div>
                <span className="font-mono text-[9px] font-bold text-cyan-600 uppercase tracking-widest block mb-2">
                  Cognitive Vision Subsystem
                </span>
                <h3 className="text-lg font-bold text-ink mb-2">Perception Agent</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans mb-4">
                  Analyzes uploaded issue photos to verify hazard presence. Identifies potholes, electrical damages, blocked sewers, and rates raw severity scores.
                </p>
                <div className="bg-slate-50 p-3 rounded font-mono text-[10px] text-slate-700 border border-slate-100">
                  <span className="font-bold text-ink block mb-1">Live Processing Output:</span>
                  <div className="space-y-1">
                    <div>[INPUT]: photo_stream_49a.png</div>
                    <div className="text-cyan-600 font-semibold">[RESULT]: hazard_pothole (96% conf)</div>
                    <div>[WEIGHT]: severity_score = 7.4</div>
                  </div>
                </div>
              </div>

              {/* Card 2: Deduplication Agent */}
              <div className="bg-white border border-paper-dim rounded shadow-sm p-6 hover:border-slate-350 transition relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-hazard/10 rounded-bl-full flex items-center justify-center transition group-hover:bg-hazard/20">
                  <Layers className="w-5 h-5 text-hazard" />
                </div>
                <span className="font-mono text-[9px] font-bold text-hazard uppercase tracking-widest block mb-2">
                  Spatial Adjacency Manager
                </span>
                <h3 className="text-lg font-bold text-ink mb-2">Deduplication Agent</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans mb-4">
                  Runs local geo-clustering filters. If an active hazard is reported within 100 meters, it locks coordinates to aggregate multiple complaints into upvotes.
                </p>
                <div className="bg-slate-50 p-3 rounded font-mono text-[10px] text-slate-700 border border-slate-100">
                  <span className="font-bold text-ink block mb-1">Spatial Deduplication Logic:</span>
                  <div className="space-y-1">
                    <div>[GEOPROX]: 84.2 meters (Active)</div>
                    <div className="text-amber-600 font-semibold">[MERGE]: resolved_target = CP-10198</div>
                    <div>[ACTION]: Ticket incremented (+1 upvote)</div>
                  </div>
                </div>
              </div>

              {/* Card 3: Dispatch Orchestrator */}
              <div className="bg-white border border-paper-dim rounded shadow-sm p-6 hover:border-slate-350 transition relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-full flex items-center justify-center transition group-hover:bg-purple-100">
                  <GitPullRequest className="w-5 h-5 text-purple-600" />
                </div>
                <span className="font-mono text-[9px] font-bold text-purple-600 uppercase tracking-widest block mb-2">
                  Municipal Routing Core
                </span>
                <h3 className="text-lg font-bold text-ink mb-2">Dispatch Orchestrator</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-sans mb-4">
                  Maps verified incident geohashes to spatial ward boundary polygons (GeoJSON) and automatically triggers municipal department action cues.
                </p>
                <div className="bg-slate-50 p-3 rounded font-mono text-[10px] text-slate-700 border border-slate-100">
                  <span className="font-bold text-ink block mb-1">Orchestrator Routing Event:</span>
                  <div className="space-y-1">
                    <div>[INDEX]: ttnfv2r56</div>
                    <div className="text-purple-600 font-semibold">[WARD]: Ward 07 (Palace Gdns)</div>
                    <div>[QUEUE]: dispatch_sent (priority_high)</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Architecture Node Visualizer Map */}
            <div className="bg-slate-950 border border-slate-800 rounded p-6 text-white">
              <div className="flex justify-between items-center border-b border-slate-900 pb-4 mb-6">
                <div>
                  <h3 className="text-base font-mono font-bold text-hazard uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 animate-pulse text-verified" />
                    Distributed Geospatial Node Cluster
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-sans">
                    Live system ping status across local ward boundary databases.
                  </p>
                </div>
                <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 px-2.5 py-1 rounded">
                  SWEEP NOMINAL
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {simulatedNodes.map(node => (
                  <div
                    key={node.id}
                    className={`p-4 border rounded font-mono transition duration-300 ${
                      node.active
                        ? 'bg-slate-900/60 border-slate-800 hover:border-verified/40'
                        : 'bg-slate-950 border-slate-900 opacity-40'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[9px] text-slate-500">{node.id}</span>
                      <span className={`w-2 h-2 rounded-full ${node.active ? 'bg-verified animate-pulse' : 'bg-signal'}`} />
                    </div>
                    <span className="text-xs font-bold text-slate-200 block truncate">{node.name}</span>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {node.active ? `Latency: ${node.ping}ms` : 'OFFLINE'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Panel 2: Philosophy and Vision */}
        {activeTab === 'story' && (
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-2xl font-display font-black uppercase text-ink mb-4">
                  Bridging the Municipal Communication Gap
                </h2>
                <div className="space-y-4 text-sm text-slate-600 leading-relaxed font-sans">
                  <p>
                    For years, reporting civic issues meant filling long forms, making endless phone calls, or dealing with red tape. Important hazards were ignored, and municipal trucks were dispatched to duplicate tasks due to fragmented records.
                  </p>
                  <p>
                    CivicPulse was conceived to address this exact bottleneck. By providing a clean visual map where citizens and administrators look at the exact same spatial truth, we eliminate back-and-forth messaging.
                  </p>
                  <p className="font-semibold text-ink">
                    Our model is simple: See it, photograph it, verify it. The technology does the rest.
                  </p>
                </div>
              </div>
              <div className="bg-slate-50 border border-paper-dim rounded-lg p-6 relative">
                <h3 className="text-lg font-bold text-ink mb-3 flex items-center gap-2">
                  <Award className="w-5 h-5 text-hazard" />
                  Our Core Pillars
                </h3>
                <div className="space-y-4">
                  {[
                    { title: 'Open Ledger Spatial Map', desc: 'No hidden tickets. Issues are visible to everyone living in the ward boundary.' },
                    { title: 'Citizen Audit & Verifications', desc: 'Local residents act as the validation layer. Geolocation checks confirm they are standing near the issue.' },
                    { title: 'Reputation Meritocracy', desc: 'Point scoring rewards helpful citizens and ignores spam accounts to maintain data integrity.' }
                  ].map((pillar, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded bg-hazard/10 text-hazard flex items-center justify-center font-mono text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-ink">{pillar.title}</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-sans mt-0.5">{pillar.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Meet the Team Profiles */}
            <div>
              <h3 className="text-xl font-display font-extrabold uppercase tracking-wide text-ink mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-hazard" />
                Team & Contributors
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {TEAM_MEMBERS.map(member => (
                  <div key={member.name} className="bg-white border border-paper-dim rounded shadow-sm overflow-hidden flex flex-col justify-between hover:border-slate-350 transition">
                    <div className="p-5 space-y-3">
                      <img src={member.avatar} alt={member.name} className="w-14 h-14 rounded-full object-cover border border-paper-dim" />
                      <div>
                        <h4 className="font-bold text-sm text-ink">{member.name}</h4>
                        <span className="text-[10px] font-mono font-bold text-hazard uppercase">{member.role}</span>
                      </div>
                      <p className="text-xs text-slate-500 font-sans leading-relaxed">{member.bio}</p>
                    </div>
                    <div className="p-4 bg-slate-50/50 border-t border-paper-dim text-[11px] font-mono text-slate-600 flex justify-between items-center">
                      <span className="truncate max-w-[150px]">{member.contribution}</span>
                      {member.github !== '#' && (
                        <a href={member.github} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Panel 3: Technical Stack Details */}
        {activeTab === 'technology' && (
          <div className="space-y-12">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-display font-black uppercase text-ink mb-3">
                Built For Local Scale
              </h2>
              <p className="text-slate-600 leading-relaxed text-sm">
                CivicPulse is engineered using modern React patterns, geographical partitioning algorithms, and AI agent endpoints. The entire stack is built to render under 2 seconds even on slow mobile networks.
              </p>
            </div>

            {/* Tech Stack Specs Table */}
            <div className="bg-white border border-paper-dim rounded shadow-sm overflow-hidden">
              <div className="p-5 border-b border-paper-dim bg-slate-50">
                <h3 className="font-bold text-sm text-ink uppercase tracking-wider font-mono">System Specification & Core Stack</h3>
              </div>
              <div className="divide-y divide-paper-dim text-xs">
                {[
                  { layer: 'Frontend Layer', tech: 'React, TypeScript, React Router Dom', usage: 'Responsive interface rendering, SPA routing state management, and real-time form draft validation.' },
                  { layer: 'Icon Utility', tech: 'Lucide React, FontAwesome glyph vectors', usage: 'Renders crisp vector representations for system dashboard statuses and map pins.' },
                  { layer: 'Geospatial Indexing', tech: 'Geohashing Algorithm (12-char resolution)', usage: 'Encrypts coordinate floats into linear strings to compute regional bounding queries.' },
                  { layer: 'AI Inference', tech: 'Gemini Multimodal LLM Integration', usage: 'Perceives photographic uploads to confirm hazard existence and output severity weights.' },
                  { layer: 'State Persistence', tech: 'Local Storage, React Context API', usage: 'Caches user preferences, quiz statuses, form drafts, and global authenticated contexts.' }
                ].map(item => (
                  <div key={item.layer} className="p-4 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <span className="font-mono font-bold text-ink uppercase">{item.layer}</span>
                    <span className="font-semibold text-blue-600 md:col-span-1">{item.tech}</span>
                    <span className="text-slate-500 md:col-span-2 font-sans">{item.usage}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Architecture Flow Diagram (CSS Grid/Flex) */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-ink uppercase tracking-wider font-mono">Pipeline Data Flow</h3>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                <div className="p-4 bg-slate-50 border border-paper-dim rounded text-center">
                  <span className="font-mono font-bold text-xs text-ink block">Citizen Report</span>
                  <span className="text-[10px] text-slate-500 mt-1 block font-sans">User uploads photo</span>
                </div>
                <div className="text-center text-slate-400 hidden md:block"><ChevronRight className="w-5 h-5 mx-auto" /></div>
                
                <div className="p-4 bg-cyan-50 border border-cyan-200 rounded text-center">
                  <span className="font-mono font-bold text-xs text-cyan-700 block">Perception Agent</span>
                  <span className="text-[10px] text-slate-500 mt-1 block font-sans">Validates hazard & weight</span>
                </div>
                <div className="text-center text-slate-400 hidden md:block"><ChevronRight className="w-5 h-5 mx-auto" /></div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded text-center">
                  <span className="font-mono font-bold text-xs text-amber-700 block">Deduplication</span>
                  <span className="text-[10px] text-slate-500 mt-1 block font-sans">Clusters overlapping geotags</span>
                </div>
                <div className="text-center text-slate-400 hidden md:block"><ChevronRight className="w-5 h-5 mx-auto" /></div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded text-center">
                  <span className="font-mono font-bold text-xs text-purple-700 block">Ward Dispatch</span>
                  <span className="text-[10px] text-slate-500 mt-1 block font-sans">Truck routes updated</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ROADMAP SECTION — Citizens Voting Dashboard
        ═══════════════════════════════════════════════════════════════ */}
        <div className="border-t border-paper-dim pt-12 mt-12 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
            <div>
              <span className="text-xs font-mono font-bold text-hazard uppercase tracking-wider block mb-1">
                Looking Ahead
              </span>
              <h2 className="text-2xl font-display font-black uppercase text-ink">
                Platform Feature Roadmap
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-sm font-sans">
              Vote on features you want to see implemented first. Vote states are saved locally.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roadmap.map(item => {
              const hasVoted = votedItems.includes(item.id);
              return (
                <div
                  key={item.id}
                  className="bg-white border border-paper-dim rounded p-5 hover:border-slate-300 transition flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <span className="font-mono text-[9px] font-bold px-2 py-0.5 bg-paper-dim text-slate-600 rounded uppercase tracking-wider">
                        {item.quarter}
                      </span>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        item.status === 'deployed'
                          ? 'bg-verified text-white'
                          : item.status === 'in-progress'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-ink">{item.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-sans">{item.description}</p>
                  </div>

                  <div className="flex justify-between items-center border-t border-paper-dim/60 pt-3">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{item.category}</span>
                    <button
                      onClick={() => handleVote(item.id)}
                      disabled={item.status === 'deployed'}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded cursor-pointer transition ${
                        item.status === 'deployed'
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : hasVoted
                          ? 'bg-verified text-white'
                          : 'bg-paper text-slate-700 hover:bg-paper-dim hover:text-ink'
                      }`}
                    >
                      <Vote className="w-3.5 h-3.5" />
                      <span>{item.votes} Votes</span>
                      {hasVoted && <Check className="w-3 h-3 ml-1" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            CIVIC TRIVIA QUIZ
        ═══════════════════════════════════════════════════════════════ */}
        <div className="border-t border-paper-dim pt-12 mt-12">
          <div className="bg-slate-900 text-white rounded-lg p-6 lg:p-8 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-xs font-mono font-bold text-hazard uppercase tracking-wider block mb-1">
                Trivia Challenge
              </span>
              <h2 className="text-xl font-display font-black uppercase tracking-wide">
                Test Your System Knowledge
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Complete a brief quiz about how CivicPulse manages data to unlock a direct team appreciation.
              </p>
            </div>

            {!quizCompleted ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                  <span>Question {currentQuizIndex + 1} of {QUIZ_QUESTIONS.length}</span>
                  <span>Score: {quizScore}/{QUIZ_QUESTIONS.length}</span>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-slate-200 leading-snug">
                    {QUIZ_QUESTIONS[currentQuizIndex].question}
                  </h3>

                  <div className="grid grid-cols-1 gap-3">
                    {QUIZ_QUESTIONS[currentQuizIndex].options.map((opt, idx) => {
                      let buttonStyle = 'bg-slate-850 hover:bg-slate-800 border-slate-800 text-slate-300';
                      if (selectedAnswer !== null) {
                        if (idx === QUIZ_QUESTIONS[currentQuizIndex].correctIndex) {
                          buttonStyle = 'bg-verified border-verified text-white';
                        } else if (idx === selectedAnswer) {
                          buttonStyle = 'bg-signal border-signal text-white';
                        } else {
                          buttonStyle = 'bg-slate-900 border-slate-850 text-slate-500 opacity-60';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleQuizAnswer(idx)}
                          disabled={selectedAnswer !== null}
                          className={`w-full text-left p-3.5 text-xs rounded border transition flex justify-between items-center cursor-pointer ${buttonStyle}`}
                        >
                          <span>{opt}</span>
                          {selectedAnswer !== null && idx === QUIZ_QUESTIONS[currentQuizIndex].correctIndex && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedAnswer !== null && (
                  <div className="p-4 bg-slate-850 border border-slate-800 rounded space-y-2">
                    <span className="text-[9px] font-mono text-hazard font-bold uppercase tracking-wider block">
                      Architect Explanation:
                    </span>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed">
                      {QUIZ_QUESTIONS[currentQuizIndex].explanation}
                    </p>
                    <button
                      onClick={handleNextQuiz}
                      className="btn-primary py-1.5 px-3 text-xs mt-2 float-right cursor-pointer"
                    >
                      {currentQuizIndex === QUIZ_QUESTIONS.length - 1 ? 'Finish Challenge' : 'Next Question'}
                    </button>
                    <div className="clear-both" />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 space-y-4 max-w-lg mx-auto">
                <Sparkles className="w-12 h-12 text-hazard mx-auto animate-bounce" />
                <h3 className="text-lg font-bold text-slate-200">
                  Challenge Completed!
                </h3>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  You scored <b>{quizScore} out of {QUIZ_QUESTIONS.length}</b>.
                  {quizScore === QUIZ_QUESTIONS.length
                    ? ' Stellar job! You have full knowledge of our multi-agent architecture.'
                    : ' Good effort! Read through our Technical Stack layers to find out how our routing loops connect.'}
                </p>
                <div className="p-4 bg-slate-850 border border-slate-800 rounded text-left space-y-2">
                  <span className="text-[10px] font-mono text-hazard font-bold uppercase block tracking-wider">
                    Thank You Message:
                  </span>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    "Thank you for exploring CivicPulse! Building transparent, open-source technology for civic auditing is a passion project. We appreciate you auditing our code and reviewing municipal dispatch structures."
                    <br />
                    <span className="mt-2 block font-mono text-[9px] text-slate-500">— Aditya, Dipanshu, & AI Agents</span>
                  </p>
                </div>
                <button
                  onClick={resetQuiz}
                  className="btn-secondary py-1.5 px-4 text-xs cursor-pointer inline-block"
                >
                  Restart Quiz
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER DECK
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border-t border-paper-dim py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div>
            <span>© Civic Pulse Network — Open Ledger Citizen Audits.</span>
          </div>
          <div className="flex gap-4">
            <Link to="/home" className="hover:text-ink transition no-underline">Live Feed</Link>
            <span>&bull;</span>
            <Link to="/faq" className="hover:text-ink transition no-underline">FAQ Center</Link>
            <span>&bull;</span>
            <Link to="/report" className="hover:text-ink transition no-underline">Report Incident</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
