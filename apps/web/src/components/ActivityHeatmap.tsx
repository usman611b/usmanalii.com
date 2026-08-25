import React, { useEffect, useState } from 'react';
import { fetchJsonWithRetry } from '../lib/publicApi';

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

// M8 intensity palette — green scale, accessible
const INTENSITY_STYLES: Record<number, { background: string; label: string }> = {
  0: { background: 'rgba(255,255,255,0.04)', label: 'No activity' },
  1: { background: '#0e3a22', label: 'Low activity' },
  2: { background: '#1a5e35', label: 'Moderate activity' },
  3: { background: '#26a641', label: 'High activity' },
  4: { background: '#39d353', label: 'Very high activity' },
};

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
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [hoveredCell, setHoveredCell] = useState<ActivityCell | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchJsonWithRetry<{ projection?: ActivityProjection }>(endpointUrl);
        if (!data.projection) throw new Error('Activity service returned an invalid projection.');
        if (mounted) setProjection(data.projection);
      } catch (cause) {
        if (mounted) {
          setProjection(createFallbackProjection());
          setError(cause instanceof Error ? cause.message : 'Activity data could not be loaded.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [endpointUrl, reloadKey]);

  if (loading) {
    return (
      <div
        className="rounded-xl p-6 flex items-center justify-center"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--hairline)',
          minHeight: 160,
        }}
        aria-label="Loading activity heatmap"
        aria-busy="true"
        role="status"
      >
        <div className="space-y-2 w-full">
          <div className="skeleton h-3 w-48 rounded" />
          <div className="skeleton h-16 w-full rounded" />
        </div>
      </div>
    );
  }

  if (error)
    return (
      <div className="activity-unavailable" role="status">
        <div className="activity-unavailable-copy">
          <span className="observatory-service-beacon" aria-hidden="true" />
          <div>
            <strong>Activity projection is temporarily unavailable.</strong>
            <p>The grid is retained for layout only; these cells do not represent zero activity.</p>
            <span className="sr-only">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="btn btn-ghost text-xs"
          >
            Retry
          </button>
        </div>
        <div className="activity-unavailable-grid" aria-hidden="true">
          {Array.from({ length: 140 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      </div>
    );

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline)' }}
    >
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-4"
        style={{ borderColor: 'var(--hairline)' }}
      >
        <div>
          <h3
            className="text-sm font-semibold flex items-center gap-2"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
          >
            Engineering Activity Heatmap
            <span className="badge badge-cyan text-[10px] px-2 py-0.5">{projection.timezone}</span>
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Derived from append-only Evidence Ledger events.{' '}
            {!isPrivateView && <span>Activity presence shown; counts masked for public view.</span>}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div>
            <span className="font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {projection.activeDaysCount}
            </span>{' '}
            active days
          </div>
          {isPrivateView && (
            <div>
              <span className="font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {projection.totalActivities}
              </span>{' '}
              total events
            </div>
          )}
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto pb-1">
        {/* Screen-reader accessible summary */}
        <p className="sr-only">
          Activity heatmap for {projection.startDate} to {projection.endDate}.
          {projection.activeDaysCount} active days out of 365. Use arrow keys to navigate cells.
        </p>

        <div
          role="grid"
          aria-label="Engineering activity heatmap — past year"
          className="grid grid-flow-col grid-rows-7 gap-1"
          style={{ minWidth: 700 }}
        >
          {projection.cells.map((cell, idx) => {
            const style = INTENSITY_STYLES[cell.intensity] ?? INTENSITY_STYLES[0]!;
            const label = `${cell.date}: ${
              cell.count > 0
                ? isPrivateView
                  ? `${cell.count} activity events (${cell.eventTypes.slice(0, 3).join(', ')})`
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
                onMouseLeave={() => setHoveredCell(null)}
                onFocus={() => setHoveredCell(cell)}
                onBlur={() => setHoveredCell(null)}
                className="w-3 h-3 rounded-sm transition-all duration-[80ms] hover:scale-125 focus:outline-none focus:ring-1"
                style={{
                  background: style.background,
                  border: cell.intensity === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  boxShadow: cell.intensity > 2 ? `0 0 4px ${style.background}` : 'none',
                  outline: 'none',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Footer: tooltip + legend */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs pt-1"
        style={{ color: 'var(--text-muted)' }}
      >
        {/* Tooltip */}
        <div className="min-h-[18px] font-medium" aria-live="polite" aria-atomic="true">
          {hoveredCell ? (
            <span>
              <strong style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
                {hoveredCell.date}
              </strong>
              {': '}
              {hoveredCell.count > 0
                ? isPrivateView
                  ? `${hoveredCell.count} event${hoveredCell.count !== 1 ? 's' : ''} — ${hoveredCell.eventTypes.join(', ')}`
                  : 'Verified activity registered'
                : 'No activity registered'}
            </span>
          ) : (
            <span>Hover or focus a cell to view activity summary</span>
          )}
        </div>

        {/* Legend */}
        <div
          className="flex items-center gap-1.5 mt-2 sm:mt-0 flex-shrink-0"
          aria-label="Activity intensity legend"
        >
          <span className="text-[10px] uppercase tracking-wider">Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className="w-2.5 h-2.5 rounded-sm"
              style={{
                background: INTENSITY_STYLES[level]!.background,
                border: level === 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}
              aria-label={INTENSITY_STYLES[level]!.label}
              title={INTENSITY_STYLES[level]!.label}
            />
          ))}
          <span className="text-[10px] uppercase tracking-wider">More</span>
        </div>
      </div>
    </div>
  );
};
