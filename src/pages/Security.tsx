import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar';
import {
  Shield,
  Lock,
  Activity,
  FileText,
  Check,
  AlertCircle,
  Trash2,
  RefreshCw,
  Key,
  Database,
  AlertTriangle,
  Info,
  ExternalLink,
  Layers,
  Globe,
  Terminal,
  ArrowRight,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react';

/* ── Types & Interfaces ────────────────────────────────────────────────── */
interface AuditLog {
  id: string;
  timestamp: string;
  category: 'Access' | 'Data Cleanse' | 'Threat Sweep' | 'Integrity';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  node: string;
}

interface ComplianceControl {
  id: string;
  framework: 'SOC2' | 'ISO27001' | 'GDPR' | 'CCPA';
  name: string;
  description: string;
  implemented: boolean;
  weight: number;
}

/* ── Constants & Mock Data ─────────────────────────────────────────────── */
const INITIAL_LOGS: AuditLog[] = [
  {
    id: 'SEC-LOG-01',
    timestamp: '2026-07-17T06:40:12Z',
    category: 'Threat Sweep',
    severity: 'info',
    message: 'Perception file upload sandbox scanned: no stego or malware payload detected in photo_402.png.',
    node: 'DELHI-CENTRAL-01'
  },
  {
    id: 'SEC-LOG-02',
    timestamp: '2026-07-17T06:39:55Z',
    category: 'Data Cleanse',
    severity: 'info',
    message: 'EXIF geotags and owner signature successfully scrubbed from incident upload CP-1029.',
    node: 'SCRUB-NODE-03'
  },
  {
    id: 'SEC-LOG-03',
    timestamp: '2026-07-17T06:38:14Z',
    category: 'Access',
    severity: 'warning',
    message: 'Repeated API request unauthorized: client IP 192.168.1.18 throttled for missing token Bearer.',
    node: 'GATEWAY-02'
  },
  {
    id: 'SEC-LOG-04',
    timestamp: '2026-07-17T06:37:02Z',
    category: 'Integrity',
    severity: 'critical',
    message: 'Database check triggered: Geohash boundary mismatch resolved on ward 04 spatial polygon.',
    node: 'INDEX-NODE-09'
  },
  {
    id: 'SEC-LOG-05',
    timestamp: '2026-07-17T06:35:45Z',
    category: 'Threat Sweep',
    severity: 'info',
    message: 'Rate limit bucket successfully flushed for developer tier sandbox keys.',
    node: 'REDIS-CACHE-01'
  }
];

const COMPLIANCE_CONTROLS: ComplianceControl[] = [
  { id: 'C-01', framework: 'SOC2', name: 'Continuous Penetration Testing', description: 'Weekly external port scans and automated application vulnerability checks.', implemented: true, weight: 25 },
  { id: 'C-02', framework: 'SOC2', name: 'Least-Privilege RBAC Matrix', description: 'Restricts ward admin control levels to verified municipal identities only.', implemented: true, weight: 25 },
  { id: 'C-03', framework: 'SOC2', name: 'Encryption of Data at Rest', description: 'Applies cryptographic AES-256 envelope wrappers on all relational databases.', implemented: true, weight: 30 },
  { id: 'C-04', framework: 'SOC2', name: 'Immutable Audit Trail', description: 'Secures system state modifications inside append-only logging tables.', implemented: false, weight: 20 },
  
  { id: 'C-05', framework: 'ISO27001', name: 'Information Security Policy', description: 'Defines clean protocols for asset categorizations and control access.', implemented: true, weight: 35 },
  { id: 'C-06', framework: 'ISO27001', name: 'Disaster Recovery Plan', description: 'Enforces redundant database replication across three distinct geo-zones.', implemented: true, weight: 35 },
  { id: 'C-07', framework: 'ISO27001', name: 'Static Code Analysis (SAST)', description: 'Integrates syntax check and security scanners inside CI/CD workflows.', implemented: false, weight: 30 },

  { id: 'C-08', framework: 'GDPR', name: 'EXIF Metadata Stripping', description: 'Deletes camera types, owner names, and precise coordinates from public images.', implemented: true, weight: 40 },
  { id: 'C-09', framework: 'GDPR', name: 'Right to Erasure Sandbox', description: 'Citizen tool to request instant database purge of historical reports.', implemented: true, weight: 30 },
  { id: 'C-10', framework: 'GDPR', name: 'IP Address Anonymization', description: 'Truncates developer and client IP addresses after rate limit verification.', implemented: false, weight: 30 }
];

export default function Security() {
  /* ── State ───────────────────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState<'audit' | 'shredder' | 'encryption' | 'compliance'>('audit');
  
  // Audit Ledger State
  const [logs, setLogs] = useState<AuditLog[]>(INITIAL_LOGS);
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warning' | 'critical'>('all');
  const [isLogStreaming, setIsLogStreaming] = useState(true);

  // Shredder State
  const [retentionDays, setRetentionDays] = useState(90);
  const [purgeCategory, setPurgeCategory] = useState<'all' | 'ip' | 'metadata' | 'photos'>('metadata');
  const [isPurging, setIsPurging] = useState(false);
  const [purgeStatus, setPurgeStatus] = useState<string | null>(null);

  // Encryption & Key Rotation State
  const [dbSalt, setDbSalt] = useState('cp_salt_784af109e20a91f82b19');
  const [isRotating, setIsRotating] = useState(false);
  const [rotationStep, setRotationStep] = useState<string | null>(null);
  const [rotationProgress, setRotationProgress] = useState(0);

  // Compliance controls state
  const [controls, setControls] = useState<ComplianceControl[]>(() => {
    try {
      const saved = localStorage.getItem('civic_pulse_security_controls');
      return saved ? JSON.parse(saved) : COMPLIANCE_CONTROLS;
    } catch {
      return COMPLIANCE_CONTROLS;
    }
  });

  /* ── Effects ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    localStorage.setItem('civic_pulse_security_controls', JSON.stringify(controls));
  }, [controls]);

  // Log Stream Simulator
  useEffect(() => {
    if (!isLogStreaming) return;

    const interval = setInterval(() => {
      const categories: AuditLog['category'][] = ['Access', 'Data Cleanse', 'Threat Sweep', 'Integrity'];
      const severities: AuditLog['severity'][] = ['info', 'warning', 'critical'];
      const messages = [
        'Malware scan sandbox clean: file uploaded without binary threat signature.',
        'GDPR automated script: cleared cached spatial logs older than configured retention.',
        'Security token validation success: node authenticated successfully.',
        'DDoS firewall rules matching: rate limits updated on edge gateway.',
        'Database verification sweep: all geohash coordinate ranges verified.'
      ];
      const nodes = ['DELHI-CENTRAL-01', 'SCRUB-NODE-03', 'GATEWAY-02', 'INDEX-NODE-09', 'REDIS-CACHE-01'];

      const randomCat = categories[Math.floor(Math.random() * categories.length)];
      const randomSev = severities[Math.floor(Math.random() * severities.length)];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      const randomNode = nodes[Math.floor(Math.random() * nodes.length)];

      const newLog: AuditLog = {
        id: `SEC-LOG-${Date.now().toString().substring(8)}`,
        timestamp: new Date().toISOString(),
        category: randomCat,
        severity: randomSev,
        message: randomMsg,
        node: randomNode
      };

      setLogs(prev => [newLog, ...prev.slice(0, 19)]);
    }, 4500);

    return () => clearInterval(interval);
  }, [isLogStreaming]);

  /* ── Handlers ────────────────────────────────────────────────────────── */
  const handleToggleControl = (id: string) => {
    setControls(prev =>
      prev.map(c => (c.id === id ? { ...c, implemented: !c.implemented } : c))
    );
  };

  const handleExecutePurge = () => {
    setIsPurging(true);
    setPurgeStatus('Scans queued...');
    
    setTimeout(() => {
      setPurgeStatus('Filtering database target entries...');
    }, 1000);

    setTimeout(() => {
      setPurgeStatus('Zeroing records & rewriting storage sectors...');
    }, 2200);

    setTimeout(() => {
      setIsPurging(false);
      setPurgeStatus(null);
      
      // Append a log entry about this purge
      const logEntry: AuditLog = {
        id: `SEC-LOG-${Date.now().toString().substring(8)}`,
        timestamp: new Date().toISOString(),
        category: 'Data Cleanse',
        severity: 'critical',
        message: `Manual storage shredder: purged all ${purgeCategory} logs older than ${retentionDays} days.`,
        node: 'SHREDDER-UTILITY'
      };
      setLogs(prev => [logEntry, ...prev]);
      alert(`Purge completed successfully! Shredded ${purgeCategory} entries older than ${retentionDays} days.`);
    }, 3500);
  };

  const handleRotateSalt = () => {
    setIsRotating(true);
    setRotationProgress(5);
    setRotationStep('Generating new AES-256 master entropy salt...');

    // Multi-stage rotation simulation
    setTimeout(() => {
      setRotationProgress(25);
      setRotationStep('Warming temporary caching layer registers...');
    }, 1200);

    setTimeout(() => {
      setRotationProgress(55);
      setRotationStep('Re-encrypting database envelope hashes (AES-GCM)...');
    }, 2500);

    setTimeout(() => {
      setRotationProgress(85);
      setRotationStep('Validating decryptions on verification checks...');
    }, 3800);

    setTimeout(() => {
      const newEntropy = 'cp_salt_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
      setDbSalt(newEntropy);
      setRotationProgress(100);
      setRotationStep('Key rotation complete. Evicting old cache maps.');
      
      const logEntry: AuditLog = {
        id: `SEC-LOG-${Date.now().toString().substring(8)}`,
        timestamp: new Date().toISOString(),
        category: 'Integrity',
        severity: 'critical',
        message: 'Master encryption key rotated: regenerated global database encryption salt.',
        node: 'ENVELOPE-KEY-MGR'
      };
      setLogs(prev => [logEntry, ...prev]);

      setTimeout(() => {
        setIsRotating(false);
        setRotationStep(null);
      }, 1000);
    }, 5000);
  };

  /* ── Calculations ────────────────────────────────────────────────────── */
  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') return logs;
    return logs.filter(l => l.severity === logFilter);
  }, [logs, logFilter]);

  const scoreSoc2 = useMemo(() => {
    const soc2List = controls.filter(c => c.framework === 'SOC2');
    const totalWeight = soc2List.reduce((acc, c) => acc + c.weight, 0);
    const implementedWeight = soc2List.filter(c => c.implemented).reduce((acc, c) => acc + c.weight, 0);
    return Math.round((implementedWeight / totalWeight) * 100);
  }, [controls]);

  const scoreIso = useMemo(() => {
    const isoList = controls.filter(c => c.framework === 'ISO27001');
    const totalWeight = isoList.reduce((acc, c) => acc + c.weight, 0);
    const implementedWeight = isoList.filter(c => c.implemented).reduce((acc, c) => acc + c.weight, 0);
    return Math.round((implementedWeight / totalWeight) * 100);
  }, [controls]);

  const scoreGdpr = useMemo(() => {
    const gdprList = controls.filter(c => c.framework === 'GDPR');
    const totalWeight = gdprList.reduce((acc, c) => acc + c.weight, 0);
    const implementedWeight = gdprList.filter(c => c.implemented).reduce((acc, c) => acc + c.weight, 0);
    return Math.round((implementedWeight / totalWeight) * 100);
  }, [controls]);

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
              <Shield className="w-4 h-4 text-hazard inline-block animate-pulse" />
              Automated Integrity & Compliance Guard
            </div>
            <h1 className="text-4xl lg:text-5xl font-display font-black uppercase tracking-wide leading-none">
              Security <span className="text-hazard">& Compliance</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl mt-3 leading-relaxed">
              We audit incident uploads, strip metadata headers, sanitize database coordinates, and enforce transparent compliance standards across public sector interfaces.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-900/60 p-4 border border-grid/60 rounded">
            <div className="text-center px-4 border-r border-grid/45">
              <span className="block text-xl font-mono font-bold text-white">TLS 1.3</span>
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Transport</span>
            </div>
            <div className="text-center px-4">
              <span className="block text-xl font-mono font-bold text-verified">AES-256</span>
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Rest Storage</span>
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
          INTERACTIVE NAV TABS
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-paper-dim sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 flex justify-start gap-4">
          {[
            { id: 'audit', label: 'Security Audit Ledger', icon: <Terminal className="w-4 h-4" /> },
            { id: 'shredder', label: 'GDPR Shredder Simulator', icon: <Trash2 className="w-4 h-4" /> },
            { id: 'encryption', label: 'Encryption & Salt Rotation', icon: <Key className="w-4 h-4" /> },
            { id: 'compliance', label: 'Compliance Roadmap', icon: <FileText className="w-4 h-4" /> }
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
      <div className="max-w-6xl mx-auto px-6 py-10 flex-1 w-full">
        
        {/* Panel 1: Security Audit Ledger */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-display font-extrabold uppercase text-ink">Incident Threat Telemetry</h2>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Live logging stream audit for malware uploads, EXIF sanitization runs, and gateway access violations.
                </p>
              </div>

              {/* Pause/Play Stream */}
              <button
                onClick={() => setIsLogStreaming(!isLogStreaming)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded cursor-pointer transition ${
                  isLogStreaming
                    ? 'bg-slate-900 text-white'
                    : 'bg-paper text-slate-700 border border-paper-dim hover:bg-paper-dim'
                }`}
              >
                <Activity className={`w-3.5 h-3.5 ${isLogStreaming ? 'animate-pulse text-hazard' : ''}`} />
                <span>{isLogStreaming ? 'Streaming Active' : 'Stream Paused'}</span>
              </button>
            </div>

            {/* Filter buttons */}
            <div className="flex gap-2 text-xs font-mono">
              {(['all', 'info', 'warning', 'critical'] as const).map(sev => (
                <button
                  key={sev}
                  onClick={() => setLogFilter(sev)}
                  className={`px-3 py-1 rounded cursor-pointer uppercase font-bold border transition ${
                    logFilter === sev
                      ? 'bg-slate-950 border-slate-950 text-white shadow-sm'
                      : 'bg-white border-paper-dim text-slate-600 hover:border-slate-350'
                  }`}
                >
                  {sev === 'all' ? 'All Alerts' : sev}
                </button>
              ))}
            </div>

            {/* Console Log Panel */}
            <div className="bg-slate-950 text-slate-300 font-mono text-[10px] rounded-lg border border-slate-900 shadow-lg overflow-hidden">
              <div className="bg-slate-900 px-4 py-3 border-b border-slate-850 flex justify-between items-center text-slate-450 text-[9px] uppercase tracking-wider font-bold">
                <span>Timestamp & Message</span>
                <span>Auditing Node</span>
              </div>
              <div className="p-4 divide-y divide-slate-900/60 max-h-[420px] overflow-y-auto space-y-2">
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 italic">No logs matched selected filter.</div>
                ) : (
                  filteredLogs.map(log => (
                    <div key={log.id} className="pt-2.5 first:pt-0 flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <div className="flex gap-2 items-center">
                          <span className="text-slate-500 font-bold">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                            log.severity === 'critical'
                              ? 'bg-red-950 text-red-400 border border-red-900/50'
                              : log.severity === 'warning'
                              ? 'bg-amber-950 text-amber-400 border border-amber-900/50'
                              : 'bg-blue-950 text-blue-400 border border-blue-900/50'
                          }`}>
                            {log.severity}
                          </span>
                          <span className="text-slate-400 font-bold">|</span>
                          <span className="text-slate-500">{log.category}</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed max-w-2xl font-sans text-xs">{log.message}</p>
                      </div>
                      <span className="text-slate-500 text-[9px] font-bold flex-shrink-0">{log.node}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* Panel 2: GDPR Shredder Simulator */}
        {activeTab === 'shredder' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Control Panel */}
            <div className="lg:col-span-5 bg-white border border-paper-dim rounded p-6 shadow-sm space-y-6">
              <div>
                <h3 className="font-bold text-base text-ink flex items-center gap-1.5">
                  <Trash2 className="w-5 h-5 text-hazard" />
                  GDPR Retention Manager
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed font-sans mt-0.5">
                  Audit CCPA/GDPR compliance values by setting target retention brackets and triggering storage scrubs.
                </p>
              </div>

              <div className="space-y-5 text-xs font-mono">
                {/* Retention slider */}
                <div className="space-y-2">
                  <div className="flex justify-between font-bold text-ink">
                    <span>IP / Location Cache Limit</span>
                    <span className="text-hazard">{retentionDays} Days</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="365"
                    step="15"
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(parseInt(e.target.value))}
                    className="w-full h-1 bg-paper-dim rounded-lg appearance-none cursor-pointer accent-hazard"
                  />
                  <p className="text-[10px] text-slate-400 leading-tight font-sans">
                    GDPR mandates scrubbing personal telemetry files (like precision GPS float ranges or client IP addresses) after verification sweeps complete.
                  </p>
                </div>

                {/* Purge Category */}
                <div className="space-y-2">
                  <label className="font-bold text-ink block">Purge Category</label>
                  <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                    {[
                      { id: 'metadata', label: 'EXIF Metadata' },
                      { id: 'ip', label: 'IP Address Logs' },
                      { id: 'photos', label: 'Unverified Photos' },
                      { id: 'all', label: 'All Expired Data' }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setPurgeCategory(cat.id as any)}
                        className={`p-2.5 rounded border cursor-pointer font-bold transition ${
                          purgeCategory === cat.id
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-paper-dim text-slate-600 hover:border-slate-350'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shred button */}
                <button
                  onClick={handleExecutePurge}
                  disabled={isPurging}
                  className="w-full btn-primary bg-hazard hover:bg-yellow-500 text-ink py-2.5 font-bold uppercase tracking-wider border-none flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isPurging ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {isPurging ? 'Purging Sectors...' : 'Execute Instant Purge'}
                </button>
              </div>
            </div>

            {/* Simulated Storage Status Console */}
            <div className="lg:col-span-7 bg-slate-950 text-white border border-slate-900 rounded overflow-hidden flex flex-col justify-between shadow-lg min-h-80">
              <div className="bg-slate-900 px-4 py-3 border-b border-slate-850 flex justify-between items-center">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-hazard" />
                  Storage Partition Logs
                </span>
                <span className="text-[10px] font-mono text-slate-500">SECTOR CHECK: NOMINAL</span>
              </div>

              <div className="p-5 font-mono text-[11px] bg-slate-950/80 leading-relaxed overflow-x-auto flex-1">
                {isPurging ? (
                  <div className="flex flex-col justify-center items-center h-48 gap-3 text-slate-500">
                    <Activity className="w-8 h-8 animate-pulse text-hazard" />
                    <span className="text-[10px] tracking-widest uppercase text-white font-bold">{purgeStatus}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-slate-500">[SYSTEM] Scanning storage tables for indices matching expiration criteria...</div>
                    <div>&gt; Identified 48 incident image records containing raw EXIF headers.</div>
                    <div>&gt; Identified 102 log entries containing non-anonymized client IPs.</div>
                    <div className="text-verified font-bold">&gt; Ready for sector sanitation sweep.</div>
                    <div className="text-slate-500 mt-4">[GUIDE] Press "Execute Instant Purge" on the left to trigger the sanitization script, simulating database overwrite.</div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-900/60 border-t border-slate-900 text-[10px] font-sans text-slate-400 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-hazard flex-shrink-0 mt-0.5" />
                <p className="leading-normal">
                  <b>CCPA / GDPR Safe Harbor:</b> CivicPulse sanitizes coordinates into geohash grids. Even if storage is breached, individual citizen coordinates cannot be parsed or correlated with precise identities.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* Panel 3: Encryption & Salt Rotation */}
        {activeTab === 'encryption' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Info display and key view */}
            <div className="lg:col-span-5 bg-white border border-paper-dim rounded p-6 shadow-sm space-y-6">
              <div>
                <h3 className="font-bold text-base text-ink flex items-center gap-1.5">
                  <Lock className="w-5 h-5 text-hazard" />
                  Relational Envelope Salt
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed font-sans mt-0.5">
                  Enforces encryption protocols by rotating salts periodically to thwart database dictionary attacks.
                </p>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div className="space-y-1.5">
                  <label className="font-bold text-ink block uppercase tracking-wider text-[9px] text-slate-400">Current DB Encryption Salt</label>
                  <div className="bg-slate-950 text-slate-350 p-3 rounded border border-slate-900 flex justify-between items-center overflow-x-auto">
                    <span className="truncate pr-4">{dbSalt}</span>
                  </div>
                </div>

                <button
                  onClick={handleRotateSalt}
                  disabled={isRotating}
                  className="w-full btn-primary bg-slate-900 hover:bg-slate-800 text-white py-2.5 font-bold uppercase tracking-wider flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isRotating ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-hazard" />
                  ) : (
                    <Key className="w-4 h-4 text-hazard" />
                  )}
                  {isRotating ? 'Rotating Cryptographic Salt...' : 'Rotate Cryptographic Salt'}
                </button>
              </div>
            </div>

            {/* Rotating console progress */}
            <div className="lg:col-span-7 bg-slate-950 text-white border border-slate-900 rounded overflow-hidden flex flex-col justify-between shadow-lg min-h-80">
              <div className="bg-slate-900 px-4 py-3 border-b border-slate-850 flex justify-between items-center">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-hazard" />
                  Key Rotation Process Dashboard
                </span>
                <span className="text-[10px] font-mono text-slate-500">CIPHER: AES-GCM-256</span>
              </div>

              <div className="p-5 font-mono text-[11px] bg-slate-950/80 leading-relaxed overflow-x-auto flex-1">
                {isRotating ? (
                  <div className="space-y-4 h-full flex flex-col justify-center">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-hazard font-bold uppercase tracking-wider">Rotating master keys...</span>
                        <span className="font-bold">{rotationProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-900 h-2 rounded overflow-hidden border border-slate-800">
                        <div
                          className="bg-hazard h-full transition-all duration-300"
                          style={{ width: `${rotationProgress}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-slate-400 animate-pulse text-[10px]">&gt; {rotationStep}</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-slate-500">[SYSTEM] Envelope wrapper monitoring nominal.</div>
                    <div>&gt; Database indexes: ENCRYPTED</div>
                    <div>&gt; Salt strength: 120 bits entropy</div>
                    <div>&gt; Next scheduled automatic rotation: 14 days remaining</div>
                    <div className="text-slate-550 mt-4">[GUIDE] Click "Rotate Cryptographic Salt" on the left to manually trigger salt regeneration and index mapping recycles.</div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-900/60 border-t border-slate-900 text-[10px] font-sans text-slate-400 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="leading-normal">
                  <b>Warning:</b> Rotating master keys requires hot-cache updates. During the 5-second rotation process, database reads will fall back to secondary replica grids.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* Panel 4: Compliance Readiness */}
        {activeTab === 'compliance' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Progress status */}
            <div className="bg-white border border-paper-dim rounded p-6 shadow-sm space-y-6">
              <h3 className="font-bold text-base text-ink uppercase tracking-wider font-mono">Readiness Scores</h3>
              
              <div className="space-y-4">
                {/* SOC 2 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono font-bold">
                    <span>SOC 2 Type II Compliance</span>
                    <span className="text-hazard">{scoreSoc2}%</span>
                  </div>
                  <div className="w-full bg-paper h-2 rounded overflow-hidden border border-paper-dim">
                    <div className="bg-hazard h-full transition-all duration-300" style={{ width: `${scoreSoc2}%` }} />
                  </div>
                </div>

                {/* ISO 27001 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono font-bold">
                    <span>ISO 27001 Readiness</span>
                    <span className="text-blue-600">{scoreIso}%</span>
                  </div>
                  <div className="w-full bg-paper h-2 rounded overflow-hidden border border-paper-dim">
                    <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${scoreIso}%` }} />
                  </div>
                </div>

                {/* GDPR */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono font-bold">
                    <span>GDPR / CCPA Safe Harbor</span>
                    <span className="text-verified">{scoreGdpr}%</span>
                  </div>
                  <div className="w-full bg-paper h-2 rounded overflow-hidden border border-paper-dim">
                    <div className="bg-verified h-full transition-all duration-300" style={{ width: `${scoreGdpr}%` }} />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-paper-dim rounded text-[11px] font-sans text-slate-500 leading-normal space-y-1">
                <p className="font-bold text-ink">About Compliance Toggles:</p>
                <p>Use the checkboxes on the right to simulate adding controls (like continuous pentesting or static code analyzers) to see real-time updates on our framework compliance scores.</p>
              </div>
            </div>

            {/* Right Column: Checkbox control board */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-display font-extrabold uppercase tracking-wide flex items-center gap-2 text-ink">
                <Check className="w-5 h-5 text-hazard" />
                Administrative Control Matrix
              </h2>

              <div className="space-y-3">
                {controls.map(control => (
                  <button
                    key={control.id}
                    onClick={() => handleToggleControl(control.id)}
                    className="w-full text-left p-4 bg-white border border-paper-dim rounded shadow-sm hover:border-slate-350 transition flex items-start gap-3 cursor-pointer"
                  >
                    <span className={`w-4 h-4 mt-0.5 rounded border border-slate-400 flex items-center justify-center font-sans text-xs ${
                      control.implemented ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white'
                    }`}>
                      {control.implemented && '✓'}
                    </span>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-ink">{control.name}</span>
                        <span className={`font-mono text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          control.framework === 'GDPR'
                            ? 'bg-verified/15 text-verified'
                            : control.framework === 'SOC2'
                            ? 'bg-hazard/15 text-yellow-600'
                            : 'bg-blue-600/15 text-blue-600'
                        }`}>
                          {control.framework}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-sans leading-relaxed">{control.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER DECK
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border-t border-paper-dim py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div>
            <span>© Civic Pulse Network — Secure Auditor compliance.</span>
          </div>
          <div className="flex gap-4">
            <Link to="/home" className="hover:text-ink transition no-underline">Live Feed</Link>
            <span>&bull;</span>
            <Link to="/faq" className="hover:text-ink transition no-underline">FAQ Center</Link>
            <span>&bull;</span>
            <Link to="/api-access" className="hover:text-ink transition no-underline">Developer API</Link>
          </div>
        </div>
      </div>

    </div>
  );
}
