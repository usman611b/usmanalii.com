import React from 'react';

interface ProjectTimelineItem {
  id: string;
  name: string;
  category: string;
  state: 'Shipped' | 'Active' | 'In Progress' | 'Planning';
  progressPercent: number;
  color: string;
}

const PROJECTS: ProjectTimelineItem[] = [
  {
    id: 'p1',
    name: 'Ingestion Platform v2',
    category: 'Reliability & Scale',
    state: 'Shipped',
    progressPercent: 100,
    color: '#B8FF5A',
  },
  {
    id: 'p2',
    name: 'Data Observability',
    category: 'Visibility at Scale',
    state: 'Active',
    progressPercent: 85,
    color: '#8B5CFF',
  },
  {
    id: 'p3',
    name: 'Unified Metrics',
    category: 'Performance & Cost',
    state: 'In Progress',
    progressPercent: 60,
    color: '#45F3FF',
  },
  {
    id: 'p4',
    name: 'Internal Developer Portal',
    category: 'DX & Enablement',
    state: 'Planning',
    progressPercent: 25,
    color: '#F59E0B',
  },
];

export const ProjectStateTimeline: React.FC = () => {
  return (
    <div className="rounded-2xl glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white font-mono-tech tracking-wide">
            Project State
          </h3>
          <p className="text-xs text-[#9CAAC1]">A timeline view of active work and progress.</p>
        </div>
        <span className="text-xs font-mono-tech text-[#45F3FF]">4 PROJECTS</span>
      </div>

      {/* Timeline Headers */}
      <div className="grid grid-cols-6 gap-2 text-[10px] text-[#9CAAC1] font-mono-tech border-b border-white/10 pb-2">
        <span>DEC</span>
        <span>JAN</span>
        <span>FEB</span>
        <span>MAR</span>
        <span>APR</span>
        <span className="text-right">MAY / JUN</span>
      </div>

      {/* Project Rows */}
      <div className="space-y-4">
        {PROJECTS.map((p) => (
          <div key={p.id} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-white font-mono-tech">{p.name}</span>
                <span className="text-[10px] text-[#9CAAC1] block">{p.category}</span>
              </div>
              <span
                className="text-[10px] font-mono-tech px-2 py-0.5 rounded border"
                style={{
                  color: p.color,
                  borderColor: `${p.color}40`,
                  backgroundColor: `${p.color}15`,
                }}
              >
                {p.state}
              </span>
            </div>

            {/* Progress Rail */}
            <div className="w-full h-1.5 rounded-full bg-[#070A11] overflow-hidden relative">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${p.progressPercent}%`,
                  backgroundColor: p.color,
                  boxShadow: `0 0 8px ${p.color}`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
