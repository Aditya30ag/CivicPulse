import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar';
import {
  Terminal,
  Key,
  Cpu,
  Layers,
  Globe,
  Copy,
  Check,
  RotateCw,
  Play,
  Info,
  ExternalLink,
  Activity,
  FileText,
  CheckCircle,
  AlertCircle,
  Lock,
  Sliders,
  Settings,
  ChevronRight,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react';

/* ── Types & Interfaces ────────────────────────────────────────────────── */
interface ApiKey {
  id: string;
  label: string;
  key: string;
  environment: 'sandbox' | 'production';
  scopes: string[];
  created: string;
  revealed: boolean;
}

interface Endpoint {
  path: string;
  method: 'GET' | 'POST';
  description: string;
  queryParams: { name: string; default: string; desc: string; type: string }[];
  requestBody?: string;
  mockResponse: Record<string, any>;
}

/* ── Mock Data & Constants ─────────────────────────────────────────────── */
const MOCK_ENDPOINTS: Endpoint[] = [
  {
    path: '/v1/incidents',
    method: 'GET',
    description: 'Fetch a list of active municipal infrastructure hazards filtered by proximity.',
    queryParams: [
      { name: 'geohash', default: 'ttnfv2r', desc: 'Base geohash string to focus spatial query.', type: 'string' },
      { name: 'radius', default: '500', desc: 'Search radius in meters.', type: 'number' },
      { name: 'status', default: 'active', desc: 'Filter by ticket status (active, resolved, quarantined).', type: 'string' },
      { name: 'limit', default: '10', desc: 'Maximum number of items to return.', type: 'number' }
    ],
    mockResponse: {
      status: 'success',
      total_count: 2,
      results: [
        {
          id: 'CP-INC-40291',
          category: 'pothole',
          description: 'Deep road hazard in left lane causing traffic bottleneck.',
          severity: 7.4,
          coordinates: { lat: 28.5355, lng: 77.391 },
          geohash: 'ttnfv2r56',
          status: 'active',
          reported_at: '2026-07-16T15:20:00Z',
          verifications: 14,
          media_url: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2'
        },
        {
          id: 'CP-INC-40304',
          category: 'streetlight',
          description: 'Streetlight flickering periodically during evening hours.',
          severity: 3.2,
          coordinates: { lat: 28.5361, lng: 77.392 },
          geohash: 'ttnfv2r8a',
          status: 'active',
          reported_at: '2026-07-16T17:45:00Z',
          verifications: 4,
          media_url: 'https://images.unsplash.com/photo-1509023464722-18d996393ca8'
        }
      ]
    }
  },
  {
    path: '/v1/incidents',
    method: 'POST',
    description: 'Submit a new infrastructure incident report to the multi-agent queue.',
    queryParams: [],
    requestBody: JSON.stringify({
      category: 'pothole',
      description: 'Dangerous road cave-in near the public school crossing.',
      latitude: 28.5412,
      longitude: 77.4012,
      severity_estimate: 6,
      image_base64: 'data:image/jpeg;base64,...'
    }, null, 2),
    mockResponse: {
      status: 'queued',
      message: 'Incident submitted successfully. Perception scan initiated.',
      ticket_id: 'CP-INC-90218',
      agent_status: {
        perception_agent: 'analyzing',
        deduplication_agent: 'pending_spatial_check'
      },
      audit_url: 'https://civicpulse.org/status/CP-INC-90218'
    }
  },
  {
    path: '/v1/wards/status',
    method: 'GET',
    description: 'Retrieve real-time aggregate health and dispatch efficiency metrics for a specific ward.',
    queryParams: [
      { name: 'ward_code', default: 'ward_07', desc: 'Unique catalog alphanumeric for municipal ward.', type: 'string' }
    ],
    mockResponse: {
      ward_code: 'ward_07',
      ward_name: 'Palace Gardens & Dwarka Sector',
      operational_status: 'nominal',
      active_incidents: 24,
      dispatched_trucks: 5,
      mean_time_to_fix_hours: 14.2,
      efficiency_rating: '94.2%',
      last_sweep: '2026-07-17T00:15:00Z'
    }
  }
];

const DEFAULT_KEYS: ApiKey[] = [
  {
    id: 'key_1',
    label: 'Delhi Sandbox Client',
    key: 'cp_test_a8f92j10a9f81h29b82194a28f91',
    environment: 'sandbox',
    scopes: ['read:incidents', 'read:wards'],
    created: '2026-07-10T12:00:00Z',
    revealed: false
  },
  {
    id: 'key_2',
    label: 'Production Dispatch Core',
    key: 'cp_live_9h291a27f91h29b82194a28f910a',
    environment: 'production',
    scopes: ['read:incidents', 'write:reports', 'read:wards'],
    created: '2026-07-15T09:30:00Z',
    revealed: false
  }
];

export default function APIAccess() {
  /* ── State ───────────────────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState<'explorer' | 'keys' | 'docs' | 'metrics'>('explorer');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(() => {
    try {
      const saved = localStorage.getItem('civic_pulse_apikeys');
      return saved ? JSON.parse(saved) : DEFAULT_KEYS;
    } catch {
      return DEFAULT_KEYS;
    }
  });

  // Key creation state
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState<'sandbox' | 'production'>('sandbox');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['read:incidents']);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Explorer State
  const [selectedEndpointIdx, setSelectedEndpointIdx] = useState(0);
  const [explorerParams, setExplorerParams] = useState<Record<string, string>>({});
  const [explorerBody, setExplorerBody] = useState('');
  const [explorerResponse, setExplorerResponse] = useState<any>(null);
  const [explorerStatus, setExplorerStatus] = useState<string | null>(null);
  const [explorerLatency, setExplorerLatency] = useState<number | null>(null);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [snippetLanguage, setSnippetLanguage] = useState<'curl' | 'node' | 'python' | 'go'>('curl');

  // Metrics state (fluctuating)
  const [requestRate, setRequestRate] = useState(42.4);
  const [errorRate, setErrorRate] = useState(0.85);
  const [latencyAvg, setLatencyAvg] = useState(38);
  const [webhookSuccess, setWebhookSuccess] = useState(99.4);

  const selectedEndpoint = MOCK_ENDPOINTS[selectedEndpointIdx];

  /* ── Effects ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    localStorage.setItem('civic_pulse_apikeys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  // Sync parameters when changing endpoint
  useEffect(() => {
    const params: Record<string, string> = {};
    selectedEndpoint.queryParams.forEach(p => {
      params[p.name] = p.default;
    });
    setExplorerParams(params);
    setExplorerBody(selectedEndpoint.requestBody || '');
    setExplorerResponse(null);
    setExplorerStatus(null);
    setExplorerLatency(null);
  }, [selectedEndpointIdx]);

  // Fluctuating Metrics
  useEffect(() => {
    const interval = setInterval(() => {
      setRequestRate(prev => Math.max(10, Math.min(150, parseFloat((prev + (Math.random() * 8) - 4).toFixed(1)))));
      setErrorRate(prev => Math.max(0.1, Math.min(4.5, parseFloat((prev + (Math.random() * 0.4) - 0.2).toFixed(2)))));
      setLatencyAvg(prev => Math.max(18, Math.min(85, prev + Math.floor(Math.random() * 7) - 3)));
      setWebhookSuccess(prev => Math.max(97.5, Math.min(100, parseFloat((prev + (Math.random() * 0.2) - 0.1).toFixed(2)))));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  /* ── Handlers ────────────────────────────────────────────────────────── */
  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyLabel.trim()) return;

    const entropy = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const prefix = newKeyEnv === 'production' ? 'cp_live_' : 'cp_test_';
    const generated = `${prefix}${entropy}`;

    const newKeyItem: ApiKey = {
      id: `key_${Date.now()}`,
      label: newKeyLabel.trim(),
      key: generated,
      environment: newKeyEnv,
      scopes: [...newKeyScopes],
      created: newKeyEnv === 'production' ? new Date().toISOString() : new Date().toISOString(),
      revealed: true
    };

    setApiKeys(prev => [newKeyItem, ...prev]);
    setNewKeyLabel('');
    setNewKeyScopes(['read:incidents']);
  };

  const handleRevokeKey = (id: string) => {
    setApiKeys(prev => prev.filter(key => key.id !== id));
  };

  const toggleRevealKey = (id: string) => {
    setApiKeys(prev =>
      prev.map(key => (key.id === id ? { ...key, revealed: !key.revealed } : key))
    );
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleScopeToggle = (scope: string) => {
    setNewKeyScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  const handleParamChange = (name: string, value: string) => {
    setExplorerParams(prev => ({ ...prev, [name]: value }));
  };

  const handleSendRequest = () => {
    setIsSendingRequest(true);
    setExplorerResponse(null);
    setExplorerStatus(null);
    setExplorerLatency(null);

    // Simulate Network Latency
    const simulatedDelay = Math.floor(Math.random() * 200) + 120;
    setTimeout(() => {
      setIsSendingRequest(false);
      setExplorerStatus('200 OK');
      setExplorerLatency(simulatedDelay);
      setExplorerResponse(selectedEndpoint.mockResponse);
    }, simulatedDelay);
  };

  // Snippets calculation
  const requestUrl = useMemo(() => {
    const baseUrl = 'https://api.civicpulse.org';
    const queryStr = Object.keys(explorerParams)
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(explorerParams[k])}`)
      .join('&');
    return queryStr ? `${baseUrl}${selectedEndpoint.path}?${queryStr}` : `${baseUrl}${selectedEndpoint.path}`;
  }, [explorerParams, selectedEndpoint]);

  const codeSnippets = useMemo(() => {
    const activeKey = apiKeys[0]?.key || 'cp_live_YOUR_API_KEY_HERE';
    
    return {
      curl: `curl -X ${selectedEndpoint.method} "${requestUrl}" \\\n  -H "Authorization: Bearer ${activeKey}"${selectedEndpoint.method === 'POST' ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${explorerBody.replace(/\n/g, '\n  ')}'` : ''}`,
      node: `const response = await fetch("${requestUrl}", {\n  method: "${selectedEndpoint.method}",\n  headers: {\n    "Authorization": "Bearer ${activeKey}"${selectedEndpoint.method === 'POST' ? `,\n    "Content-Type": "application/json"` : ''}\n  }${selectedEndpoint.method === 'POST' ? `,\n  body: JSON.stringify(${explorerBody.trim()})` : ''}\n});\nconst data = await response.json();\nconsole.log(data);`,
      python: `import requests\n\nurl = "${requestUrl}"\nheaders = {\n    "Authorization": "Bearer ${activeKey}"\n}\n\nresponse = requests.${selectedEndpoint.method.toLowerCase()}(\n    url,\n    headers=headers${selectedEndpoint.method === 'POST' ? `,\n    json=${explorerBody.trim()}` : ''}\n)\n\nprint(response.json())`,
      go: `package main\n\nimport (\n\t"fmt"\n\t"net/http"\n\t"io"\n)\n\nfunc main() {\n\turl := "${requestUrl}"\n\treq, _ := http.NewRequest("${selectedEndpoint.method}", url, nil)\n\treq.Header.Add("Authorization", "Bearer ${activeKey}")\n\t\n\tclient := &http.Client{}\n\tresp, _ := client.Do(req)\n\tdefer resp.Body.Close()\n\t\n\tbody, _ := io.ReadAll(resp.Body)\n\tfmt.Println(string(body))\n}`
    };
  }, [requestUrl, selectedEndpoint, explorerBody, apiKeys]);

  const handleCopySnippet = (lang: keyof typeof codeSnippets) => {
    navigator.clipboard.writeText(codeSnippets[lang]);
    setCopiedSnippet(lang);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col font-sans" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <LandingNavbar />

      {/* ═══════════════════════════════════════════════════════════════
          HEADER — Blueprint Grid Layout
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bp-grid text-white py-16 px-6 lg:px-16 border-b border-grid relative">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-hazard uppercase mb-2">
              <Terminal className="w-4 h-4 text-hazard inline-block animate-pulse" />
              CivicPulse Open Developer API
            </div>
            <h1 className="text-4xl lg:text-5xl font-display font-black uppercase tracking-wide leading-none">
              API <span className="text-hazard">Access</span> Console
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl mt-3 leading-relaxed">
              Integrate real-time infrastructure incidents, local ward bounding status maps, and deduplication agent pipelines directly into municipal reporting dashboards.
            </p>
          </div>

          <div className="flex gap-4 bg-slate-900/60 p-4 border border-grid/60 rounded font-mono text-xs text-center">
            <div className="px-3 border-r border-grid/30">
              <span className="block text-base font-bold text-white">{requestRate}/s</span>
              <span className="text-[9px] text-slate-400 uppercase">Requests</span>
            </div>
            <div className="px-3 border-r border-grid/30">
              <span className="block text-base font-bold text-verified">{latencyAvg}ms</span>
              <span className="text-[9px] text-slate-400 uppercase">Latency</span>
            </div>
            <div className="px-3">
              <span className="block text-base font-bold text-red-400">{errorRate}%</span>
              <span className="text-[9px] text-slate-400 uppercase">Err Rate</span>
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
            { id: 'explorer', label: 'API Explorer', icon: <Terminal className="w-4 h-4" /> },
            { id: 'keys', label: 'API Key Manager', icon: <Key className="w-4 h-4" /> },
            { id: 'docs', label: 'Documentation', icon: <FileText className="w-4 h-4" /> },
            { id: 'metrics', label: 'System Metrics', icon: <Activity className="w-4 h-4" /> }
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
        
        {/* Panel 1: API Explorer */}
        {activeTab === 'explorer' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Endpoint selector & Parameters */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Endpoint select list */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-bold text-ink uppercase tracking-wider">Select Endpoint</h3>
                <div className="space-y-2">
                  {MOCK_ENDPOINTS.map((ep, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedEndpointIdx(idx)}
                      className={`w-full text-left p-3 rounded border text-xs font-mono flex items-start gap-3 transition cursor-pointer ${
                        selectedEndpointIdx === idx
                          ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                          : 'bg-white border-paper-dim hover:border-slate-350 text-slate-700'
                      }`}
                    >
                      <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                        ep.method === 'GET' ? 'bg-verified/15 text-verified' : 'bg-blue-600/15 text-blue-500'
                      }`}>
                        {ep.method}
                      </span>
                      <div>
                        <span className="block font-bold">{ep.path}</span>
                        <span className={`block text-[10px] mt-0.5 ${selectedEndpointIdx === idx ? 'text-slate-400' : 'text-slate-500'}`}>
                          {ep.description}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Params inspector form */}
              <div className="bg-white border border-paper-dim rounded p-5 space-y-4">
                <h3 className="text-xs font-mono font-bold text-ink uppercase tracking-wider flex items-center gap-1">
                  <Settings className="w-4 h-4 text-slate-500" />
                  Parameters
                </h3>

                {selectedEndpoint.queryParams.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No query parameters required for this endpoint.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedEndpoint.queryParams.map(param => (
                      <div key={param.name} className="space-y-1">
                        <div className="flex justify-between items-baseline font-mono text-[11px]">
                          <span className="font-bold text-ink">{param.name}</span>
                          <span className="text-slate-400 font-semibold italic">({param.type})</span>
                        </div>
                        <input
                          type="text"
                          className="w-full p-2 text-xs border border-paper-dim rounded bg-paper/20 focus:outline-none focus:border-hazard font-mono"
                          value={explorerParams[param.name] || ''}
                          onChange={(e) => handleParamChange(param.name, e.target.value)}
                        />
                        <p className="text-[10px] text-slate-400 leading-tight">{param.desc}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* POST Request Body inspector */}
                {selectedEndpoint.method === 'POST' && (
                  <div className="space-y-1 pt-2">
                    <span className="font-mono text-[11px] font-bold text-ink block">Request Body (JSON)</span>
                    <textarea
                      rows={6}
                      className="w-full p-2 text-xs border border-paper-dim rounded bg-slate-950 text-emerald-400 focus:outline-none focus:border-hazard font-mono"
                      value={explorerBody}
                      onChange={(e) => setExplorerBody(e.target.value)}
                    />
                  </div>
                )}

                <button
                  onClick={handleSendRequest}
                  disabled={isSendingRequest}
                  className="w-full btn-primary bg-slate-900 hover:bg-slate-800 text-white py-2 text-xs font-bold font-mono uppercase tracking-wider flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSendingRequest ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  {isSendingRequest ? 'Sending...' : 'Send Request'}
                </button>
              </div>

            </div>

            {/* Right Column: Code Snippet & Live Response Console */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Code Snippet Tabs */}
              <div className="bg-slate-950 border border-slate-900 rounded overflow-hidden text-white">
                <div className="bg-slate-900 px-4 py-2.5 flex justify-between items-center border-b border-slate-850">
                  <div className="flex gap-2 font-mono text-[10px]">
                    {(['curl', 'node', 'python', 'go'] as const).map(lang => (
                      <button
                        key={lang}
                        onClick={() => setSnippetLanguage(lang)}
                        className={`px-2 py-1 rounded cursor-pointer uppercase ${
                          snippetLanguage === lang
                            ? 'bg-slate-850 text-white font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {lang === 'node' ? 'Node' : lang === 'python' ? 'Python' : lang}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handleCopySnippet(snippetLanguage)}
                    className="p-1 rounded hover:bg-slate-850 text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    {copiedSnippet === snippetLanguage ? (
                      <Check className="w-3.5 h-3.5 text-verified" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <div className="p-4 overflow-x-auto text-[11px] font-mono leading-relaxed max-h-56 bg-slate-950/80">
                  <pre className="text-slate-300 whitespace-pre-wrap">{codeSnippets[snippetLanguage]}</pre>
                </div>
              </div>

              {/* Server Response Console */}
              <div className="bg-slate-950 text-white border border-slate-900 rounded overflow-hidden flex-1 flex flex-col min-h-80 shadow-lg">
                <div className="bg-slate-900 px-4 py-3 border-b border-slate-850 flex justify-between items-center flex-wrap gap-2">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Response Console</span>
                  
                  {explorerStatus && (
                    <div className="flex gap-3 text-[10px] font-mono">
                      <span className="text-verified font-bold uppercase">{explorerStatus}</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-slate-400">{explorerLatency}ms</span>
                    </div>
                  )}
                </div>

                <div className="p-4 font-mono text-[11px] bg-slate-950/80 leading-relaxed overflow-x-auto flex-1 max-h-96">
                  {isSendingRequest ? (
                    <div className="flex flex-col justify-center items-center h-48 gap-3 text-slate-500">
                      <Activity className="w-8 h-8 animate-pulse text-hazard" />
                      <span className="text-[10px] tracking-widest uppercase">Executing API Query...</span>
                    </div>
                  ) : explorerResponse ? (
                    <pre className="text-emerald-400 whitespace-pre">{JSON.stringify(explorerResponse, null, 2)}</pre>
                  ) : (
                    <div className="flex flex-col justify-center items-center h-48 gap-1.5 text-slate-500">
                      <Terminal className="w-8 h-8 text-slate-700" />
                      <span className="text-[10px] tracking-wider uppercase font-semibold">Console Awaiting Request</span>
                      <p className="text-[9px] text-slate-600 font-sans max-w-xs text-center mt-1">
                        Select an endpoint and click "Send Request" to perform a simulated client API fetch.
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Panel 2: API Key Manager */}
        {activeTab === 'keys' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Create new key form */}
            <div className="bg-white border border-paper-dim rounded p-6 shadow-sm space-y-5">
              <div>
                <h3 className="font-bold text-base text-ink flex items-center gap-1.5">
                  <Key className="w-5 h-5 text-hazard" />
                  Generate API Key
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed font-sans mt-0.5">
                  Produce sandbox credentials or live keys for external dispatches.
                </p>
              </div>

              <form onSubmit={handleCreateKey} className="space-y-4 text-xs font-mono">
                <div className="space-y-1.5">
                  <label className="font-bold text-ink block">Key Label</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Noida Ward Mobile Client"
                    className="w-full p-2.5 border border-paper-dim bg-paper/20 rounded font-sans focus:outline-none focus:border-hazard"
                    value={newKeyLabel}
                    onChange={(e) => setNewKeyLabel(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-ink block">Environment</label>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    {(['sandbox', 'production'] as const).map(env => (
                      <button
                        key={env}
                        type="button"
                        onClick={() => setNewKeyEnv(env)}
                        className={`p-2 rounded border cursor-pointer capitalize font-bold transition ${
                          newKeyEnv === env
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-paper-dim text-slate-600 hover:border-slate-350'
                        }`}
                      >
                        {env}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-ink block">Select Scopes</label>
                  <div className="space-y-1.5 bg-paper/20 p-3 rounded border border-paper-dim">
                    {[
                      { id: 'read:incidents', desc: 'Query local reported incidents list' },
                      { id: 'write:reports', desc: 'Create new report pin drafts' },
                      { id: 'read:wards', desc: 'Fetch ward dispatch metrics' }
                    ].map(scope => {
                      const isChecked = newKeyScopes.includes(scope.id);
                      return (
                        <button
                          key={scope.id}
                          type="button"
                          onClick={() => handleScopeToggle(scope.id)}
                          className="w-full text-left flex items-start gap-2.5 p-1 cursor-pointer"
                        >
                          <span className={`w-3.5 h-3.5 mt-0.5 rounded border border-slate-400 flex items-center justify-center font-sans ${
                            isChecked ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white'
                          }`}>
                            {isChecked && '✓'}
                          </span>
                          <div>
                            <span className="font-bold text-ink block text-[10px] leading-tight">{scope.id}</span>
                            <span className="text-[9px] text-slate-500 leading-none font-sans block mt-0.5">{scope.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full btn-primary bg-hazard hover:bg-yellow-500 text-ink py-2.5 font-bold uppercase tracking-wider border-none cursor-pointer"
                >
                  Generate Credentials
                </button>
              </form>
            </div>

            {/* Right Columns: Key listing and revocation */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xl font-display font-extrabold uppercase tracking-wide flex items-center gap-2">
                <Lock className="w-5 h-5 text-hazard" />
                Active Credentials & API Secrets
              </h2>

              <div className="space-y-4">
                {apiKeys.length === 0 ? (
                  <div className="bg-white border border-paper-dim rounded p-10 text-center text-slate-400">
                    <Key className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                    <p className="font-semibold text-lg text-ink font-mono">No keys active</p>
                    <p className="text-xs text-slate-500 font-sans mt-1">Generate credentials on the left panel to begin querying.</p>
                  </div>
                ) : (
                  apiKeys.map(key => (
                    <div
                      key={key.id}
                      className="bg-white border border-paper-dim rounded p-5 shadow-sm space-y-4 hover:border-slate-350 transition"
                    >
                      <div className="flex justify-between items-start flex-wrap gap-2 border-b border-paper-dim pb-3">
                        <div>
                          <h3 className="font-bold text-sm text-ink leading-none">{key.label}</h3>
                          <span className="text-[10px] text-slate-400 font-mono block mt-1">
                            Created: {new Date(key.created).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            key.environment === 'production' ? 'bg-verified text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {key.environment}
                          </span>
                        </div>
                      </div>

                      {/* Display Key Hash */}
                      <div className="flex items-center gap-2 font-mono text-xs bg-slate-950 text-slate-300 p-2.5 rounded border border-slate-900 overflow-x-auto justify-between">
                        <span className="truncate pr-4">
                          {key.revealed ? key.key : `${key.key.substring(0, 10)}****************************`}
                        </span>
                        
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => toggleRevealKey(key.id)}
                            className="p-1 rounded hover:bg-slate-900 text-slate-400 hover:text-white transition cursor-pointer"
                          >
                            {key.revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleCopy(key.key, key.id)}
                            className="p-1 rounded hover:bg-slate-900 text-slate-400 hover:text-white transition cursor-pointer"
                          >
                            {copiedKeyId === key.id ? (
                              <Check className="w-4 h-4 text-verified" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Info & scopes / Revoke */}
                      <div className="flex justify-between items-center flex-wrap gap-3 font-mono text-[10px] text-slate-500 pt-1">
                        <div className="flex gap-2 items-center flex-wrap">
                          <span className="font-bold uppercase text-[9px] text-slate-400 tracking-wider">Scopes:</span>
                          {key.scopes.map(scope => (
                            <span key={scope} className="bg-paper-dim text-slate-700 px-1.5 py-0.5 rounded text-[9px]">
                              {scope}
                            </span>
                          ))}
                        </div>

                        <button
                          onClick={() => handleRevokeKey(key.id)}
                          className="flex items-center gap-1 text-red-500 hover:text-red-700 cursor-pointer font-bold transition text-[9px] uppercase tracking-wider"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Revoke Key</span>
                        </button>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* Panel 3: Documentation */}
        {activeTab === 'docs' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Index Guide */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="text-xs font-mono font-bold text-ink uppercase tracking-wider">Documentation</h3>
              <div className="bg-white border border-paper-dim rounded shadow-sm overflow-hidden text-xs">
                {[
                  'Authentication',
                  'Rate Limits & Tiers',
                  'JSON Webhooks',
                  'Error Catalog'
                ].map((item, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left p-3.5 hover:bg-slate-50 border-b border-paper-dim last:border-b-0 cursor-pointer font-bold text-slate-700 flex justify-between items-center"
                  >
                    <span>{item}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-450" />
                  </button>
                ))}
              </div>
            </div>

            {/* Docs Contents */}
            <div className="lg:col-span-3 space-y-8 bg-white border border-paper-dim rounded p-6 shadow-sm">
              
              {/* Section 1: Authentication */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-ink border-b border-paper-dim pb-2 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-hazard" />
                  1. Authentication & Headers
                </h3>
                <div className="text-xs text-slate-600 leading-relaxed space-y-2 font-sans">
                  <p>
                    All API queries to CivicPulse services must include your generated secret credential inside the HTTP <code>Authorization</code> request header.
                  </p>
                  <p>
                    Keys carrying the <code>cp_test_</code> prefix connect to our isolated Sandbox mock database. Live dispatches or actual incident writes require active production credentials carrying the <code>cp_live_</code> prefix.
                  </p>
                </div>
                <div className="bg-slate-950 text-slate-300 font-mono text-[11px] p-4 rounded border border-slate-900">
                  <span className="text-slate-500 block">Headers:</span>
                  <div className="mt-1 space-y-1">
                    <div>Authorization: Bearer cp_live_YOUR_API_KEY</div>
                    <div>Accept: application/json</div>
                  </div>
                </div>
              </div>

              {/* Section 2: Rate Limits */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-ink border-b border-paper-dim pb-2 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-hazard" />
                  2. Rate Limits & Multipliers
                </h3>
                <div className="text-xs text-slate-600 leading-relaxed space-y-2 font-sans">
                  <p>
                    CivicPulse limits incoming requests based on your current Citizen Trust rating score or administrative role level. API responses include throttling statistics in the header:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-500 text-[11px]">
                    <li><b>Sandbox keys</b> are limited to 30 requests per minute.</li>
                    <li><b>Production Citizen keys</b> (Sentinel rank) are limited to 200 requests per minute.</li>
                    <li><b>Production Ward credentials</b> are limited to 1,000 requests per minute.</li>
                  </ul>
                </div>
                <div className="bg-slate-950 text-slate-300 font-mono text-[11px] p-4 rounded border border-slate-900 space-y-1">
                  <span className="text-slate-500 block">Response Headers:</span>
                  <div>X-RateLimit-Limit: 200</div>
                  <div>X-RateLimit-Remaining: 184</div>
                  <div>X-RateLimit-Reset: 1784209943</div>
                </div>
              </div>

              {/* Section 3: Webhooks */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-ink border-b border-paper-dim pb-2 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-hazard" />
                  3. JSON Webhook Events
                </h3>
                <div className="text-xs text-slate-600 leading-relaxed font-sans">
                  <p>
                    Configure callback webhooks in your developer dashboard to receive automated HTTP POST calls whenever a local hazard is updated, verified by community nodes, or marked solved by ward dispatch crews.
                  </p>
                </div>
                <div className="bg-slate-950 text-slate-300 font-mono text-[11px] p-4 rounded border border-slate-900 space-y-2">
                  <span className="text-slate-500 block">Sample Webhook JSON Payload:</span>
                  <pre className="text-emerald-400">
{`{
  "event": "incident.resolved",
  "created_at": "2026-07-17T01:00:00Z",
  "data": {
    "ticket_id": "CP-INC-40291",
    "category": "pothole",
    "location": { "lat": 28.5355, "lng": 77.391 },
    "resolution_code": "WARD-FIX-09",
    "closed_at": "2026-07-17T00:54:12Z"
  }
}`}
                  </pre>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Panel 4: Metrics */}
        {activeTab === 'metrics' && (
          <div className="space-y-8">
            
            {/* Live gauges */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              <div className="bg-white border border-paper-dim rounded p-5 shadow-sm text-center space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Query Rate</span>
                <span className="text-3xl font-display font-black text-ink block">{requestRate}/s</span>
                <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-500 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-verified animate-ping" />
                  <span>LIVE INGEST</span>
                </div>
              </div>

              <div className="bg-white border border-paper-dim rounded p-5 shadow-sm text-center space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Inference Delay</span>
                <span className="text-3xl font-display font-black text-ink block">{latencyAvg}ms</span>
                <div className="flex items-center justify-center gap-1 text-[9px] text-slate-500 font-mono">
                  <span>MEAN DECREMENT</span>
                </div>
              </div>

              <div className="bg-white border border-paper-dim rounded p-5 shadow-sm text-center space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Http Error Rate</span>
                <span className="text-3xl font-display font-black text-red-500 block">{errorRate}%</span>
                <div className="flex items-center justify-center gap-1 text-[9px] text-slate-500 font-mono">
                  <span>SWEEP NOMINAL</span>
                </div>
              </div>

              <div className="bg-white border border-paper-dim rounded p-5 shadow-sm text-center space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Webhook Delivery</span>
                <span className="text-3xl font-display font-black text-verified block">{webhookSuccess}%</span>
                <div className="flex items-center justify-center gap-1 text-[9px] text-slate-500 font-mono">
                  <span>99.9% TARGET</span>
                </div>
              </div>

            </div>

            {/* Simulated Server Console Logs */}
            <div className="bg-slate-950 text-slate-300 font-mono text-[10px] p-5 rounded-lg border border-slate-900 shadow-inner space-y-2 max-h-80 overflow-y-auto">
              <div className="text-slate-500 border-b border-slate-900 pb-2 flex justify-between items-center mb-3">
                <span className="uppercase font-bold text-[9px] tracking-wider">Gateway Telemetry Streams</span>
                <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[8px]">LOG_LEVEL: VERBOSE</span>
              </div>
              <div className="space-y-1">
                <div>[2026-07-17T06:38:01Z] [AUTH] Key prefix cp_live_ validated on client IP 115.242.19.124</div>
                <div className="text-emerald-400">[2026-07-17T06:38:02Z] [HTTP] GET /v1/incidents?geohash=ttnfv2r - 200 OK (22ms)</div>
                <div>[2026-07-17T06:38:04Z] [INF] Perception Agent completed image validation on ticket CP-INC-90218</div>
                <div className="text-blue-400">[2026-07-17T06:38:04Z] [HTTP] POST /v1/incidents - 201 Created (142ms)</div>
                <div>[2026-07-17T06:38:09Z] [SWEEP] Spatial indexing cleanup sweeps complete. Geohash grid indices optimized (4ms)</div>
                <div className="text-emerald-400">[2026-07-17T06:38:12Z] [HTTP] GET /v1/wards/status?ward_code=ward_07 - 200 OK (18ms)</div>
                <div>[2026-07-17T06:38:15Z] [WEBHOOK] Triggered callback incident.resolved to client endpoint https://webhook.ward07.gov.in/callback</div>
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
            <span>© Civic Pulse Network — Open Developer APIs.</span>
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
