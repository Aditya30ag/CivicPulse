import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, arrayUnion, doc } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Upload, X, Loader2, Image as ImageIcon, Video, CheckCircle2, Camera, Sparkles, Building2, ArrowRight, ArrowLeft, LocateFixed, Crosshair, PenLine } from 'lucide-react';
import { analyzeIssueImage, checkDuplicateIssue, processReportPipeline } from '../lib/gemini';
import { geohashForLocation, geohashQueryBounds, distanceBetween } from 'geofire-common';
import Stepper from '../components/ui/Stepper';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Input, Textarea } from '../components/ui/Input';
import { CATEGORIES, categoryById, departmentForCategory, severityLabel } from '../lib/status';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../lib/theme';

const uploadToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const API_URL = import.meta.env.VITE_API_URL;

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload image');
  }

  const data = await response.json();
  return data.data.secure_url;
};

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Road: MapPin,
  Trash2: Camera,
  Droplets: MapPin,
  Zap: Camera,
  ShieldAlert: MapPin,
};

const STEPS = [
  { id: 'category', label: 'Category' },
  { id: 'media', label: 'Media' },
  { id: 'location', label: 'Location' },
  { id: 'details', label: 'Details' },
  { id: 'submit', label: 'Submit' },
];

/* ── Map click-to-pin picker ──────────────────────────────────────────── */
function MapClickHandler({ onPick }: { onPick: (loc: { lat: number; lng: number }) => void }) {
  const map = useMap();
  useEffect(() => {
    const handler = (e: L.LeafletMouseEvent) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    map.on('click', handler);
    return () => {
      map.off('click', handler);
    };
  }, [map, onPick]);
  return null;
}

const pinIcon = L.divIcon({
  html: `<div style="
    width: 34px; height: 34px; border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    background: linear-gradient(180deg, #2563eb, #1d4ed8);
    border: 3px solid #fff;
    box-shadow: 0 8px 20px -6px rgba(37,99,235,0.6);
    display: flex; align-items: center; justify-content: center;
  "><div style="width: 10px; height: 10px; border-radius: 50%; background: #fff; transform: rotate(45deg);"></div></div>`,
  className: 'custom-leaflet-icon',
  iconSize: [34, 34],
  iconAnchor: [17, 32],
  popupAnchor: [0, -30],
});

