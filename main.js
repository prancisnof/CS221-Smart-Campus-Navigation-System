'use strict';

/* =====================================================================
   SECTION 1 — GRAPH DATA STRUCTURE
   ===================================================================== */

class Graph {
  constructor() {
    this.nodes   = new Map();   // name → { name, x, y }
    this.edges   = [];          // [{ id, from, to, weight }]
    this.adjList = new Map();   // name → [{ to, weight, edgeId }]
    this._nextEdgeId = 0;
  }

  /**
   * Add a new node.
   * @param {string} name   - Unique location name.
   * @param {number|null} x - Canvas x (auto-placed with golden-angle spiral if null).
   * @param {number|null} y - Canvas y.
   * @param {number} cw     - Canvas width (used for auto-placement bounds).
   * @param {number} ch     - Canvas height.
   * @returns {boolean} true if added, false if name already exists or is invalid.
   */
  addNode(name, x = null, y = null, cw = 800, ch = 500) {
    name = String(name).trim();
    if (!name || this.nodes.has(name)) return false;

    if (x === null || y === null) {
      const idx   = this.nodes.size;
      const angle = idx * 2.39996;
      const r     = 80 + idx * 22;
      const maxR  = Math.min(cw, ch) * 0.38;
      x = cw / 2 + Math.cos(angle) * Math.min(r, maxR);
      y = ch / 2 + Math.sin(angle) * Math.min(r, maxR);
    }

    this.nodes.set(name, { name, x, y });
    this.adjList.set(name, []);
    return true;
  }

  /**
   * Remove a node and all of its edges.
   * @param {string} name
   * @returns {boolean}
   */
  removeNode(name) {
    if (!this.nodes.has(name)) return false;

    // Drop edges that reference this node
    this.edges = this.edges.filter(e => e.from !== name && e.to !== name);
    this.nodes.delete(name);
    this.adjList.delete(name);

    // Clean adjacency lists of remaining nodes
    for (const [, neighbors] of this.adjList) {
      const i = neighbors.findIndex(n => n.to === name);
      if (i !== -1) neighbors.splice(i, 1);
    }
    return true;
  }

  /* ── Edge Operations ── */

  /**
   * Add an undirected edge between two existing nodes.
   * @param {string} from
   * @param {string} to
   * @param {number} weight - Must be ≥ 1.
   * @returns {boolean} true if added, false if invalid or already exists.
   */
  addEdge(from, to, weight = 1) {
    from   = String(from).trim();
    to     = String(to).trim();
    weight = Math.max(1, Math.round(parseFloat(weight)) || 1);

    if (!this.nodes.has(from) || !this.nodes.has(to)) return false;
    if (from === to) return false;

    // No duplicate edges
    if (this.edges.some(e =>
      (e.from === from && e.to === to) ||
      (e.from === to   && e.to === from)
    )) return false;

    const id = this._nextEdgeId++;
    this.edges.push({ id, from, to, weight });
    this.adjList.get(from).push({ to,   weight, edgeId: id });
    this.adjList.get(to  ).push({ to: from, weight, edgeId: id });
    return true;
  }

  /**
   * Remove an edge by its endpoint names.
   * @param {string} from
   * @param {string} to
   * @returns {boolean}
   */
  removeEdge(from, to) {
    const idx = this.edges.findIndex(e =>
      (e.from === from && e.to === to) ||
      (e.from === to   && e.to === from)
    );
    if (idx === -1) return false;

    const { id } = this.edges[idx];
    this.edges.splice(idx, 1);

    for (const name of [from, to]) {
      const adj = this.adjList.get(name);
      if (adj) {
        const i = adj.findIndex(n => n.edgeId === id);
        if (i !== -1) adj.splice(i, 1);
      }
    }
    return true;
  }

  /* ── Algorithms ── */

