import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Clock3,
  Code2,
  ExternalLink,
  FileSearch,
  Globe2,
  GraduationCap,
  Image,
  Link2,
  Mail,
  MessagesSquare,
  Network,
  RotateCcw,
  Search,
  ShieldCheck,
  Star,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import {
  findResourceContext,
  flattenResources,
  getRelatedResources,
  isSafeHttpsUrl,
  searchResources,
  validateCatalogue
} from '../../features/osintUniverse/analysis';
import { osintCategories, osintRoot, type OsintResource } from '../../features/osintUniverse/catalogue';

const center = { x: 700, y: 600 };
const learningPath = [
  { label: 'Search Basics', categoryId: 'search' },
  { label: 'Domain Intelligence', categoryId: 'domain' },
  { label: 'DNS & IP Research', categoryId: 'network' },
  { label: 'Public Asset Discovery', categoryId: 'network' },
  { label: 'Threat Intelligence', categoryId: 'threat-intel' },
  { label: 'Digital Forensics', categoryId: 'forensics' },
  { label: 'Evidence Evaluation', categoryId: 'learning' },
  { label: 'Reporting & Ethics', categoryId: 'learning' }
];
const categoryIcons = {
  search: Search,
  globe: Globe2,
  network: Network,
  mail: Mail,
  messages: MessagesSquare,
  image: Image,
  shield: ShieldCheck,
  code: Code2,
  'file-search': FileSearch,
  'graduation-cap': GraduationCap
};

interface PositionedResource {
  resource: OsintResource;
  x: number;
  y: number;
  parentId?: string;
}

function categoryPoint(index: number): { x: number; y: number; angle: number } {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / osintCategories.length;
  return { x: center.x + Math.cos(angle) * 305, y: center.y + Math.sin(angle) * 305, angle };
}

function graphNodes(expandedCategoryId: string | null, expandedTopicId: string | null): PositionedResource[] {
  const nodes: PositionedResource[] = [{ resource: osintRoot, ...center }];
  const categoryPositions = new Map<string, { x: number; y: number; angle: number }>();
  osintCategories.forEach((item, index) => {
    const point = categoryPoint(index);
    categoryPositions.set(item.id, point);
    nodes.push({ resource: item, x: point.x, y: point.y, parentId: osintRoot.id });
  });

  const expandedCategory = osintCategories.find((item) => item.id === expandedCategoryId);
  if (!expandedCategory) return nodes;

  const categoryPosition = categoryPositions.get(expandedCategory.id);
  if (!categoryPosition) return nodes;
  const tangent = { x: -Math.sin(categoryPosition.angle), y: Math.cos(categoryPosition.angle) };
  const children = expandedCategory.children ?? [];
  const topicPoints = new Map<string, { x: number; y: number }>();
  children.forEach((item, index) => {
    const spread = (index - (children.length - 1) / 2) * 82;
    const x = categoryPosition.x + Math.cos(categoryPosition.angle) * 120 + tangent.x * spread;
    const y = categoryPosition.y + Math.sin(categoryPosition.angle) * 120 + tangent.y * spread;
    topicPoints.set(item.id, { x, y });
    nodes.push({ resource: item, x, y, parentId: expandedCategory.id });
  });

  const expandedTopic = children.find((item) => item.id === expandedTopicId);
  const topicPosition = expandedTopic ? topicPoints.get(expandedTopic.id) : undefined;
  if (!expandedTopic || !topicPosition) return nodes;
  const tools = expandedTopic.children ?? [];
  tools.forEach((item, index) => {
    const spread = (index - (tools.length - 1) / 2) * 70;
    nodes.push({
      resource: item,
      x: topicPosition.x + Math.cos(categoryPosition.angle) * 145 + tangent.x * spread,
      y: topicPosition.y + Math.sin(categoryPosition.angle) * 145 + tangent.y * spread,
      parentId: expandedTopic.id
    });
  });
  return nodes;
}

function readSavedFavorites(): string[] {
  const raw = window.localStorage.getItem('omnisec-osint-favorites');
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'string')) {
    throw new Error('Saved OSINT favorites are invalid. Remove the saved favorites or reset them to continue.');
  }
  return parsed;
}

