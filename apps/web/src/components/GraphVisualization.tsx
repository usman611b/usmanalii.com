import React, { useState } from 'react';

export interface GraphNode {
  id: string;
  name: string;
  type: 'skill' | 'capability';
  category?: string;
  stage?: string;
}

export interface GraphEdge {
  sourceId: string;
  targetId: string;
  relationshipType: string;
}

export interface GraphVisualizationProps {
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
}

export const GraphVisualization: React.FC<GraphVisualizationProps> = ({ nodes, edges }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'visual' | 'table'>('visual');

  const filteredNodes =
    selectedCategory === 'all' ? nodes : nodes.filter((n) => n.category === selectedCategory);

  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = edges.filter(
    (e) => filteredNodeIds.has(e.sourceId) && filteredNodeIds.has(e.targetId),
  );

  return (
    <div className="space-y-4">
      {/* Accessible Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl glass-panel border border-white/10">
        <div className="flex items-center gap-3">
          <label htmlFor="category-filter" className="text-xs font-semibold text-[#9CAAC1]">
            Filter Category:
          </label>
          <select
            id="category-filter"
            aria-label="Filter skills and capabilities by category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#101A31] text-xs text-white border border-white/10 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#22D3EE]"
          >
            <option value="all">All Categories ({nodes.length})</option>
            <option value="programming_language">Programming Languages</option>
            <option value="security">Security</option>
            <option value="data">Data & Storage</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('visual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'visual'
                ? 'bg-[#22D3EE] text-[#050509]'
                : 'bg-[#101A31] text-[#9CAAC1] hover:text-white'
            }`}
          >
            Visual Graph
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'table'
                ? 'bg-[#22D3EE] text-[#050509]'
                : 'bg-[#101A31] text-[#9CAAC1] hover:text-white'
            }`}
          >
            Accessible Table View
          </button>
        </div>
      </div>

      {/* ARIA Screen Reader Summary */}
      <div className="sr-only" aria-live="polite">
        Showing graph with {filteredNodes.length} nodes and {filteredEdges.length} relationship
        edges.
      </div>

      {viewMode === 'visual' ? (
        <div className="p-6 rounded-2xl glass-panel border border-white/10 relative min-h-[360px] overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredNodes.map((node) => (
              <button
                type="button"
                key={node.id}
                aria-label={`Node: ${node.name}, Type: ${node.type}`}
                className="p-4 rounded-xl bg-[#101A31] border border-white/10 hover:border-[#22D3EE] focus:outline-none focus:ring-2 focus:ring-[#22D3EE] transition-all motion-reduce:transition-none text-left w-full"
              >
                <div className="flex items-center justify-between text-[10px] uppercase font-mono text-[#22D3EE]">
                  <span>{node.type}</span>
                  {node.stage && <span className="text-amber-400">Stage: {node.stage}</span>}
                </div>
                <h3 className="text-sm font-bold text-[#FFFFFF] mt-1">{node.name}</h3>
                {node.category && (
                  <p className="text-xs text-[#9CAAC1] mt-1 capitalize">
                    {node.category.replace('_', ' ')}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Accessible Table View for Screen Readers & Keyboard Navigation */
        <div className="overflow-x-auto rounded-xl glass-panel border border-white/10">
          <table className="w-full text-left text-xs text-white">
            <thead className="bg-[#101A31] text-[#9CAAC1] uppercase text-[10px]">
              <tr>
                <th scope="col" className="p-3">
                  Node Name
                </th>
                <th scope="col" className="p-3">
                  Type
                </th>
                <th scope="col" className="p-3">
                  Category / Stage
                </th>
                <th scope="col" className="p-3">
                  Incoming / Outgoing Edges
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredNodes.map((node) => {
                const nodeEdges = filteredEdges.filter(
                  (e) => e.sourceId === node.id || e.targetId === node.id,
                );
                return (
                  <tr key={node.id} className="hover:bg-white/5">
                    <td className="p-3 font-semibold text-white">{node.name}</td>
                    <td className="p-3 font-mono text-[#22D3EE] capitalize">{node.type}</td>
                    <td className="p-3 text-[#9CAAC1] capitalize">
                      {node.category || node.stage || 'N/A'}
                    </td>
                    <td className="p-3 font-mono text-xs text-[#9CAAC1]">
                      {nodeEdges.length > 0
                        ? `${nodeEdges.length} connected edge(s)`
                        : 'Isolated node'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
