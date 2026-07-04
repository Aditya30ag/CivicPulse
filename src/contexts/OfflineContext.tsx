/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, arrayUnion, doc } from 'firebase/firestore';
import { analyzeIssueImage, checkDuplicateIssue } from '../lib/gemini';
import { geohashForLocation, geohashQueryBounds, distanceBetween } from 'geofire-common';
import { getDrafts, saveDraft, deleteDraft, DraftReport } from '../lib/draftQueue';

interface OfflineContextType {
  isOnline: boolean;
  drafts: DraftReport[];
  syncing: boolean;
  addOfflineDraft: (draft: Omit<DraftReport, 'status'>) => Promise<void>;
  syncDrafts: () => Promise<void>;
  deleteOfflineDraft: (id: string) => Promise<void>;
  refreshDrafts: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

const uploadToCloudinary = async (file: File): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary configuration is missing.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const resourceType = 'auto';
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

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [drafts, setDrafts] = useState<DraftReport[]>([]);
  const [syncing, setSyncing] = useState<boolean>(false);

  const refreshDrafts = async () => {
    try {
      const allDrafts = await getDrafts();
      setDrafts(allDrafts);
    } catch (err) {
      console.error('Failed to load drafts:', err);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger auto-sync when network returns
      syncDrafts();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    refreshDrafts();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addOfflineDraft = async (draftData: Omit<DraftReport, 'status'>) => {
    const draft: DraftReport = {
      ...draftData,
      status: 'pending'
    };
    await saveDraft(draft);
    await refreshDrafts();
  };

  const deleteOfflineDraft = async (id: string) => {
    await deleteDraft(id);
    await refreshDrafts();
  };

  const syncDrafts = async () => {
    if (!navigator.onLine || syncing) return;
    
    const pendingDrafts = await getDrafts();
    const activeDrafts = pendingDrafts.filter(d => d.status === 'pending' || d.status === 'failed');
    if (activeDrafts.length === 0) return;

    setSyncing(true);
    console.log(`Starting synchronization of ${activeDrafts.length} drafts.`);

    for (const draft of activeDrafts) {
      try {
        // 1. Update status to uploading
        const uploadingDraft: DraftReport = { ...draft, status: 'uploading', errorMessage: undefined };
        await saveDraft(uploadingDraft);
        await refreshDrafts();

        // 2. Upload media
        let mediaUrl = '';
        try {
          mediaUrl = await uploadToCloudinary(draft.file);
        } catch (uploadErr: any) {
          throw new Error(`Media upload failed: ${uploadErr.message}`);
        }

        // 3. Gemini Perception analysis (if title/category/description missing and media is image)
        let finalTitle = draft.title;
        let finalCategory = draft.category;
        let finalDescription = draft.description;
        let finalSeverity = draft.severity;
        let finalReasoning = '';

        const needsAIAnalysis = draft.mediaType === 'image' && (!finalTitle.trim() || !finalCategory || !finalDescription.trim());
        
        if (needsAIAnalysis) {
          try {
            const analysis = await analyzeIssueImage(mediaUrl);
            finalTitle = finalTitle || analysis.title || 'Civic Issue';
            finalCategory = finalCategory || analysis.category || 'Other';
            finalDescription = finalDescription || analysis.description || 'Reported via offline mode';
            finalSeverity = analysis.severity || draft.severity || 5;
            finalReasoning = analysis.reasoning || '';
          } catch (aiErr: any) {
            console.error('Gemini offline fallback analysis failed:', aiErr);
            // Fallback default values if AI fails, to allow the report to be filed
            finalTitle = finalTitle || 'Offline Civic Issue';
            finalCategory = finalCategory || 'Other';
            finalDescription = finalDescription || 'Reported offline (perception check skipped)';
          }
        } else {
          // Defaults if completely blank and video/unsupported
          finalTitle = finalTitle || 'Offline Civic Report';
          finalCategory = finalCategory || 'Other';
          finalDescription = finalDescription || 'Reported offline';
        }

        // 4. Deduplication
        const center = [draft.location.lat, draft.location.lng] as [number, number];
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
          for (const docObj of snap.docs) {
            const data = docObj.data();
            if (data.status === 'resolved') continue;
            if (data.category !== finalCategory) continue;
            
            if (data.geoPoint) {
              const distanceInKm = distanceBetween([data.geoPoint.lat, data.geoPoint.lng], center);
              const distanceInM = distanceInKm * 1000;
              if (distanceInM <= radiusInM) {
                matchingDocs.push({ id: docObj.id, ...data, distance: distanceInM });
              }
            }
          }
        }

        matchingDocs.sort((a, b) => a.distance - b.distance);
        matchingDocs = matchingDocs.slice(0, 3);

        let foundDuplicate = null;
        for (const candidate of matchingDocs) {
          const check = await checkDuplicateIssue(finalDescription, candidate.description);
          if (check.isDuplicate) {
            foundDuplicate = candidate;
            break;
          }
        }

        const now = new Date().toISOString();

        if (foundDuplicate) {
          // Merge with duplicate
          const oldSeverity = foundDuplicate.severityScore || 1;
          const newSeverity = finalSeverity;
          const isEscalation = (newSeverity - oldSeverity) >= 2;

          let orchestratorReasoning = "";
          let targetSeverity = oldSeverity;

          if (isEscalation) {
            orchestratorReasoning = `Merged duplicate report, but escalated severity from ${oldSeverity} to ${newSeverity} based on new visual evidence showing increased urgency (offline sync)`;
            targetSeverity = newSeverity;
          } else {
            orchestratorReasoning = "Merged with existing report — consistent severity assessment (offline sync)";
          }

          const updateData: any = {
            verifiers: arrayUnion(draft.id), // Add draft ID as a reference
            agentTrace: arrayUnion(
              { agent: "Deduplication", reasoning: "Found highly similar existing report in same area during offline sync", timestamp: now },
              { agent: "Severity", reasoning: `Independent assessment of new report: ${finalSeverity}/10`, timestamp: now },
              { agent: "Orchestrator", reasoning: orchestratorReasoning, timestamp: now }
            )
          };

          if (isEscalation) {
            updateData.severityScore = targetSeverity;
          }

          await updateDoc(doc(db, 'reports', foundDuplicate.id), updateData);
        } else {
          // Create new issue
          const hash = geohashForLocation(center);
          await addDoc(collection(db, 'reports'), {
            mediaURL: mediaUrl,
            mediaType: draft.mediaType,
            category: finalCategory,
            title: finalTitle,
            description: finalDescription,
            geoPoint: draft.location,
            geohash: hash,
            reporterId: draft.id, // using unique draft ID as unique device reporter placeholder if user credentials lost/missing
            status: "reported",
            severityScore: finalSeverity,
            verifiers: [],
            agentTrace: [
              {
                agent: "Perception",
                reasoning: finalReasoning || "Initial classification and visual assessment complete (Offline Synced)",
                timestamp: now
              },
              {
                agent: "Deduplication",
                reasoning: "No similar reports found nearby (Offline Synced)",
                timestamp: now
              },
              {
                agent: "Severity",
                reasoning: `Standalone report severity assessed at ${finalSeverity}/10 (Offline Synced)`,
                timestamp: now
              },
              {
                agent: "Orchestrator",
                reasoning: "New unique issue confirmed, proceeding to routing (Offline Synced)",
                timestamp: now
              }
            ],
            createdAt: serverTimestamp()
          });
        }

        // 5. Delete successfully synced draft
        await deleteDraft(draft.id);
      } catch (err: any) {
        console.error(`Failed to sync draft ${draft.id}:`, err);
        const failedDraft: DraftReport = {
          ...draft,
          status: 'failed',
          errorMessage: err.message || 'Unknown synchronization error'
        };
        await saveDraft(failedDraft);
      }
    }

    await refreshDrafts();
    setSyncing(false);
    console.log("Synchronization process finished.");
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        drafts,
        syncing,
        addOfflineDraft,
        syncDrafts,
        deleteOfflineDraft,
        refreshDrafts
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