  /**
   * BFS reachability / connectivity check.
   * @param {string} start
   * @param {string} end
   * @returns {boolean} true if a path exists between start and end.
   */
  isConnected(start, end) {
    if (!this.nodes.has(start) || !this.nodes.has(end)) return false;
    if (start === end) return true;

    const visited = new Set([start]);
    const queue   = [start];

    while (queue.length) {
      const cur = queue.shift();
      for (const { to } of this.adjList.get(cur) || []) {
        if (to === end) return true;
        if (!visited.has(to)) { visited.add(to); queue.push(to); }
      }
    }
    return false;
  }

  /**
   * Dijkstra's algorithm — shortest weighted path.
   * @param {string} start
   * @param {string} end
   * @returns {{ path: string[], distance: number } | null}
   */
  dijkstra(start, end) {
    if (!this.nodes.has(start) || !this.nodes.has(end)) return null;
    if (start === end) return { path: [start], distance: 0 };

    // Initialise distances to ∞
    const dist    = new Map([...this.nodes.keys()].map(k => [k, Infinity]));
    const prev    = new Map();
    const visited = new Set();

    dist.set(start, 0);

    // Simple array-based min-heap (adequate for campus-scale graphs)
    const pq = [{ name: start, d: 0 }];

    while (pq.length) {
      // Extract minimum distance node
      pq.sort((a, b) => a.d - b.d);
      const { name: cur } = pq.shift();

      if (visited.has(cur)) continue;
      if (cur === end) break;
      visited.add(cur);

      for (const { to: nb, weight } of this.adjList.get(cur) || []) {
        if (visited.has(nb)) continue;
        const nd = dist.get(cur) + weight;
        if (nd < dist.get(nb)) {
          dist.set(nb, nd);
          prev.set(nb, cur);
          pq.push({ name: nb, d: nd });
        }
      }
    }

    if (dist.get(end) === Infinity) return null;

    // Reconstruct path by backtracking through prev map
    const path = [];
    let cur = end;
    while (cur !== undefined) { path.unshift(cur); cur = prev.get(cur); }
    return { path, distance: dist.get(end) };
  }

  /**
   * DFS-based longest simple path (no revisiting nodes).
   * NOTE: This is NP-hard in general; suitable for campus-scale graphs (≤ 50 nodes).
   * @param {string} start
   * @param {string} end
   * @returns {{ path: string[], distance: number } | null}
   */
  longestPath(start, end) {
    if (!this.nodes.has(start) || !this.nodes.has(end)) return null;
    if (start === end) return { path: [start], distance: 0 };

    let best = null;

    const dfs = (cur, visited, path, dist) => {
      if (cur === end) {
        if (!best || dist > best.distance) {
          best = { path: [...path], distance: dist };
        }
        return;
      }
      for (const { to, weight } of this.adjList.get(cur) || []) {
        if (!visited.has(to)) {
          visited.add(to);
          path.push(to);
          dfs(to, visited, path, dist + weight);
          path.pop();
          visited.delete(to);
        }
      }
    };

    dfs(start, new Set([start]), [start], 0);
    return best;
  }

  /* ── Utility ── */

  get nodeCount() { return this.nodes.size; }
  get edgeCount()  { return this.edges.length; }

  /** Sorted array of all node names. */
  getNames() { return [...this.nodes.keys()].sort((a, b) => a.localeCompare(b)); }

  /** Serialise to JSON string. */
  toJSON() {
    return JSON.stringify({
      nodes: [...this.nodes.values()].map(n => ({
        name: n.name,
        x: Math.round(n.x),
        y: Math.round(n.y),
      })),
      edges: this.edges.map(e => ({ from: e.from, to: e.to, weight: e.weight })),
    }, null, 2);
  }

  /** Deserialise from JSON string. Replaces current graph. */
  fromJSON(json) {
    const data = JSON.parse(json);
    if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
      throw new Error('Invalid graph JSON');
    }
    this.nodes.clear();
    this.edges = [];
    this.adjList.clear();
    this._nextEdgeId = 0;

