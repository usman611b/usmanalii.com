import { Html, Line, OrbitControls, Sparkles } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import type { Group, Mesh } from 'three';
import { createCareerGraphLayout } from './layout';
import {
  CAREER_NODE_STYLE,
  type CareerGraphEdge,
  type CareerGraphNode,
  type CareerGraphPosition,
} from './types';

type Props = {
  nodes: CareerGraphNode[];
  edges: CareerGraphEdge[];
  focusId: string | null;
  selectedId: string | null;
  active: boolean;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  onFocus: (node: CareerGraphNode) => void;
};

function midpoint(source: CareerGraphPosition, target: CareerGraphPosition): CareerGraphPosition {
  return [
    (source[0] + target[0]) / 2,
    (source[1] + target[1]) / 2 + 0.35,
    (source[2] + target[2]) / 2 + 0.55,
  ];
}

function motionPhase(value: string) {
  return [...value].reduce((total, character) => total + character.charCodeAt(0), 0) * 0.17;
}

function OrbitalField({ reducedMotion }: { reducedMotion: boolean }) {
  const field = useRef<Group>(null);
  useFrame(({ clock }, delta) => {
    if (!field.current || reducedMotion) return;
    field.current.rotation.y += delta * 0.08;
    field.current.rotation.z = Math.sin(clock.elapsedTime * 0.12) * 0.12;
  });

  return (
    <group ref={field} rotation={[0.78, 0.1, 0]}>
      {[5.2, 8.6, 12.5].map((radius, index) => (
        <mesh key={radius} rotation={[index * 0.62, index * 0.45, index * 0.34]}>
          <torusGeometry args={[radius, index === 0 ? 0.018 : 0.012, 8, 160]} />
          <meshBasicMaterial
            color={index === 1 ? '#8B5CF6' : index === 2 ? '#FF2DAA' : '#25E6FF'}
            transparent
            opacity={0.16 - index * 0.025}
          />
        </mesh>
      ))}
    </group>
  );
}

function CareerNode({
  node,
  position,
  selected,
  connected,
  reducedMotion,
  onSelect,
  onFocus,
}: {
  node: CareerGraphNode;
  position: CareerGraphPosition;
  selected: boolean;
  connected: boolean;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  onFocus: (node: CareerGraphNode) => void;
}) {
  const style = CAREER_NODE_STYLE[node.type];
  const nodeGroup = useRef<Group>(null);
  const orbitRing = useRef<Mesh>(null);
  const phase = useMemo(() => motionPhase(node.id), [node.id]);

  useFrame(({ clock }, delta) => {
    if (!nodeGroup.current) return;
    if (reducedMotion) return;
    if (orbitRing.current) orbitRing.current.rotation.z += delta * (selected ? 0.62 : 0.28);
    const time = clock.elapsedTime;
    nodeGroup.current.position.y = position[1] + Math.sin(time * 0.72 + phase) * 0.22;
    nodeGroup.current.position.x = position[0] + Math.cos(time * 0.43 + phase) * 0.1;
    const pulse = selected ? 1.18 + Math.sin(time * 2.2) * 0.08 : 1;
    nodeGroup.current.scale.setScalar(pulse);
  });

  return (
    <group ref={nodeGroup} position={position}>
      <mesh
        scale={selected ? 1.22 : 1}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(node.id);
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onFocus(node);
        }}
      >
        <sphereGeometry args={[style.size, 32, 32]} />
        <meshStandardMaterial
          color={style.color}
          emissive={style.color}
          emissiveIntensity={selected ? 2.2 : connected ? 1.15 : 0.25}
          metalness={0.35}
          roughness={0.2}
          transparent
          opacity={connected ? 1 : 0.35}
        />
      </mesh>
      <mesh ref={orbitRing} rotation={[Math.PI / 2, 0, 0]} scale={selected ? 1.35 : 1}>
        <torusGeometry args={[style.size * 1.45, 0.025, 10, 56]} />
        <meshBasicMaterial color={style.color} transparent opacity={connected ? 0.72 : 0.14} />
      </mesh>
      <pointLight color={style.color} intensity={selected ? 3 : 0.6} distance={4} />
      <Html center position={[0, -style.size - 0.5, 0]} distanceFactor={10} zIndexRange={[30, 0]}>
        <button
          type="button"
          className={`career-graph-node-label${selected ? ' is-selected' : ''}`}
          style={{ '--node-color': style.color } as React.CSSProperties}
          onClick={() => onSelect(node.id)}
          onDoubleClick={() => onFocus(node)}
          aria-label={`${style.label}: ${node.label}. Select to inspect; double click to focus.`}
        >
          <small>{style.label}</small>
          <span>{node.label}</span>
        </button>
      </Html>
    </group>
  );
}

