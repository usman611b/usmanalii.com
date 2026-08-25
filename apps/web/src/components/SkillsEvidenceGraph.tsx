import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { fetchWithRetry } from '../lib/publicApi';
import { createCareerGraphLayout } from './career-graph/layout';
import {
  CAREER_NODE_STYLE,
  type CareerGraphNode,
  type CareerGraphProjection,
  type CareerNodeType,
} from './career-graph/types';

const CareerGraph3DScene = lazy(() => import('./career-graph/CareerGraph3DScene'));

type Focus = { type: CareerNodeType | 'universe'; id: string | null; label: string };
type RenderMode = '3d' | 'table';

const EMPTY: CareerGraphProjection = {
  nodes: [],
  edges: [],
  focus: { type: 'universe', id: null },
  truncated: false,
};

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function prefersDataSaving() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(connection?.saveData);
}

function GraphFallback({
  nodes,
  selectedId,
}: {
  nodes: CareerGraphNode[];
  selectedId: string | null;
}) {
  return (
    <div className="career-graph-fallback" role="img" aria-label="Static career graph overview">
      <div className="career-graph-fallback-core" />
      {nodes.slice(0, 18).map((node, index) => {
        const style = CAREER_NODE_STYLE[node.type];
        const angle = (index / Math.min(nodes.length, 18)) * Math.PI * 2;
        return (
          <span
            key={node.id}
            className={node.id === selectedId ? 'is-selected' : ''}
            style={
              {
                '--node-color': style.color,
                '--node-x': `${50 + Math.cos(angle) * (25 + (index % 3) * 6)}%`,
                '--node-y': `${50 + Math.sin(angle) * (24 + (index % 2) * 8)}%`,
              } as React.CSSProperties
            }
          >
            {node.label}
          </span>
        );
      })}
    </div>
  );
}

