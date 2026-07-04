import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, arrayUnion, doc, orderBy } from 'firebase/firestore';
import { MapPin, Upload, X, Loader2, Image as ImageIcon, Video, CheckCircle2, Trash2, RefreshCw } from 'lucide-react';
import { analyzeIssueImage, checkDuplicateIssue } from '../lib/gemini';
import { geohashForLocation, geohashQueryBounds, distanceBetween } from 'geofire-common';
import { useOffline } from '../contexts/OfflineContext';

const uploadToCloudinary = async (file: File): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary configuration is missing. Please check your .env file or environment variables.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const resourceType = 'auto'; // automatically detects image or video
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to upload to Cloudinary');
  }

  const data = await response.json();
  return data.secure_url;
};

const CATEGORIES = [
  "Pothole",
  "Garbage",
  "Streetlight",
  "Water Leakage",
  "Other"
];

function DraftItem({ draft, onDelete, onSync, isOnline }: { draft: any, onDelete: (id: string) => void, onSync: () => void, isOnline: boolean, key?: any }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!draft.file) return;
    const url = URL.createObjectURL(draft.file);
    setThumbUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [draft.file]);

  return (
    <div className="flex items-center gap-4 py-3 border-b border-border-subtle last:border-b-0">
      <div className="w-16 h-16 rounded-lg overflow-hidden border border-border-subtle bg-page shrink-0 flex items-center justify-center">
        {thumbUrl ? (
          draft.mediaType === 'video' ? (
            <video src={thumbUrl} className="w-full h-full object-cover" />
          ) : (
            <img src={thumbUrl} alt="Draft Thumbnail" className="w-full h-full object-cover" />
          )
        ) : (
          <div className="w-6 h-6 rounded bg-muted animate-pulse"></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm text-dark truncate">
          {draft.title || <span className="italic text-muted font-normal font-sans text-xs">Auto-generates details online</span>}
        </h4>
        <p className="text-xs text-muted mt-0.5 truncate">
          {draft.category || 'Uncategorized'} • {draft.location.lat.toFixed(4)}, {draft.location.lng.toFixed(4)}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          {draft.status === 'uploading' && (
            <span className="flex items-center gap-1 text-[10px] bg-lavender/10 text-lavender font-bold px-2 py-0.5 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin" />
              Syncing
            </span>
          )}
          {draft.status === 'pending' && (
            <span className="text-[10px] bg-warning/10 text-warning font-bold px-2 py-0.5 rounded-full">
              Awaiting connection
            </span>
          )}
          {draft.status === 'failed' && (
            <span className="group relative text-[10px] bg-danger/10 text-danger font-bold px-2 py-0.5 rounded-full cursor-help">
              Failed (hover for error)
              <span className="hidden group-hover:block absolute bottom-full left-0 bg-dark text-white text-[10px] font-normal p-2 rounded shadow-md w-48 mb-1 z-[100] break-words">
                {draft.errorMessage || 'Unknown error'}
              </span>
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {draft.status === 'failed' && isOnline && (
          <button
            type="button"
            onClick={onSync}
            className="p-2 text-muted hover:text-dark hover:bg-page rounded-full transition-colors cursor-pointer"
            title="Retry Sync"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(draft.id)}
          className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-full transition-colors cursor-pointer"
          title="Delete Draft"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function Report() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isOnline, drafts, addOfflineDraft, deleteOfflineDraft, syncDrafts, syncing } = useOffline();

  const [step, setStep] = useState<1 | 2>(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);
  
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualLat, setManualLat] = useState<string>('');
  const [manualLng, setManualLng] = useState<string>('');
  
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [severity, setSeverity] = useState<number>(5);
  const [reasoning, setReasoning] = useState<string>('');
  
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const type = selectedFile.type.startsWith('video/') ? 'video' : 'image';
      
      setFile(selectedFile);
      setMediaType(type);
      
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationLoading(false);
        setError(null);
      },
      (err) => {
        setLocationLoading(false);
        setError(`Unable to retrieve your location: ${err.message}`);
      }
    );
  };

  const handleAnalyze = async () => {
    setError(null);
    if (!user) {
      setError("You must be logged in to submit a report.");
      return;
    }
    if (!file) {
      setError("Please attach a photo or video.");
      return;
    }
    if (!location) {
      setError("Please provide the location of the issue.");
      return;
    }

    try {
      setAnalyzing(true);
      // Upload media to Cloudinary
      let downloadURL: string;
      try {
        downloadURL = await uploadToCloudinary(file);
      } catch (err: any) {
        throw new Error(`Media upload failed: ${err.message}`);
      }
      setUploadedMediaUrl(downloadURL);

      // Only analyze images
      if (mediaType === 'image') {
        const analysisDetails = await analyzeIssueImage(downloadURL);
        setCategory(analysisDetails.category);
        setDescription(analysisDetails.description || '');
        setTitle(analysisDetails.title || '');
        setSeverity(analysisDetails.severity || 5);
        setReasoning(analysisDetails.reasoning || '');
      } else {
        // Fallback for videos
        setCategory('');
        setDescription('');
        setTitle('');
        setSeverity(5);
        setReasoning("Video analysis not supported. Values entered manually.");
      }
      setStep(2);
    } catch (err: any) {
      console.error("Error analyzing report:", err);
      setError(err.message || "Failed to analyze image. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleProceedOffline = () => {
    setError(null);
    if (!file) {
      setError("Please attach a photo or video.");
      return;
    }
    if (!location) {
      setError("Please provide the location of the issue.");
      return;
    }
    setStep(2);
  };

  const handleOfflineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !location) {
      setError("Missing information.");
      return;
    }

    try {
      setSubmitting(true);
      const draftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await addOfflineDraft({
        id: draftId,
        file: file,
        mediaType: mediaType || 'image',
        location: location,
        createdAt: new Date().toISOString(),
        title: title || '',
        category: category || 'Other',
        description: description || '',
        severity: severity,
        reporterId: user?.uid || 'anonymous'
      });
      navigate('/');
    } catch (err: any) {
      console.error("Failed to save offline draft:", err);
      setError("Failed to save draft locally: " + err.message);
      setSubmitting(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !uploadedMediaUrl || !location) {
      setError("Missing information.");
      return;
    }
    if (!category) {
      setError("Please select a category.");
      return;
    }
    if (!title.trim() || !description.trim()) {
      setError("Please provide a title and description.");
      return;
    }

    try {
      setSubmitting(true);
      
      const center = [location.lat, location.lng] as [number, number];
      const radiusInM = 100;
      const bounds = geohashQueryBounds(center, radiusInM);
      const promises = [];
      for (const b of bounds) {
        const q = query(
          collection(db, 'reports'),
          where('geohash', '>=', b[0]),
          where('geohash', '<=', b[1])
        );
        promises.push(getDocs(q));
      }

      const snapshots = await Promise.all(promises);
      let matchingDocs: any[] = [];

      for (const snap of snapshots) {
        for (const doc of snap.docs) {
          const data = doc.data();
          if (data.status === 'resolved') continue;
          if (data.category !== category) continue;
          
          if (data.geoPoint) {
            const lat = data.geoPoint.lat;
            const lng = data.geoPoint.lng;
            const distanceInKm = distanceBetween([lat, lng], center);
            const distanceInM = distanceInKm * 1000;
            if (distanceInM <= radiusInM) {
              matchingDocs.push({ id: doc.id, ...data, distance: distanceInM });
            }
          }
        }
      }

      matchingDocs.sort((a, b) => a.distance - b.distance);
      matchingDocs = matchingDocs.slice(0, 3);

      let foundDuplicate = null;
      for (const candidate of matchingDocs) {
        const check = await checkDuplicateIssue(description, candidate.description);
        if (check.isDuplicate) {
          foundDuplicate = candidate;
          break;
        }
      }

      if (foundDuplicate) {
        const oldSeverity = foundDuplicate.severityScore || 1;
        const newSeverity = severity;
        const isEscalation = (newSeverity - oldSeverity) >= 2;

        let orchestratorReasoning = "";
        let finalSeverity = oldSeverity;

        if (isEscalation) {
           orchestratorReasoning = `Merged duplicate report, but escalated severity from ${oldSeverity} to ${newSeverity} based on new visual evidence showing increased urgency`;
           finalSeverity = newSeverity;
        } else {
           orchestratorReasoning = "Merged with existing report — consistent severity assessment";
        }

        const now = new Date().toISOString();
        const updateData: any = {
           verifiers: arrayUnion(user.uid),
           agentTrace: arrayUnion(
              { agent: "Deduplication", reasoning: "Found highly similar existing report in same area", timestamp: now },
              { agent: "Severity", reasoning: `Independent assessment of new report: ${severity}/10`, timestamp: now },
              { agent: "Orchestrator", reasoning: orchestratorReasoning, timestamp: now }
           )
        };

        if (isEscalation) {
           updateData.severityScore = finalSeverity;
        }

        await updateDoc(doc(db, 'reports', foundDuplicate.id), updateData);
        navigate(`/issue/${foundDuplicate.id}`);
        return;
      }

      const hash = geohashForLocation(center);
      const now = new Date().toISOString();
      const docRef = await addDoc(collection(db, 'reports'), {
        mediaURL: uploadedMediaUrl,
        mediaType: mediaType,
        category: category,
        title: title,
        description: description,
        geoPoint: location,
        geohash: hash,
        reporterId: user.uid,
        status: "reported",
        severityScore: severity,
        verifiers: [],
        agentTrace: [
          {
            agent: "Perception",
            reasoning: reasoning || "Initial classification and visual assessment complete",
            timestamp: now
          },
          {
            agent: "Deduplication",
            reasoning: "No similar reports found nearby",
            timestamp: now
          },
          {
            agent: "Severity",
            reasoning: `Standalone report severity assessed at ${severity}/10`,
            timestamp: now
          },
          {
            agent: "Orchestrator",
            reasoning: "New unique issue confirmed, proceeding to routing",
            timestamp: now
          }
        ],
        createdAt: serverTimestamp()
      });

      navigate(`/issue/${docRef.id}`);
    } catch (err: any) {
      console.error("Error submitting report:", err);
      setError(err.message || "Failed to submit report. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      {/* Mobile Title */}
      <h1 className="md:hidden text-2xl font-bold text-dark mb-6 mt-2">Report an Issue</h1>
      
      {/* Desktop Title */}
      <div className="hidden md:block mb-8 mt-4">
        <h1 className="text-3xl font-bold text-dark">Report an Issue</h1>
        <p className="text-muted mt-2">Help keep our community clean and safe. Provide details below.</p>
      </div>

      {/* Pending Drafts List */}
      {drafts.length > 0 && (
        <div className="bg-card rounded-xl shadow-sm border border-border-subtle p-6 mb-6">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-4">
            <h3 className="font-bold text-dark flex items-center gap-2">
              Pending Drafts
              <span className="bg-dark/10 text-dark text-xs px-2 py-0.5 rounded-full font-bold">
                {drafts.length}
              </span>
            </h3>
            {isOnline && (
              <button
                type="button"
                onClick={syncDrafts}
                disabled={syncing}
                className="flex items-center gap-1.5 text-xs font-bold bg-dark text-white px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-55 cursor-pointer"
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Sync Now
                  </>
                )}
              </button>
            )}
          </div>
          <div className="divide-y divide-border-subtle max-h-60 overflow-y-auto pr-1">
            {drafts.map((draft) => (
              <DraftItem
                key={draft.id}
                draft={draft}
                onDelete={deleteOfflineDraft}
                onSync={syncDrafts}
                isOnline={isOnline}
              />
            ))}
          </div>
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={(e) => { e.preventDefault(); isOnline ? handleAnalyze() : handleProceedOffline(); }} className="bg-card rounded-xl shadow-sm border border-border-subtle p-6 space-y-6">
          
          {error && (
            <div className="bg-danger/10 text-danger p-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {/* Media Upload */}
          <div>
            <label className="block text-sm font-semibold text-dark mb-2">Photo or Video *</label>
            {previewUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-border-subtle bg-page flex justify-center max-h-64">
                {mediaType === 'video' ? (
                  <video src={previewUrl} controls className="max-h-64 object-contain" />
                ) : (
                  <img src={previewUrl} alt="Preview" className="max-h-64 object-contain" />
                )}
                <button
                  type="button"
                  onClick={removeFile}
                  className="absolute top-2 right-2 bg-dark text-white rounded-full p-1 opacity-75 hover:opacity-100 transition-opacity"
                  aria-label="Remove media"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border-subtle rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-page transition-colors"
              >
                <div className="flex gap-4 mb-3">
                  <ImageIcon className="w-8 h-8 text-muted" />
                  <Video className="w-8 h-8 text-muted" />
                </div>
                <p className="text-sm font-medium text-dark">Click to upload media</p>
                <p className="text-xs text-muted mt-1">Image or short video</p>
              </div>
            )}
            <input
              type="file"
              accept="image/*,video/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-dark mb-2">Location *</label>
            {location ? (
              <div className="flex items-center justify-between bg-success/10 border border-success/30 rounded-lg p-4">
                <div className="flex items-center gap-3 text-dark">
                  <MapPin className="w-5 h-5 flex-shrink-0 text-success" />
                  <span className="text-sm font-medium text-balance">
                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setLocation(null)}
                  className="text-dark hover:opacity-70 p-1"
                  aria-label="Clear location"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={locationLoading}
                  className="w-full flex items-center justify-center gap-2 border border-border-subtle bg-page text-dark rounded-lg px-4 py-3 text-sm font-medium hover:bg-card transition-colors disabled:opacity-50"
                >
                  {locationLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <MapPin className="w-5 h-5" />
                  )}
                  {locationLoading ? 'Locating...' : 'Use my current location automatically'}
                </button>
                
                {!showManualLocation ? (
                   <button
                     type="button"
                     onClick={() => setShowManualLocation(true)}
                     className="w-full text-center text-xs text-muted hover:text-dark underline"
                   >
                     Cannot use location? Enter coordinates manually
                   </button>
                ) : (
                  <div className="flex flex-col gap-2 p-3 border border-border-subtle rounded-lg bg-page relative">
                    <button 
                      type="button" 
                      onClick={() => setShowManualLocation(false)} 
                      className="absolute top-2 right-2 text-muted hover:text-dark"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <p className="text-xs font-medium text-dark mb-1">Enter coordinates</p>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        step="any"
                        placeholder="Latitude (e.g. 37.7749)" 
                        value={manualLat}
                        onChange={(e) => setManualLat(e.target.value)}
                        className="flex-1 border border-border-subtle rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:border-dark bg-card text-dark"
                      />
                      <input 
                        type="number" 
                        step="any"
                        placeholder="Longitude (e.g. -122.4194)" 
                        value={manualLng}
                        onChange={(e) => setManualLng(e.target.value)}
                        className="flex-1 border border-border-subtle rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:border-dark bg-card text-dark"
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const lat = parseFloat(manualLat);
                          const lng = parseFloat(manualLng);
                          if (!isNaN(lat) && !isNaN(lng)) {
                            setLocation({ lat, lng });
                            setShowManualLocation(false);
                            setManualLat('');
                            setManualLng('');
                          } else {
                            setError("Please enter valid numbers for latitude and longitude.");
                          }
                        }}
                        className="bg-dark text-white px-3 py-2 rounded text-sm font-medium hover:opacity-90"
                      >
                        Set
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Proceed to Analysis */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={analyzing}
              className="w-full md:w-auto flex justify-center items-center gap-2 bg-dark text-white font-medium px-8 py-3 rounded-lg hover:opacity-90 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-dark disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing image...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  {isOnline ? 'Analyze Image (AI)' : 'Proceed to Details (Offline)'}
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={isOnline ? handleFinalSubmit : handleOfflineSubmit} className="bg-card rounded-xl shadow-sm border border-border-subtle p-6 space-y-6">
          {error && (
            <div className="bg-danger/10 text-danger p-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-6">
             {/* Preview Image */}
             <div className="w-full md:w-1/3 flex flex-col gap-2">
               <label className="block text-sm font-semibold text-dark">Media</label>
               <div className="relative rounded-lg overflow-hidden border border-border-subtle bg-page flex justify-center h-48 md:h-auto object-cover">
                 {mediaType === 'video' ? (
                   <video src={previewUrl || uploadedMediaUrl || ''} controls className="max-h-64 object-contain" />
                 ) : (
                   <img src={previewUrl || uploadedMediaUrl || ''} alt="Preview" className="max-h-64 object-contain" />
                 )}
               </div>
               
               <div className="mt-4">
                 <label className="block text-sm font-semibold text-dark mb-2">Severity (1-10)</label>
                 <input
                   type="range"
                   min="1"
                   max="10"
                   value={severity}
                   onChange={(e) => setSeverity(parseInt(e.target.value))}
                   className="w-full"
                 />
                 <div className="flex justify-between text-xs text-muted mt-1">
                   <span>Low (1)</span>
                   <span className="font-bold text-dark">{severity}</span>
                   <span>High (10)</span>
                 </div>
               </div>
               {reasoning && (
                  <p className="text-xs text-muted italic mt-2">
                    <span className="font-semibold not-italic text-dark">AI Reasoning:</span> {reasoning}
                  </p>
               )}
             </div>

             <div className="flex-1 space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-dark mb-2" htmlFor="title">Title *</label>
                    <input
                      id="title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Short description of the issue"
                      className="w-full bg-card border border-border-subtle rounded-lg px-4 py-3 text-sm text-dark focus:outline-none focus:ring-1 focus:border-dark"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold text-dark mb-2" htmlFor="category">Category *</label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full border border-border-subtle rounded-lg px-4 py-3 text-sm text-dark focus:outline-none focus:ring-1 focus:border-dark bg-card appearance-none"
                      style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23181e15%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
                    >
                      <option value="" disabled>Select an issue category</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-dark mb-2" htmlFor="description">Description *</label>
                    <textarea
                      id="description"
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide context or details about the issue..."
                      className="w-full bg-card border border-border-subtle rounded-lg px-4 py-3 text-sm text-dark focus:outline-none focus:ring-1 focus:border-dark resize-y"
                    ></textarea>
                  </div>

                  {/* Submit */}
                  <div className="pt-4 flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      disabled={submitting}
                      className="flex-1 md:flex-none justify-center items-center gap-2 bg-card text-dark border border-border-subtle font-medium px-6 py-3 rounded-lg hover:bg-page transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 justify-center flex items-center gap-2 bg-dark text-white font-medium px-8 py-3 rounded-lg hover:opacity-90 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-dark disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {isOnline ? 'Submitting...' : 'Saving Draft...'}
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          {isOnline ? 'Confirm Submit' : 'Save Draft Offline'}
                        </>
                      )}
                    </button>
                  </div>
             </div>
          </div>
        </form>
      )}
    </div>
  );
}
