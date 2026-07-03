import React, { useState } from 'react';
import { StatusBadge } from './Home';
import { Check, ShieldAlert, ArrowRight, CornerDownRight } from 'lucide-react';

export default function Admin() {
  const [adminIssues, setAdminIssues] = useState([
    { id: '1', title: 'Deep Pothole on Main Avenue Crossing', status: 'pending', category: 'Infrastructure', reports: 5 },
    { id: '2', title: 'Damaged Park Street Streetlight Grid', status: 'in-progress', category: 'Utilities', reports: 12 }
  ]);

  const updateStatus = (id: string, nextStatus: 'pending' | 'in-progress' | 'resolved') => {
    setAdminIssues(prev => prev.map(issue => issue.id === id ? { ...issue, status: nextStatus } : issue));
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 md:pb-0">
      <div>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Admin Operations</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">Review verified public safety matters and control lifecycle dispatch states.</p>
      </div>

      {/* Main Container Layer */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 bg-gray-50/50 border-b border-gray-100 hidden sm:grid sm:grid-cols-12 text-xs font-bold text-gray-500 tracking-wider uppercase">
          <div className="col-span-6">Issue & Scope</div>
          <div className="col-span-3 text-center">Status Badge</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>

        <div className="divide-y divide-gray-100">
          {adminIssues.map((issue) => (
            <div key={issue.id} className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-2 items-center">
              
              {/* Info Block */}
              <div className="col-span-1 sm:col-span-6 space-y-1">
                <span className="inline-block text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">
                  {issue.category}
                </span>
                <h4 className="text-base font-bold text-gray-900 leading-snug">{issue.title}</h4>
                <p className="text-xs text-gray-400">Flagged by {issue.reports} verified citizens</p>
              </div>

              {/* Responsive Badge Frame Alignment */}
              <div className="col-span-1 sm:col-span-3 sm:text-center flex items-center sm:justify-center">
                <StatusBadge status={issue.status as any} />
              </div>

              {/* Custom Selector Group Controls */}
              <div className="col-span-1 sm:col-span-3 flex justify-start sm:justify-end items-center gap-1.5">
                <button
                  onClick={() => updateStatus(issue.id, 'in-progress')}
                  disabled={issue.status === 'in-progress'}
                  className="px-2.5 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 disabled:opacity-40 transition"
                >
                  Work
                </button>
                <button
                  onClick={() => updateStatus(issue.id, 'resolved')}
                  disabled={issue.status === 'resolved'}
                  className="px-2.5 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-40 shadow-sm transition flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> Close
                </button>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}