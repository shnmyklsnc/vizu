/* Sleeping barber engine.
 * Deterministic, step-based, snapshot-able. One call to step() runs ONE
 * instruction of ONE thread, so every interleaving is visible.
 * Semaphore semantics follow the CMSC handout:
 *   wait(s):   if s > 0 then s = s - 1, else enqueue the caller and block
 *   signal(s): if queue empty then s = s + 1, else dequeue one thread and make it ready
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.BarberSim = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- programs ---------- */
  /* mux: true marks the lines that disappear when the mutex is switched off. */
  var BARBER = [
    { op: 'wait',   sem: 'customers', text: 'wait(customers)', note: 'sleep if nobody is here' },
    { op: 'wait',   sem: 'mutex', mux: true, text: 'wait(mutex)' },
    { op: 'load',   text: 't = waiting' },
    { op: 'store',  delta: -1, text: 'waiting = t - 1' },
    { op: 'signal', sem: 'barber', text: 'signal(barber)', note: 'call the next customer' },
    { op: 'signal', sem: 'mutex', mux: true, text: 'signal(mutex)' },
    { op: 'work',   text: 'cut_hair()', next: 0 }
  ];

  var CUSTOMER = [
    { op: 'wait',   sem: 'mutex', mux: true, text: 'wait(mutex)' },
    { op: 'iffull', target: 9, text: 'if waiting >= N goto 9', note: 'shop full?' },
    { op: 'load',   text: 't = waiting' },
    { op: 'store',  delta: 1, text: 'waiting = t + 1' },
    { op: 'signal', sem: 'customers', text: 'signal(customers)', note: 'wake the barber if asleep' },
    { op: 'signal', sem: 'mutex', mux: true, text: 'signal(mutex)' },
    { op: 'wait',   sem: 'barber', text: 'wait(barber)', note: 'wait for my turn' },
    { op: 'work',   text: 'get_haircut()' },
    { op: 'end',    st: 'done', text: 'return', note: 'served' },
    { op: 'signal', sem: 'mutex', mux: true, text: 'signal(mutex)', note: 'shop was full' },
    { op: 'end',    st: 'left', text: 'return', note: 'turned away' }
  ];

  var SEM_KEYS = { customers: 'c', barber: 'b', mutex: 'm' };

  /* ---------- helpers ---------- */
  function clamp(v, lo, hi, d) {
    v = Number(v);
    if (!isFinite(v)) { v = d; }
    return Math.min(hi, Math.max(lo, Math.round(v)));
  }

  function normalize(c) {
    c = c || {};
    var init = c.init || {};
    return {
      N: clamp(c.N, 1, 8, 3),
      total: clamp(c.total, 1, 30, 8),
      arrivalMode: ['periodic', 'random', 'manual'].indexOf(c.arrivalMode) >= 0 ? c.arrivalMode : 'periodic',
      interval: clamp(c.interval, 1, 40, 9),
      prob: clamp(c.prob, 1, 100, 30),
      cutLen: clamp(c.cutLen, 1, 10, 3),
      sched: ['rr', 'random', 'manual'].indexOf(c.sched) >= 0 ? c.sched : 'rr',
      seed: clamp(c.seed, 0, 999999, 1),
      mutexOn: c.mutexOn !== false,
      init: {
        customers: clamp(init.customers, 0, 5, 0),
        barber: clamp(init.barber, 0, 5, 0),
        mutex: clamp(init.mutex, 0, 5, 1)
      }
    };
  }

  function rand(sim) {
    sim.rng = (sim.rng + 0x6D2B79F5) | 0;
    var t = Math.imul(sim.rng ^ (sim.rng >>> 15), 1 | sim.rng);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function progOf(th) { return th.kind === 'barber' ? BARBER : CUSTOMER; }
  function isReady(t) { return t.state === 'ready'; }
  function byId(sim, id) {
    for (var i = 0; i < sim.threads.length; i++) { if (sim.threads[i].id === id) { return sim.threads[i]; } }
    return null;
  }

  /* Lowest chair index not used by a customer who is currently seated (lines 4-6). */
  function freeSeat(sim) {
    var used = {}, i = 0;
    sim.threads.forEach(function (t) {
      if (t.kind === 'customer' && t.seat != null && t.pc >= 4 && t.pc <= 6 &&
          (t.state === 'ready' || t.state === 'blocked')) { used[t.seat] = true; }
    });
    while (used[i]) { i++; }
    return i;
  }

  function skipMux(sim, prog, p) {
    while (prog[p] && prog[p].mux && !sim.cfg.mutexOn) { p++; }
    return p;
  }
  function advance(sim, th, to) {
    th.pc = skipMux(sim, progOf(th), to === undefined ? th.pc + 1 : to);
  }

  function snapKeys(sim) {
    var s = sim.sems;
    return {
      c: s.customers.v + '|' + s.customers.q.join(','),
      b: s.barber.v + '|' + s.barber.q.join(','),
      m: s.mutex.v + '|' + s.mutex.q.join(','),
      w: String(sim.waiting)
    };
  }
  function diffKeys(a, b) {
    return ['c', 'b', 'm', 'w'].filter(function (k) { return a[k] !== b[k]; });
  }

  function pushRow(sim, kind, who, text, note, changed, viol) {
    var s = sim.sems;
    sim.trace.push({
      n: sim.trace.length + 1, tick: sim.clock, kind: kind, who: who, text: text, note: note || '',
      c: s.customers.v, cq: s.customers.q.slice(),
      b: s.barber.v, bq: s.barber.q.slice(),
      m: s.mutex.v, mq: s.mutex.q.slice(),
      w: sim.waiting, ch: changed || [], viol: viol || []
    });
  }

  /* ---------- state ---------- */
  function create(cfg) {
    var c = normalize(cfg);
    return {
      cfg: c, clock: 0, rng: c.seed | 0, rr: -1, arrived: 0,
      waiting: 0, shadow: 0,
      sems: {
        customers: { v: c.init.customers, q: [] },
        barber: { v: c.init.barber, q: [] },
        mutex: { v: c.init.mutex, q: [] }
      },
      threads: [{ id: 'B', kind: 'barber', pc: 0, state: 'ready', blockedOn: null, tmp: null, work: null }],
      trace: [], hist: [], changed: [],
      vio: { range: null, lost: null, seats: null }
    };
  }

  var SNAP_FIELDS = ['clock', 'rng', 'rr', 'arrived', 'waiting', 'shadow', 'sems', 'threads', 'changed', 'vio'];
  function pushHistory(sim) {
    var o = { traceLen: sim.trace.length };
    SNAP_FIELDS.forEach(function (k) { o[k] = sim[k]; });
    sim.hist.push(JSON.stringify(o));
    if (sim.hist.length > 3000) { sim.hist.shift(); }
  }
  function back(sim) {
    if (!sim.hist.length) { return false; }
    var o = JSON.parse(sim.hist.pop());
    SNAP_FIELDS.forEach(function (k) { sim[k] = o[k]; });
    sim.trace.length = o.traceLen;
    return true;
  }

  /* ---------- derived views ---------- */
  function phase(th) {
    if (th.kind !== 'customer') { return null; }
    if (th.state === 'done') { return 'served'; }
    if (th.state === 'left') { return 'left'; }
    if (th.pc <= 3) { return th.state === 'blocked' ? 'door-blocked' : 'door'; }
    if (th.pc <= 6) { return 'seated'; }
    if (th.pc === 7) { return 'chair'; }
    if (th.pc === 8) { return 'exiting'; }
    return 'bounced';
  }

  function view(sim) {
    var v = { seated: [], chair: [], door: [], bounced: [], served: 0, left: 0, barber: 'awake', cut: null };
    sim.threads.forEach(function (t) {
      if (t.kind !== 'customer') { return; }
      var p = phase(t);
      if (p === 'seated') { v.seated.push({ id: t.id, seat: t.seat == null ? 0 : t.seat, blocked: t.state === 'blocked' }); }
      else if (p === 'chair') { v.chair.push(t.id); }
      else if (p === 'door' || p === 'door-blocked') {
        v.door.push({ id: t.id, blocked: t.state === 'blocked', where: CUSTOMER[t.pc].text });
      }
      else if (p === 'bounced') { v.bounced.push(t.id); }
      if (t.state === 'done') { v.served++; }
      if (t.state === 'left') { v.left++; }
    });
    var b = sim.threads[0];
    if (b.state === 'blocked') { v.barber = b.blockedOn === 'customers' ? 'asleep' : 'blocked-' + b.blockedOn; }
    else if (BARBER[b.pc].op === 'work') { v.barber = 'cutting'; }
    if (b.work != null) { v.cut = (sim.cfg.cutLen - b.work) + '/' + sim.cfg.cutLen; }
    return v;
  }

  function checks(sim) {
    var N = sim.cfg.N;
    return [
      { id: 'range', label: 'waiting stays between 0 and N',
        ok: sim.waiting >= 0 && sim.waiting <= N,
        detail: 'waiting = ' + sim.waiting + ', N = ' + N },
      { id: 'lost', label: 'waiting matches the seats actually taken',
        ok: sim.waiting === sim.shadow,
        detail: 'waiting = ' + sim.waiting + ', seats taken = ' + sim.shadow },
      { id: 'seats', label: 'seats taken never exceed the chairs',
        ok: sim.shadow >= 0 && sim.shadow <= N,
        detail: 'seats taken = ' + sim.shadow + ', chairs = ' + N }
    ];
  }

  function status(sim) {
    var anyReady = sim.threads.some(isReady);
    if (anyReady) { return 'running'; }
    var stuck = sim.threads.some(function (t) {
      return t.state === 'blocked' && !(t.kind === 'barber' && t.blockedOn === 'customers');
    });
    var more = sim.arrived < sim.cfg.total;
    if (stuck) { return more ? 'stalled' : 'deadlock'; }
    return more ? 'idle' : 'closed';
  }

  function canStep(sim) {
    var s = status(sim);
    if (s === 'closed' || s === 'deadlock') { return { ok: false, reason: s }; }
    if (s !== 'running' && sim.cfg.arrivalMode === 'manual') { return { ok: false, reason: s }; }
    return { ok: true, reason: s };
  }

  /* ---------- running ---------- */
  function spawn(sim) {
    sim.arrived++;
    var id = 'c' + sim.arrived;
    sim.threads.push({
      id: id, kind: 'customer', pc: skipMux(sim, CUSTOMER, 0),
      state: 'ready', blockedOn: null, tmp: null, work: null, seat: null
    });
    pushRow(sim, 'arrive', 'door', id + ' arrives', '', [], []);
    return id;
  }

  function arrive(sim) {
    if (sim.arrived >= sim.cfg.total) { return false; }
    pushHistory(sim);
    sim.changed = [];
    spawn(sim);
    return true;
  }

  function pickThread(sim) {
    var th = sim.threads, n = th.length, i;
    if (sim.cfg.sched === 'random') {
      var ready = th.filter(isReady);
      if (!ready.length) { return null; }
      return ready[Math.floor(rand(sim) * ready.length)];
    }
    for (var k = 1; k <= n; k++) {
      i = (sim.rr + k) % n;
      if (th[i].state === 'ready') { sim.rr = i; return th[i]; }
    }
    return null;
  }

  function execute(sim, th) {
    var prog = progOf(th), ins = prog[th.pc], note = '', s;
    var before = snapKeys(sim);
    var failedBefore = checks(sim).filter(function (c) { return !c.ok; }).map(function (c) { return c.id; });
    var text = ins.text, pcNow = th.pc;

    switch (ins.op) {
      case 'wait':
        s = sim.sems[ins.sem];
        if (s.v > 0) { s.v--; advance(sim, th); }
        else { s.q.push(th.id); th.state = 'blocked'; th.blockedOn = ins.sem; note = 'blocks'; }
        break;
      case 'signal':
        s = sim.sems[ins.sem];
        if (s.q.length === 0) { s.v++; }
        else {
          var wid = s.q.shift(), w = byId(sim, wid);
          w.state = 'ready'; w.blockedOn = null; advance(sim, w);
          note = 'wakes ' + wid;
        }
        advance(sim, th);
        break;
      case 'load':
        th.tmp = sim.waiting; note = 't = ' + th.tmp; advance(sim, th);
        break;
      case 'store':
        sim.waiting = th.tmp + ins.delta; sim.shadow += ins.delta;
        if (th.kind === 'customer' && ins.delta > 0) { th.seat = freeSeat(sim); }
        note = 'waiting = ' + sim.waiting; advance(sim, th);
        break;
      case 'iffull':
        if (sim.waiting >= sim.cfg.N) { note = 'full, leave'; advance(sim, th, ins.target); }
        else { note = 'has room'; advance(sim, th); }
        break;
      case 'work':
        if (th.work == null) { th.work = sim.cfg.cutLen; }
        th.work--;
        note = (sim.cfg.cutLen - th.work) + '/' + sim.cfg.cutLen;
        if (th.work <= 0) { th.work = null; advance(sim, th, ins.next); }
        break;
      case 'end':
        th.state = ins.st; note = ins.note;
        break;
    }

    var changed = diffKeys(before, snapKeys(sim));
    var viol = [];
    checks(sim).forEach(function (c) {
      if (!c.ok && failedBefore.indexOf(c.id) < 0) { viol.push(c.id); }
      if (!c.ok && sim.vio[c.id] == null) { sim.vio[c.id] = sim.clock; }
    });
    sim.changed = changed;
    pushRow(sim, 'op', th.id, text, note, changed, viol);
  }

  /* step(sim)        : one tick, scheduler picks the thread
   * step(sim, 'c3')  : one tick, run exactly that thread
   * With sched 'manual' and no id, the tick only advances the clock (arrivals still happen). */
  function step(sim, forcedId) {
    var can = canStep(sim);
    if (!can.ok) { return { ok: false, reason: can.reason }; }
    var th = null;
    if (forcedId) {
      th = byId(sim, forcedId);
      if (!th || th.state !== 'ready') { return { ok: false, reason: 'not-runnable' }; }
    }
    pushHistory(sim);
    sim.changed = [];
    sim.clock++;
    var c = sim.cfg;
    if (sim.arrived < c.total) {
      var go = false;
      if (c.arrivalMode === 'periodic') { go = (sim.clock - 1) % c.interval === 0; }
      else if (c.arrivalMode === 'random') { go = rand(sim) * 100 < c.prob; }
      if (go) { spawn(sim); }
    }
    if (!th && c.sched !== 'manual') { th = pickThread(sim); }
    if (th) { execute(sim, th); }
    return { ok: true, ran: th ? th.id : null };
  }

  return {
    PROGRAMS: { barber: BARBER, customer: CUSTOMER },
    normalize: normalize, create: create, step: step, arrive: arrive, back: back,
    status: status, canStep: canStep, checks: checks, view: view, phase: phase
  };
});
