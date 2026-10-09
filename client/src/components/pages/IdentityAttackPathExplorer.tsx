import { useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  AlertTriangle,
  AppWindow,
  ArrowDownRight,
  Check,
  CircleHelp,
  Computer,
  KeyRound,
  Network,
  RotateCcw,
  Shield,
  ShieldAlert,
  UserRound,
  Users,
  Wrench,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import {
  findIdentityAttackPaths,
  getNodeRelationships,
  getReachablePrivilegedAssets,
  validateIdentityEnvironment
} from '../../features/identityAttackPath/analysis';
import {
  acmeDemoEnvironment,
  type IdentityEnvironment,
  type IdentityNode,
  type IdentityNodeType,
  type IdentityRelationship,
  type RelationshipType
} from '../../features/identityAttackPath/demoData';

const typeLabels: Record<IdentityNodeType, string> = {
  user: 'Standard user',
  privilegedUser: 'Privileged user',
  group: 'Group',
  computer: 'Computer',
  application: 'Application',
  resource: 'Resource'
};

const typeStyles: Record<IdentityNodeType, { fill: string; stroke: string; text: string }> = {
  user: { fill: '#082f49', stroke: '#0e7490', text: '#a5f3fc' },
  privilegedUser: { fill: '#4c0519', stroke: '#e11d48', text: '#fecdd3' },
  group: { fill: '#312e81', stroke: '#6366f1', text: '#c7d2fe' },
  computer: { fill: '#172554', stroke: '#3b82f6', text: '#bfdbfe' },
  application: { fill: '#3b0764', stroke: '#a855f7', text: '#e9d5ff' },
  resource: { fill: '#422006', stroke: '#d97706', text: '#fde68a' }
};

const relationshipLabels: Record<RelationshipType, string> = {
  memberOf: 'Member of',
  canModify: 'Can modify',
  canAccess: 'Can access',
  administers: 'Has administrative permission over'
};

const graphWidth = 1110;
const graphHeight = 1300;
const nodeWidth = 176;
const nodeHeight = 58;

function relationshipColor(type: RelationshipType): string {
  if (type === 'memberOf') return '#64748b';
  if (type === 'canModify') return '#fb923c';
  if (type === 'administers') return '#fb7185';
  return '#38bdf8';
}

function relationshipPath(source: IdentityNode, target: IdentityNode): string {
  const x1 = source.x + nodeWidth / 2;
  const y1 = source.y + nodeHeight / 2;
  const x2 = target.x - nodeWidth / 2;
  const y2 = target.y + nodeHeight / 2;
  const control = Math.max(36, Math.abs(x2 - x1) * 0.45);
  return `M ${x1} ${y1} C ${x1 + control} ${y1}, ${x2 - control} ${y2}, ${x2} ${y2}`;
}

export function IdentityAttackPathExplorer() {
  const [environment, setEnvironment] = useState<IdentityEnvironment | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);
  const [showRiskyPaths, setShowRiskyPaths] = useState(true);
  const [zoom, setZoom] = useState(0.78);
  const [pan, setPan] = useState({ x: 16, y: 8 });
  const [remediationResult, setRemediationResult] = useState<{
    pathCountBefore: number;
    pathCountAfter: number;
    targetId: string;
    targetStillReachable: boolean;
    relationship: IdentityRelationship;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragState = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  const validationErrors = useMemo(
    () => environment ? validateIdentityEnvironment(environment) : [],
    [environment]
  );
  const paths = useMemo(
    () => environment ? findIdentityAttackPaths(environment) : [],
    [environment]
  );
  const selectedUser = environment?.nodes.find((node) => node.id === selectedUserId);
  const selectedUserPaths = paths.filter((path) => path.sourceUser.id === selectedUserId);
  const reachableAssets = environment && selectedUser
    ? getReachablePrivilegedAssets(environment, selectedUser.id)
    : [];
  const selectedPath = paths.find((path) => path.id === selectedPathId);
  const selectedNode = environment?.nodes.find((node) => node.id === selectedNodeId);
  const selectedRelationship = environment?.relationships.find((edge) => edge.id === selectedRelationshipId);
  const relatedRelationships = selectedNode && environment
    ? getNodeRelationships(environment, selectedNode.id)
    : [];
  const reachableAssetIds = new Set(reachableAssets.map((asset) => asset.id));
  const visiblePathIds = showRiskyPaths
    ? new Set(selectedUserId ? selectedUserPaths.map((path) => path.id) : paths.map((path) => path.id))
    : new Set<string>();
  const highlightedNodes = new Set<string>();
  const highlightedRelationships = new Set<string>();

  for (const path of paths) {
    if (!visiblePathIds.has(path.id)) continue;
    path.nodeIds.forEach((id) => highlightedNodes.add(id));
    path.relationshipIds.forEach((id) => highlightedRelationships.add(id));
  }
  if (selectedPath) {
    selectedPath.nodeIds.forEach((id) => highlightedNodes.add(id));
    selectedPath.relationshipIds.forEach((id) => highlightedRelationships.add(id));
  }

  const resetDemo = () => {
    const freshEnvironment = structuredClone(acmeDemoEnvironment);
    setEnvironment(freshEnvironment);
    setSelectedNodeId(null);
    setSelectedUserId('');
    setSelectedPathId(null);
    setSelectedRelationshipId(null);
    setRemediationResult(null);
    setError(null);
    setZoom(0.78);
    setPan({ x: 16, y: 8 });
  };

  const simulateFix = () => {
    if (!environment || !selectedRelationship) {
      setError('Select a relationship from a simulated risky path before applying a fix.');
      return;
    }

    const pathCountBefore = paths.length;
    const targetId = selectedPath?.target.id ??
      paths.find((path) => path.relationshipIds.includes(selectedRelationship.id))?.target.id;
    if (!targetId) {
      setError('The selected relationship is not part of an active simulated risky path.');
      return;
    }

    const sourceUserId = selectedPath?.sourceUser.id ??
      paths.find((path) => path.relationshipIds.includes(selectedRelationship.id))?.sourceUser.id;
    if (!sourceUserId) {
      setError('Could not determine the starting identity for this path.');
      return;
    }

    const updatedEnvironment = {
      ...environment,
      relationships: environment.relationships.map((relationship) =>
        relationship.id === selectedRelationship.id
          ? { ...relationship, enabled: false }
          : relationship
      )
    };
    const remainingPaths = findIdentityAttackPaths(updatedEnvironment);
    const targetStillReachable = remainingPaths.some(
      (path) => path.sourceUser.id === sourceUserId && path.target.id === targetId
    );

    setEnvironment(updatedEnvironment);
    setRemediationResult({
      pathCountBefore,
      pathCountAfter: remainingPaths.length,
      targetId,
      targetStillReachable,
      relationship: selectedRelationship
    });
    setSelectedPathId(null);
    setError(null);
  };

  const onGraphPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.target !== event.currentTarget || !svgRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  };

  const onGraphPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragState.current;
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!drag || drag.pointerId !== event.pointerId || !bounds) return;
    setPan((current) => ({
      x: current.x + (event.clientX - drag.x) * (graphWidth / bounds.width) / zoom,
      y: current.y + (event.clientY - drag.y) * (graphHeight / bounds.height) / zoom
    }));
    dragState.current = { ...drag, x: event.clientX, y: event.clientY };
  };

  const handlePathSelect = (pathId: string) => {
    const path = paths.find((item) => item.id === pathId);
    setSelectedPathId(pathId);
    setSelectedNodeId(null);
    setSelectedRelationshipId(path?.relationships.find((edge) => edge.type === 'canModify')?.id ??
      path?.relationshipIds[0] ?? null);
  };

  const nodeCounts = environment ? {
    user: environment.nodes.filter((node) => node.type === 'user' || node.type === 'privilegedUser').length,
    group: environment.nodes.filter((node) => node.type === 'group').length,
    computer: environment.nodes.filter((node) => node.type === 'computer').length,
    application: environment.nodes.filter((node) => node.type === 'application').length
  } : { user: 0, group: 0, computer: 0, application: 0 };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#1F2937] bg-[#111827] p-5 shadow-xl sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-800 bg-violet-950 text-violet-300">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-white">Identity Attack Path Explorer</h1>
                <span className="rounded-full border border-amber-700/70 bg-amber-950/50 px-2.5 py-1 font-mono text-[10px] font-bold tracking-wide text-amber-300">
                  SIMULATED DEMO
                </span>
              </div>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-gray-400">
                Explore fictional identity relationships in Acme Corporation. Directed paths illustrate
                potential impact in this demo dataset only; no live directory, account, or company network is queried.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={resetDemo}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-700 bg-violet-950 px-4 py-2.5 font-mono text-xs font-bold text-violet-200 transition hover:bg-violet-900"
            >
              <Network className="h-4 w-4" />
              Load Demo Environment
            </button>
            <button
              type="button"
              disabled={!environment}
              onClick={resetDemo}
              className="inline-flex items-center gap-2 rounded-xl border border-[#374151] bg-[#0B0F19] px-4 py-2.5 font-mono text-xs font-semibold text-gray-300 transition hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Demo
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!environment ? (
        <section className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-[#374151] bg-[#111827] p-8 text-center">
          <Network className="mb-4 h-12 w-12 text-violet-400" />
          <h2 className="text-lg font-bold text-white">Load the Acme demo graph</h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-gray-400">
            The fictional dataset contains 12 users, 5 groups, 4 computers, 3 applications,
            and 2 resources with explicitly modeled permissions.
          </p>
          <button
            type="button"
            onClick={resetDemo}
            className="mt-5 rounded-xl bg-violet-700 px-5 py-3 font-mono text-xs font-bold text-white transition hover:bg-violet-600"
          >
            Load Demo Environment
          </button>
        </section>
      ) : validationErrors.length > 0 ? (
        <section role="alert" className="rounded-2xl border border-red-800 bg-red-950/50 p-5 text-sm text-red-200">
          <h2 className="font-bold">Demo graph validation failed</h2>
          <ul className="mt-2 list-inside list-disc">
            {validationErrors.map((message) => <li key={message}>{message}</li>)}
          </ul>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              { label: 'Users', value: nodeCounts.user, icon: UserRound, color: 'cyan' },
              { label: 'Groups', value: nodeCounts.group, icon: Users, color: 'indigo' },
              { label: 'Computers', value: nodeCounts.computer, icon: Computer, color: 'blue' },
              { label: 'Applications', value: nodeCounts.application, icon: AppWindow, color: 'violet' },
              { label: 'Risky paths', value: paths.length, icon: ShieldAlert, color: 'rose' }
            ].map((metric) => {
              const Icon = metric.icon;
              const styles: Record<string, string> = {
                cyan: 'text-cyan-300 border-cyan-900/70',
                indigo: 'text-indigo-300 border-indigo-900/70',
                blue: 'text-blue-300 border-blue-900/70',
                violet: 'text-violet-300 border-violet-900/70',
                rose: 'text-rose-300 border-rose-900/70'
              };
              return (
                <div key={metric.label} className={`rounded-xl border bg-[#111827] p-4 ${styles[metric.color]}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-gray-400">{metric.label}</span>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-white">{metric.value}</div>
                </div>
              );
            })}
          </section>

          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.8fr)_minmax(350px,1fr)]">
            <section className="min-w-0 overflow-hidden rounded-2xl border border-[#1F2937] bg-[#111827]">
              <div className="flex flex-col justify-between gap-3 border-b border-[#1F2937] p-4 xl:flex-row xl:items-center">
                <div>
                  <h2 className="font-mono text-sm font-bold uppercase tracking-wide text-white">
                    {environment.organization} · Identity Graph
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Drag empty canvas to pan · Select nodes, paths, or relationships · Zoom with controls or wheel
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#374151] bg-[#0B0F19] px-3 py-2 text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={showRiskyPaths}
                      onChange={(event) => setShowRiskyPaths(event.target.checked)}
                      className="accent-rose-500"
                    />
                    Show Risky Paths
                  </label>
                  <select
                    aria-label="Select a standard user"
                    value={selectedUserId}
                    onChange={(event) => {
                      setSelectedUserId(event.target.value);
                      setSelectedPathId(null);
                    }}
                    className="max-w-48 rounded-lg border border-[#374151] bg-[#0B0F19] px-3 py-2 text-xs text-gray-200 outline-none focus:border-cyan-500"
                  >
                    <option value="">All standard users</option>
                    {environment.nodes.filter((node) => node.type === 'user').map((node) => (
                      <option key={node.id} value={node.id}>{node.label}</option>
                    ))}
                  </select>
                  <div className="flex rounded-lg border border-[#374151] bg-[#0B0F19]">
                    <button type="button" onClick={() => setZoom((value) => Math.max(0.45, value - 0.1))} className="p-2 text-gray-300 hover:text-white" aria-label="Zoom out">
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <span className="min-w-12 self-center text-center font-mono text-[10px] text-gray-400">{Math.round(zoom * 100)}%</span>
                    <button type="button" onClick={() => setZoom((value) => Math.min(1.5, value + 0.1))} className="p-2 text-gray-300 hover:text-white" aria-label="Zoom in">
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="h-[760px] overflow-auto bg-[#080d18] sm:h-[880px]">
                <div className="h-full min-w-[700px] sm:min-w-0">
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${graphWidth} ${graphHeight}`}
                  className="h-full w-full touch-none"
                  role="img"
                  aria-label="Interactive fictional identity relationship graph"
                  onPointerDown={onGraphPointerDown}
                  onPointerMove={onGraphPointerMove}
                  onPointerUp={(event) => {
                    if (dragState.current?.pointerId === event.pointerId) dragState.current = null;
                  }}
                  onPointerCancel={() => { dragState.current = null; }}
                  onWheel={(event) => {
                    event.preventDefault();
                    setZoom((value) => Math.max(0.45, Math.min(1.5, value + (event.deltaY < 0 ? 0.05 : -0.05))));
                  }}
                >
                  <defs>
                    <marker id="identity-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                      <path d="M0,0 L8,4 L0,8 z" fill="context-stroke" />
                    </marker>
                    <filter id="identity-glow" x="-80%" y="-80%" width="260%" height="260%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                    {environment.relationships.filter((edge) => edge.enabled).map((edge) => {
                      const source = environment.nodes.find((node) => node.id === edge.source);
                      const target = environment.nodes.find((node) => node.id === edge.target);
                      if (!source || !target) return null;
                      const highlighted = highlightedRelationships.has(edge.id);
                      const selected = selectedRelationshipId === edge.id;
                      return (
                        <g key={edge.id} className="cursor-pointer" onClick={() => {
                          setSelectedRelationshipId(edge.id);
                          setSelectedNodeId(null);
                          setSelectedPathId(paths.find((path) => path.relationshipIds.includes(edge.id))?.id ?? null);
                        }}>
                          <path d={relationshipPath(source, target)} fill="none" stroke="transparent" strokeWidth="18" />
                          <path
                            d={relationshipPath(source, target)}
                            fill="none"
                            stroke={relationshipColor(edge.type)}
                            strokeWidth={selected ? 4 : highlighted ? 3 : 1.6}
                            strokeDasharray={edge.type === 'memberOf' ? '5 5' : undefined}
                            strokeOpacity={showRiskyPaths && !highlighted ? 0.13 : edge.type === 'memberOf' ? 0.72 : 0.9}
                            markerEnd="url(#identity-arrow)"
                            filter={highlighted ? 'url(#identity-glow)' : undefined}
                          />
                          {highlighted && (
                            <text
                              x={(source.x + target.x) / 2}
                              y={(source.y + target.y) / 2 - 7}
                              fill={relationshipColor(edge.type)}
                              fontSize="10"
                              textAnchor="middle"
                              className="pointer-events-none"
                            >
                              {relationshipLabels[edge.type]}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {environment.nodes.map((node) => {
                      const style = typeStyles[node.type];
                      const isOnPath = highlightedNodes.has(node.id);
                      const isDimmed = showRiskyPaths && highlightedNodes.size > 0 && !isOnPath;
                      const isSelected = selectedNodeId === node.id;
                      return (
                        <g
                          key={node.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`${typeLabels[node.type]} ${node.label}${node.privileged ? ', privileged' : ''}`}
                          className="cursor-pointer outline-none"
                          onClick={() => {
                            setSelectedNodeId(node.id);
                            setSelectedRelationshipId(null);
                            setSelectedPathId(null);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setSelectedNodeId(node.id);
                              setSelectedRelationshipId(null);
                              setSelectedPathId(null);
                            }
                          }}
                        >
                          <rect
                            x={node.x - nodeWidth / 2}
                            y={node.y - nodeHeight / 2}
                            width={nodeWidth}
                            height={nodeHeight}
                            rx="13"
                            fill={style.fill}
                            stroke={isSelected ? '#ffffff' : isOnPath ? '#fb7185' : style.stroke}
                            strokeWidth={isSelected ? 3 : isOnPath ? 2.5 : 1.5}
                            opacity={isDimmed ? 0.22 : 1}
                            filter={isOnPath || isSelected ? 'url(#identity-glow)' : undefined}
                          />
                          <text x={node.x} y={node.y - 3} textAnchor="middle" fill={style.text} fontSize="15" fontWeight="700" opacity={isDimmed ? 0.3 : 1}>
                            {node.label.length > 22 ? `${node.label.slice(0, 20)}…` : node.label}
                          </text>
                          <text x={node.x} y={node.y + 15} textAnchor="middle" fill="#94a3b8" fontSize="12" opacity={isDimmed ? 0.3 : 1}>
                            {typeLabels[node.type]}{node.privileged ? ' · PRIVILEGED' : ''}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </svg>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-[#1F2937] p-3">
                {(Object.keys(typeLabels) as IdentityNodeType[]).map((type) => (
                  <span key={type} className="inline-flex items-center gap-1.5 text-[10px] text-gray-400">
                    <span className="h-2.5 w-2.5 rounded-full border" style={{ background: typeStyles[type].fill, borderColor: typeStyles[type].stroke }} />
                    {typeLabels[type]}
                  </span>
                ))}
                <span className="ml-auto flex flex-wrap gap-3">
                  {(Object.keys(relationshipLabels) as RelationshipType[]).map((type) => (
                    <span key={type} className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                      <span className="h-0.5 w-4" style={{ background: relationshipColor(type) }} />
                      {relationshipLabels[type]}
                    </span>
                  ))}
                </span>
              </div>
            </section>

            <div className="space-y-5">
              <section className="rounded-2xl border border-[#1F2937] bg-[#111827] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-mono text-sm font-bold uppercase text-white">
                    <ShieldAlert className="h-4 w-4 text-rose-400" />
                    Potential Risky Paths
                  </h2>
                  <span className="rounded-full border border-rose-900 bg-rose-950/40 px-2 py-0.5 font-mono text-[10px] text-rose-300">
                    {selectedUser ? `${selectedUserPaths.length} for ${selectedUser.label}` : `${paths.length} simulated`}
                  </span>
                </div>
                {selectedUserPaths.length === 0 && selectedUser ? (
                  <p className="rounded-xl border border-emerald-900/70 bg-emerald-950/20 p-3 text-xs text-emerald-300">
                    No directed path from this standard user to a privileged asset is present in the current demo graph.
                  </p>
                ) : (
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {(selectedUser ? selectedUserPaths : paths).map((path, index) => (
                      <button
                        type="button"
                        key={path.id}
                        onClick={() => handlePathSelect(path.id)}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          selectedPathId === path.id
                            ? 'border-rose-500/80 bg-rose-950/30'
                            : 'border-[#293548] bg-[#0B0F19] hover:border-rose-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] font-bold uppercase text-rose-300">SIMULATED PATH {index + 1}</span>
                          <span className="text-[10px] text-gray-500">{path.relationships.length} relationships</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs text-gray-200">
                          <span>{path.sourceUser.label}</span>
                          {path.nodeIds.slice(1).map((nodeId) => {
                            const node = environment.nodes.find((item) => item.id === nodeId);
                            return node ? (
                              <span key={nodeId} className="inline-flex items-center gap-1">
                                <ArrowDownRight className="h-3 w-3 text-gray-600" />
                                <span className={node.privileged ? 'text-rose-300' : ''}>{node.label}</span>
                              </span>
                            ) : null;
                          })}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedPath && (
                  <div className="mt-3 space-y-2 rounded-xl border border-rose-900/60 bg-rose-950/15 p-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase text-gray-400">Relationship-by-relationship explanation</span>
                      <ol className="mt-1 list-inside list-decimal space-y-1 text-xs leading-relaxed text-gray-300">
                        {selectedPath.relationships.map((relationship) => (
                          <li key={relationship.id}>{relationship.explanation}</li>
                        ))}
                      </ol>
                    </div>
                    <p className="text-xs leading-relaxed text-rose-200">{selectedPath.whyRisky}</p>
                    <p className="text-xs leading-relaxed text-gray-300"><strong className="text-emerald-300">Recommendation:</strong> {selectedPath.remediation}</p>
                    <p className="text-[10px] leading-relaxed text-amber-300">
                      The relationships shown are facts of this fictional demo dataset. The potential security impact is illustrative, not a live or verified finding.
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-[#1F2937] bg-[#111827] p-4">
                <h2 className="mb-3 flex items-center gap-2 font-mono text-sm font-bold uppercase text-white">
                  <CircleHelp className="h-4 w-4 text-cyan-400" />
                  Selected Node Details
                </h2>
                {selectedNode ? (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">{selectedNode.label}</span>
                        {selectedNode.privileged && <span className="rounded border border-rose-800 px-1.5 py-0.5 text-[9px] font-mono text-rose-300">PRIVILEGED</span>}
                      </div>
                      <p className="mt-1 text-xs text-gray-400">{selectedNode.description}</p>
                    </div>
                    <dl className="grid grid-cols-2 gap-2">
                      {Object.entries(selectedNode.properties).map(([key, value]) => (
                        <div key={key} className="rounded-lg bg-[#0B0F19] p-2">
                          <dt className="text-[9px] font-mono uppercase text-gray-500">{key}</dt>
                          <dd className="mt-0.5 break-words text-xs text-gray-200">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase text-gray-500">Connected relationships</span>
                      {relatedRelationships.map((relationship) => (
                        <button
                          type="button"
                          key={relationship.id}
                          disabled={!relationship.enabled}
                          onClick={() => {
                            setSelectedRelationshipId(relationship.id);
                            setSelectedPathId(paths.find((path) => path.relationshipIds.includes(relationship.id))?.id ?? null);
                          }}
                          className={`block w-full rounded-lg border p-2 text-left text-[11px] ${
                            relationship.enabled
                              ? selectedRelationshipId === relationship.id
                                ? 'border-cyan-600 bg-cyan-950/30 text-cyan-100'
                                : 'border-[#293548] bg-[#0B0F19] text-gray-300 hover:border-cyan-900'
                              : 'border-[#1F2937] bg-[#0B0F19] text-gray-600 line-through'
                          }`}
                        >
                          {relationshipLabels[relationship.type]} · {environment.nodes.find((node) => node.id === relationship.source)?.label}
                          {' → '}{environment.nodes.find((node) => node.id === relationship.target)?.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="rounded-xl bg-[#0B0F19] p-4 text-xs leading-relaxed text-gray-500">
                    Select a graph node to inspect its fictional account or asset properties and all connected relationships.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-amber-900/60 bg-[#111827] p-4">
                <h2 className="mb-2 flex items-center gap-2 font-mono text-sm font-bold uppercase text-white">
                  <Wrench className="h-4 w-4 text-amber-300" />
                  Simulated Remediation
                </h2>
                <p className="mb-3 text-xs leading-relaxed text-gray-400">
                  Select a path, then a relationship to disable it in this in-memory demo only. Nothing is changed on real systems.
                </p>
                {selectedRelationship && (
                  <div className="mb-3 rounded-xl border border-amber-900/50 bg-amber-950/20 p-3">
                    <div className="text-[10px] font-mono font-bold uppercase text-amber-300">Selected relationship</div>
                    <p className="mt-1 text-xs text-gray-200">
                      {environment.nodes.find((node) => node.id === selectedRelationship.source)?.label}
                      {' → '}{relationshipLabels[selectedRelationship.type]} →{' '}
                      {environment.nodes.find((node) => node.id === selectedRelationship.target)?.label}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-gray-400">{selectedRelationship.remediation}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={simulateFix}
                  disabled={!selectedRelationship || !selectedRelationship.enabled}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-700 bg-amber-950/60 px-4 py-2.5 font-mono text-xs font-bold text-amber-200 transition hover:bg-amber-900/60 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <KeyRound className="h-4 w-4" />
                  Simulate Fix
                </button>

                {remediationResult && (
                  <div className="mt-3 space-y-2 rounded-xl border border-emerald-900/70 bg-emerald-950/20 p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-200">
                      <Check className="h-4 w-4" /> SIMULATED BEFORE / AFTER
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-lg bg-[#0B0F19] p-2">
                        <div className="text-[9px] font-mono uppercase text-gray-500">Paths before</div>
                        <div className="text-xl font-bold text-rose-300">{remediationResult.pathCountBefore}</div>
                      </div>
                      <div className="rounded-lg bg-[#0B0F19] p-2">
                        <div className="text-[9px] font-mono uppercase text-gray-500">Paths remaining</div>
                        <div className="text-xl font-bold text-emerald-300">{remediationResult.pathCountAfter}</div>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-300">
                      Disabled relationship: <strong>{environment.nodes.find((node) => node.id === remediationResult.relationship.source)?.label}</strong>
                      {' → '}{relationshipLabels[remediationResult.relationship.type]} →{' '}
                      <strong>{environment.nodes.find((node) => node.id === remediationResult.relationship.target)?.label}</strong>
                    </p>
                    <p className={`text-xs font-semibold ${remediationResult.targetStillReachable ? 'text-amber-300' : 'text-emerald-300'}`}>
                      {remediationResult.targetStillReachable
                        ? `The selected target remains reachable by another path (${environment.nodes.find((node) => node.id === remediationResult.targetId)?.label}).`
                        : `The selected target is no longer reachable from the chosen identity (${environment.nodes.find((node) => node.id === remediationResult.targetId)?.label}).`}
                    </p>
                    <p className="text-[10px] text-gray-500">Reset Demo restores all fictional relationships.</p>
                  </div>
                )}
              </section>

              {selectedUser && (
                <section className="rounded-xl border border-cyan-900/60 bg-cyan-950/15 p-3">
                  <h2 className="flex items-center gap-2 text-xs font-bold text-cyan-200">
                    <Shield className="h-4 w-4" />
                    Reachable privileged resources for {selectedUser.label}
                  </h2>
                  {reachableAssetIds.size ? (
                    <ul className="mt-2 space-y-1 text-xs text-gray-300">
                      {[...reachableAssetIds].map((assetId) => (
                        <li key={assetId}>• {environment.nodes.find((node) => node.id === assetId)?.label}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">No privileged assets are reachable in the current simulated graph.</p>
                  )}
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
