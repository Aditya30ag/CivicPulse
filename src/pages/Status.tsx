import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Terminal,
  Cpu,
  Database,
  Globe,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Radio,
  Server,
  Layers,
  ArrowRight,
  TrendingUp,
  Sliders,
  Play
} from 'lucide-react';

/* ── Types ───────────────────────────────────────────────────────────── */
interface SystemNode {
  id: string;
  name: string;
  type: 'gateway' | 'ai' | 'database' | 'cdn';
  status: 'operational' | 'degraded' | 'maintenance' | 'offline';
  uptime: string;
  latency: number; // in ms
  region: string;
  details: string;
}

interface QueueMetric {
  id: string;
  name: string;
  activeTasks: number;
  pendingTasks: number;
  avgProcessTime: string;
  loadIndex: number; // 0 to 100
}

interface IncidentLog {
  timestamp: string;
  node: string;
  message: string;
  level: 'info' | 'warn' | 'success' | 'critical';
}

/* ── Database ────────────────────────────────────────────────────────── */
const INITIAL_NODES: SystemNode[] = [
  { id: 'node-gw-01', name: 'Gateway-API-Alpha', type: 'gateway', status: 'operational', uptime: '99.98%', latency: 45, region: 'East Ward Hub', details: 'Primary ingress for client requests, JWT token validation, and image upload routing.' },
  { id: 'node-gw-02', name: 'Gateway-API-Beta', type: 'gateway', status: 'operational', uptime: '99.95%', latency: 52, region: 'West Ward Hub', details: 'Secondary ingress, provides failover routes and static content caching.' },
  { id: 'node-ai-01', name: 'AI-Perception-Model', type: 'ai', status: 'operational', uptime: '99.42%', latency: 320, region: 'Cloud Compute Core', details: 'Multi-modal Gemini model cluster executing real-time paving crack and hazard severity audits.' },
  { id: 'node-db-01', name: 'Firestore-Core-Node', type: 'database', status: 'operational', uptime: '99.99%', latency: 18, region: 'Regional Database Cluster', details: 'Stores active reporting documents, spatial geohash indices, and client reputation tallies.' },
  { id: 'node-db-02', name: 'Firestore-Replica-01', type: 'database', status: 'operational', uptime: '99.99%', latency: 22, region: 'Regional Backup Node', details: 'Read-only replica for leaderboard generation and public dashboard spatial syncs.' },
  { id: 'node-cdn-01', name: 'Leaflet-Tiles-CDN', type: 'cdn', status: 'operational', uptime: '99.91%', latency: 28, region: 'Global Edge Cache', details: 'Delivers mapping overlays and tile textures for client geofenced map viewports.' }
];

const INITIAL_QUEUES: QueueMetric[] = [
  { id: 'q-perception', name: 'Perception AI Image Scanning', activeTasks: 3, pendingTasks: 8, avgProcessTime: '1.4s', loadIndex: 42 },
  { id: 'q-dedup', name: 'Geohash Deduplication Sweeps', activeTasks: 1, pendingTasks: 0, avgProcessTime: '0.2s', loadIndex: 12 },
  { id: 'q-dispatch', name: 'Ward Ticket Routing Dispatch', activeTasks: 4, pendingTasks: 12, avgProcessTime: '3.1s', loadIndex: 68 },
  { id: 'q-audit', name: 'Reputation Score Recalculator', activeTasks: 0, pendingTasks: 2, avgProcessTime: '0.8s', loadIndex: 8 }
];

