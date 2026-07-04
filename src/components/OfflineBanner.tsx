/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useOffline } from '../contexts/OfflineContext';
import { WifiOff, Loader2, CloudLightning } from 'lucide-react';

export default function OfflineBanner() {
  const { isOnline, drafts, syncing } = useOffline();
  
  const pendingCount = drafts.filter(d => d.status === 'pending' || d.status === 'failed').length;

  if (syncing) {
    return (
      <div className="bg-lavender/10 border-b border-lavender/30 text-lavender px-4 py-2.5 flex items-center justify-center gap-2 text-xs font-semibold tracking-wide animate-pulse">
        <Loader2 className="w-4 h-4 animate-spin text-lavender" />
        <span>Syncing {pendingCount} offline report{pendingCount > 1 ? 's' : ''} to server...</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="bg-warning/10 border-b border-warning/30 text-warning px-4 py-2.5 flex items-center justify-center gap-2 text-xs font-semibold tracking-wide">
        <WifiOff className="w-4 h-4 text-warning" />
        <span>You are currently offline. Reports will be drafted locally and uploaded when you reconnect.</span>
        {pendingCount > 0 && (
          <span className="bg-warning/20 px-2 py-0.5 rounded-full text-[10px]">
            {pendingCount} draft{pendingCount > 1 ? 's' : ''} pending
          </span>
        )}
      </div>
    );
  }

  return null;
}
