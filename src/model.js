// Deterministic simulation. No DOM, rendering, wall-clock time or third-party SDKs.
export const WORLD = { w: 600, h: 920 };
export const STATIONS = {
  supply: { x: 104, y: 365, label: 'Nguyên liệu' },
  kitchen: { x: 365, y: 365, label: 'Bếp bánh mì' },
  sale: { x: 180, y: 671, label: 'Quầy bánh mì' },
  tea: { x: 451, y: 671, label: 'Trà tắc' },
};
export const SOLIDS = [
  { x: 38, y: 238, w: 134, h: 86 },
  { x: 285, y: 226, w: 172, h: 98 },
  { x: 78, y: 559, w: 207, h: 72 },
  { x: 373, y: 553, w: 157, h: 78 },
  { x: 22, y: 746, w: 43, h: 43 },
  { x: 531, y: 746, w: 43, h: 43 },
];
export const UPGRADES = [
  { id: 'oven', cost: 60, icon: '♨', name: 'Bếp đôi rực lửa', description: 'Nấu nhanh hơn 40% · Thêm bánh mì đặc biệt 18 xu.' },
  { id: 'tea', cost: 100, icon: '🍹', name: 'Quầy trà tắc', description: 'Mở món thứ ba · Tự pha và bày trà khi đứng cạnh.' },
  { id: 'worker', cost: 140, icon: '👩🏻‍🍳', name: 'Mời Linh về quán', description: 'Linh tự lấy hàng, làm bánh, bày bán và thu tiền.' },
  { id: 'capacity', cost: 75, icon: '▣', name: 'Xe đẩy & kệ rộng', description: 'Mang 7 món · Quầy chứa 18 món · Có xe đẩy thật.' },
  { id: 'efficiency', cost: 100, icon: '⚡', name: 'Đôi giày nhanh nhẹn', description: 'Linh đi nhanh hơn 45%, mang 5 món thay vì 3.', requires: 'worker' },
];
export const PRICE = { banh: 12, special: 18, tea: 10 };
export const emptyBag = () => ({ raw: 0, banh: 0, special: 0, tea: 0 });
export const count = bag => Object.values(bag).reduce((a, b) => a + b, 0);
export function freshState() {
  return {
    version: 1, rng: 20261107, started: false, elapsed: 0, money: 0, revenue: 0, sold: 0,
    upgrades: {}, player: { x: 255, y: 430, face: 1, step: 0, moving: false, bag: emptyBag(), action: 0 },
    worker: null, supply: 20, supplyTimer: 0,
    kitchen: { input: 0, output: [], job: null, serial: 0 }, stock: { banh: 0, special: 0, tea: 0 },
    till: 0, customers: [], spawnTimer: 2, nextCustomer: 1, served: 0, lost: 0,
    teaTimer: 0, rushStarted: false, rushLeft: 60, finished: false, finishSeen: false,
    stats: { rawTaken: 0, cooked: 0, stocked: 0, workerStocked: 0, collected: 0, brewed: 0, soldBanh: 0, soldTea: 0 },
  };
}
export function random(s) { s.rng = (s.rng * 1664525 + 1013904223) >>> 0; return s.rng / 4294967296; }
export function blocked(x, y, radius = 13) {
  if (x < 23 || x > 577 || y < 175 || y > 848) return true;
  return SOLIDS.some(r => {
    const dx = x - Math.max(r.x, Math.min(x, r.x + r.w));
    const dy = y - Math.max(r.y, Math.min(y, r.y + r.h));
    return dx * dx + dy * dy < radius * radius;
  });
}
export function move(actor, dx, dy) {
  const parts = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 5));
  const ox = actor.x, oy = actor.y;
  for (let i = 0; i < parts; i++) {
    if (!blocked(actor.x + dx / parts, actor.y)) actor.x += dx / parts;
    if (!blocked(actor.x, actor.y + dy / parts)) actor.y += dy / parts;
  }
  actor.moving = Math.hypot(actor.x - ox, actor.y - oy) > .05;
  if (actor.moving) {
    actor.step += Math.hypot(actor.x - ox, actor.y - oy) * .13;
    if (Math.abs(dx) > .1) actor.face = dx < 0 ? -1 : 1;
    actor.back = dy < -Math.abs(dx) * .5;
  }
}
// Small grid A* with obstacle inflation; worker and keyboard tests share physical movement.
export function findPath(from, to) {
  const cell = 20, cols = 30, rows = 46;
  const start = [Math.floor(from.x / cell), Math.floor(from.y / cell)];
  const end = [Math.floor(to.x / cell), Math.floor(to.y / cell)];
  const key = (x, y) => y * cols + x;
  const open = [{ x: start[0], y: start[1], g: 0, f: 0 }], seen = new Map(), prev = new Map();
  seen.set(key(...start), 0);
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const n = open.shift(), nk = key(n.x, n.y);
    if (n.x === end[0] && n.y === end[1]) {
      const path = [{ x: to.x, y: to.y }]; let k = nk;
      while (prev.has(k)) { path.unshift({ x: (k % cols) * cell + 10, y: Math.floor(k / cols) * cell + 10 }); k = prev.get(k); }
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = n.x + dx, y = n.y + dy, k = key(x, y), g = n.g + 1;
      if (x < 0 || x >= cols || y < 0 || y >= rows || blocked(x * cell + 10, y * cell + 10, 16)) continue;
      if (seen.has(k) && seen.get(k) <= g) continue;
      seen.set(k, g); prev.set(k, nk);
      open.push({ x, y, g, f: g + Math.abs(x - end[0]) + Math.abs(y - end[1]) });
    }
  }
  return [];
}
export function buy(s, id, emit = () => {}) {
  const u = UPGRADES.find(v => v.id === id);
  if (!u || s.upgrades[id] || s.money < u.cost || (u.requires && !s.upgrades[u.requires])) return false;
  s.money -= u.cost; s.upgrades[id] = true;
  if (id === 'worker') s.worker = { x: 300, y: 760, face: 1, step: 0, bag: emptyBag(), action: 0, target: 'supply', path: [] };
  emit('upgrade', { id, text: u.name }); return true;
}
export function goal(s) {
  if (s.sold < 5) return { text: 'Bán 5 ổ bánh đầu tiên', value: s.sold, max: 5, station: count(s.player.bag) ? (s.player.bag.raw ? 'kitchen' : 'sale') : 'supply' };
  if (!s.upgrades.oven) return { text: 'Nâng bếp · mở bánh đặc biệt', value: s.money, max: 60, station: 'shop' };
  if (!s.upgrades.tea) return { text: 'Mở quầy trà tắc', value: s.money, max: 100, station: 'shop' };
  if (!s.upgrades.worker) return { text: 'Mời Linh về phụ quán', value: s.money, max: 140, station: 'shop' };
  if (s.revenue < 900) return { text: 'Doanh thu khai trương: 900 xu', value: s.revenue, max: 900 };
  if (!s.finished) return { text: s.rushStarted ? 'Giữ quán nhộn nhịp hết giờ cao điểm' : 'Chuẩn bị cho giờ cao điểm', value: s.rushStarted ? 60 - s.rushLeft : s.elapsed, max: s.rushStarted ? 60 : 300 };
  return { text: 'Ngày khai trương thành công!', value: 1, max: 1 };
}
export function interact(s, actor, dt, emit, worker = false) {
  actor.action = Math.max(0, actor.action - dt);
  if (actor.action > 0) return;
  const at = name => Math.hypot(actor.x - STATIONS[name].x, actor.y - STATIONS[name].y) < 43;
  const cap = worker ? (s.upgrades.efficiency ? 5 : 3) : (s.upgrades.capacity ? 7 : 4), bag = actor.bag;
  const foodCount = bag.banh + bag.special + bag.tea;
  if (at('supply') && count(bag) < cap && !foodCount && s.supply > 0) {
    bag.raw++; s.supply--; s.stats.rawTaken++; actor.action = .25; emit('pickup', { x: actor.x, y: actor.y, kind: 'raw' });
  }
  if (at('kitchen')) {
    if (bag.raw > 0) { bag.raw--; s.kitchen.input++; actor.action = .22; emit('drop', { x: 365, y: 295 }); }
    else if (s.kitchen.output.length && count(bag) < cap) { const kind = s.kitchen.output.shift(); bag[kind]++; actor.action = .24; emit('pickup', { x: actor.x, y: actor.y, kind }); }
  }
  if (at('sale')) {
    if (s.till > 0) { const amount = s.till; s.money += amount; s.stats.collected += amount; s.till = 0; emit('money', { x: 180, y: 623, amount }); }
    const kind = bag.special ? 'special' : bag.banh ? 'banh' : null;
    if (kind && s.stock.banh + s.stock.special < (s.upgrades.capacity ? 18 : 10)) {
      bag[kind]--; s.stock[kind]++; s.stats.stocked++; if (worker) s.stats.workerStocked++;
      actor.action = .22; emit('drop', { x: 180, y: 585 });
    }
  }
  if (!worker && at('tea') && s.upgrades.tea) {
    if (s.till > 0) { const amount = s.till; s.money += amount; s.stats.collected += amount; s.till = 0; emit('money', { x: 451, y: 620, amount }); }
    s.teaTimer += dt;
    if (s.teaTimer >= .9 && s.stock.tea < (s.upgrades.capacity ? 18 : 10)) {
      s.teaTimer = 0; s.stock.tea++; s.stats.brewed++; s.stats.stocked++; emit('tea', { x: 450, y: 580 });
    }
  }
}
function updateWorker(s, dt, emit) {
  const w = s.worker; if (!w) return;
  const cap = s.upgrades.efficiency ? 5 : 3;
  let target = w.target;
  if (w.target === 'supply' && (count(w.bag) >= cap || (w.bag.raw > 0 && s.supply === 0))) target = 'kitchen';
  if (w.target === 'kitchen' && (count(w.bag) >= cap && !w.bag.raw || (!w.bag.raw && w.bag.banh + w.bag.special > 0 && !s.kitchen.input && !s.kitchen.job && !s.kitchen.output.length))) target = 'sale';
  if (w.target === 'sale' && !count(w.bag)) target = 'supply';
  if (target !== w.target) { w.target = target; w.path = []; }
  const dest = w.target === 'sale' ? { x: 212, y: 673 } : w.target === 'kitchen' ? { x: 395, y: 369 } : { x: 132, y: 369 };
  if (Math.hypot(w.x - dest.x, w.y - dest.y) > 9) {
    if (!w.path?.length) w.path = findPath(w, dest);
    if (w.path.length) {
      const p = w.path[0], dx = p.x - w.x, dy = p.y - w.y, len = Math.hypot(dx, dy);
      const distance = Math.min(len, (s.upgrades.efficiency ? 155 : 107) * dt);
      if (len > .1) move(w, dx / len * distance, dy / len * distance);
      if (len < 5) w.path.shift();
    }
  } else w.moving = false;
  interact(s, w, dt, emit, true);
}
function updateCustomers(s, dt, emit) {
  s.spawnTimer -= dt;
  const active = s.customers.filter(c => c.phase !== 'leave');
  if (s.spawnTimer <= 0 && active.length < 7) {
    s.spawnTimer = s.rushStarted && s.rushLeft > 0 ? 2.7 : s.sold < 5 ? 7 : 4.7;
    let tea = s.upgrades.tea && random(s) < .34;
    if (active.filter(c => (c.type === 'tea') === !!tea).length >= 4) {
      if (s.upgrades.tea) tea = !tea;
      else tea = null;
    }
    if (tea !== null) s.customers.push({ id: s.nextCustomer++, x: -35, y: 440, phase: 'enter', type: tea ? 'tea' : (s.upgrades.oven && random(s) < .35 ? 'special' : 'banh'), patience: 48, wait: 0, service: 0, look: Math.floor(random(s) * 6), step: 0, face: 1 });
  }
  for (const c of s.customers) {
    const tea = c.type === 'tea';
    const queue = s.customers.filter(v => v.phase !== 'leave' && (v.type === 'tea') === tea);
    const idx = queue.indexOf(c);
    let tx = tea ? 449 : 179, ty = 522 - Math.max(0, idx) * 42;
    if (c.phase === 'leave') { tx = 650; ty = c.y < 460 ? 440 : 490; }
    // Customers use their own clear public corridor north of the counters.
    if (c.phase === 'enter' && c.x < tx - 5) { ty = 430 - Math.max(0, idx) * 8; }
    const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy), speed = c.phase === 'leave' ? 90 : 68;
    c.moving = d > 2;
    if (d > 2) { c.x += dx / d * Math.min(d, dt * speed); c.y += dy / d * Math.min(d, dt * speed); c.step += dt * 9; c.face = dx < 0 ? -1 : 1; }
    else if (c.phase !== 'leave') {
      c.phase = 'wait'; c.wait += dt; c.patience -= dt;
      if (idx === 0) {
        let kind = c.type;
        if (kind === 'special' && !s.stock.special && s.stock.banh) kind = 'banh';
        if (kind === 'banh' && !s.stock.banh && s.stock.special) kind = 'special';
        if (s.stock[kind] > 0) {
          c.service += dt;
          if (c.service >= 1.2) {
            s.stock[kind]--; if (kind === 'tea') s.stats.soldTea++; else s.stats.soldBanh++; s.till += PRICE[kind]; s.revenue += PRICE[kind]; s.sold++; s.served++; c.phase = 'leave'; c.holding = kind;
            emit('sold', { x: c.x, y: c.y - 45, amount: PRICE[kind] });
          }
        } else c.service = 0;
      }
      if (c.patience <= 0 && c.phase !== 'leave') { c.phase = 'leave'; c.angry = true; s.lost++; emit('lost', { x: c.x, y: c.y - 40 }); }
    }
  }
  s.customers = s.customers.filter(c => c.x < 660);
}
export function tick(s, dt, input = { x: 0, y: 0 }, emit = () => {}) {
  if (!s.started || dt <= 0) return;
  dt = Math.min(dt, .1); s.elapsed += dt;
  const len = Math.hypot(input.x, input.y);
  s.player.moving = false;
  if (len > .05) move(s.player, input.x / Math.max(1, len) * 155 * dt, input.y / Math.max(1, len) * 155 * dt);
  interact(s, s.player, dt, emit);
  s.supplyTimer += dt;
  if (s.supplyTimer >= 12) { s.supplyTimer -= 12; s.supply = Math.min(20, s.supply + 12); }
  const k = s.kitchen;
  if (!k.job && k.input > 0 && k.output.length < 8) {
    k.input--; k.serial++;
    k.job = { kind: s.upgrades.oven && k.serial % 3 === 0 ? 'special' : 'banh', left: s.upgrades.oven ? 1.5 : 2.5, total: s.upgrades.oven ? 1.5 : 2.5 };
  }
  if (k.job) { k.job.left -= dt; if (k.job.left <= 0) { k.output.push(k.job.kind); s.stats.cooked++; k.job = null; emit('cooked', { x: 365, y: 270 }); } }
  updateWorker(s, dt, emit); updateCustomers(s, dt, emit);
  if (!s.rushStarted && s.elapsed >= 300 && s.upgrades.worker && s.upgrades.tea) { s.rushStarted = true; emit('rush', { text: 'Giờ cao điểm! Cả phố ghé quán.' }); }
  if (s.rushStarted && s.rushLeft > 0) s.rushLeft = Math.max(0, s.rushLeft - dt);
  if (!s.finished && s.revenue >= 900 && s.rushStarted && s.rushLeft === 0 && s.upgrades.oven && s.upgrades.worker && s.upgrades.tea) { s.finished = true; emit('finish', {}); }
}
export function encode(s) { return JSON.stringify({ schema: 1, state: s }); }
export function decode(json) {
  try {
    const v = JSON.parse(json); if (v.schema !== 1 || v.state?.version !== 1) return null;
    const s = v.state, validInt = n => Number.isSafeInteger(n) && n >= 0 && n <= 1e8;
    if (![s.money, s.revenue, s.sold, s.till, s.supply, s.rng, ...Object.values(s.stock || {})].every(n => Number.isFinite(n) && n >= 0)) return null;
    if (!validInt(s.money) || !validInt(s.revenue) || !validInt(s.sold) || !Number.isFinite(s.elapsed) || s.elapsed < 0 || !s.upgrades || !s.kitchen || !s.stats || !Array.isArray(s.customers)) return null;
    for (const a of [s.player, s.worker].filter(Boolean)) {
      if (!Number.isFinite(a.x) || !Number.isFinite(a.y) || blocked(a.x, a.y) || !a.bag || !['raw', 'banh', 'special', 'tea'].every(k => validInt(a.bag[k]))) return null;
    }
    if (!Object.keys(freshState().stats).every(k => validInt(s.stats[k]))) return null;
    if (!s.player || !Array.isArray(s.kitchen.output) || !s.kitchen.output.every(k => k === 'banh' || k === 'special') || !validInt(s.kitchen.input)) return null;
    if (!['banh','special','tea'].every(k => validInt(s.stock[k])) || !Number.isFinite(s.rushLeft)) return null;
    if (![s.spawnTimer, s.supplyTimer, s.teaTimer, s.nextCustomer, s.served, s.lost].every(Number.isFinite) || s.customers.length > 20) return null;
    if (s.kitchen.job && (!['banh', 'special'].includes(s.kitchen.job.kind) || !Number.isFinite(s.kitchen.job.left) || !Number.isFinite(s.kitchen.job.total) || s.kitchen.job.total <= 0)) return null;
    if (!s.customers.every(c => [c.x, c.y, c.patience, c.service, c.look, c.step].every(Number.isFinite) && ['enter', 'wait', 'leave'].includes(c.phase) && ['banh', 'special', 'tea'].includes(c.type))) return null;
    if (s.worker) s.worker.path = [];
    return s;
  } catch { return null; }
}