const INITIAL_LOGS: IncidentLog[] = [
  { timestamp: '07:35:10', node: 'Gateway-API-Alpha', message: 'JWT validation verified token user-3091.', level: 'info' },
  { timestamp: '07:35:15', node: 'AI-Perception-Model', message: 'Visual audit for report CP-10309 successful. Identified Pothole.', level: 'success' },
  { timestamp: '07:36:01', node: 'Firestore-Core-Node', message: 'Geohash spatial transaction executed in 14ms.', level: 'info' },
  { timestamp: '07:36:12', node: 'Gateway-API-Beta', message: 'Static map tiles loaded for local ward dashboards.', level: 'info' },
  { timestamp: '07:37:00', node: 'AI-Perception-Model', message: 'Cloud compute latency spike: processing took 2.8s (target 1.5s).', level: 'warn' },
  { timestamp: '07:37:05', node: 'Firestore-Replica-01', message: 'Sync cycle complete. Leaderboard tables updated.', level: 'success' },
  { timestamp: '07:38:10', node: 'Gateway-API-Alpha', message: 'Rate-limiting lock triggered on IP 192.168.4.112 (exceeded 60 req/min).', level: 'warn' }
];

export default function Status() {
  /* ── State ─────────────────────────────────────────────────────────── */
  const [nodes, setNodes] = useState<SystemNode[]>(INITIAL_NODES);
  const [queues, setQueues] = useState<QueueMetric[]>(INITIAL_QUEUES);
  const [logs, setLogs] = useState<IncidentLog[]>(INITIAL_LOGS);
  
  // Interactive options
  const [selectedClusterNode, setSelectedClusterNode] = useState<string>('node-gw-01');
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom interactive simulation modifiers
  const [loadMultiplier, setLoadMultiplier] = useState<number>(1.0); // 0.5 to 2.5
  const [chartLatencyPoints, setChartLatencyPoints] = useState<number[]>([42, 48, 44, 46, 50, 43, 45]);
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);

  /* ── Effects ───────────────────────────────────────────────────────── */
  // Fluctuate system statistics periodically based on load multiplier
  useEffect(() => {
    const updateInterval = setInterval(() => {
      // Fluctuate latencies and queues
      setNodes(prevNodes => 
        prevNodes.map(node => {
          let baseLatency = INITIAL_NODES.find(n => n.id === node.id)?.latency || 50;
          let randomShift = Math.floor(Math.random() * 9) - 4;
          let calculatedLatency = Math.max(10, Math.floor((baseLatency + randomShift) * loadMultiplier));
          
          let calculatedStatus = node.status;
          if (calculatedLatency > 150 && node.type === 'gateway') {
            calculatedStatus = 'degraded';
          } else if (calculatedLatency <= 150 && node.status === 'degraded') {
            calculatedStatus = 'operational';
          }

          return {
            ...node,
            latency: calculatedLatency,
            status: calculatedStatus
          };
        })
      );

      setQueues(prevQueues => 
        prevQueues.map(q => {
          let baseActive = INITIAL_QUEUES.find(qu => qu.id === q.id)?.activeTasks || 2;
          let basePending = INITIAL_QUEUES.find(qu => qu.id === q.id)?.pendingTasks || 5;
          
          let activeShift = Math.floor(Math.random() * 3) - 1;
          let pendingShift = Math.floor(Math.random() * 5) - 2;

          let finalActive = Math.max(0, Math.floor((baseActive + activeShift) * loadMultiplier));
          let finalPending = Math.max(0, Math.floor((basePending + pendingShift) * loadMultiplier));
          let loadIdx = Math.min(100, Math.max(0, Math.floor(((finalActive + finalPending) / 25) * 100)));

          return {
            ...q,
            activeTasks: finalActive,
            pendingTasks: finalPending,
            loadIndex: loadIdx
          };
        })
      );

      // Append mock operational console log
      const logNodes = ['Gateway-API-Alpha', 'Gateway-API-Beta', 'AI-Perception-Model', 'Firestore-Core-Node'];
      const randomNode = logNodes[Math.floor(Math.random() * logNodes.length)];
      
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];

      let msg = '';
      let level: IncidentLog['level'] = 'info';

      if (randomNode.includes('Gateway')) {
        const reqTime = Math.floor(Math.random() * 40) + 30;
        msg = `Proxy route to database node succeeded in ${reqTime}ms. Code 200.`;
        level = 'info';
      } else if (randomNode.includes('AI')) {
        const conf = (85 + Math.random() * 15).toFixed(1);
        msg = `Gemini visual telemetry: confidence rating ${conf}% verified.`;
        level = 'success';
      } else {
        const writes = Math.floor(Math.random() * 10) + 1;
        msg = `Database batch write: updated ${writes} coordinates pins in geohash.`;
        level = 'info';
      }

      setLogs(prev => [
        { timestamp: timeStr, node: randomNode, message: msg, level },
        ...prev.slice(0, 15)
      ]);

      // Dynamic Latency Chart update
      setChartLatencyPoints(prev => {
        const activeNode = nodes.find(n => n.id === selectedClusterNode);
        const currentLatency = activeNode ? activeNode.latency : 50;
        return [...prev.slice(1), currentLatency];
      });

    }, 4000);

    return () => clearInterval(updateInterval);
  }, [loadMultiplier, selectedClusterNode, nodes]);

  /* ── Computations ──────────────────────────────────────────────────── */
  const selectedNodeInfo = useMemo(() => {
    return nodes.find(node => node.id === selectedClusterNode) || null;
  }, [selectedClusterNode, nodes]);

  const filteredNodes = useMemo(() => {
    if (!searchQuery) return nodes;
    return nodes.filter(node => 
      node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, nodes]);

  const systemStatusIndicator = useMemo(() => {
    const isOffline = nodes.some(n => n.status === 'offline');
    const isDegraded = nodes.some(n => n.status === 'degraded' || n.status === 'maintenance');
    
    if (isOffline) return { text: 'OUTAGE', color: 'text-signal', bg: 'bg-signal/15', border: 'border-signal/30' };
    if (isDegraded) return { text: 'DEGRADED', color: 'text-hazard', bg: 'bg-hazard/15', border: 'border-hazard/30' };
    return { text: 'NOMINAL', color: 'text-verified', bg: 'bg-verified/15', border: 'border-verified/30' };
  }, [nodes]);

  /* ── Handlers ──────────────────────────────────────────────────────── */
  const triggerDiagnostics = () => {
    setIsDiagnosticRunning(true);
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    // Stage 1
    setLogs(prev => [
      { timestamp: timeStr, node: 'Diagnostics-Runner', message: 'Initializing node testing sequence for Ward Network...', level: 'warn' },
      ...prev
    ]);

    // Stage 2
    setTimeout(() => {
      setLogs(prev => [
        { timestamp: timeStr, node: 'Diagnostics-Runner', message: 'Testing database replica read/write speeds. Node nominal (18ms).', level: 'success' },
        ...prev
      ]);
    }, 1000);

    // Stage 3
    setTimeout(() => {
      setLogs(prev => [
        { timestamp: timeStr, node: 'Diagnostics-Runner', message: 'Testing Perception Agent API endpoint response loop... Nominal (310ms).', level: 'success' },
        ...prev
      ]);
    }, 2000);

    // Stage 4
    setTimeout(() => {
      setLogs(prev => [
        { timestamp: timeStr, node: 'Diagnostics-Runner', message: 'All nodes responsive. Diagnostic sequence finished. Outage score: 0%.', level: 'success' },
        ...prev
      ]);
      setIsDiagnosticRunning(false);
    }, 3000);
  };

  return (
    <div className="flex-1 bg-paper text-ink overflow-y-auto" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      
      {/* ═══════════════════════════════════════════════════════════════
          HEADER — Blueprint Grid Banner
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bp-grid text-white py-12 px-6 lg:px-16 border-b border-grid relative">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-hazard uppercase mb-2">
              <Radio className="w-4 h-4 text-hazard inline-block animate-pulse" />
              Real-time Node Telemetry & API Status
            </div>
            <h1 className="text-4xl lg:text-5xl font-display font-black uppercase tracking-wide leading-none">
              System <span className="text-hazard">Status</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-xl mt-2 leading-relaxed font-sans">
              Monitor active database replicas, API gateway response times, and Perception AI models operating on the regional dispatch grid.
            </p>
          </div>

          {/* Main Status Badge */}
          <div className={`p-4 border ${systemStatusIndicator.border} ${systemStatusIndicator.bg} rounded flex items-center gap-3`}>
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-verified opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-verified"></span>
            </span>
            <div className="font-mono text-xs">
              <span className="block text-slate-400">GRID STATUS:</span>
              <span className={`font-bold ${systemStatusIndicator.color}`}>{systemStatusIndicator.text}</span>
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
          INTERACTIVE TELEMETRY CONTROLS & LINE CHART
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-950 text-white border-b border-slate-800 py-8 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          
          {/* Slider Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded p-5 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-mono font-bold text-hazard uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Sliders className="w-4 h-4 text-hazard" />
                Network Load Simulator
              </h3>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Modify request load parameters to simulate grid density bottlenecks. Observe changes in API latencies, queue metrics, and status logs.
              </p>
            </div>

            <div className="space-y-4 pt-3 font-mono text-xs">
              <div>
                <div className="flex justify-between mb-1.5">
                  <span>Load Multiplier</span>
                  <span className="text-hazard font-bold">{loadMultiplier.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  className="w-full accent-hazard cursor-pointer"
                  value={loadMultiplier}
                  onChange={(e) => setLoadMultiplier(parseFloat(e.target.value))}
                />
                <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                  <span>0.5x (Idle)</span>
                  <span>1.0x (Nominal)</span>
                  <span>2.5x (Peak Load)</span>
                </div>
              </div>

              <button
                disabled={isDiagnosticRunning}
                onClick={triggerDiagnostics}
                className="w-full btn-primary bg-hazard text-ink font-bold py-1.5 text-xs flex justify-center items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDiagnosticRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Checking Nodes...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Run Diagnostic Sequence
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Custom SVG Line Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded p-5 space-y-3 lg:col-span-2 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-hazard animate-pulse" />
                  Node Latency Analysis
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Active Endpoint: <span className="text-hazard">{selectedNodeInfo?.name}</span>
                </p>
              </div>

              <select
                className="bg-slate-950 border border-slate-800 rounded p-1 text-[10px] font-mono text-white focus:outline-none focus:border-hazard"
                value={selectedClusterNode}
                onChange={(e) => setSelectedClusterNode(e.target.value)}
              >
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
            </div>

            {/* SVG Plot */}
            <div className="relative h-32 w-full bg-slate-950 border border-slate-850/80 rounded flex items-end px-2 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
                {/* Horizontal gridlines */}
                <line x1="0" y1="25" x2="200" y2="25" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="0" y1="50" x2="200" y2="50" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="0" y1="75" x2="200" y2="75" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,2" />

                {/* Polyline chart curves */}
                <polyline
                  fill="none"
                  stroke="var(--hazard)"
                  strokeWidth="1.5"
                  points={chartLatencyPoints
                    .map((val, idx) => `${(idx * 200) / 6},${100 - (val / 400) * 90}`)
                    .join(' ')}
                />
              </svg>
              {/* Max/min labels */}
              <span className="absolute left-2 top-1 text-[8px] font-mono text-slate-500">400ms</span>
              <span className="absolute left-2 bottom-1 text-[8px] font-mono text-slate-500">0ms</span>
              <span className="absolute right-2 bottom-1 text-[10px] font-mono text-hazard font-bold">
                {chartLatencyPoints[chartLatencyPoints.length - 1]}ms
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN GRID — Left: Nodes / Right: Queues & Diagnostic Console
      ═══════════════════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Node Health list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-display font-extrabold uppercase tracking-wide flex items-center gap-2">
              <Server className="w-5 h-5 text-hazard" />
              Cluster Node Directory ({filteredNodes.length})
            </h2>
            <input
              type="text"
              placeholder="Filter nodes..."
              className="px-2 py-1 text-xs border border-paper-dim rounded focus:border-hazard bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {filteredNodes.map(node => {
              const statusColors = 
                node.status === 'operational' ? { text: 'text-verified', bg: 'bg-verified/10' } :
                node.status === 'degraded' ? { text: 'text-hazard', bg: 'bg-hazard/10' } :
                node.status === 'maintenance' ? { text: 'text-ink', bg: 'bg-paper-dim' } :
                { text: 'text-signal', bg: 'bg-signal/10' };

              const isSelected = selectedClusterNode === node.id;

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedClusterNode(node.id)}
                  className={`bg-white border rounded p-5 shadow-sm transition hover:border-slate-400 cursor-pointer ${
                    isSelected ? 'border-grid ring-1 ring-grid/30' : 'border-paper-dim'
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-sm text-ink">{node.name}</h3>
                        <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">
                          {node.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed font-sans max-w-lg">
                        {node.details}
                      </p>
                    </div>

                    <div className="text-right space-y-1.5 flex-shrink-0">
                      <span className={`inline-block font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded ${statusColors.bg} ${statusColors.text}`}>
                        {node.status}
                      </span>
                      <div className="text-[10px] font-mono text-slate-400">
                        <span className="block">Latency: <b className="text-ink">{node.latency}ms</b></span>
                        <span className="block">Uptime: <b className="text-ink">{node.uptime}</b></span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Agent Queues & Live Audit Console Terminal */}
        <div className="space-y-8">
          
          {/* Agent Queues Panel */}
          <div className="bg-white border border-paper-dim rounded shadow-sm overflow-hidden">
            <div className="bp-grid text-white p-4 border-b border-grid">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-hazard flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-hazard" />
                Active Agent Task Backlogs
              </h3>
            </div>
            
            <div className="p-4 space-y-4">
              {queues.map(q => {
                const barColor = 
                  q.loadIndex > 60 ? 'bg-signal' :
                  q.loadIndex > 30 ? 'bg-hazard' :
                  'bg-verified';

                return (
                  <div key={q.id} className="space-y-1">
                    <div className="flex justify-between items-baseline font-mono text-xs">
                      <span className="font-bold text-ink truncate max-w-[180px]">{q.name}</span>
                      <span className="text-[10px] text-slate-500">{q.activeTasks}a / {q.pendingTasks}p</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-paper rounded overflow-hidden">
                      <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${q.loadIndex}%` }} />
                    </div>
                    
                    <div className="flex justify-between text-[8px] font-mono text-slate-400">
                      <span>Avg Process: {q.avgProcessTime}</span>
                      <span>Load Weight: {q.loadIndex}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Console Terminal Log Ticker */}
          <div className="bg-slate-950 border border-slate-800 rounded shadow-lg p-5 text-white space-y-3">
            <div className="flex justify-between items-center border-b border-slate-850 pb-2">
              <span className="text-xs font-mono font-bold text-hazard tracking-wider flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-hazard" />
                Live Node Log Console
              </span>
              <span className="text-[9px] font-mono text-slate-500">
                AUDIT LOGS
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-850 rounded p-3 h-64 overflow-y-auto font-mono text-[9px] space-y-2 select-text">
              {logs.map((log, idx) => {
                const color = 
                  log.level === 'critical' ? 'text-signal font-bold' :
                  log.level === 'warn' ? 'text-hazard font-bold' :
                  log.level === 'success' ? 'text-verified' :
                  'text-slate-300';

                return (
                  <div key={idx} className="border-b border-slate-850/60 pb-1.5 last:border-0 leading-relaxed">
                    <div className="flex justify-between text-slate-500 text-[8px] mb-0.5">
                      <span>[{log.timestamp}]</span>
                      <span className="font-bold">{log.node}</span>
                    </div>
                    <p className={color}>
                      <span className="mr-1">&raquo;</span>
                      {log.message}
                    </p>
                  </div>
                );
              })}
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
            <span>© Civic Pulse Network Monitor. Cluster gateway routes fully encrypted.</span>
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
