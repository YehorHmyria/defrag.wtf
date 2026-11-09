import { useEffect, useRef, useState, useMemo } from 'react';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import LoadingState from './LoadingState';
import { getGraph } from '../lib/api';
import { useAsync } from '../lib/hooks';

const W = 900, H = 560;
const TYPE_COLOR = { TECH: 'rgb(var(--color-accent-rgb))', COMPANY: 'rgb(var(--color-secondary-rgb))', PRODUCT: 'rgb(var(--color-hot-rgb))', PERSON: 'rgb(var(--text-muted-rgb))' };

const GraphView = ({ onOpenEntity, stack }) => {
  const [days, setDays] = useState(7);
  const { data, loading, error } = useAsync(() => getGraph({ days, min: days > 3 ? 2 : 1 }), [days]);
  const [layout, setLayout] = useState({ nodes: [], links: [] });
  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null);
  const simRef = useRef(null);
  const svgRef = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    if (!data) return;
    const nodes = data.nodes.map((n) => ({ ...n }));
    const links = data.links.map((l) => ({ ...l }));
    const sim = forceSimulation(nodes)
      .force('link', forceLink(links).id((d) => d.id).distance((l) => 90 - Math.min(l.weight, 4) * 8).strength(0.5))
      .force('charge', forceManyBody().strength(-160))
      .force('center', forceCenter(W / 2, H / 2))
      .force('collide', forceCollide().radius((d) => radius(d) + 6));
    let raf = 0;
    sim.on('tick', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setLayout({ nodes: [...nodes], links: [...links] })); });
    simRef.current = sim;
    return () => { sim.stop(); cancelAnimationFrame(raf); };
  }, [data]);

  const neighbours = useMemo(() => {
    const map = new Map();
    (data?.links || []).forEach((l) => {
      const a = l.source.id || l.source, b = l.target.id || l.target;
      (map.get(a) || map.set(a, new Set()).get(a)).add(b);
      (map.get(b) || map.set(b, new Set()).get(b)).add(a);
    });
    return map;
  }, [data]);

  const focus = hover || selected;
  const lit = (id) => !focus || id === focus || neighbours.get(focus)?.has(id);
  const stackSet = new Set(stack);

  const toSvg = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  };
  const onDown = (e, n) => { e.target.setPointerCapture(e.pointerId); drag.current = n; simRef.current.alphaTarget(0.3).restart(); n.moved = false; };
  const onMove = (e) => { const n = drag.current; if (!n) return; const [x, y] = toSvg(e); n.fx = x; n.fy = y; n.moved = true; };
  const onUp = (n) => { simRef.current.alphaTarget(0); n.fx = null; n.fy = null; drag.current = null; if (!n.moved) setSelected(selected === n.id ? null : n.id); };

  const sel = layout.nodes.find((n) => n.id === selected);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="text-xs text-muted max-w-xl">
          Entities extracted from the news, linked when they appear in the same event. Node size = number of events.
          Drag to rearrange, click to inspect.
        </p>
        <div className="flex border border-base-border">
          {[[1, '24H'], [7, '7D'], [30, '30D']].map(([v, l]) => (
            <button key={v} onClick={() => setDays(v)} aria-pressed={days === v}
              className={`px-3 py-1 text-xs ${days === v ? 'bg-accent text-primary' : 'text-muted hover:text-main'}`}>{l}</button>
          ))}
        </div>
      </div>

      {loading ? <LoadingState rows={2} /> : error ? <div className="text-hot text-center py-16">Graph unavailable.</div> :
       data.nodes.length === 0 ? <div className="text-center py-24 text-muted border border-dashed border-base-border">Not enough linked entities yet. Run an ingestion or widen the range.</div> : (
        <div className="relative border border-base-border bg-secondary/40">
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto touch-none select-none" onPointerMove={onMove} role="img" aria-label="Entity relationship graph">
            {layout.links.map((l, i) => {
              const a = l.source.id || l.source, b = l.target.id || l.target;
              if (!l.source.x) return null;
              const on = !focus || a === focus || b === focus;
              return <line key={i} x1={l.source.x} y1={l.source.y} x2={l.target.x} y2={l.target.y}
                stroke="rgb(var(--text-muted-rgb))" strokeOpacity={on ? 0.45 : 0.06} strokeWidth={Math.min(1 + l.weight * 0.6, 4)} />;
            })}
            {layout.nodes.map((n) => {
              if (n.x == null) return null;
              const mine = stackSet.has(n.id);
              return (
                <g key={n.id} transform={`translate(${n.x},${n.y})`} opacity={lit(n.id) ? 1 : 0.25}
                  onPointerDown={(e) => onDown(e, n)} onPointerUp={() => onUp(n)}
                  onPointerEnter={() => setHover(n.id)} onPointerLeave={() => setHover(null)} style={{ cursor: 'grab' }}>
                  <circle r={radius(n)} fill={TYPE_COLOR[n.type] || TYPE_COLOR.TECH} fillOpacity={0.22}
                    stroke={mine ? 'rgb(var(--text-main-rgb))' : TYPE_COLOR[n.type] || TYPE_COLOR.TECH} strokeWidth={mine ? 3 : n.id === selected ? 3 : 1.5} />
                  <text y={radius(n) + 12} textAnchor="middle" fontSize="11" fill="rgb(var(--text-main-rgb))" style={{ pointerEvents: 'none' }}>{n.name}</text>
                </g>
              );
            })}
          </svg>

          <div className="absolute left-3 bottom-3 flex flex-wrap gap-3 text-[10px] text-muted bg-primary/80 px-2 py-1">
            {Object.entries(TYPE_COLOR).map(([t, c]) => (
              <span key={t} className="flex items-center gap-1"><i className="inline-block w-2 h-2 rounded-full" style={{ background: c }} />{t}</span>
            ))}
            {stack.length > 0 && <span>◯ white ring = in your stack</span>}
          </div>

          {sel && (
            <div className="absolute right-3 top-3 w-60 bg-primary border border-accent p-3 text-xs">
              <div className="font-heading text-2xl text-accent leading-none">{sel.name}</div>
              <div className="text-muted mt-1">{sel.type} · {sel.count} events · peak impact {sel.impact}</div>
              <div className="mt-2 text-muted">Linked: {[...(neighbours.get(sel.id) || [])].slice(0, 8).join(', ') || '—'}</div>
              <button className="btn-dedsec mt-3 w-full" onClick={() => onOpenEntity(sel.name)}>Open events</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function radius(n) { return 7 + Math.sqrt(n.count) * 5; }

export default GraphView;
