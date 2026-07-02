import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ThumbsUp, MessageSquare, MapPin, AlertCircle, Clock, CheckCircle2, RefreshCw } from 'lucide-react';

interface Issue {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'resolved';
  category: string;
  location: string;
  upvotes: number;
  commentsCount: number;
  createdAt: any;
  imageUrl?: string;
}

export const StatusBadge = ({ status }: { status: Issue['status'] }) => {
  const configs = {
    pending: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200/60',
      icon: <Clock className="w-3.5 h-3.5 mr-1 shrink-0" />,
      label: 'Pending'
    },
    'in-progress': {
      bg: 'bg-blue-50 text-blue-700 border-blue-200/60',
      icon: <RefreshCw className="w-3.5 h-3.5 mr-1 shrink-0 animate-spin-slow" />,
      label: 'In Progress'
    },
    resolved: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0" />,
      label: 'Resolved'
    }
  };

  const current = configs[status] || configs.pending;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border tracking-wide shadow-sm uppercase ${current.bg}`}>
      {current.icon}
      {current.label}
    </span>
  );
};

export default function Home() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated fetch logic matching existing state behavior
    setTimeout(() => {
      setIssues([
        {
          id: '1',
          title: 'Deep Pothole on Main Avenue Crossing',
          description: 'A structural pothole causing major vehicle path shifts right before the traffic lights. Hazard for bikes.',
          status: 'pending',
          category: 'Infrastructure',
          location: 'Main Ave, Ward 4',
          upvotes: 42,
          commentsCount: 5,
          createdAt: new Date()
        },
        {
          id: '2',
          title: 'Damaged Park Street Streetlight Grid',
          description: 'Entire block streetlight grid has been flickering or completely blacked out for three consecutive nights.',
          status: 'in-progress',
          category: 'Utilities',
          location: 'Park Street Sector B',
          upvotes: 18,
          commentsCount: 2,
          createdAt: new Date()
        }
      ]);
      setLoading(false);
    }, 600);
  }, []);

  const filteredIssues = filter === 'all' ? issues : issues.filter(i => i.status === filter);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium text-sm">Syncing urban pulse data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 md:pb-0">
      {/* Typography Header Block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Community Feed</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">Track, vote, and stay up to date on unresolved municipal issues.</p>
        </div>
        
        {/* Dynamic Mobile Filter Segment Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl items-center self-start md:self-auto overflow-x-auto max-w-full">
          {['all', 'pending', 'in-progress', 'resolved'].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 text-xs font-semibold capitalize rounded-lg whitespace-nowrap transition-all ${
                filter === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Complete Responsive Issue Grid */}
      {filteredIssues.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center max-w-md mx-auto shadow-sm">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900">No reports found</h3>
          <p className="text-gray-500 text-sm mt-1">Everything looks smooth under this filter criteria!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIssues.map((issue) => (
            <div 
              key={issue.id} 
              className="bg-white rounded-2xl border border-gray-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
            >
              {/* Card Main Body Padding */}
              <div className="p-5 md:p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[11px] font-bold tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md uppercase">
                    {issue.category}
                  </span>
                  <StatusBadge status={issue.status} />
                </div>

                <div className="space-y-1.5">
                  <Link 
                    to={`/issue/${issue.id}`}
                    className="block text-lg font-bold text-gray-900 hover:text-blue-600 transition tracking-tight line-clamp-1"
                  >
                    {issue.title}
                  </Link>
                  <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                    {issue.description}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">
                  <MapPin className="w-4 h-4 shrink-0 text-gray-400" />
                  <span className="truncate">{issue.location}</span>
                </div>
              </div>

              {/* Card Footer Interaction Elements */}
              <div className="px-5 md:px-6 py-4 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between text-sm mt-auto">
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition">
                  <ThumbsUp className="w-4 h-4" />
                  <span>{issue.upvotes}</span>
                </button>

                <Link 
                  to={`/issue/${issue.id}`} 
                  className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 font-medium transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{issue.commentsCount} comments</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}