function nodeColors(type: OsintResource['nodeType']): { fill: string; stroke: string; text: string } {
  switch (type) {
    case 'root': return { fill: '#082f49', stroke: '#22d3ee', text: '#cffafe' };
    case 'category': return { fill: '#172554', stroke: '#60a5fa', text: '#dbeafe' };
    case 'subcategory': return { fill: '#312e81', stroke: '#a78bfa', text: '#ede9fe' };
    case 'tool': return { fill: '#134e4a', stroke: '#2dd4bf', text: '#ccfbf1' };
    case 'website': return { fill: '#164e63', stroke: '#22d3ee', text: '#cffafe' };
    case 'documentation': return { fill: '#3f3f46', stroke: '#a1a1aa', text: '#f4f4f5' };
    case 'learningResource': return { fill: '#422006', stroke: '#fbbf24', text: '#fef3c7' };
  }
}

function humanType(type: OsintResource['nodeType']): string {
  return type === 'learningResource' ? 'Learning resource' : type[0].toUpperCase() + type.slice(1);
}

export function OsintUniverse({ onBackToDashboard }: { onBackToDashboard?: () => void }) {
  const [initialFavorites] = useState(() => {
    try {
      const knownIds = new Set(flattenResources(osintRoot).map((resource) => resource.id));
      return { ids: readSavedFavorites().filter((id) => knownIds.has(id)), error: null as string | null };
    } catch (cause) {
      return {
        ids: [] as string[],
        error: cause instanceof Error ? cause.message : 'Could not read saved favorites.'
      };
    }
  });
  const [selectedId, setSelectedId] = useState(osintRoot.id);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [favorites, setFavorites] = useState<string[]>(initialFavorites.ids);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([osintRoot.id]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [learnMode, setLearnMode] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(initialFavorites.error);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragState = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  const catalogueErrors = useMemo(() => validateCatalogue(osintRoot), []);
  const allResources = useMemo(() => flattenResources(osintRoot), []);
  const selectedContext = useMemo(
    () => findResourceContext(osintRoot, selectedId),
    [selectedId]
  );
  const selectedResource = selectedContext?.resource ?? osintRoot;
  const relatedResources = useMemo(
    () => getRelatedResources(osintRoot, selectedId),
    [selectedId]
  );
  const matchingResources = useMemo(
    () => searchResources(osintRoot, searchText).slice(0, 9),
    [searchText]
  );
  const visibleNodes = useMemo(
    () => graphNodes(expandedCategoryId, expandedTopicId),
    [expandedCategoryId, expandedTopicId]
  );
  const toggleFavorite = (resourceId: string) => {
    const nextFavorites = favorites.includes(resourceId)
      ? favorites.filter((id) => id !== resourceId)
      : [...favorites, resourceId];
    setFavorites(nextFavorites);
    try {
      window.localStorage.setItem('omnisec-osint-favorites', JSON.stringify(nextFavorites));
    } catch {
      setError('Favorites could not be saved in this browser. Check storage settings and try again.');
    }
  };

  const revealResource = (resourceId: string, addToHistory = true) => {
    const context = findResourceContext(osintRoot, resourceId);
    if (!context) {
      setError(`The selected catalogue entry "${resourceId}" could not be found.`);
      return;
    }
    setSelectedId(resourceId);
    setExpandedCategoryId(context.category?.id ?? null);
    setExpandedTopicId(context.subcategory?.id ?? null);
    setError(null);
    setMobileDetailsOpen(true);
    setRecentIds((current) => [resourceId, ...current.filter((id) => id !== resourceId)].slice(0, 6));
    if (addToHistory) {
      setHistory((current) => [...current.slice(0, historyIndex + 1), resourceId]);
      setHistoryIndex((current) => current + 1);
    }
  };

  const moveHistory = (direction: -1 | 1) => {
    const nextIndex = historyIndex + direction;
    const nextId = history[nextIndex];
    if (!nextId) return;
    setHistoryIndex(nextIndex);
    revealResource(nextId, false);
  };

  const resetView = () => {
    setSelectedId(osintRoot.id);
    setExpandedCategoryId(null);
    setExpandedTopicId(null);
    setSearchText('');
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setHistory([osintRoot.id]);
    setHistoryIndex(0);
    setMobileDetailsOpen(false);
    setError(null);
  };

  const onNodeKeyDown = (event: KeyboardEvent<SVGGElement>, resourceId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      revealResource(resourceId);
    }
  };

  const onGraphPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current || (event.target instanceof SVGElement && event.target.closest('[role="button"]'))) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const onGraphPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragState.current;
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!drag || drag.pointerId !== event.pointerId || !bounds) return;
    setPan((current) => ({
      x: current.x + ((event.clientX - drag.x) / bounds.width) * 1400 / zoom,
      y: current.y + ((event.clientY - drag.y) / bounds.height) * 1200 / zoom
    }));
    dragState.current = { ...drag, x: event.clientX, y: event.clientY };
  };
  const onGraphWheel = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    setZoom((current) => Math.min(1.8, Math.max(0.62, current * (event.deltaY < 0 ? 1.08 : 0.92))));
  };

  const chooseLearningStep = (index: number) => {
    const step = learningPath[index];
    if (step) revealResource(step.categoryId);
  };

  const categoryList = osintCategories.map((item) => (
    <div key={item.id}>
      <button
        type="button"
        onClick={() => revealResource(item.id)}
        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
          expandedCategoryId === item.id
            ? 'bg-cyan-950/70 text-cyan-200'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
        }`}
        aria-expanded={expandedCategoryId === item.id}
      >
        <span className="truncate">{item.name}</span>
        <ChevronDown className={`ml-auto h-3.5 w-3.5 shrink-0 transition-transform ${expandedCategoryId === item.id ? 'rotate-180' : ''}`} />
      </button>
      {expandedCategoryId === item.id && (
        <div className="ml-3 border-l border-slate-800 py-1 pl-2">
          {(item.children ?? []).map((subcategory) => (
            <button type="button" key={subcategory.id} onClick={() => revealResource(subcategory.id)} className="block w-full truncate rounded-md px-2 py-1.5 text-left text-[11px] text-slate-500 hover:bg-slate-800 hover:text-cyan-200">
              {subcategory.name}
            </button>
          ))}
        </div>
      )}
    </div>
  ));

  const detailsPanel = (
    <aside className="flex max-h-[calc(100vh-13rem)] min-h-[400px] flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#101827]">
      <div className="border-b border-slate-800 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">{humanType(selectedResource.nodeType)}</p>
            <h2 className="mt-1 text-base font-semibold leading-snug text-white">{selectedResource.name}</h2>
          </div>
          <button
            type="button"
            aria-label={favorites.includes(selectedId) ? 'Remove from favorites' : 'Add to favorites'}
            onClick={() => toggleFavorite(selectedId)}
            className={`rounded-lg border p-2 transition-colors ${favorites.includes(selectedId) ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-slate-700 text-slate-400 hover:text-amber-300'}`}
          >
            <Star className={`h-4 w-4 ${favorites.includes(selectedId) ? 'fill-current' : ''}`} />
          </button>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">{selectedContext?.category?.name ?? 'OSINT Universe'}</p>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <section>
          <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">What it is</h3>
          <p className="text-xs leading-relaxed text-slate-300">{selectedResource.description}</p>
        </section>
        <section>
          <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Purpose</h3>
          <p className="text-xs leading-relaxed text-slate-300">{selectedResource.purpose}</p>
        </section>
        {learnMode && (
          <section className="rounded-lg border border-violet-500/20 bg-violet-950/20 p-3">
            <h3 className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-violet-300">
              <BookOpen className="h-3.5 w-3.5" /> Learn OSINT
            </h3>
            <p className="text-xs leading-relaxed text-slate-300">
              In simple terms: use this resource as one clue, not a final answer. For a safe exercise, research a fictional training domain or public organization documentation, record the source, and note what remains uncertain.
            </p>
            <p className="mt-2 text-[11px] text-violet-200">Workflow: define scope → use public sources → corroborate → document uncertainty.</p>
            <button
              type="button"
              onClick={() => {
                const currentIndex = learningPath.findIndex((step) => step.categoryId === selectedContext?.category?.id);
                const nextStep = learningPath[Math.min(currentIndex + 1, learningPath.length - 1)];
                if (nextStep) revealResource(nextStep.categoryId);
              }}
              className="mt-2 text-left text-[11px] font-medium text-violet-300 hover:text-violet-100"
            >
              Next learning topic: {learningPath[Math.min(Math.max(0, learningPath.findIndex((step) => step.categoryId === selectedContext?.category?.id) + 1), learningPath.length - 1)].label} →
            </button>
          </section>
        )}
        <section>
          <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Use cases</h3>
          <ul className="space-y-1 text-xs text-slate-300">
            {selectedResource.useCases.map((useCase) => <li key={useCase} className="flex gap-2"><span className="text-cyan-400">•</span>{useCase}</li>)}
          </ul>
        </section>
        {selectedResource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedResource.tags.map((tag) => <span key={tag} className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400">{tag}</span>)}
          </div>
        )}
        <section>
          <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Resource links</h3>
          <div className="space-y-1.5">
            {[
              ['Official website', selectedResource.officialUrl],
              ['GitHub', selectedResource.githubUrl],
              ['Documentation', selectedResource.documentationUrl]
            ].map(([label, url]) => isSafeHttpsUrl(url) ? (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-cyan-200 transition hover:border-cyan-700 hover:bg-slate-800"
              >
                {label}<ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null)}
            {!isSafeHttpsUrl(selectedResource.officialUrl) && !isSafeHttpsUrl(selectedResource.githubUrl) && !isSafeHttpsUrl(selectedResource.documentationUrl) && (
              <p className="text-xs text-slate-500">No external link supplied for this learning concept.</p>
            )}
          </div>
        </section>
        <section className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-900/70 p-2.5">
            <p className="text-[10px] uppercase text-slate-500">Pricing</p>
            <p className="mt-1 text-xs text-slate-300">{selectedResource.pricingType === 'unknown' ? 'Not verified' : selectedResource.pricingType}</p>
          </div>
          <div className="rounded-lg bg-slate-900/70 p-2.5">
            <p className="text-[10px] uppercase text-slate-500">License</p>
            <p className="mt-1 text-xs text-slate-300">{selectedResource.openSourceStatus === 'unknown' ? 'Not verified' : selectedResource.openSourceStatus}</p>
          </div>
        </section>
        <section className={`rounded-lg border p-2.5 ${selectedResource.verificationStatus === 'verified' ? 'border-emerald-900 bg-emerald-950/30' : 'border-amber-900/70 bg-amber-950/20'}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300">
            {selectedResource.verificationStatus === 'verified' ? 'Metadata verified' : 'Seed resource · verification pending'}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{selectedResource.safetyNotes}</p>
        </section>
        {relatedResources.length > 0 && (
          <section>
            <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500"><Link2 className="h-3 w-3" /> Related resources</h3>
            <div className="space-y-1">
              {relatedResources.slice(0, 5).map((resource) => (
                <button type="button" key={resource.id} onClick={() => revealResource(resource.id)} className="block w-full truncate rounded-md px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-800 hover:text-cyan-200">
                  {resource.name}
                </button>
              ))}
            </div>
          </section>
        )}
        {(selectedResource.nodeType === 'category' || selectedResource.nodeType === 'subcategory') && (
          <button type="button" onClick={() => revealResource(selectedResource.id)} className="w-full rounded-lg border border-cyan-800/70 bg-cyan-950/30 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-900/40">
            Expand in graph
          </button>
        )}
      </div>
    </aside>
  );

  const renderGraph = () => {
    const nodeById = new Map(visibleNodes.map((node) => [node.resource.id, node]));
    const edges = visibleNodes.filter((node) => node.parentId);
    return (
      <svg
        ref={svgRef}
        viewBox="0 0 1400 1200"
        role="group"
        aria-label="Interactive OSINT resource knowledge graph"
        className="h-full min-h-[540px] w-full touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={onGraphPointerDown}
        onPointerMove={onGraphPointerMove}
        onPointerUp={() => { dragState.current = null; }}
        onPointerCancel={() => { dragState.current = null; }}
        onWheel={onGraphWheel}
      >
        <defs>
          <radialGradient id="osint-bg" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stopColor="#101b2c" />
            <stop offset="100%" stopColor="#08111e" />
          </radialGradient>
          <filter id="osint-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect x="0" y="0" width="1400" height="1200" fill="url(#osint-bg)" />
        <g opacity="0.12">
          {Array.from({ length: 15 }, (_, index) => <circle key={index} cx={(index * 137 + 29) % 1350} cy={(index * 211 + 67) % 1160} r="1.2" fill="#67e8f9" />)}
        </g>
        <g
          transform={`translate(${pan.x} ${pan.y}) translate(${center.x} ${center.y}) scale(${zoom}) translate(${-center.x} ${-center.y})`}
          style={{ transition: reduceMotion ? 'none' : 'transform 240ms ease-out' }}
        >
          {edges.map((node) => {
            const parent = node.parentId ? nodeById.get(node.parentId) : undefined;
            if (!parent) return null;
            const childColor = nodeColors(node.resource.nodeType).stroke;
            return (
              <path
                key={`edge-${node.resource.id}`}
                d={`M ${parent.x} ${parent.y} Q ${(parent.x + node.x) / 2} ${(parent.y + node.y) / 2 - 10} ${node.x} ${node.y}`}
                fill="none"
                stroke={childColor}
                strokeOpacity="0.42"
                strokeWidth="1.5"
                strokeDasharray={node.resource.nodeType === 'subcategory' ? '0' : '4 4'}
              />
            );
          })}
          {visibleNodes.map(({ resource, x, y }) => {
            const colors = nodeColors(resource.nodeType);
            const selected = resource.id === selectedId;
            const isFavorite = favorites.includes(resource.id);
            const Icon = resource.icon ? categoryIcons[resource.icon as keyof typeof categoryIcons] : null;
            const width = resource.nodeType === 'root' ? 184 : resource.nodeType === 'category' ? 182 : 158;
            const height = resource.nodeType === 'root' ? 76 : 58;
            return (
              <g
                key={resource.id}
                role="button"
                tabIndex={0}
                aria-label={`${resource.name}, ${humanType(resource.nodeType)}. Press Enter to select.`}
                aria-pressed={selected}
                onClick={() => revealResource(resource.id)}
                onKeyDown={(event) => onNodeKeyDown(event, resource.id)}
                className="osint-node-enter cursor-pointer"
                style={{ animation: reduceMotion ? 'none' : 'osint-node-enter 180ms ease-out both' }}
              >
                {selected && <rect x={x - width / 2 - 5} y={y - height / 2 - 5} width={width + 10} height={height + 10} rx="20" fill="none" stroke={colors.stroke} strokeOpacity="0.4" strokeWidth="4" filter="url(#osint-glow)" />}
                <rect
                  x={x - width / 2}
                  y={y - height / 2}
                  width={width}
                  height={height}
                  rx={resource.nodeType === 'root' ? '24' : '16'}
                  fill={colors.fill}
                  stroke={selected ? '#e0f2fe' : colors.stroke}
                  strokeWidth={selected ? '2.5' : '1.3'}
                  className="transition-[stroke,fill] duration-200 hover:brightness-125"
                />
                {Icon && <foreignObject x={x - width / 2 + 11} y={y - 10} width="20" height="20"><Icon className="h-4 w-4 text-cyan-200" /></foreignObject>}
                <text
                  x={x + (Icon ? 10 : 0)}
                  y={y + 4}
                  textAnchor="middle"
                  fill={colors.text}
                  fontSize={resource.nodeType === 'root' ? '13' : '10.5'}
                  fontWeight={resource.nodeType === 'root' ? '700' : '600'}
                  className="pointer-events-none"
                >
                  {resource.name.length > 24 ? `${resource.name.slice(0, 22)}…` : resource.name}
                </text>
                {isFavorite && <text x={x + width / 2 - 13} y={y - height / 2 + 13} fill="#fbbf24" fontSize="12">★</text>}
                <title>{resource.name} — {humanType(resource.nodeType)}</title>
              </g>
            );
          })}
        </g>
      </svg>
    );
  };

  return (
    <div className="space-y-4 text-slate-100">
      <header className="flex flex-col justify-between gap-3 border-b border-slate-800 pb-4 md:flex-row md:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-800/70 bg-cyan-950/50 text-cyan-300"><Network className="h-5 w-5" /></div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">OSINT Universe</h1>
              <span className="rounded-full border border-amber-700/60 bg-amber-950/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-amber-300">Resource directory · not a scanner</span>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">Explore the tools, sources, and techniques behind open-source intelligence.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" aria-label="Back" disabled={historyIndex <= 0} onClick={() => moveHistory(-1)} className="rounded-lg border border-slate-800 p-2 text-slate-400 hover:text-white disabled:opacity-30"><ArrowLeft className="h-4 w-4" /></button>
          <button type="button" aria-label="Forward" disabled={historyIndex >= history.length - 1} onClick={() => moveHistory(1)} className="rounded-lg border border-slate-800 p-2 text-slate-400 hover:text-white disabled:opacity-30"><ArrowRight className="h-4 w-4" /></button>
          <button type="button" onClick={resetView} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 px-2.5 py-2 text-xs text-slate-300 hover:border-slate-600 hover:text-white"><RotateCcw className="h-3.5 w-3.5" /> Reset</button>
          <button type="button" aria-pressed={learnMode} onClick={() => setLearnMode((value) => !value)} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs ${learnMode ? 'border-violet-500/60 bg-violet-950/40 text-violet-200' : 'border-slate-800 text-slate-300 hover:text-white'}`}><GraduationCap className="h-3.5 w-3.5" /> Learn OSINT</button>
          <button type="button" aria-pressed={reduceMotion} onClick={() => setReduceMotion((value) => !value)} className={`rounded-lg border px-2.5 py-2 text-xs ${reduceMotion ? 'border-cyan-700 text-cyan-200' : 'border-slate-800 text-slate-400'}`}>Reduce motion {reduceMotion ? 'On' : 'Off'}</button>
        </div>
      </header>

      {(error || catalogueErrors.length > 0) && (
        <div role="alert" className="rounded-lg border border-red-800 bg-red-950/30 px-3 py-2 text-xs text-red-200">
          {error ?? catalogueErrors.join(' ')}
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="flex max-h-[calc(100vh-13rem)] min-h-[320px] flex-col gap-3 rounded-xl border border-slate-800 bg-[#101827] p-3">
          <label className="relative block">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && matchingResources[0]) revealResource(matchingResources[0].id);
                if (event.key === 'Escape') setSearchText('');
              }}
              placeholder="Search tools, topics…"
              aria-label="Search the OSINT resource catalogue"
              className="w-full rounded-lg border border-slate-700 bg-slate-950/70 py-2 pl-9 pr-3 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-700"
            />
          </label>
          {searchText.trim() && (
            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/80 p-1" role="listbox" aria-label="Search results">
              {matchingResources.length === 0
                ? <p className="px-2 py-2 text-xs text-slate-500">No resources match that search.</p>
                : matchingResources.map((resource) => (
                  <button type="button" role="option" key={resource.id} onClick={() => revealResource(resource.id)} className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-slate-800">
                    <span className="block truncate text-xs text-slate-200">{resource.name}</span>
                    <span className="block truncate text-[10px] text-slate-500">{resource.parentCategory} · {humanType(resource.nodeType)}</span>
                  </button>
                ))}
            </div>
          )}
          <section className="min-h-0 flex-1 overflow-y-auto">
            <h2 className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Explore categories</h2>
            <div className="space-y-0.5">{categoryList}</div>
          </section>
          <section className="border-t border-slate-800 pt-2">
            <h2 className="mb-1 flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500"><Star className="h-3 w-3" /> Favorites</h2>
            <div className="max-h-24 space-y-0.5 overflow-y-auto">
              {favorites.length === 0
                ? <p className="px-2 py-1 text-[11px] text-slate-600">Bookmark a resource to save it here.</p>
                : favorites.map((id) => {
                  const resource = allResources.find((item) => item.id === id);
                  return resource ? <button type="button" key={id} onClick={() => revealResource(id)} className="block w-full truncate rounded-md px-2 py-1 text-left text-[11px] text-amber-200 hover:bg-slate-800">{resource.name}</button> : null;
                })}
            </div>
          </section>
          <section className="border-t border-slate-800 pt-2">
            <h2 className="mb-1 flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500"><Clock3 className="h-3 w-3" /> Recently viewed</h2>
            <div className="max-h-20 space-y-0.5 overflow-y-auto">
              {recentIds.length === 0 ? <p className="px-2 py-1 text-[11px] text-slate-600">Your recent items appear here.</p> : recentIds.slice(0, 3).map((id) => {
                const resource = allResources.find((item) => item.id === id);
                return resource ? <button type="button" key={id} onClick={() => revealResource(id)} className="block w-full truncate rounded-md px-2 py-1 text-left text-[11px] text-slate-400 hover:bg-slate-800">{resource.name}</button> : null;
              })}
            </div>
          </section>
          {onBackToDashboard && (
            <button type="button" onClick={onBackToDashboard} className="rounded-lg border border-slate-800 px-3 py-2 text-left text-xs text-slate-400 hover:border-slate-600 hover:text-white">
              ← Return to OmniSec dashboard
            </button>
          )}
        </aside>

        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-[#08111e]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
            <div>
              <p className="text-xs font-medium text-slate-200">Interactive knowledge graph</p>
              <p className="text-[10px] text-slate-500">Select a category, then a subtopic to reveal resources</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.62, value - 0.12))} className="rounded-md border border-slate-800 p-1.5 text-slate-400 hover:text-white"><ZoomOut className="h-3.5 w-3.5" /></button>
              <span className="w-10 text-center font-mono text-[10px] text-slate-500">{Math.round(zoom * 100)}%</span>
              <button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(1.8, value + 0.12))} className="rounded-md border border-slate-800 p-1.5 text-slate-400 hover:text-white"><ZoomIn className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label="Reset graph position" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="ml-1 rounded-md border border-slate-800 px-2 py-1.5 text-[10px] text-slate-400 hover:text-white">Fit</button>
            </div>
          </div>
          <div className="h-[min(72vh,780px)] min-h-[540px]">{renderGraph()}</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-800 px-3 py-2">
            {[
              ['#082f49', 'Universe'], ['#172554', 'Category'], ['#312e81', 'Subtopic'], ['#134e4a', 'Tool'], ['#164e63', 'Website'], ['#422006', 'Learning']
            ].map(([color, label]) => <span key={label} className="inline-flex items-center gap-1.5 text-[10px] text-slate-500"><span className="h-2 w-2 rounded-full border" style={{ backgroundColor: color, borderColor: color }} />{label}</span>)}
            <span className="ml-auto text-[10px] text-slate-600">{osintCategories.length} categories · {allResources.length - osintCategories.length - 1} subtopics/resources</span>
          </div>
          {learnMode && (
            <div className="border-t border-violet-900/50 bg-violet-950/10 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-violet-200"><GraduationCap className="h-4 w-4" /> Beginner learning path</div>
              <div className="flex flex-wrap items-center gap-1">
                {learningPath.map((step, index) => (
                  <div key={`${step.label}-${index}`} className="flex items-center gap-1">
                    <button type="button" onClick={() => chooseLearningStep(index)} className={`rounded-md border px-2 py-1 text-[10px] ${selectedContext?.category?.id === step.categoryId ? 'border-violet-500 bg-violet-900/50 text-violet-100' : 'border-slate-800 text-slate-400 hover:text-violet-200'}`}>{step.label}</button>
                    {index < learningPath.length - 1 && <span className="text-[10px] text-violet-700">→</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="hidden xl:block">{detailsPanel}</div>
      </div>

      {mobileDetailsOpen && (
        <div className="fixed inset-0 z-[70] bg-black/60 xl:hidden" onClick={() => setMobileDetailsOpen(false)}>
          <div className="absolute inset-y-0 right-0 w-[min(90vw,380px)] p-3" onClick={(event) => event.stopPropagation()}>
            <div className="mb-2 flex justify-end"><button type="button" onClick={() => setMobileDetailsOpen(false)} className="rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-200">Close details</button></div>
            {detailsPanel}
          </div>
        </div>
      )}

      <footer className="flex flex-col gap-1 border-t border-slate-800 pt-3 text-[10px] leading-relaxed text-slate-500 sm:flex-row sm:justify-between">
        <span><Check className="mr-1 inline h-3 w-3 text-emerald-500" />Directory only: no automated collection, scanning, or personal-data gathering.</span>
        <span>Public information may be incomplete or outdated. Verify sources, terms, and authorization.</span>
      </footer>
    </div>
  );
}

export default OsintUniverse;
