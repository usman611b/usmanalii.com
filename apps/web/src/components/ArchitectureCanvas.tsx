import React, { useState } from 'react';

export const ArchitectureCanvas: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative w-full rounded-2xl glass-panel-cyan p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#45F3FF] animate-pulse" />
          <span className="text-xs font-mono-tech text-[#45F3FF] tracking-wider uppercase">
            ARCHITECTURE CANVAS
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-mono-tech text-[#9CAAC1] hover:text-white px-2.5 py-1 rounded-md border border-white/10 bg-[#08111F] transition-all flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
          {expanded ? 'COLLAPSE' : 'EXPAND DIAGRAM'}
        </button>
      </div>

      {/* Diagram Nodes Flow */}
      <div
        className={`relative transition-all duration-300 ${expanded ? 'min-h-[400px]' : 'min-h-[220px]'} flex flex-col justify-between`}
      >
        {/* Top Main Queue Pipeline */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center relative z-10">
          {/* Node 1: Queue */}
          <div className="p-4 rounded-xl border border-[#45F3FF]/30 bg-[#070A11]/90 flex flex-col items-center justify-center text-center shadow-lg shadow-[#45F3FF]/5">
            <span className="text-xs font-bold text-white font-mono-tech">Queue</span>
            <div className="flex items-center gap-1 mt-2">
              <span className="w-4 h-2 rounded bg-[#45F3FF]/40" />
              <span className="w-4 h-2 rounded bg-[#45F3FF]/40" />
              <span className="w-4 h-2 rounded bg-[#45F3FF]/40" />
            </div>
            <span className="text-[10px] text-[#45F3FF] mt-2 font-mono-tech">D1 Batched Ops</span>
          </div>

          {/* Connector 1 */}
          <div className="hidden sm:flex flex-col items-center justify-center relative">
            <span className="text-[10px] text-[#9CAAC1] font-mono-tech mb-1">PULL</span>
            <div className="w-full h-0.5 bg-gradient-to-r from-[#45F3FF] to-[#8B5CFF] relative">
              <span className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-[#8B5CFF] animate-ping" />
            </div>
          </div>

          {/* Node 2: Worker Pool */}
          <div className="p-4 rounded-xl border border-[#8B5CFF]/30 bg-[#070A11]/90 flex flex-col items-center justify-center text-center shadow-lg shadow-[#8B5CFF]/5">
            <span className="text-xs font-bold text-white font-mono-tech">Worker Pool</span>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CFF] animate-pulse" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CFF]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CFF]" />
            </div>
            <span className="text-[10px] text-[#8B5CFF] mt-2 font-mono-tech">Edge Concurrency</span>
          </div>

          {/* Connector 2 */}
          <div className="hidden sm:flex flex-col items-center justify-center relative">
            <span className="text-[10px] text-[#9CAAC1] font-mono-tech mb-1">ACK / EXHAUST</span>
            <div className="w-full h-0.5 bg-gradient-to-r from-[#8B5CFF] to-[#FF3DA4] relative" />
          </div>

          {/* Node 3: Retry & Dead Letter */}
          <div className="p-4 rounded-xl border border-[#FF3DA4]/30 bg-[#070A11]/90 flex flex-col items-center justify-center text-center shadow-lg shadow-[#FF3DA4]/5">
            <span className="text-xs font-bold text-white font-mono-tech">Retry & Dead Letter</span>
            <div className="flex items-center gap-1 mt-2 text-[#FF3DA4]">
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <span className="text-[10px] text-[#FF3DA4] mt-2 font-mono-tech">
              Exponential Backoff
            </span>
          </div>
        </div>

        {/* Bus Layer: Observability */}
        <div className="mt-8 pt-4 border-t border-dashed border-white/15 flex items-center justify-between text-xs text-[#9CAAC1] font-mono-tech">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#B8FF5A]" />
            <span>Telemetry & Audit Trail</span>
          </div>
          <span className="text-[#B8FF5A]">99.99% Execution Semantics</span>
        </div>
      </div>
    </div>
  );
};
