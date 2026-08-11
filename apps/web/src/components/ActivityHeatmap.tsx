import React, { useEffect, useState } from 'react';

export interface ActivityCell {
  readonly date: string;
  readonly count: number;
  readonly intensity: 0 | 1 | 2 | 3 | 4;
  readonly eventTypes: readonly string[];
}

export interface ActivityProjection {
  readonly timezone: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly cells: readonly ActivityCell[];
  readonly totalActivities: number;
  readonly activeDaysCount: number;
}

interface ActivityHeatmapProps {
  readonly isPrivateView?: boolean;
  readonly endpointUrl?: string;
}

// Generate deterministic zeroed 365-day fallback cells for graceful degradation
function createFallbackProjection(): ActivityProjection {
  const now = new Date();
  const cells: ActivityCell[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400 * 1000);
    cells.push({
      date: d.toISOString().split('T')[0] || '',
      count: 0,
      intensity: 0,
      eventTypes: [],
    });
  }
  return {
    timezone: 'Asia/Karachi',
    startDate: cells[0]?.date || '',
    endDate: cells[cells.length - 1]?.date || '',
    cells,
    totalActivities: 0,
    activeDaysCount: 0,
  };
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  isPrivateView = false,
  endpointUrl = '/api/v1/public/activity',
}) => {
  const [projection, setProjection] = useState<ActivityProjection>(createFallbackProjection());
  const [loading, setLoading] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<ActivityCell | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchActivity = async () => {
      try {
        setLoading(true);
        const res = await fetch(endpointUrl);
        if (res.ok) {
          const data = (await res.json()) as { projection?: ActivityProjection };
          if (isMounted && data.projection) {
            setProjection(data.projection);
          }
        }
      } catch {
        // Fallback to zeroed projection on network error or missing local worker API
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchActivity();
    return () => {
      isMounted = false;
    };
  }, [endpointUrl]);

  const intensityColors = {
    0: 'bg-[#070A11] border border-white/5',
    1: 'bg-[#0e4429] border border-[#0e4429]',
    2: 'bg-[#006d32] border border-[#006d32]',
    3: 'bg-[#26a641] border border-[#26a641]',
    4: 'bg-[#39d353] border border-[#39d353]',
  };

  if (loading) {
    return (
      <div className="p-6 rounded-2xl glass-panel animate-pulse flex items-center justify-center min-h-[160px] font-mono-tech">
        <div className="text-xs text-[#9CAAC1]">Loading activity ledger projection...</div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl glass-panel space-y-4 font-mono-tech">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span>Engineering Activity Heatmap</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#45F3FF]/15 text-[#45F3FF] border border-[#45F3FF]/30 font-bold">
              {projection.timezone}
            </span>
          </h3>
          <p className="text-xs text-[#9CAAC1] mt-1 font-sans">
            Deterministic projection derived from append-only Evidence Ledger events.
          </p>
        </div>

        <div className="text-xs text-[#9CAAC1] flex items-center gap-4">
          <div>
            <span className="text-white font-bold">{projection.activeDaysCount}</span> active days
          </div>
          {!isPrivateView && (
            <div className="text-[10px] text-[#45F3FF] uppercase font-bold">Public ledger</div>
          )}
        </div>
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto pb-2">
        <div
          aria-label="Engineering activity heatmap for past year"
          className="grid grid-flow-col grid-rows-7 gap-1.5 min-w-[720px]"
        >
          {projection.cells.map((cell, idx) => {
            const label = `${cell.date}: ${
              cell.count > 0
                ? isPrivateView
                  ? `${cell.count} activities`
                  : 'Active'
                : 'No activity'
            }`;

            return (
              <button
                key={cell.date || idx}
                type="button"
                aria-label={label}
                onMouseEnter={() => setHoveredCell(cell)}
                onFocus={() => setHoveredCell(cell)}
                className={`w-3 h-3 rounded-[2px] transition-all hover:scale-125 focus:outline-none focus:ring-2 focus:ring-[#45F3FF] ${
                  intensityColors[cell.intensity]
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Footer & Active Tooltip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-[#9CAAC1] pt-2">
        <div className="min-h-[20px] font-medium text-white/90">
          {hoveredCell ? (
            <span>
              <strong className="text-[#45F3FF]">{hoveredCell.date}</strong>:{' '}
              {hoveredCell.count > 0
                ? isPrivateView
                  ? `${hoveredCell.count} event(s) (${hoveredCell.eventTypes.join(', ')})`
                  : 'Verified Activity Registered'
                : 'No activity registered'}
            </span>
          ) : (
            <span>Hover or focus on a day cell to view activity summary</span>
          )}
        </div>

        <div className="flex items-center space-x-1.5 mt-2 sm:mt-0">
          <span className="text-[10px] uppercase tracking-wider">Less</span>
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#070A11] border border-white/5" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#0e4429]" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#006d32]" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#26a641]" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#39d353]" />
          <span className="text-[10px] uppercase tracking-wider">More</span>
        </div>
      </div>
    </div>
  );
};
