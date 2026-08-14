export type CareerNodeType =
  | 'identity'
  | 'role'
  | 'project'
  | 'skill'
  | 'capability'
  | 'evidence'
  | 'journey'
  | 'artifact'
  | 'adr'
  | 'experiment'
  | 'debugging_lesson'
  | 'deployment';

export type CareerGraphNode = {
  id: string;
  type: CareerNodeType;
  label: string;
  subtitle: string | null;
  visibility: string;
  state: string | null;
  href: string | null;
  clusterId: string | null;
};

export type CareerGraphEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  relationshipType: string;
  relevance: number;
};

export type CareerGraphProjection = {
  nodes: CareerGraphNode[];
  edges: CareerGraphEdge[];
  focus: { type: CareerNodeType | 'universe'; id: string | null };
  truncated: boolean;
};

export type CareerGraphPosition = [number, number, number];

export const CAREER_NODE_STYLE: Record<
  CareerNodeType,
  { color: string; label: string; size: number }
> = {
  identity: { color: '#FFFFFF', label: 'Identity', size: 1.2 },
  role: { color: '#8B5CF6', label: 'Role', size: 0.88 },
  project: { color: '#FF2DAA', label: 'Project', size: 0.67 },
  skill: { color: '#25E6FF', label: 'Skill', size: 0.5 },
  capability: { color: '#A78BFA', label: 'Capability', size: 0.55 },
  evidence: { color: '#B8FF3D', label: 'Evidence', size: 0.43 },
  journey: { color: '#60A5FA', label: 'Journey', size: 0.43 },
  artifact: { color: '#CBD5E1', label: 'Artifact', size: 0.4 },
  adr: { color: '#FBBF24', label: 'ADR', size: 0.42 },
  experiment: { color: '#F472B6', label: 'Experiment', size: 0.42 },
  debugging_lesson: { color: '#FB923C', label: 'Debugging', size: 0.42 },
  deployment: { color: '#34D399', label: 'Deployment', size: 0.42 },
};