function Universe({ ...props }: Props) {
  const group = useRef<Group>(null);
  const positions = useMemo(
    () => createCareerGraphLayout(props.nodes, props.edges, props.focusId),
    [props.edges, props.focusId, props.nodes],
  );
  const connectedIds = useMemo(() => {
    if (!props.selectedId) return new Set(props.nodes.map(({ id }) => id));
    const result = new Set([props.selectedId]);
    for (const edge of props.edges) {
      if (edge.sourceId === props.selectedId) result.add(edge.targetId);
      if (edge.targetId === props.selectedId) result.add(edge.sourceId);
    }
    return result;
  }, [props.edges, props.nodes, props.selectedId]);

  useFrame(({ clock }) => {
    if (!group.current || props.reducedMotion) return;
    group.current.rotation.y = clock.elapsedTime * 0.035;
    group.current.rotation.x = Math.cos(clock.elapsedTime * 0.18) * 0.06;
    group.current.position.y = Math.sin(clock.elapsedTime * 0.25) * 0.18;
  });

  return (
    <>
      <ambientLight intensity={0.24} />
      <directionalLight position={[5, 8, 10]} intensity={0.8} color="#dbeafe" />
      <pointLight position={[-8, 2, 6]} intensity={5} distance={18} color="#25E6FF" />
      <pointLight position={[9, -2, 2]} intensity={4} distance={18} color="#FF2DAA" />
      <Sparkles count={150} scale={[28, 18, 14]} size={1.35} speed={0.42} color="#67e8f9" />
      <OrbitalField reducedMotion={props.reducedMotion} />
      <group ref={group}>
        {props.edges.map((edge) => {
          const source = positions.get(edge.sourceId);
          const target = positions.get(edge.targetId);
          if (!source || !target) return null;
          const connected =
            !props.selectedId ||
            edge.sourceId === props.selectedId ||
            edge.targetId === props.selectedId;
          return (
            <Line
              key={edge.id}
              points={[source, midpoint(source, target), target]}
              color={connected ? '#38dff2' : '#334155'}
              lineWidth={connected ? Math.min(1.7, 0.55 + edge.relevance * 0.18) : 0.35}
              transparent
              opacity={connected ? 0.56 : 0.1}
            />
          );
        })}
        {props.nodes.map((node) => {
          const position = positions.get(node.id);
          if (!position) return null;
          return (
            <CareerNode
              key={node.id}
              node={node}
              position={position}
              selected={node.id === props.selectedId}
              connected={connectedIds.has(node.id)}
              reducedMotion={props.reducedMotion}
              onSelect={props.onSelect}
              onFocus={props.onFocus}
            />
          );
        })}
      </group>
      <OrbitControls
        makeDefault
        enableDamping={!props.reducedMotion}
        dampingFactor={0.06}
        autoRotate={!props.reducedMotion}
        autoRotateSpeed={0.7}
        enablePan={false}
        minDistance={10}
        maxDistance={31}
        minPolarAngle={Math.PI * 0.22}
        maxPolarAngle={Math.PI * 0.78}
      />
    </>
  );
}

export default function CareerGraph3DScene(props: Props) {
  return (
    <Canvas
      className="career-graph-webgl"
      camera={{ position: [0, 1, 20], fov: 48, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      frameloop={props.active ? 'always' : 'never'}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onPointerMissed={() => props.onSelect('')}
      aria-hidden="true"
    >
      <fog attach="fog" args={['#03050a', 23, 48]} />
      <Universe {...props} />
    </Canvas>
  );
}
