(() => {
  'use strict';
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;
  const art = canvas.parentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let playing = !reduced.matches;
  let visible = true;
  let frame = 0;
  let previous = 0;
  let elapsed = 0;
  let width = 0;
  let height = 0;
  let yaw = 0;
  let pitch = .24;
  let drag = null;
  let velocity = { yaw: 0, pitch: 0 };
  let resumeAt = 0;
  const clampPitch = value => Math.max(-1.35, Math.min(1.35, value));
  let seed = 7319;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const colors = ['#b54d2c', '#d77937', '#e8a446', '#f2bc61', '#c96e55', '#e39c83'];
  const particles = Array.from({ length: 5400 }, (_, i) => {
    const z = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const radial = Math.sqrt(1 - z * z);
    const radius = .74 + .26 * Math.cbrt(random());
    return {
      group: i % 5,
      x: Math.cos(angle) * radial * radius,
      y: Math.sin(angle) * radial * radius,
      z: z * radius,
      size: .6 + random() * 1.15,
      phase: random() * Math.PI * 2,
      color: colors[Math.floor(random() * colors.length)],
      outline: random() < .16,
    };
  });
  function draw() {
    context.clearRect(0, 0, width, height);
    const t = elapsed * .00023;
    const rotation = yaw;
    const cos = Math.cos(rotation), sin = Math.sin(rotation);
    const tilt = pitch;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const scale = Math.min(width, height) * .31;
    // Five soft volumes drift from a single sculpture into distinct lobes.
    const spread = .62 + .19 * Math.sin(t * .78);
    const centers = Array.from({ length: 5 }, (_, i) => {
      const a = i * Math.PI * 2 / 5 + t * .12;
      return [Math.cos(a) * spread, Math.sin(a) * spread * 1.08, Math.sin(a * 2 + t * .65) * .34];
    });
    const projected = [];
    for (const p of particles) {
      const center = centers[p.group];
      const pulse = .49 + .035 * Math.sin(t * 1.3 + p.group);
      const swirl = t * .32 + p.group;
      const cs = Math.cos(swirl), ss = Math.sin(swirl);
      const ripple = 1 + .045 * Math.sin(p.y * 7 + p.phase + t * 2);
      const x = center[0] + (p.x * cs - p.z * ss) * pulse * ripple;
      const y = center[1] + p.y * pulse * ripple;
      const z = center[2] + (p.x * ss + p.z * cs) * pulse;
      const rx = x * cos + z * sin;
      const rz = z * cos - x * sin;
      const ry = y * ct - rz * st;
      const depth = y * st + rz * ct;
      const perspective = 3.8 / (3.8 - depth);
      projected.push({ p, x: width / 2 + rx * scale * perspective, y: height * .47 + ry * scale * perspective, depth, perspective });
    }
    projected.sort((a, b) => a.depth - b.depth);
    for (const dot of projected) {
      const p = dot.p;
      const size = p.size * dot.perspective * Math.max(.65, width / 500);
      context.globalAlpha = Math.max(.14, Math.min(.86, .47 + dot.depth * .33));
      if (p.outline) {
        context.strokeStyle = p.color;
        context.lineWidth = Math.max(.55, width / 850);
        context.strokeRect(dot.x - size, dot.y - size, size * 2, size * 2);
      } else {
        context.fillStyle = p.color;
        context.beginPath();
        context.arc(dot.x, dot.y, size, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.globalAlpha = 1;
  }
  function tick(now) {
    frame = 0;
    if (!playing || !visible || document.hidden) { previous = 0; return; }
    const dt = previous ? Math.min(now - previous, 50) : 0;
    elapsed += dt;
    if (!drag) {
      const decay = Math.exp(-dt / 240);
      yaw += velocity.yaw * 240 * (1 - decay);
      pitch = clampPitch(pitch + velocity.pitch * 240 * (1 - decay));
      velocity.yaw *= decay;
      velocity.pitch *= decay;
      if (now >= resumeAt) yaw += dt * .00023 * .48;
    }
    previous = now;
    draw();
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    if (playing && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function resize() {
    const box = canvas.getBoundingClientRect();
    width = box.width;
    height = box.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  function endDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    if (event.type !== 'pointerup' || reduced.matches || event.timeStamp - drag.time > 100) {
      velocity = { yaw: 0, pitch: 0 };
    }
    drag = null;
    resumeAt = performance.now() + 6000;
    canvas.classList.remove('is-dragging');
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }
  canvas.addEventListener('pointerdown', event => {
    if (drag || !event.isPrimary || event.button !== 0) return;
    velocity = { yaw: 0, pitch: 0 };
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const sensitivity = 3.5 / Math.max(200, Math.min(width, height));
    const dx = (event.clientX - drag.x) * sensitivity;
    const dy = -(event.clientY - drag.y) * sensitivity;
    const dt = Math.max(8, event.timeStamp - drag.time);
    yaw += dx;
    const nextPitch = clampPitch(pitch + dy);
    velocity = { yaw: dx / dt, pitch: (nextPitch - pitch) / dt };
    pitch = nextPitch;
    drag.x = event.clientX;
    drag.y = event.clientY;
    drag.time = event.timeStamp;
    if (!playing) draw();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(type, endDrag);
  }
  canvas.addEventListener('keydown', event => {
    switch (event.key) {
      case 'ArrowLeft': yaw -= .14; break;
      case 'ArrowRight': yaw += .14; break;
      case 'ArrowUp': pitch = clampPitch(pitch + .14); break;
      case 'ArrowDown': pitch = clampPitch(pitch - .14); break;
      default: return;
    }
    event.preventDefault();
    velocity = { yaw: 0, pitch: 0 };
    resumeAt = performance.now() + 6000;
    if (!playing) draw();
  });
  reduced.addEventListener('change', event => {
    playing = !event.matches;
    velocity = { yaw: 0, pitch: 0 };
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  new ResizeObserver(resize).observe(art);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(art);
  resize();
  sync();
})();