    for (const n of data.nodes) this.addNode(n.name, n.x ?? null, n.y ?? null);
    for (const e of data.edges) this.addEdge(e.from, e.to, e.weight ?? 1);
  }
}


/* =====================================================================
   SECTION 2 — CANVAS RENDERER
   ===================================================================== */

class GraphCanvas {
  constructor(canvas, graph) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.graph  = graph;

    // Path highlighting state
    this.highlightPath    = null;     // array of node names
    this.highlightEdgeIds = new Set();
    this.animProgress     = 0;
    this.animId           = null;

    // Drag state
    this.dragging   = null;
    this._dragOX    = 0;
    this._dragOY    = 0;

    this._bindPointerEvents();
    this._setupResizeObserver();
    this._resize();
  }

  /* ── Setup ── */

  _setupResizeObserver() {
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this.canvas.parentElement);
  }

  _resize() {
    const p = this.canvas.parentElement;
    this.canvas.width  = p.clientWidth;
    this.canvas.height = p.clientHeight;
    this.render();
  }

  /* ── Pointer Events (mouse + touch) ── */

  _getXY(e) {
    const rect = this.canvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  _hitNode(x, y) {
    for (const [name, n] of this.graph.nodes) {
      if (Math.hypot(x - n.x, y - n.y) < 20) return name;
    }
    return null;
  }

  _bindPointerEvents() {
    const onDown = e => {
      if (e.touches) e.preventDefault();
      const { x, y } = this._getXY(e);
      const hit = this._hitNode(x, y);
      if (hit) {
        const n = this.graph.nodes.get(hit);
        this.dragging = hit;
        this._dragOX  = x - n.x;
        this._dragOY  = y - n.y;
        this.canvas.style.cursor = 'grabbing';
      }
    };

    const onMove = e => {
      if (!this.dragging) return;
      if (e.touches) e.preventDefault();
      const { x, y } = this._getXY(e);
      const n = this.graph.nodes.get(this.dragging);
      if (n) {
        // Keep node inside canvas bounds with padding
        n.x = Math.max(22, Math.min(this.canvas.width  - 22, x - this._dragOX));
        n.y = Math.max(22, Math.min(this.canvas.height - 40, y - this._dragOY));
        this.render();
      }
    };

    const onUp = () => {
      this.dragging = null;
      this.canvas.style.cursor = 'grab';
    };

    this.canvas.addEventListener('mousedown',  onDown);
    this.canvas.addEventListener('mousemove',  onMove);
    this.canvas.addEventListener('mouseup',    onUp);
    this.canvas.addEventListener('mouseleave', onUp);
    this.canvas.addEventListener('touchstart', onDown, { passive: false });
    this.canvas.addEventListener('touchmove',  onMove, { passive: false });
    this.canvas.addEventListener('touchend',   onUp);
  }

  /* ── Path Highlighting ── */

  /**
   * Highlight a path of node names and animate a particle along it.
   * @param {string[]} path
   */
  setPath(path) {
    this.highlightPath    = path;
    this.highlightEdgeIds = new Set();

    if (path && path.length > 1) {
      for (let i = 0; i < path.length - 1; i++) {
        const edge = this.graph.edges.find(e =>
          (e.from === path[i] && e.to === path[i + 1]) ||
          (e.from === path[i + 1] && e.to === path[i])
        );
        if (edge) this.highlightEdgeIds.add(edge.id);
      }
      this._startAnimation();
    }
    this.render();
  }

  clearPath() {
    this.highlightPath    = null;
    this.highlightEdgeIds = new Set();
    if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
    this.render();
  }

  _startAnimation() {
    this.animProgress = 0;
    if (this.animId) cancelAnimationFrame(this.animId);

    const step = () => {
      this.animProgress = Math.min(this.animProgress + 0.022, 1);
      this.render();
      if (this.animProgress < 1) {
        this.animId = requestAnimationFrame(step);
      } else {
        this.animId = null;
      }
    };
    this.animId = requestAnimationFrame(step);
  }

  /* ── Main Render ── */

  render() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this._drawGrid();
    this.graph.edges.forEach(e => this._drawEdge(e));
    this.graph.nodes.forEach(n => this._drawNode(n));
  }

  /* ── Drawing Helpers ── */

  _drawGrid() {
    const { ctx, canvas } = this;
    ctx.save();
    ctx.strokeStyle = 'rgba(69, 57, 71, 0.08)';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < canvas.width;  x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0);           ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y);            ctx.lineTo(canvas.width, y);  ctx.stroke();
    }
    ctx.restore();
  }

  _drawEdge(edge) {
    const { ctx } = this;
    const fn = this.graph.nodes.get(edge.from);
    const tn = this.graph.nodes.get(edge.to);
    if (!fn || !tn) return;

    const isHi = this.highlightEdgeIds.has(edge.id);
    const mx = (fn.x + tn.x) / 2;
    const my = (fn.y + tn.y) / 2;

    if (isHi) {
      // Glowing highlighted edge
      ctx.save();
      ctx.shadowColor = '#d900ff';
      ctx.shadowBlur  = 16;
      ctx.strokeStyle = 'rgba(200, 0, 255, 0.75)';
      ctx.lineWidth   = 2.5;
      ctx.beginPath();
      ctx.moveTo(fn.x, fn.y);
      ctx.lineTo(tn.x, tn.y);
      ctx.stroke();
      ctx.restore();

      // Animated travel particle along edge
      const p  = this.animProgress;
      const tx = fn.x + (tn.x - fn.x) * p;
      const ty = fn.y + (tn.y - fn.y) * p;
      ctx.save();
      ctx.shadowColor = 'rgba(48, 20, 60, 0.55)';
      ctx.shadowBlur  = 20;
      ctx.fillStyle   = 'rgba(44, 20, 60, 0.55)';
      ctx.beginPath();
      ctx.arc(tx, ty, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Normal edge
      ctx.save();
      ctx.strokeStyle = 'rgba(214, 100, 255, 0.75)';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(fn.x, fn.y);
      ctx.lineTo(tn.x, tn.y);
      ctx.stroke();
      ctx.restore();
    }

    // Weight label (small pill at midpoint)
    ctx.save();
    const label = String(edge.weight);
    const lw    = label.length * 7 + 10;
    const lh    = 16;

    // Pill background
    ctx.fillStyle = isHi ? 'rgba(199, 125, 255, 0.92)' : '#ac7fc8';
    this._roundRect(ctx, mx - lw / 2, my - lh / 2, lw, lh, 3);
    ctx.fill();

    // Label text
    ctx.fillStyle    = isHi ? '#000000' : 'rgba(28, 0, 50, 0.92)';
    ctx.font         = `${isHi ? '600 ' : ''}11px "JetBrains Mono", monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, mx, my);
    ctx.restore();
  }

  _drawNode(node) {
    const { ctx } = this;
    const path    = this.highlightPath;
    const isHi    = path && path.includes(node.name);
    const isStart = path && path[0] === node.name;
    const isEnd   = path && path[path.length - 1] === node.name;

    const R     = 14;
    const color = (isStart || isEnd) ? '#a600ff' : '#d400ff';

    if (isHi) {
      // Pulsing halo ring
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur  = 24;
      ctx.strokeStyle = color + '55';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(node.x, node.y, R + 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Main circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(node.x, node.y, R, 0, Math.PI * 2);

    if (isHi) {
      ctx.fillStyle   = color + '25';
      ctx.shadowColor = color;
      ctx.shadowBlur  = 18;
    } else {
      ctx.fillStyle   = '#f0d9f9';
    }
    ctx.fill();

    ctx.strokeStyle = isHi ? color : 'rgba(157, 0, 255, 0.5)';
    ctx.lineWidth   = isHi ? 2 : 1.5;
    ctx.stroke();
    ctx.restore();

    // Inner dot / fill
    ctx.save();
    ctx.fillStyle = isHi ? color : '#9000ff';
    if (isHi) { ctx.shadowColor = color; ctx.shadowBlur = 12; }
    ctx.beginPath();
    ctx.arc(node.x, node.y, isHi ? 5 : 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Name label beneath node
    ctx.save();
    const label = node.name;
    ctx.font     = `${isHi ? '600 ' : ''}11px "Exo 2", "Rajdhani", sans-serif`;
    const tw     = ctx.measureText(label).width + 10;
    const th     = 16;
    const lx     = node.x - tw / 2;
    const ly     = node.y + R + 4;

    // Label background pill
    ctx.fillStyle = 'rgba(142, 19, 243, 0.56)';
    this._roundRect(ctx, lx, ly, tw, th, 3);
    ctx.fill();

    // Label text
    ctx.fillStyle    = isHi ? color : 'rgb(255, 255, 255)';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, node.x, ly + 2);
    ctx.restore();
  }

  /** Polyfill for ctx.roundRect for wider browser support. */
  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h,     x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y,         x + r, y);
    ctx.closePath();
  }
}


/* =====================================================================
   SECTION 3 — UI CONTROLLER
   ===================================================================== */

// ── Global State ──────────────────────────────────────────────────────
const graph = new Graph();
let gCanvas;          // GraphCanvas instance
let _toastTimer;      // timeout handle for toast dismissal

// Convenience: get element by id
const $ = id => document.getElementById(id);

// ── DOM References ─────────────────────────────────────────────────────
const locationNameEl  = $('locationName');
const connFromEl      = $('connFrom');
const connToEl        = $('connTo');
const connWeightEl    = $('connWeight');
const autoWeightEl    = $('autoWeight');
const connectionsList = $('connectionsList');
const locationsList   = $('locationsList');
const nodeCountEl     = $('nodeCount');
const edgeCountEl     = $('edgeCount');
const pathFromEl      = $('pathFrom');
const pathToEl        = $('pathTo');
const pathResultEl    = $('pathResult');
const canvasEl        = $('graphCanvas');
const deleteModal     = $('deleteModal');
const deleteSelectEl  = $('deleteSelect');
const importModal     = $('importModal');
const importDataEl    = $('importData');
const locationBadge   = $('locationBadge');


/* =====================================================================
   INITIALISATION
   ===================================================================== */

window.addEventListener('DOMContentLoaded', () => {
  // Boot canvas renderer
  gCanvas = new GraphCanvas(canvasEl, graph);

  // Attempt to restore a previously saved session
  try {
    const saved = localStorage.getItem('baklay-graph-v2');
    if (saved) {
      graph.fromJSON(saved);
      refreshAll();
      showToast('Session restored', 'info');
    }
  } catch (_) {
    localStorage.removeItem('baklay-graph-v2');
  }
});

/** Persist the current graph to localStorage. */
function saveGraph() {
  try { localStorage.setItem('baklay-graph-v2', graph.toJSON()); } catch (_) {}
}


/* =====================================================================
   TAB SWITCHING
   ===================================================================== */

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    $('tab' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1))
      .classList.remove('hidden');
  });
});


/* =====================================================================
   BUILD TAB — ADD LOCATION
   ===================================================================== */

$('btnAddLocation').addEventListener('click', handleAddLocation);
locationNameEl.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleAddLocation();
});

function handleAddLocation() {
  const name = locationNameEl.value.trim();

  if (!name) {
    showToast('Please enter a location name', 'error');
    locationNameEl.focus();
    return;
  }
  if (name.length > 50) {
    showToast('Name too long (max 50 characters)', 'error');
    return;
  }

  // Ensure canvas is sized before auto-placement
  const cw = canvasEl.width  || canvasEl.offsetWidth  || 800;
  const ch = canvasEl.height || canvasEl.offsetHeight || 500;

  if (!graph.addNode(name, null, null, cw, ch)) {
    showToast(`"${name}" already exists`, 'error');
    return;
  }

  locationNameEl.value = '';
  refreshAll();
  showToast(`Added: ${name}`, 'success');
  saveGraph();
}


/* =====================================================================
   BUILD TAB — ADD CONNECTION
   ===================================================================== */

// Auto weight toggle
autoWeightEl.addEventListener('change', () => {
  connWeightEl.disabled = autoWeightEl.checked;
  if (autoWeightEl.checked) computeAutoWeight();
});

// Recompute auto weight whenever either endpoint changes
connFromEl.addEventListener('change', () => { if (autoWeightEl.checked) computeAutoWeight(); });
connToEl.addEventListener('change',   () => { if (autoWeightEl.checked) computeAutoWeight(); });

/** Calculate weight from Euclidean distance between nodes (scaled). */
function computeAutoWeight() {
  const fn = graph.nodes.get(connFromEl.value);
  const tn = graph.nodes.get(connToEl.value);
  if (fn && tn) {
    const d = Math.round(Math.hypot(fn.x - tn.x, fn.y - tn.y) / 3);
    connWeightEl.value = Math.max(1, d);
  }
}

$('btnAddConnection').addEventListener('click', handleAddConnection);

function handleAddConnection() {
  const from = connFromEl.value;
  const to   = connToEl.value;

  if (!from || !to) {
    showToast('Select both From and To locations', 'error');
    return;
  }
  if (from === to) {
    showToast('Cannot connect a location to itself', 'error');
    return;
  }

  if (autoWeightEl.checked) computeAutoWeight();
  const weight = Math.max(1, Math.round(parseFloat(connWeightEl.value)) || 1);

  if (!graph.addEdge(from, to, weight)) {
    showToast(`Connection already exists: ${from} ↔ ${to}`, 'error');
    return;
  }

  refreshAll();
  showToast(`Connected: ${from} ↔ ${to}  (w=${weight})`, 'success');
  saveGraph();
}


/* =====================================================================
   ROUTE TAB — FIND PATH
   ===================================================================== */

$('btnFindPath').addEventListener('click', handleFindPath);

function handleFindPath() {
  const from = pathFromEl.value;
  const to   = pathToEl.value;

  if (!from || !to) {
    showToast('Select start and destination locations', 'error');
    return;
  }
  if (from === to) {
    showToast('Start and destination are the same', 'info');
    return;
  }

  const shortest = graph.dijkstra(from, to);
  const longest  = graph.longestPath(from, to);

  if (!shortest) {
    showResult(
      'error',
      '✗ No path found',
      `<div class="result-row">
        No route exists between <strong>${escHtml(from)}</strong> and <strong>${escHtml(to)}</strong>.
        <br>Try adding more connections in the Build tab.
      </div>`
    );
    gCanvas.clearPath();
    return;
  }

  // Format paths for display
  const shortPathStr = shortest.path.map(escHtml).join(' → ');
  const longPathStr  = longest
    ? longest.path.map(escHtml).join(' → ')
    : shortest.path.map(escHtml).join(' → ');
  const longDist     = longest ? longest.distance : shortest.distance;

  showResult(
    'success',
    '✓ Shortest path found',
    `<div class="result-row">
      <strong>Shortest:</strong> ${shortPathStr}
      <br><span class="result-dist" style="border-color:rgba(162, 0, 255, 0.3);background:rgba(166, 0, 255, 0.1);color:purple;">distance: ${shortest.distance}</span>
    </div>
    <div class="result-row">
      <strong>Longest:</strong> ${longPathStr}
      <br><span class="result-dist" style="border-color:rgba(255, 0, 85, 0.3);background:rgba(255, 0, 0, 0.1);color:red;">
        distance: ${longDist}
      </span>
    </div>`
  );

  // Highlight shortest path on canvas
  gCanvas.setPath(shortest.path);
}


/* =====================================================================
   ROUTE TAB — CONNECTIVITY CHECK
   ===================================================================== */

$('btnCheckConnect').addEventListener('click', handleCheckConnect);

function handleCheckConnect() {
  const from = pathFromEl.value;
  const to   = pathToEl.value;

  if (!from || !to) {
    showToast('Select both locations first', 'error');
    return;
  }

  const connected = graph.isConnected(from, to);

  showResult(
    connected ? 'info' : 'error',
    connected ? '↔ Locations are connected' : '✗ Locations are NOT connected',
    `<div class="result-row">
      <strong>${escHtml(from)}</strong> and <strong>${escHtml(to)}</strong>
      are <strong>${connected ? 'reachable' : 'not reachable'}</strong> from each other.
      ${connected ? '' : '<br>Add more connections to create a route.'}
    </div>`
  );
}


/* =====================================================================
   ROUTE TAB — CLEAR PATH
   ===================================================================== */

$('btnClearPath').addEventListener('click', () => {
  gCanvas.clearPath();
  pathResultEl.classList.add('hidden');
});


/* =====================================================================
   DELETE LOCATION (modal)
   ===================================================================== */

$('btnDeleteLocation').addEventListener('click', () => {
  if (graph.nodeCount === 0) {
    showToast('No locations to delete', 'error');
    return;
  }
  deleteSelectEl.innerHTML = graph.getNames()
    .map(n => `<option value="${escHtml(n)}">${escHtml(n)}</option>`)
    .join('');
  deleteModal.classList.remove('hidden');
});

$('btnCancelDelete').addEventListener('click',  () => deleteModal.classList.add('hidden'));
$('btnConfirmDelete').addEventListener('click', () => {
  const name = deleteSelectEl.value;
  if (name && graph.removeNode(name)) {
    gCanvas.clearPath();
    refreshAll();
    showToast(`Deleted: ${name}`, 'info');
    saveGraph();
  }
  deleteModal.classList.add('hidden');
});

// Close modal on overlay click
deleteModal.addEventListener('click', e => {
  if (e.target === deleteModal) deleteModal.classList.add('hidden');
});


/* =====================================================================
   CLEAR ENTIRE GRAPH
   ===================================================================== */

$('btnClearGraph').addEventListener('click', () => {
  if (graph.nodeCount === 0) { showToast('Graph is already empty', 'info'); return; }
  if (!confirm('Clear all locations and connections?')) return;

  graph.nodes.clear();
  graph.edges = [];
  graph.adjList.clear();
  graph._nextEdgeId = 0;

  gCanvas.clearPath();
  pathResultEl.classList.add('hidden');
  refreshAll();
  saveGraph();
  showToast('Graph cleared', 'info');
});


/* =====================================================================
   EXPORT / IMPORT
   ===================================================================== */

$('btnExport').addEventListener('click', () => {
  if (graph.nodeCount === 0) { showToast('Nothing to export', 'error'); return; }

  const json    = graph.toJSON();
  const blob    = new Blob([json], { type: 'application/json' });
  const url     = URL.createObjectURL(blob);
  const anchor  = document.createElement('a');
  anchor.href   = url;
  anchor.download = 'campus-map.json';
  anchor.click();
  URL.revokeObjectURL(url);
  showToast('Graph exported as campus-map.json', 'success');
});

$('btnImport').addEventListener('click', () => {
  importDataEl.value = '';
  importModal.classList.remove('hidden');
  setTimeout(() => importDataEl.focus(), 60);
});

$('btnCancelImport').addEventListener('click',  () => importModal.classList.add('hidden'));
$('btnConfirmImport').addEventListener('click', () => {
  const raw = importDataEl.value.trim();
  if (!raw) { showToast('No data to import', 'error'); return; }

  try {
    graph.fromJSON(raw);
    gCanvas.clearPath();
    pathResultEl.classList.add('hidden');
    refreshAll();
    showToast('Graph imported successfully', 'success');
    saveGraph();
    importModal.classList.add('hidden');
  } catch (err) {
    showToast('Invalid JSON — check format and try again', 'error');
  }
});

importModal.addEventListener('click', e => {
  if (e.target === importModal) importModal.classList.add('hidden');
});


/* =====================================================================
   UI REFRESH HELPERS
   ===================================================================== */

/** Refresh all UI elements to reflect current graph state. */
function refreshAll() {
  refreshStats();
  refreshSelects();
  refreshConnectionsList();
  refreshLocationsList();
  gCanvas.render();
}

function refreshStats() {
  nodeCountEl.textContent  = graph.nodeCount;
  edgeCountEl.textContent  = graph.edgeCount;
  if (locationBadge) locationBadge.textContent = graph.nodeCount;
}

function refreshSelects() {
  const names   = graph.getNames();
  const optHtml = names.map(n => `<option value="${escHtml(n)}">${escHtml(n)}</option>`).join('');

  connFromEl.innerHTML = `<option value="">From…</option>${optHtml}`;
  connToEl.innerHTML   = `<option value="">To…</option>${optHtml}`;
  pathFromEl.innerHTML = `<option value="">Start…</option>${optHtml}`;
  pathToEl.innerHTML   = `<option value="">End…</option>${optHtml}`;
}

function refreshConnectionsList() {
  if (graph.edgeCount === 0) {
    connectionsList.innerHTML =
      '<div class="empty-state">No connections yet.<br>Add locations, then connect them.</div>';
    return;
  }

  let html = '';
  for (const e of graph.edges) {
    html += `
    <div class="connection-item" role="listitem">
      <span class="conn-from">${escHtml(e.from)}</span>
      <span class="conn-arrow">↔</span>
      <span class="conn-to">${escHtml(e.to)}</span>
      <span class="conn-w">(w=${e.weight})</span>
      <button
        class="btn-remove-edge"
        data-from="${escHtml(e.from)}"
        data-to="${escHtml(e.to)}"
        title="Remove this connection"
        aria-label="Remove connection between ${escHtml(e.from)} and ${escHtml(e.to)}"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
             width="10" height="10">
          <line x1="18" y1="6"  x2="6"  y2="18"/>
          <line x1="6"  y1="6"  x2="18" y2="18"/>
        </svg>
      </button>
    </div>`;
  }
  connectionsList.innerHTML = html;

  // Attach remove-edge listeners
  connectionsList.querySelectorAll('.btn-remove-edge').forEach(btn => {
    btn.addEventListener('click', () => {
      const { from, to } = btn.dataset;
      graph.removeEdge(from, to);
      gCanvas.clearPath();
      pathResultEl.classList.add('hidden');
      refreshAll();
      saveGraph();
      showToast(`Removed: ${from} ↔ ${to}`, 'info');
    });
  });
}

function refreshLocationsList() {
  const names = graph.getNames();

  if (names.length === 0) {
    locationsList.innerHTML =
      '<div class="empty-state">No locations added yet.</div>';
    return;
  }

  locationsList.innerHTML = names.map(name => {
    const degree = (graph.adjList.get(name) || []).length;
    return `
    <div class="location-item" role="listitem">
      <div class="location-dot"></div>
      <div class="location-name">${escHtml(name)}</div>
      <div class="location-degree">${degree} conn</div>
    </div>`;
  }).join('');
}

/**
 * Display a result panel in the Route tab.
 * @param {'success'|'error'|'info'} type
 * @param {string} title
 * @param {string} bodyHtml
 */
function showResult(type, title, bodyHtml) {
  pathResultEl.className = `path-result ${type}`;
  pathResultEl.innerHTML = `
    <div class="result-title ${type}">${title}</div>
    ${bodyHtml}`;
  pathResultEl.classList.remove('hidden');
}

/**
 * Show a transient toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showToast(message, type = 'info') {
  const el     = $('toast');
  el.textContent = message;
  el.className   = `toast ${type} show`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

/** Minimal HTML escaping to prevent XSS in dynamic content. */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