export default function Report() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<number>(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  const [category, setCategory] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [description, setDescription] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [severity, setSeverity] = useState<number>(5);
  const [reasoning, setReasoning] = useState<string>('');

  const [error, setError] = useState<string | null>(null);

  /* ── Draft autosave (existing behaviour) ── */
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('reportDraft');
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        setTitle(draft.title || '');
        setDescription(draft.description || '');
        const savedCat = draft.category || '';
        setCategory(savedCat);
        if (savedCat && !CATEGORIES.some((c) => c.id === savedCat)) {
          setCustomCategory(savedCat);
          setSelectedCard('custom');
        }
        setSeverity(draft.severity || 5);
      }
    } catch (e) {
      console.error('Failed to load draft:', e);
    }
  }, []);

  useEffect(() => {
    if (!title && !description && !category && severity === 5) {
      localStorage.removeItem('reportDraft');
      return;
    }
    localStorage.setItem('reportDraft', JSON.stringify({ title, description, category, severity }));
  }, [title, description, category, severity]);

  /* ── Media handling ── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const type = selectedFile.type.startsWith('video/') ? 'video' : 'image';
      setFile(selectedFile);
      setMediaType(type);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setUploadedMediaUrl(null);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setMediaType(null);
    setUploadedMediaUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── Location handling ── */
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationLoading(false);
        setError(null);
      },
      (err) => {
        setLocationLoading(false);
        setError(`Unable to retrieve your location: ${err.message}`);
      }
    );
  };

  /* ── Upload + AI analysis (run when entering the details step) ── */
  const runAnalysis = async () => {
    if (uploadedMediaUrl) return true;
    if (!file) return false;
    try {
      setAnalyzing(true);
      setError(null);
      const url = await uploadToCloudinary(file);
      setUploadedMediaUrl(url);

      if (mediaType === 'image') {
        try {
          const analysis = await analyzeIssueImage(url);
          setCategory(analysis.category || category);
          if (analysis.category && CATEGORIES.some((c) => c.id === analysis.category)) {
            setSelectedCard(analysis.category);
            setCustomCategory('');
          }
          setDescription(analysis.description || '');
          setTitle(analysis.title || '');
          setSeverity(analysis.severity || 5);
          setReasoning(analysis.reasoning || '');
        } catch (e: any) {
          console.warn('AI analysis unavailable:', e);
          setReasoning('AI analysis unavailable — values entered manually.');
        }
      } else {
        setReasoning('Video analysis not supported — values entered manually.');
      }
      return true;
    } catch (e: any) {
      console.error('Error analyzing report:', e);
      setError(e.message || 'Media upload failed. Please try again.');
      return false;
    } finally {
      setAnalyzing(false);
    }
  };

  /* ── Step navigation with validation ── */
  const canContinue = () => {
    if (step === 1) return !!category;
    if (step === 2) return !!file;
    if (step === 3) return !!location;
    if (step === 4) return title.trim().length > 0 && description.trim().length > 0;
    return true;
  };

  const handleContinue = async () => {
    setError(null);
    if (step === 3) {
      const ok = await runAnalysis();
      if (!ok) return;
    }
    setStep((s) => Math.min(5, s + 1));
  };

  const handleBack = () => {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  /* ── Final submit (existing dedup + pipeline + create logic) ── */
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !uploadedMediaUrl || !location) {
      setError('Missing information.');
      return;
    }
    if (!category) {
      setError('Please select a category.');
      return;
    }
    if (!title.trim() || !description.trim()) {
      setError('Please provide a title and description.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const center = [location.lat, location.lng] as [number, number];
      const radiusInM = 100;
      const bounds = geohashQueryBounds(center, radiusInM);
      const promises = [];
      for (const b of bounds) {
        const q = query(collection(db, 'reports'), where('geohash', '>=', b[0]), where('geohash', '<=', b[1]));
        promises.push(getDocs(q));
      }

      const snapshots = await Promise.all(promises);
      let matchingDocs: any[] = [];

      for (const snap of snapshots) {
        for (const d of snap.docs) {
          const data = d.data();
          if (data.status === 'resolved') continue;
          if (data.category !== category) continue;
          if (data.geoPoint) {
            const distanceInM = distanceBetween([data.geoPoint.lat, data.geoPoint.lng], center) * 1000;
            if (distanceInM <= radiusInM) {
              matchingDocs.push({ id: d.id, ...data, distance: distanceInM });
            }
          }
        }
      }

      matchingDocs.sort((a, b) => a.distance - b.distance);
      matchingDocs = matchingDocs.slice(0, 3);

      let pipelineResult: any = null;
      try {
        pipelineResult = await processReportPipeline(uploadedMediaUrl, location, matchingDocs);
      } catch (pipelineErr) {
        console.warn('Pipeline endpoint fallback:', pipelineErr);
      }

      if (pipelineResult && pipelineResult.is_duplicate && pipelineResult.duplicate_candidate_id) {
        const candidateId = pipelineResult.duplicate_candidate_id;
        const updateData: any = {
          verifiers: arrayUnion(user.uid),
          agentTrace: arrayUnion(...(pipelineResult.agent_trace || [])),
        };
        if (pipelineResult.severity?.is_escalation) {
          updateData.severityScore = pipelineResult.final_severity;
        }
        await updateDoc(doc(db, 'reports', candidateId), updateData);
        localStorage.removeItem('reportDraft');
        toastError('Already reported', 'Your report matched an existing issue nearby and was merged into it.');
        navigate(`/issue/${candidateId}`);
        return;
      }

      let foundDuplicate = null;
      if (!pipelineResult) {
        for (const candidate of matchingDocs) {
          const check = await checkDuplicateIssue(description, candidate.description);
          if (check.isDuplicate) {
            foundDuplicate = candidate;
            break;
          }
        }
      }

      if (foundDuplicate) {
        const oldSeverity = foundDuplicate.severityScore || 1;
        const newSeverity = severity;
        const isEscalation = newSeverity - oldSeverity >= 2;

        let orchestratorReasoning = '';
        let finalSeverity = oldSeverity;
        if (isEscalation) {
          orchestratorReasoning = `Merged duplicate report, but escalated severity from ${oldSeverity} to ${newSeverity} based on new visual evidence showing increased urgency`;
          finalSeverity = newSeverity;
        } else {
          orchestratorReasoning = 'Merged with existing report — consistent severity assessment';
        }

        const now = new Date().toISOString();
        const updateData: any = {
          verifiers: arrayUnion(user.uid),
          agentTrace: arrayUnion(
            { agent: 'Deduplication', reasoning: 'Found highly similar existing report in same area', timestamp: now },
            { agent: 'Severity', reasoning: `Independent assessment of new report: ${severity}/10`, timestamp: now },
            { agent: 'Orchestrator', reasoning: orchestratorReasoning, timestamp: now }
          ),
        };
        if (isEscalation) {
          updateData.severityScore = finalSeverity;
        }
        await updateDoc(doc(db, 'reports', foundDuplicate.id), updateData);
        localStorage.removeItem('reportDraft');
        toastError('Already reported', 'Your report matched an existing issue nearby and was merged into it.');
        navigate(`/issue/${foundDuplicate.id}`);
        return;
      }

      const hash = geohashForLocation(center);
      const now = new Date().toISOString();
      const docRef = await addDoc(collection(db, 'reports'), {
        mediaURL: uploadedMediaUrl,
        mediaType,
        category,
        title,
        description,
        geoPoint: location,
        geohash: hash,
        reporterId: user.uid,
        status: 'reported',
        severityScore: severity,
        verifiers: [],
        agentTrace: [
          { agent: 'Perception', reasoning: reasoning || 'Initial classification and visual assessment complete', timestamp: now },
          { agent: 'Deduplication', reasoning: 'No similar reports found nearby', timestamp: now },
          { agent: 'Severity', reasoning: `Standalone report severity assessed at ${severity}/10`, timestamp: now },
          { agent: 'Orchestrator', reasoning: 'New unique issue confirmed, proceeding to routing', timestamp: now },
        ],
        createdAt: serverTimestamp(),
      });
      localStorage.removeItem('reportDraft');
      success('Report submitted 🎉', 'The AI agents are analysing it and routing it to the right department.');
      navigate(`/issue/${docRef.id}`);
    } catch (err: any) {
      console.error('Error submitting report:', err);
      setError(err.message || 'Failed to submit report. Please try again.');
      setSubmitting(false);
    }
  };

  const categoryDisplay =
    category && CATEGORIES.some((c) => c.id === category) ? categoryById(category).label : category;

  const mapCenter: [number, number] = location ? [location.lat, location.lng] : [37.7749, -122.4194];
  const tileUrl = theme === 'dark' ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* Header */}
      <div className="mb-8 text-center">
        <Badge tone="primary" className="mb-3">
          <Sparkles className="w-3.5 h-3.5" /> AI-assisted reporting
        </Badge>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Report an Issue</h1>
        <p className="text-sm text-muted mt-2 max-w-md mx-auto">
          Takes about a minute. Our AI agents classify, prioritise, and route your report automatically.
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8 px-2">
        <Stepper steps={STEPS} current={step - 1} />
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-danger-soft border border-danger/25 text-danger p-4 text-sm leading-relaxed">
          {error}
        </div>
      )}

      {/* ══════════ STEP 1 — CATEGORY ══════════ */}
      {step === 1 && (
        <div className="animate-fade-up">
          <h2 className="text-base font-bold text-ink mb-1">What type of issue is it?</h2>
          <p className="text-sm text-muted mb-5">Pick the closest match — AI will refine it from your photo.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICONS[c.icon] ?? MapPin;
              const active = selectedCard === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedCard(c.id);
                    setCategory(c.id);
                  }}
                  className={`group text-left rounded-2xl border-2 p-5 transition-all duration-200 ${
                    active
                      ? 'border-primary bg-primary/5 shadow-[0_8px_24px_-12px_rgba(37,99,235,0.5)]'
                      : 'border-line bg-card hover:border-primary/40 hover:shadow-card'
                  }`}
                >
                  <span
                    className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                      active ? 'bg-primary text-white' : 'bg-primary-soft text-primary group-hover:bg-primary group-hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <h3 className="text-sm font-bold text-ink">{c.label}</h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{c.desc}</p>
                  {active && (
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                    </span>
                  )}
                </button>
              );
            })}

            {/* Other — lets the user type a custom issue type */}
            <button
              type="button"
              onClick={() => {
                setSelectedCard('custom');
                setCategory(customCategory.trim() || 'Other');
              }}
              className={`group text-left rounded-2xl border-2 p-5 transition-all duration-200 ${
                selectedCard === 'custom'
                  ? 'border-primary bg-primary/5 shadow-[0_8px_24px_-12px_rgba(37,99,235,0.5)]'
                  : 'border-line bg-card hover:border-primary/40 hover:shadow-card'
              }`}
            >
              <span
                className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                  selectedCard === 'custom'
                    ? 'bg-primary text-white'
                    : 'bg-primary-soft text-primary group-hover:bg-primary group-hover:text-white'
                }`}
              >
                <PenLine className="w-5 h-5" />
              </span>
              <h3 className="text-sm font-bold text-ink">Other</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">Something else — type the issue type below</p>
              {selectedCard === 'custom' && (
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                </span>
              )}
            </button>
          </div>

          {/* Custom category input — shown when Other is selected */}
          {selectedCard === 'custom' && (
            <div className="mt-5 animate-fade-in">
              <label htmlFor="customCategory" className="block text-[0.8125rem] font-semibold text-ink mb-1.5">
                Describe the issue type
              </label>
              <div className="relative">
                <PenLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none" />
                <input
                  id="customCategory"
                  type="text"
                  value={customCategory}
                  onChange={(e) => {
                    setCustomCategory(e.target.value);
                    setCategory(e.target.value.trim() || 'Other');
                  }}
                  placeholder="e.g. Damaged footbridge, stray animal, illegal parking…"
                  maxLength={60}
                  autoFocus
                  className="w-full h-11 rounded-xl border border-line-strong bg-card pl-10 pr-4 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
              <p className="text-xs text-faint mt-1.5">Your custom type will be used as the report category.</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════ STEP 2 — MEDIA ══════════ */}
      {step === 2 && (
        <div className="animate-fade-up">
          <h2 className="text-base font-bold text-ink mb-1">Show us what's wrong</h2>
          <p className="text-sm text-muted mb-5">Upload a clear photo or short video of the issue.</p>

          {previewUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-line bg-subtle flex justify-center max-h-96">
              {mediaType === 'video' ? (
                <video src={previewUrl} controls className="max-h-96 object-contain" />
              ) : (
                <img src={previewUrl} alt="Issue preview" className="max-h-96 object-contain" />
              )}
              <button
                type="button"
                onClick={removeFile}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-night/70 text-white flex items-center justify-center backdrop-blur hover:bg-night transition-colors"
                aria-label="Remove media"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-2xl border-2 border-dashed border-line-strong bg-card p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <span className="w-16 h-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-7 h-7" />
              </span>
              <p className="text-sm font-bold text-ink">Click to upload media</p>
              <p className="text-xs text-muted mt-1">Image or short video · PNG, JPG, MP4</p>
              <p className="text-[0.6875rem] text-faint mt-4 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" /> AI will analyse the photo automatically
              </p>
            </button>
          )}
          <input type="file" accept="image/*,video/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

          <div className="flex items-center gap-2 mt-4 rounded-xl bg-subtle border border-line p-3 text-xs text-muted">
            <ImageIcon className="w-4 h-4 shrink-0 text-primary" />
            Photos are uploaded securely and used only to classify and verify your report.
          </div>
        </div>
      )}

      {/* ══════════ STEP 3 — LOCATION ══════════ */}
      {step === 3 && (
        <div className="animate-fade-up">
          <h2 className="text-base font-bold text-ink mb-1">Where is the issue?</h2>
          <p className="text-sm text-muted mb-5">Click on the map to drop a pin, or use your current location.</p>

          <div className="rounded-2xl overflow-hidden border border-line h-[340px] relative">
            <MapContainer center={mapCenter} zoom={13} className="absolute inset-0 w-full h-full" zoomControl={false}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' url={tileUrl} />
              <MapClickHandler onPick={(loc) => setLocation(loc)} />
              {location && (
                <Marker position={[location.lat, location.lng]} icon={pinIcon}>
                  <Popup>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13 }}>
                      {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>

            <div className="absolute top-3 right-3 z-[500] flex flex-col gap-2">
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locationLoading}
                className="glass rounded-xl px-3.5 py-2.5 text-xs font-bold text-ink flex items-center gap-1.5 shadow-card hover:shadow-pop transition-shadow disabled:opacity-60"
              >
                {locationLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5 text-primary" />}
                Use my location
              </button>
              <button
                type="button"
                onClick={() => setShowManualLocation(true)}
                className="glass rounded-xl px-3.5 py-2.5 text-xs font-bold text-ink flex items-center gap-1.5 shadow-card hover:shadow-pop transition-shadow"
              >
                <Crosshair className="w-3.5 h-3.5 text-teal-brand" />
                Enter coordinates
              </button>
            </div>
          </div>

          {location && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-success-soft border border-success/25 p-3.5">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-ink">
                <MapPin className="w-5 h-5 text-success" />
                Pin dropped at {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </div>
              <button
                type="button"
                onClick={() => setLocation(null)}
                className="text-xs font-bold text-faint hover:text-danger transition-colors"
              >
                Remove
              </button>
            </div>
          )}

          {showManualLocation && (
            <div className="mt-4 rounded-xl border border-line bg-card p-4 space-y-3">
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder="Latitude (e.g. 37.7749)"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="flex-1 rounded-lg border border-line-strong bg-card px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Longitude (e.g. -122.4194)"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  className="flex-1 rounded-lg border border-line-strong bg-card px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const lat = parseFloat(manualLat);
                    const lng = parseFloat(manualLng);
                    if (!isNaN(lat) && !isNaN(lng)) {
                      setLocation({ lat, lng });
                      setShowManualLocation(false);
                      setManualLat('');
                      setManualLng('');
                    } else {
                      setError('Please enter valid numbers for latitude and longitude.');
                    }
                  }}
                >
                  Set
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ STEP 4 — DETAILS + AI ANALYSIS ══════════ */}
      {step === 4 && (
        <div className="animate-fade-up">
          {analyzing ? (
            <div className="rounded-2xl border border-line bg-card p-10 flex flex-col items-center text-center">
              <div className="relative mb-5">
                <div className="w-16 h-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center animate-pulse">
                  <Sparkles className="w-7 h-7" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-success border-2 border-card" />
              </div>
              <h3 className="text-base font-bold text-ink">AI agents are analysing your report…</h3>
              <p className="text-sm text-muted mt-1.5 max-w-sm">
                Detecting the issue category, assessing severity, and preparing the details for you.
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                Perception agent at work
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
              {/* AI summary */}
              <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 to-teal-brand/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-ink">AI Analysis</h3>
                  <Badge tone="success" className="ml-auto">
                    <CheckCircle2 className="w-3 h-3" /> Complete
                  </Badge>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="rounded-xl bg-card/80 border border-line p-3">
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-faint mb-1">Detected category</p>
                    <p className="text-sm font-bold text-ink flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      {category ? categoryDisplay : '—'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-card/80 border border-line p-3">
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-faint mb-1">Predicted priority</p>
                    <p className="text-sm font-bold text-ink">
                      {severityLabel(severity)} <span className="text-faint font-semibold">· {severity}/10</span>
                    </p>
                  </div>
                  <div className="rounded-xl bg-card/80 border border-line p-3">
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-faint mb-1">Suggested department</p>
                    <p className="text-sm font-bold text-ink flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-teal-brand" />
                      {departmentForCategory(category)}
                    </p>
                  </div>
                </div>
                {reasoning && (
                  <p className="mt-3 text-xs text-muted italic leading-relaxed">
                    “{reasoning}”
                  </p>
                )}
              </div>

              <Input
                id="title"
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short description of the issue"
              />

              <div>
                <label className="text-[0.8125rem] font-semibold text-ink block mb-1.5">Severity (1–10)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={severity}
                    onChange={(e) => setSeverity(parseInt(e.target.value))}
                    className="flex-1 accent-[var(--primary)]"
                    aria-label="Severity"
                  />
                  <span className="w-12 text-right text-sm font-extrabold text-ink tabular-nums">{severity}/10</span>
                </div>
                <div className="flex justify-between text-[0.6875rem] text-faint mt-1">
                  <span>Low</span>
                  <span>Moderate</span>
                  <span>Critical</span>
                </div>
              </div>

              <Textarea
                id="description"
                label="Description"
                rows={5}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide context or details about the issue…"
                hint={`${description.length}/500 characters`}
              />
            </form>
          )}
        </div>
      )}

      {/* ══════════ STEP 5 — REVIEW & SUBMIT ══════════ */}
      {step === 5 && (
        <form onSubmit={handleFinalSubmit} className="animate-fade-up space-y-5">
          <h2 className="text-base font-bold text-ink">Review your report</h2>

          <div className="rounded-2xl border border-line bg-card overflow-hidden">
            <div className="h-48 bg-subtle relative">
              {previewUrl || uploadedMediaUrl ? (
                mediaType === 'video' ? (
                  <video src={previewUrl || uploadedMediaUrl || ''} className="w-full h-full object-cover" controls />
                ) : (
                  <img src={previewUrl || uploadedMediaUrl || ''} alt="Issue preview" className="w-full h-full object-cover" />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-faint">
                  <ImageIcon className="w-10 h-10" />
                </div>
              )}
              <span className="absolute top-3 left-3 rounded-full px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-wide text-white shadow-lg" style={{ background: severity >= 7 ? 'var(--danger)' : severity >= 4 ? 'var(--warning)' : 'var(--success)' }}>
                {severityLabel(severity)} · {severity}/10
              </span>
            </div>

            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-ink leading-snug">{title}</h3>
                  <p className="text-xs text-faint mt-0.5">{categoryDisplay}</p>
                </div>
                <Badge tone="danger" dot>
                  Reported
                </Badge>
              </div>
              <p className="text-sm text-muted leading-relaxed">{description}</p>

              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-subtle px-3 py-1.5 text-xs font-semibold text-ink">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  {location?.lat.toFixed(4)}, {location?.lng.toFixed(4)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-subtle px-3 py-1.5 text-xs font-semibold text-ink">
                  <Building2 className="w-3.5 h-3.5 text-teal-brand" />
                  {departmentForCategory(category)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-warning-soft border border-warning/25 p-4 text-xs text-ink leading-relaxed">
            <strong className="font-bold">Before you submit:</strong> our AI agents will check for duplicates within 100m. If
            the same issue is already reported, your report will be merged with it and count as a community verification.
          </div>
        </form>
      )}

      {/* ── Footer navigation ── */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={handleBack} disabled={step === 1}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="flex items-center gap-2 text-xs text-faint">
          Step {step} of 5
        </div>

        {step < 5 ? (
          <Button onClick={handleContinue} disabled={!canContinue() || analyzing}>
            {step === 4 && analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Analysing…
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        ) : (
          <Button onClick={handleFinalSubmit as any} loading={submitting} disabled={submitting}>
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? 'Submitting…' : 'Confirm Submit'}
          </Button>
        )}
      </div>
    </div>
  );
}
