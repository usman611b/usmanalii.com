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

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  isPrivateView = false,
  endpointUrl = '/api/v1/public/activity',
}) => {
  const [projection, setProjection] = useState<ActivityProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<ActivityCell | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchActivity = async () => {
      try {
        setLoading(true);
        const res = await fetch(endpointUrl);
        if (!res.ok) {
          throw new Error(`Failed to load activity projection (${res.status})`);
        }
        const data = (await res.json()) as { projection: ActivityProjection };
        if (isMounted) {
          setProjection(data.projection);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : String(err));
        }
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

  if (loading) {
    return (
      <div className="p-6 rounded-2xl glass-panel animate-pulse flex items-center justify-center min-h-[160px]">
        <div className="text-xs text-[#9CAAC1]">Loading activity ledger projection...</div>
      </div>
    );
  }

  if (error || !projection) {
    return (
      <div className="p-6 rounded-2xl glass-panel text-xs text-rose-400">
        Unable to load activity heatmap: {error || 'No data'}
      </div>
    );
  }

  // Intensity color map (GitHub dark theme style)
  const intensityColors = {
    0: 'bg-[#101A31] border border-white/5',
    1: 'bg-[#0e4429] border border-[#0e4429]',
    2: 'bg-[#006d32] border border-[#006d32]',
    3: 'bg-[#26a641] border border-[#26a641]',
    4: 'bg-[#39d353] border border-[#39d353]',
  };

  return (
    <div className="p-6 rounded-2xl glass-panel space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Engineering Activity Heatmap</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/20 uppercase font-semibold">
              {projection.timezone}
            </span>
          </h3>
          <p className="text-xs text-[#9CAAC1] mt-1">
            Deterministic projection derived from append-only Evidence Ledger events.
          </p>
        </div>

        <div className="text-xs text-[#9CAAC1] flex items-center gap-4">
          <div>
            <span className="text-white font-semibold">{projection.activeDaysCount}</span> active
            days
          </div>
          {!isPrivateView && (
            <div className="text-[11px] text-[#22D3EE]">Counts obscured for privacy</div>
          )}
        </div>
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto pb-2">
        <div
          role="grid"
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
                role="gridcell"
                aria-label={label}
                onMouseEnter={() => setHoveredCell(cell)}
                onFocus={() => setHoveredCell(cell)}
                className={`w-3 h-3 rounded-[2px] transition-all hover:scale-125 focus:outline-none focus:ring-2 focus:ring-[#22D3EE] ${
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
              <strong className="text-[#22D3EE]">{hoveredCell.date}</strong>:{' '}
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
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#101A31] border border-white/5"></span>
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#0e4429]"></span>
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#006d32]"></span>
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#26a641]"></span>
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#39d353]"></span>
          <span className="text-[10px] uppercase tracking-wider">More</span>
        </div>
      </div>
    </div>
  );
};