export function SkillsEvidenceGraph({
  endpointUrl = '/api/v1/public/graph/visualization',
  privateView = false,
}: {
  endpointUrl?: string;
  privateView?: boolean;
}) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [projection, setProjection] = useState<CareerGraphProjection>(EMPTY);
  const [history, setHistory] = useState<Focus[]>([
    { type: 'universe', id: null, label: 'Career Universe' },
  ]);
  const [depth, setDepth] = useState(3);
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<RenderMode>('3d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [webgl, setWebgl] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [dataSaving, setDataSaving] = useState(false);
  const [allow3d, setAllow3d] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const focus = history.at(-1)!;

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => {
      setReducedMotion(motion.matches);
      if (motion.matches) setAllow3d(false);
    };
    updateMotion();
    setWebgl(supportsWebGL());
    const saving = prefersDataSaving();
    setDataSaving(saving);
    setAllow3d(!saving && !motion.matches);
    motion.addEventListener('change', updateMotion);
    return () => motion.removeEventListener('change', updateMotion);
  }, []);

  useEffect(() => {
    if (!rootRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      {
        rootMargin: '120px',
      },
    );
    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateVisibility = () => setPageVisible(document.visibilityState === 'visible');
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ focusType: focus.type, depth: String(depth) });
    if (focus.id) query.set('focusId', focus.id);
    setLoading(true);
    setError('');
    fetchWithRetry(`${endpointUrl}?${query}`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as {
          data?: CareerGraphProjection;
          message?: string;
        };
        if (!response.ok || !body.data)
          throw new Error(body.message || `Graph unavailable (${response.status}).`);
        setProjection(body.data);
        setSelected(
          body.data.focus.id ?? body.data.nodes.find(({ type }) => type === 'identity')?.id ?? null,
        );
      })
      .catch((cause: Error) => {
        if (!controller.signal.aborted) setError(cause.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [depth, endpointUrl, focus.id, focus.type]);

  const selectedNode = projection.nodes.find(({ id }) => id === selected) ?? null;
  const connectedIds = useMemo(() => {
    if (!selected) return new Set<string>();
    const ids = new Set([selected]);
    for (const edge of projection.edges) {
      if (edge.sourceId === selected) ids.add(edge.targetId);
      if (edge.targetId === selected) ids.add(edge.sourceId);
    }
    return ids;
  }, [projection.edges, selected]);
  const positions = useMemo(
    () => createCareerGraphLayout(projection.nodes, projection.edges, projection.focus.id),
    [projection.edges, projection.focus.id, projection.nodes],
  );
  const types = [...new Set(projection.nodes.map(({ type }) => type))];
  const render3d = mode === '3d' && allow3d && webgl;

  function focusNode(node: CareerGraphNode) {
    setHistory((current) => [...current, { type: node.type, id: node.id, label: node.label }]);
  }

  function resetUniverse() {
    setHistory([{ type: 'universe', id: null, label: 'Career Universe' }]);
  }

  return (
    <section
      ref={rootRef}
      className="career-graph-shell"
      aria-label={privateView ? 'Private career knowledge graph' : 'Public career knowledge graph'}
    >
      <header className="career-graph-toolbar">
        <div>
          <p className="section-eyebrow">Living professional system</p>
          <h2>Career Knowledge Universe</h2>
          <p>Drag to orbit. Scroll to zoom. Select a node, then open its verified connections.</p>
        </div>
        <div className="career-graph-controls">
          <button type="button" onClick={resetUniverse} disabled={history.length === 1}>
            Universe
          </button>
          <button
            type="button"
            onClick={() =>
              setHistory((current) => (current.length > 1 ? current.slice(0, -1) : current))
            }
            disabled={history.length === 1}
          >
            Back
          </button>
          <label>
            Detail
            <input
              type="range"
              min="1"
              max="5"
              value={depth}
              onChange={(event) => setDepth(Number(event.target.value))}
            />
          </label>
          <button
            type="button"
            aria-pressed={mode === 'table'}
            onClick={() => setMode(mode === 'table' ? '3d' : 'table')}
          >
            {mode === 'table' ? '3D universe' : 'Table'}
          </button>
        </div>
      </header>

      <nav className="career-graph-breadcrumbs" aria-label="Graph location">
        {history.map((item, index) => (
          <button
            type="button"
            key={`${item.id ?? 'universe'}-${index}`}
            onClick={() => setHistory((current) => current.slice(0, index + 1))}
            aria-current={index === history.length - 1 ? 'page' : undefined}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="career-graph-legend" role="list" aria-label="Node types">
        {types.map((type) => (
          <span
            role="listitem"
            key={type}
            style={{ '--node-color': CAREER_NODE_STYLE[type].color } as React.CSSProperties}
          >
            {CAREER_NODE_STYLE[type].label}
          </span>
        ))}
      </div>

      <div className="career-graph-stage">
        {loading && <div className="career-graph-state">Mapping verified relationships...</div>}
        {!loading && error && <div className="career-graph-state career-graph-error">{error}</div>}
        {!loading && !error && projection.nodes.length === 0 && (
          <div className="career-graph-state">
            {privateView
              ? 'Create a career role and assign projects to begin your universe.'
              : 'No public career graph has been published yet.'}
          </div>
        )}

        {!loading && !error && projection.nodes.length > 0 && mode === '3d' && (
          <>
            {render3d ? (
              <Suspense fallback={<div className="career-graph-state">Opening 3D universe...</div>}>
                <CareerGraph3DScene
                  nodes={projection.nodes}
                  edges={projection.edges}
                  focusId={projection.focus.id}
                  selectedId={selected}
                  active={visible && pageVisible}
                  reducedMotion={reducedMotion}
                  onSelect={(id) => setSelected(id || null)}
                  onFocus={focusNode}
                />
              </Suspense>
            ) : (
              <GraphFallback nodes={projection.nodes} selectedId={selected} />
            )}
            {dataSaving && !reducedMotion && !allow3d && webgl && (
              <button
                type="button"
                className="career-graph-enable-3d"
                onClick={() => setAllow3d(true)}
              >
                Enable interactive 3D
              </button>
            )}
          </>
        )}

        {!loading && !error && projection.nodes.length > 0 && mode === 'table' && (
          <div className="career-graph-table-wrap">
            <table>
              <caption className="sr-only">Current career graph nodes</caption>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Record</th>
                  <th>State</th>
                  <th>Explore</th>
                </tr>
              </thead>
              <tbody>
                {projection.nodes.map((node) => (
                  <tr key={node.id}>
                    <td>{CAREER_NODE_STYLE[node.type].label}</td>
                    <td>{node.label}</td>
                    <td>{node.state || 'Active'}</td>
                    <td>
                      <button type="button" onClick={() => focusNode(node)}>
                        Focus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedNode && mode === '3d' && (
          <aside className="career-graph-inspector" aria-live="polite">
            <span style={{ color: CAREER_NODE_STYLE[selectedNode.type].color }}>
              {CAREER_NODE_STYLE[selectedNode.type].label}
            </span>
            <strong>{selectedNode.label}</strong>
            {selectedNode.subtitle && <p>{selectedNode.subtitle}</p>}
            <small>{connectedIds.size - 1} connected records</small>
            <div>
              <button type="button" onClick={() => focusNode(selectedNode)}>
                Zoom into node
              </button>
              {selectedNode.href && <a href={selectedNode.href}>Open record</a>}
            </div>
          </aside>
        )}

        {!loading && !error && projection.nodes.length > 0 && mode === '3d' && (
          <div className="career-graph-minimap" aria-hidden="true">
            {projection.nodes.slice(0, 42).map((node) => {
              const position = positions.get(node.id) ?? [0, 0, 0];
              return (
                <i
                  key={node.id}
                  className={node.id === selected ? 'is-selected' : ''}
                  style={
                    {
                      '--node-color': CAREER_NODE_STYLE[node.type].color,
                      '--map-x': `${50 + Math.max(-42, Math.min(42, position[0] * 2.1))}%`,
                      '--map-y': `${50 + Math.max(-42, Math.min(42, position[1] * 2.1))}%`,
                    } as React.CSSProperties
                  }
                />
              );
            })}
          </div>
        )}
      </div>
      {projection.truncated && (
        <p className="career-graph-truncated">
          More records exist. Focus a cluster to load its bounded detail view.
        </p>
      )}
    </section>
  );
}
