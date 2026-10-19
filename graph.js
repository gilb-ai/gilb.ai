(() => {
  'use strict';
  const root = document.querySelector('#knowledge-graph');
  if (!root) return;
  const svg = root.querySelector('#graph');
  const world = root.querySelector('#graph-world');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const groups = {
    records: { label: 'Record', color: '#443a32', x: -105, y: -45 },
    decisions: { label: 'Decision', color: '#bd452f', x: 105, y: -40 },
    history: { label: 'History', color: '#aa8063', x: 5, y: 75 }
  };
  // This fictional dataset mirrors the illustrative answers below.
  // Links are actual relationships; the layout is a spring simulation.
  const data = [
    ['records', 'Client pilot', 'The shared context for a fictional sales pilot.', true],
    ['records', 'Signed scope', 'March 12 · Product questions and proposal search. CRM integration is excluded from phase one.'],
    ['records', 'Meeting notes', 'March 12 · The team records the agreed pilot boundaries.'],
    ['records', 'CRM record', 'The client record connects the pilot, its scope, and the supporting documents.'],
    ['records', 'Product documents', 'Source material for the product questions included in the pilot.'],
    ['records', 'Proposal archive', 'Retained proposals form the source collection for proposal search.'],
    ['records', 'Acceptance checklist', 'The team checks source coverage and answer quality before launch.'],
    ['records', 'Service agreement', 'The operating scope and service commitments agreed for the deployment.'],
    ['decisions', 'Project decisions', 'Follow a decision back to the records and dates behind it.', true],
    ['decisions', 'Pilot boundary', 'March 12 · Start with product questions and proposal search.'],
    ['decisions', 'Quality first', 'April 4 · Validate answer quality before adding CRM integration.'],
    ['decisions', 'CRM in phase two', 'April 4 · The revised scope moves CRM integration to the second phase.'],
    ['decisions', 'Launch criteria', 'Use the agreed checklist to review the pilot before launch.'],
    ['decisions', 'Historical coverage', 'An answer can use only the history retained in its connected sources.'],
    ['history', 'Business history', 'Versions and events keep the context of past decisions within reach.', true],
    ['history', 'March 12 agreement', 'The original agreement links the signed scope to the meeting notes.'],
    ['history', 'April 4 change', 'The change log records the decision to revise the project scope.'],
    ['history', 'Scope v1', 'March 12 · The first retained version of the pilot scope.'],
    ['history', 'Scope v2', 'April 4 · The revised scope records the phase-two CRM work.'],
    ['history', 'Policy v2', 'January 1 · This archived version applies to the February 15 example.'],
    ['history', 'Policy v3', 'March 1 · The next policy version takes effect.'],
    ['history', 'February 15 context', 'A historical question uses the policy effective on that date.']
  ];
  const relationships = [
    [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],
    [8,9],[8,10],[8,11],[8,12],[8,13],
    [14,15],[14,16],[14,17],[14,18],[14,19],[14,20],[14,21],
    [1,9],[2,9],[1,15],[2,15],[1,17],[3,11],[4,12],[5,12],[6,12],
    [7,13],[10,11],[10,16],[11,18],[16,18],[17,18],[19,20],[19,21],[13,19],[13,20],
    [0,8],[8,14],[14,0],[3,16],[6,18],[5,13],[7,20],[2,10],[4,17],[9,21],[12,15],[11,19]
  ];
  const nodes = data.map(([group, title, description, hub], id) => {
    const angle = id * 2.39996;
    const radius = hub ? 0 : 38 + (id % 4) * 15;
    return { id, group, title, description, hub, x: groups[group].x + Math.cos(angle) * radius,
      y: groups[group].y + Math.sin(angle) * radius, vx: 0, vy: 0 };
  });
  const primaryCount = nodes.length;
  const fragments = {
    records: ['Source excerpt', 'Document reference', 'Context note', 'Meeting extract', 'Client reference', 'Related document', 'Supporting evidence', 'Source version'],
    decisions: ['Decision context', 'Review note', 'Supporting record', 'Scope reference', 'Rationale', 'Follow-up note', 'Acceptance note', 'Linked discussion'],
    history: ['Retained snapshot', 'Dated reference', 'Version note', 'Source timestamp', 'Change reference', 'Archived context', 'Earlier record', 'Timeline entry']
  };
  // Each record has a small neighborhood of source fragments. The fragments
  // follow their parent through damped springs instead of repelling every node.
  for (let parent = 0; parent < primaryCount; parent++) {
    const center = nodes[parent];
    const first = nodes.length;
    for (let j = 0; j < 18; j++) {
      const angle = j * 2.39996 + parent * .71;
      const radius = 13 + Math.sqrt((j + 1) / 18) * (center.hub ? 40 : 32);
      const ox = Math.cos(angle) * radius, oy = Math.sin(angle) * radius;
      nodes.push({ id: nodes.length, group: center.group, parent,
        title: `${fragments[center.group][j % 8]} ${Math.floor(j / 8) + 1}`,
        description: `Illustrative source fragment connected to “${center.title}”. Explore the parent record for its business context.`,
        x: center.x + ox, y: center.y + oy, ox, oy, vx: 0, vy: 0, small: true });
      relationships.push([parent, first + j]);
      if (j > 0) relationships.push([first + j - 1, first + j]);
      if (j > 2) relationships.push([first + j - 3, first + j]);
    }
    relationships.push([first + 17, first]);
    if (parent > 0) relationships.push([first + 2, first - 3]);
  }
  const neighbors = nodes.map(() => new Set());
  const create = (tag, attrs, parent) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    parent.append(el);
    return el;
  };
  const edges = relationships.map(([a, b]) => {
    neighbors[a].add(b); neighbors[b].add(a);
    return { a, b, el: create('line', {}, root.querySelector('#graph-edges')) };
  });
  let selected = null, hovered = null, filter = null, focusIndex = 0;
  let zoom = 1, pan = { x: 0, y: 0 }, running = !reduced.matches;
  let visible = false, frame = null, lastTime = 0, clock = 0, drag = null;
  const motion = root.querySelector('#motion');
  const signals = edges.filter((_, i) => i % 17 === 0).map(edge => ({
    edge, el: create('circle', { r: 1.5, fill: '#bd452f' }, root.querySelector('#graph-signals'))
  }));

  nodes.forEach(n => {
    n.el = create('g', { role: 'button', tabindex: n.id === 0 ? 0 : -1,
      'aria-label': `${n.title}. ${groups[n.group].label}. ${neighbors[n.id].size} connections.`,
      'aria-pressed': 'false', class: 'knowledge-node', 'data-node': n.id }, root.querySelector('#graph-nodes'));
    create('circle', { r: n.small ? 6 : n.hub ? 20 : 12, class: 'node-hit' }, n.el);
    create('circle', { r: n.small ? 4.5 : n.hub ? 13 : 8, class: 'node-ring', stroke: groups[n.group].color }, n.el);
    create('circle', { r: n.small ? 1.3 + (n.id % 4) * .35 : n.hub ? 8.5 : 4.7, fill: groups[n.group].color, class: 'node-dot' }, n.el);
    n.label = create('text', { x: 0, y: n.hub ? 29 : 21, 'text-anchor': 'middle' }, n.el);
    n.label.textContent = n.title;
    n.el.addEventListener('pointerenter', () => { hovered = n.id; paint(); });
    n.el.addEventListener('pointerleave', () => { hovered = null; paint(); });
    n.el.addEventListener('focus', () => { hovered = n.id; focusIndex = n.id; paint(); });
    n.el.addEventListener('blur', () => { hovered = null; paint(); });
    n.el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(n.id); }
      if (e.key === 'Escape') { e.preventDefault(); select(null); }
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (step) {
        e.preventDefault();
        const next = (n.id + step + nodes.length) % nodes.length;
        nodes.forEach(v => v.el.setAttribute('tabindex', v.id === next ? '0' : '-1'));
        nodes[next].el.focus();
      }
    });
  });

  function paint() {
    const active = hovered ?? selected;
    for (const n of nodes) {
      const connected = active === null || active === n.id || neighbors[active].has(n.id);
      const matches = filter === null || n.group === filter;
      n.el.setAttribute('transform', `translate(${n.x.toFixed(2)} ${n.y.toFixed(2)})`);
      n.el.style.opacity = connected && matches ? 1 : .2;
      n.el.classList.toggle('is-active', n.id === active);
      n.el.setAttribute('aria-pressed', String(n.id === selected));
      n.label.style.opacity = n.id === active || (!n.small && (n.hub || (active !== null && neighbors[active].has(n.id)))) ? 1 : 0;
    }
    for (const e of edges) {
      const a = nodes[e.a], b = nodes[e.b];
      e.el.setAttribute('x1', a.x); e.el.setAttribute('y1', a.y);
      e.el.setAttribute('x2', b.x); e.el.setAttribute('y2', b.y);
      const related = active !== null && (e.a === active || e.b === active);
      const matches = filter === null || a.group === filter || b.group === filter;
      e.el.setAttribute('stroke', related ? '#bd452f' : '#8f7c6c');
      e.el.setAttribute('stroke-opacity', !matches ? .05 : related ? .9 : active === null ? (a.small || b.small ? .3 : .52) : .07);
      e.el.setAttribute('stroke-width', related ? 1.4 : (a.small || b.small ? .6 : 1));
    }
    signals.forEach((s, i) => {
      const a = nodes[s.edge.a], b = nodes[s.edge.b], t = (clock * .14 + i * .19) % 1;
      s.el.setAttribute('cx', a.x + (b.x - a.x) * t);
      s.el.setAttribute('cy', a.y + (b.y - a.y) * t);
      s.el.style.opacity = selected === null && filter === null ? .8 : 0;
    });
    world.setAttribute('transform', `translate(${300 + pan.x} ${202 + pan.y}) scale(${zoom})`);
  }

  function simulate(dt = 1) {
    for (let i = 0; i < primaryCount; i++) {
      const a = nodes[i];
      const center = groups[a.group];
      a.vx += (center.x - a.x) * .0018 * dt;
      a.vy += (center.y - a.y) * .0018 * dt;
      for (let j = i + 1; j < primaryCount; j++) {
        const b = nodes[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        const d2 = Math.max(80, dx * dx + dy * dy);
        const force = (3.2 + (d2 < 1600 ? 14 : 0)) / d2 * dt;
        a.vx += dx * force; a.vy += dy * force;
        b.vx -= dx * force; b.vy -= dy * force;
      }
    }
    for (const e of edges) {
      const a = nodes[e.a], b = nodes[e.b];
      if (a.small || b.small) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || 1;
      const target = a.group === b.group ? 64 : 115;
      const f = (distance - target) / distance * .0035 * dt;
      a.vx += dx * f; a.vy += dy * f;
      b.vx -= dx * f; b.vy -= dy * f;
    }
    for (const n of nodes) {
      if (n.small) {
        const parent = nodes[n.parent];
        const sway = running ? Math.sin(clock * .35 + n.id) * 2 : 0;
        n.vx += (parent.x + n.ox + sway - n.x) * .035 * dt;
        n.vy += (parent.y + n.oy - sway - n.y) * .035 * dt;
      }
      if (drag?.node === n.id) { n.vx = 0; n.vy = 0; continue; }
      n.vx *= Math.pow(.83, dt); n.vy *= Math.pow(.83, dt);
      n.x = Math.max(-280, Math.min(280, n.x + n.vx * dt));
      n.y = Math.max(-175, Math.min(175, n.y + n.vy * dt));
    }
  }

  function select(id) {
    selected = id;
    const n = id === null ? null : nodes[id];
    root.querySelector('#graph-kind').textContent = n ? `${groups[n.group].label.toUpperCase()} / ${neighbors[id].size} CONNECTIONS` : 'EXPLORE THE CONNECTIONS';
    root.querySelector('#graph-title').textContent = n ? n.title : 'Every record has a story.';
    root.querySelector('#graph-description').textContent = n ? n.description : 'Select a node to follow its context, decisions, and history.';
    root.querySelector('#graph-clear').hidden = !n;
    const related = root.querySelector('#graph-related');
    related.replaceChildren();
    if (n) [...neighbors[id]].slice(0, 3).forEach(other => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = nodes[other].title + ' ↗';
      button.addEventListener('click', () => { select(other); root.querySelector('#graph-clear').focus(); });
      related.append(button);
    });
    paint();
  }

  function animate(time) {
    frame = null;
    if (!running || !visible || document.hidden) return;
    if (lastTime && time - lastTime < 32) {
      frame = requestAnimationFrame(animate);
      return;
    }
    const dt = lastTime ? Math.min(2, (time - lastTime) / 16.667) : 1;
    lastTime = time; clock += dt / 60;
    simulate(dt); paint();
    frame = requestAnimationFrame(animate);
  }
  function schedule() {
    if (running && visible && !document.hidden && frame === null) {
      lastTime = 0; frame = requestAnimationFrame(animate);
    } else if ((!running || !visible || document.hidden) && frame !== null) {
      cancelAnimationFrame(frame); frame = null; lastTime = 0;
    }
  }
  function updateMotion() {
    motion.textContent = running ? 'Ⅱ' : '▷';
    motion.setAttribute('aria-label', running ? 'Pause animation' : 'Play animation');
    schedule();
  }
  function setZoom(value) {
    zoom = Math.max(.65, Math.min(2.5, value));
    root.querySelector('#graph-zoom-in').disabled = zoom >= 2.5;
    root.querySelector('#graph-zoom-out').disabled = zoom <= .65;
    paint();
  }
  function point(event) {
    const p = new DOMPoint(event.clientX, event.clientY);
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }
  svg.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const target = e.target.closest('[data-node]');
    // Leave vertical touch scrolling available on the empty canvas.
    if (!target && e.pointerType === 'touch') return;
    const p = point(e);
    drag = { pointer: e.pointerId, node: target ? Number(target.dataset.node) : null,
      x: p.x, y: p.y, startX: e.clientX, startY: e.clientY,
      panX: pan.x, panY: pan.y, moved: false };
    svg.setPointerCapture(e.pointerId);
    if (target) {
      focusIndex = Number(target.dataset.node);
      nodes.forEach(n => n.el.setAttribute('tabindex', n.id === focusIndex ? '0' : '-1'));
      target.focus({ preventScroll: true });
    }
    svg.classList.add('is-dragging');
  });
  svg.addEventListener('pointermove', e => {
    if (!drag || drag.pointer !== e.pointerId) return;
    const p = point(e);
    if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 4) drag.moved = true;
    if (drag.node !== null) {
      const n = nodes[drag.node];
      n.x = (p.x - 300 - pan.x) / zoom; n.y = (p.y - 202 - pan.y) / zoom;
      n.vx = 0; n.vy = 0;
    } else {
      pan.x = Math.max(-350, Math.min(350, drag.panX + p.x - drag.x));
      pan.y = Math.max(-250, Math.min(250, drag.panY + p.y - drag.y));
    }
    paint();
  });
  function endDrag(e, canceled = false) {
    if (!drag || drag.pointer !== e.pointerId) return;
    if (!canceled && !drag.moved) select(drag.node);
    drag = null; svg.classList.remove('is-dragging');
    if (svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId);
  }
  svg.addEventListener('pointerup', e => endDrag(e));
  svg.addEventListener('pointercancel', e => endDrag(e, true));
  svg.addEventListener('lostpointercapture', e => endDrag(e, true));
  // Ctrl/Command + wheel zooms without trapping normal page scrolling.
  svg.addEventListener('wheel', e => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault(); setZoom(zoom * Math.exp(-e.deltaY * .003));
  }, { passive: false });
  root.querySelector('#graph-zoom-in').addEventListener('click', () => setZoom(zoom * 1.2));
  root.querySelector('#graph-zoom-out').addEventListener('click', () => setZoom(zoom / 1.2));
  root.querySelector('#graph-clear').addEventListener('click', () => { select(null); nodes[focusIndex].el.focus(); });
  root.querySelector('#graph-reset').addEventListener('click', () => {
    pan = { x: 0, y: 0 }; setZoom(1); select(null); setFilter(null);
  });
  function setFilter(group) {
    filter = group;
    root.querySelectorAll('[data-group]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.group === filter));
    });
    paint();
  }
  root.querySelectorAll('[data-group]').forEach(button => {
    button.addEventListener('click', () => setFilter(filter === button.dataset.group ? null : button.dataset.group));
  });
  motion.addEventListener('click', () => { running = !running; updateMotion(); });
  reduced.addEventListener('change', e => { running = !e.matches; updateMotion(); });
  document.addEventListener('visibilitychange', schedule);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }).observe(root);
  for (let i = 0; i < 160; i++) simulate();
  paint(); updateMotion();
})();
