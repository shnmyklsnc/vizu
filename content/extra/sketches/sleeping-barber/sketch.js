// Sleeping Barber simulator -- the interactive half of the "Sleeping Barber" article.
//
// This is NOT a p5 sketch (the article sets `Runtime: vanilla`, so the page skips p5.js).
// It is a step-based semaphore simulator in three files, all in this folder:
//
//   engine.js       pure logic: the barber/customer programs, wait()/signal() with a
//                   FIFO queue, a seeded scheduler, history for Back. No DOM, so it also
//                   runs under node (`require("./engine.js")`).
//   simulator.css   styles, written for a shadow root.
//   sketch.js       this file: loads the two above, mounts the UI into #sbs-host.
//
// The UI lives in a shadow root so its generic class names (.btn, .panel, .pill, ...)
// can never collide with the site stylesheet. Two things cross the boundary on purpose:
// the site's theme (data-theme on <html> is mirrored onto the host) and the web fonts
// (@font-face does not register from inside a shadow root, so they load into <head>).
(function () {
  "use strict";

  var script = document.currentScript;
  var base = script && script.src ? script.src.replace(/[^\/?#]*([?#].*)?$/, "") : "";
  var FONTS = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap";

  var MARKUP = `
<div class="wrap">
  <div class="presets" id="presets" role="group" aria-label="Scenarios"></div>
  <p class="preset-note" id="preset-note"></p>

  <div class="bar" role="toolbar" aria-label="Simulation controls">
    <button class="btn" id="btn-reset" type="button">Reset</button>
    <button class="btn" id="btn-back" type="button">Back</button>
    <button class="btn primary" id="btn-step" type="button">Step</button>
    <button class="btn" id="btn-run" type="button">Run</button>
    <button class="btn" id="btn-arrive" type="button">+ Customer</button>
    <div class="tick">Tick <b id="tick">0</b></div>
  </div>

  <div class="runinfo" aria-live="polite">
    <span class="pill" id="st-pill">Running</span>
    <span class="last" id="last"></span>
    <div class="speed">
      <label for="speed">Speed</label>
      <input id="speed" type="range" min="1" max="20" value="5">
      <output id="speed-out" for="speed">5/s</output>
    </div>
    <div class="picker" id="picker" hidden></div>
  </div>

  <div class="layout">
    <details class="side panel" id="settings">
      <summary>
        <span class="h">Settings</span>
        <span class="side-sum" id="side-sum"></span>
      </summary>
      <div class="form">
        <div class="field">
          <div class="lab"><label for="f-N">Waiting chairs (N)</label><output id="o-N" for="f-N"></output></div>
          <input id="f-N" type="range" min="1" max="8" value="2">
        </div>
        <div class="field">
          <div class="lab"><label for="f-total">Customers in total</label><output id="o-total" for="f-total"></output></div>
          <input id="f-total" type="range" min="1" max="30" value="8">
        </div>
        <div class="field">
          <label class="lab" for="f-arrivals">Arrivals</label>
          <select id="f-arrivals">
            <option value="periodic">Every few ticks</option>
            <option value="random">Random chance each tick</option>
            <option value="manual">Only when I press + Customer</option>
          </select>
        </div>
        <div class="field" id="row-interval">
          <div class="lab"><label for="f-interval">Ticks between arrivals</label><output id="o-interval" for="f-interval"></output></div>
          <input id="f-interval" type="range" min="1" max="40" value="9">
        </div>
        <div class="field" id="row-prob" hidden>
          <div class="lab"><label for="f-prob">Chance per tick</label><output id="o-prob" for="f-prob"></output></div>
          <input id="f-prob" type="range" min="1" max="100" value="30">
        </div>
        <div class="field">
          <div class="lab"><label for="f-cut">Haircut length</label><output id="o-cut" for="f-cut"></output></div>
          <input id="f-cut" type="range" min="1" max="10" value="3">
        </div>
        <div class="field">
          <label class="lab" for="f-sched">Scheduler</label>
          <select id="f-sched">
            <option value="rr">Round-robin</option>
            <option value="random">Random (uses the seed)</option>
            <option value="manual">I pick the thread</option>
          </select>
        </div>
        <div class="field">
          <label class="lab" for="f-seed">Seed</label>
          <div class="seedrow">
            <input id="f-seed" type="number" min="0" max="999999" value="7">
            <button class="btn" id="btn-seed" type="button">New seed</button>
          </div>
        </div>
        <label class="check" for="f-mutex">
          <input id="f-mutex" type="checkbox" checked>
          <span>Use the mutex</span>
        </label>
        <div class="field">
          <span class="lab">Starting values</span>
          <div class="trio">
            <label for="f-iC">customers<input id="f-iC" type="number" min="0" max="5" value="0"></label>
            <label for="f-iB">barber<input id="f-iB" type="number" min="0" max="5" value="0"></label>
            <label for="f-iM">mutex<input id="f-iM" type="number" min="0" max="5" value="1"></label>
          </div>
        </div>
      </div>
    </details>

    <main class="main">
      <section class="panel" aria-labelledby="h-floor">
        <div class="shop-head">
          <h2 class="h" id="h-floor">The shop</h2>
          <div class="tally" id="tally"></div>
        </div>
        <div class="plan">
          <div class="zone entrance">
            <div class="zlabel">Entrance</div>
            <div class="crowd" id="crowd"></div>
            <div class="clip" id="clip"></div>
          </div>
          <div class="wall"></div>
          <div class="zone waiting">
            <div class="zlabel" id="wlabel">Waiting area</div>
            <div class="chairs" id="chairs"></div>
          </div>
          <div class="wall"></div>
          <div class="zone barber" id="roomzone">
            <div class="zlabel">Barber room</div>
            <svg class="room" id="room" viewBox="0 -20 280 270" role="img" aria-label="Barber room with a barber chair and a barber pole"></svg>
            <div class="bcap" id="bcap"></div>
          </div>
        </div>
      </section>

      <section class="panel" aria-labelledby="h-sems">
        <h2 class="h" id="h-sems">Semaphores</h2>
        <div class="vals" id="vals"></div>
        <div class="checks" id="checks"></div>
      </section>

      <section class="panel" aria-labelledby="h-code">
        <h2 class="h" id="h-code">Code</h2>
        <div class="codes">
          <div><h3>barber()</h3><div class="code" id="code-barber"></div></div>
          <div><h3>customer()</h3><div class="code" id="code-customer"></div></div>
        </div>
        <p class="legend">Solid badge: ready at that line. Dashed: blocked there. B is the barber. cut_hair() and get_haircut() run as separate threads.</p>
      </section>

      <section class="panel" aria-labelledby="h-trace">
        <h2 class="h" id="h-trace">Trace</h2>
        <div class="tools">
          <label class="check" for="o-newest"><input id="o-newest" type="checkbox" checked><span>Newest first</span></label>
          <button class="btn" id="btn-copy" type="button">Copy trace</button>
        </div>
        <div class="tracewrap" id="tracewrap">
          <table class="trace">
            <thead><tr><th>Tick</th><th>Who</th><th>Instruction</th><th>customers</th><th>barber</th><th>mutex</th><th>waiting</th><th>Note</th></tr></thead>
            <tbody id="trace-body"></tbody>
          </table>
        </div>
        <p class="trace-foot" id="trace-foot"></p>
        <textarea id="copy-box" hidden readonly aria-label="Trace text to copy"></textarea>
      </section>
    </main>
  </div>
</div>
`;

  /* ---------- boot ---------- */
  function loadScript(src, ok, fail) {
    var s = document.createElement("script");
    s.src = src; s.onload = ok; s.onerror = fail;
    document.head.appendChild(s);
  }

  function boot() {
    var host = document.getElementById("sbs-host");
    if (!host || host.shadowRoot) { return; }

    if (!document.querySelector('link[href^="https://fonts.googleapis.com/css2?family=Barlow"]')) {
      var f = document.createElement("link");
      f.rel = "stylesheet"; f.href = FONTS;
      document.head.appendChild(f);
    }

    function failed() {
      host.textContent = "The simulator could not load its files. Check that engine.js and simulator.css are next to sketch.js.";
    }

    function start() {
      if (!window.BarberSim) { failed(); return; }
      var html = document.documentElement;
      function syncTheme() { host.setAttribute("data-theme", html.getAttribute("data-theme") === "light" ? "light" : "dark"); }
      syncTheme();
      new MutationObserver(syncTheme).observe(html, { attributes: true, attributeFilter: ["data-theme"] });

      var root = host.attachShadow({ mode: "open" });
      root.innerHTML = '<link rel="stylesheet" href="' + base + 'simulator.css">' + MARKUP;
      var wrap = root.querySelector(".wrap");
      var link = root.querySelector("link");
      function ready() { wrap.classList.add("ready"); }
      link.addEventListener("load", ready);
      link.addEventListener("error", ready);
      mount(root, host);
    }

    if (window.BarberSim) { start(); }
    else { loadScript(base + "engine.js", start, failed); }
  }

  /* ---------- UI (everything below runs against the shadow root) ---------- */
  function mount(root, host) {
  'use strict';
  var Sim = window.BarberSim;
  var P = Sim.PROGRAMS;
  var SVGNS = 'http://www.w3.org/2000/svg';
  function $(id) { return root.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function num(id) { return parseInt(String(id).slice(1), 10) || 0; }
  function shirtVar(id) { return 'var(--p' + (num(id) % 6 + 1) + ')'; }
  function skinVar(id) { return 'var(--skin' + (num(id) % 3 + 1) + ')'; }

  /* ---------- scenarios ---------- */
  var BASE = { N: 2, total: 8, arrivalMode: 'periodic', interval: 9, prob: 30, cutLen: 3, sched: 'rr', seed: 7, mutexOn: true, init: { customers: 0, barber: 0, mutex: 1 } };
  function mk(over, init) {
    var c = JSON.parse(JSON.stringify(BASE));
    Object.keys(over).forEach(function (k) { c[k] = over[k]; });
    if (init) { Object.keys(init).forEach(function (k) { c.init[k] = init[k]; }); }
    return c;
  }
  var PRESETS = [
    { id: 'busy', name: 'Busy morning', cfg: mk({}), note: 'Two chairs and a slow barber. Customers who find the room full leave.' },
    { id: 'quiet', name: 'Quiet morning', cfg: mk({ N: 3, total: 5, interval: 30 }), note: 'Customers arrive far apart, so the barber sleeps between haircuts.' },
    { id: 'race', name: 'Race without the mutex', cfg: mk({ interval: 1, sched: 'random', seed: 18, mutexOn: false }), note: 'Mutex off. Run it and watch the checks fail.' },
    { id: 'mutex0', name: 'mutex starts at 0', cfg: mk({ total: 6, interval: 6 }, { mutex: 0 }), note: 'The lock starts taken, so everyone blocks forever.' },
    { id: 'phantom', name: 'customers starts at 1', cfg: mk({ N: 3, total: 4, arrivalMode: 'manual' }, { customers: 1 }), note: 'The barber thinks someone is waiting. Run it, then add customers.' },
    { id: 'token', name: 'barber starts at 1', cfg: mk({ N: 3, total: 4, interval: 25 }, { barber: 1 }), note: 'A customer reaches the chair without being called.' }
  ];

  var F = {
    N: $('f-N'), total: $('f-total'), arrivals: $('f-arrivals'), interval: $('f-interval'), prob: $('f-prob'),
    cut: $('f-cut'), sched: $('f-sched'), seed: $('f-seed'), mutex: $('f-mutex'),
    iC: $('f-iC'), iB: $('f-iB'), iM: $('f-iM')
  };
  var sim = null, running = false, timer = null, activePreset = null;

  function readCfg() {
    return {
      N: +F.N.value, total: +F.total.value, arrivalMode: F.arrivals.value, interval: +F.interval.value,
      prob: +F.prob.value, cutLen: +F.cut.value, sched: F.sched.value, seed: +F.seed.value,
      mutexOn: F.mutex.checked, init: { customers: +F.iC.value, barber: +F.iB.value, mutex: +F.iM.value }
    };
  }
  function writeCfg(c) {
    F.N.value = c.N; F.total.value = c.total; F.arrivals.value = c.arrivalMode; F.interval.value = c.interval;
    F.prob.value = c.prob; F.cut.value = c.cutLen; F.sched.value = c.sched; F.seed.value = c.seed;
    F.mutex.checked = c.mutexOn; F.iC.value = c.init.customers; F.iB.value = c.init.barber; F.iM.value = c.init.mutex;
    syncOutputs();
  }
  function syncOutputs() {
    $('o-N').textContent = F.N.value;
    $('o-total').textContent = F.total.value;
    $('o-interval').textContent = F.interval.value + ' ticks';
    $('o-prob').textContent = F.prob.value + '%';
    $('o-cut').textContent = F.cut.value + ' ticks';
    $('row-interval').hidden = F.arrivals.value !== 'periodic';
    $('row-prob').hidden = F.arrivals.value !== 'random';
    var c = Sim.normalize(readCfg());
    $('side-sum').textContent = c.N + ' chairs, ' + c.total + ' customers, mutex ' + (c.mutexOn ? 'on' : 'off');
  }
  function renderPresets() {
    $('presets').innerHTML = PRESETS.map(function (p) {
      return '<button type="button" class="chip" data-p="' + p.id + '" aria-pressed="' + (activePreset === p.id) + '">' + esc(p.name) + '</button>';
    }).join('');
    var cur = PRESETS.filter(function (p) { return p.id === activePreset; })[0];
    $('preset-note').textContent = cur ? cur.note : 'Custom settings.';
  }

  /* ---------- run control ---------- */
  function stopRun() { running = false; if (timer) { clearTimeout(timer); timer = null; } }
  function reset() { stopRun(); sim = Sim.create(readCfg()); render(); }
  function loop() {
    if (!running) { return; }
    if (host.offsetParent === null) { stopRun(); render(); return; }
    var r = Sim.step(sim);
    render();
    if (!r.ok) { stopRun(); render(); return; }
    var st = Sim.status(sim);
    if (st === 'closed' || st === 'deadlock' || ((st === 'idle' || st === 'stalled') && sim.cfg.arrivalMode === 'manual')) { stopRun(); render(); return; }
    timer = setTimeout(loop, Math.round(1000 / (+$('speed').value)));
  }

  /* ---------- figures ---------- */
  /* standing person for the entrance, viewBox 40 x 58 */
  function standing(id) {
    return '<svg viewBox="0 0 40 58" aria-hidden="true" style="--pc:' + shirtVar(id) + ';--sk:' + skinVar(id) + '">' +
      '<rect class="pants" x="10" y="42" width="8" height="15" rx="2"/><rect class="pants" x="22" y="42" width="8" height="15" rx="2"/>' +
      '<rect class="shirt" x="7" y="22" width="26" height="24" rx="8"/>' +
      '<circle class="skin" cx="20" cy="12" r="9"/><path class="hair" d="M11 11a9 9 0 0 1 18 0c-4-3-13-3-18 0z"/>' +
      '<circle class="eye" cx="16.5" cy="13" r="1.2"/><circle class="eye" cx="23.5" cy="13" r="1.2"/></svg>';
  }
  /* seated person in a waiting chair, viewBox 76 x 88 */
  function chairSVG(id) {
    var s = '<svg viewBox="0 0 76 88" aria-hidden="true"' + (id ? ' style="--pc:' + shirtVar(id) + ';--sk:' + skinVar(id) + '"' : '') + '>' +
      '<rect class="chairfill-d" x="12" y="8" width="52" height="52" rx="9"/>';
    if (id) {
      s += '<rect class="shirt" x="22" y="34" width="32" height="30" rx="10"/>' +
        '<circle class="skin" cx="38" cy="26" r="11"/><path class="hair" d="M27 24a11 11 0 0 1 22 0c-5-4-17-4-22 0z"/>' +
        '<circle class="eye" cx="34" cy="27" r="1.4"/><circle class="eye" cx="42" cy="27" r="1.4"/>';
    }
    return s + '<rect class="chairfill" x="6" y="56" width="64" height="16" rx="6"/>' +
      '<rect class="chairfill-d" x="12" y="72" width="7" height="14" rx="2"/><rect class="chairfill-d" x="57" y="72" width="7" height="14" rx="2"/></svg>';
  }
  /* overflow customer standing next to the row of chairs (only when the mutex is off) */
  function overSVG(id) {
    return '<svg viewBox="0 0 76 88" aria-hidden="true" style="--pc:' + shirtVar(id) + ';--sk:' + skinVar(id) + '">' +
      '<g transform="translate(18 14) scale(1.1)">' + standing(id).replace(/<\/?svg[^>]*>/g, '') + '</g></svg>';
  }

  /* ---------- barber room (built once so animations keep running) ---------- */
  function buildRoom() {
    var stripes = '', k, cls = ['pole-red', 'pole-white', 'pole-blue', 'pole-white'];
    for (k = -7; k <= 6; k++) {
      var y = 36 + k * 14;
      stripes += '<polygon class="' + cls[((k % 4) + 4) % 4] + '" points="236,' + y + ' 258,' + (y - 14) + ' 258,' + y + ' 236,' + (y + 14) + '"/>';
    }
    var cx = 70;
    $('room').innerHTML =
      '<defs><clipPath id="poleclip"><rect x="236" y="36" width="22" height="84" rx="4"/></clipPath>' +
        '<pattern id="tiles" width="36" height="36" patternUnits="userSpaceOnUse"><rect width="36" height="36" style="fill:var(--tile-a)"/>' +
        '<rect width="18" height="18" style="fill:var(--tile-b)"/><rect x="18" y="18" width="18" height="18" style="fill:var(--tile-b)"/></pattern></defs>' +
      '<rect class="bg-paper" x="-900" y="-700" width="2080" height="818"/>' +
      '<rect x="-900" y="118" width="2080" height="900" fill="url(#tiles)"/>' +
      '<rect class="bg-base" x="-900" y="114" width="2080" height="6"/>' +
      '<rect class="mirror" x="22" y="14" width="104" height="62" rx="6"/>' +
      '<polygon class="shine" points="40,16 64,16 38,74 24,74"/>' +
      '<g id="r-pole"><rect class="pole-cap" x="232" y="26" width="30" height="10" rx="3"/>' +
        '<g clip-path="url(#poleclip)"><g class="stripes">' + stripes + '</g></g>' +
        '<rect class="pole-frame" x="236" y="36" width="22" height="84" rx="4"/>' +
        '<rect class="pole-cap" x="232" y="120" width="30" height="10" rx="3"/></g>' +
      /* chair back, headrest, base */
      '<ellipse class="metal" cx="150" cy="200" rx="38" ry="8"/><rect class="metal" x="144" y="168" width="12" height="32"/>' +
      '<rect class="leather" x="122" y="74" width="56" height="72" rx="14"/><rect class="leather" x="134" y="60" width="32" height="20" rx="7"/>' +
      /* customer in the chair: head and torso behind the seat */
      '<g id="r-cust" class="off"><rect class="shirt" x="132" y="108" width="36" height="38" rx="10"/>' +
        '<circle class="skin" cx="150" cy="96" r="12"/><path class="hair" d="M138 94a12 12 0 0 1 24 0c-6-4-18-4-24 0z"/>' +
        '<circle class="eye" cx="146" cy="97" r="1.5"/><circle class="eye" cx="154" cy="97" r="1.5"/></g>' +
      /* barber asleep in the chair */
      '<g id="r-sleep" class="off"><rect class="coat" x="132" y="110" width="36" height="36" rx="10"/>' +
        '<g transform="rotate(14 150 112)"><circle class="skin" cx="150" cy="98" r="12" style="--sk:var(--skin2)"/><path class="hair" d="M138 96a12 12 0 0 1 24 0c-6-4-18-4-24 0z"/>' +
        '<path class="eyeline" d="M144 100q2.5 2 5 0M152 100q2.5 2 5 0"/></g>' +
        '<g><text class="zz" x="170" y="72">z</text><text class="zz" x="180" y="58">Z</text><text class="zz" x="190" y="44">Z</text></g></g>' +
      /* seat, arms, footrest, then the cape over the customer's lap */
      '<rect class="leather" x="114" y="138" width="72" height="28" rx="10"/>' +
      '<rect class="leather-d" x="104" y="116" width="14" height="40" rx="5"/><rect class="leather-d" x="182" y="116" width="14" height="40" rx="5"/>' +
      '<rect class="metal" x="122" y="178" width="56" height="8" rx="3"/>' +
      '<g id="r-cape" class="off"><path class="shirt" d="M132 108h36l12 40H120z"/></g>' +
      /* barber on his feet */
      '<g id="r-stand" class="off">' +
        '<rect class="pants" x="' + (cx - 11) + '" y="168" width="9" height="30" rx="2"/><rect class="pants" x="' + (cx + 2) + '" y="168" width="9" height="30" rx="2"/>' +
        '<rect class="coat" x="' + (cx - 17) + '" y="126" width="34" height="46" rx="9"/>' +
        '<circle class="skin" cx="' + cx + '" cy="114" r="12" style="--sk:var(--skin2)"/><path class="hair" d="M' + (cx - 12) + ' 112a12 12 0 0 1 24 0c-6-4-18-4-24 0z"/>' +
        '<g id="r-eyes-open"><circle class="eye" cx="' + (cx - 4.5) + '" cy="115" r="1.5"/><circle class="eye" cx="' + (cx + 4.5) + '" cy="115" r="1.5"/></g>' +
        '<path id="r-eyes-shut" class="eyeline off" d="M' + (cx - 8) + ' 116q3.5 2.5 7 0M' + (cx + 1) + ' 116q3.5 2.5 7 0"/>' +
        '<g id="r-arm-idle"><path class="armline" d="M' + (cx + 15) + ' 134v26"/><path class="armfill" d="M' + (cx + 15) + ' 134v26"/></g>' +
        '<g id="r-arm-cut" class="off"><g class="snip"><path class="armline" d="M' + (cx + 15) + ' 134L' + (cx + 44) + ' 112"/><path class="armfill" d="M' + (cx + 15) + ' 134L' + (cx + 44) + ' 112"/>' +
          '<path class="tool" d="M' + (cx + 44) + ' 112l10-7M' + (cx + 44) + ' 112l10 3"/></g></g>' +
        '<g id="r-bubble" class="off"><rect class="bubble" x="14" y="82" width="112" height="20" rx="6"/><text class="bubble-t" x="70" y="96" text-anchor="middle">waiting for the lock</text></g>' +
      '</g>';
  }

  function show(id, on) { $(id).classList.toggle('off', !on); }

  function renderRoom(v) {
    var asleep = v.barber === 'asleep', cutting = v.barber === 'cutting', blocked = v.barber.indexOf('blocked') === 0;
    var cust = v.chair[0], b = sim.threads[0];
    show('r-sleep', asleep && !cust);
    show('r-stand', !(asleep && !cust));
    show('r-cust', !!cust);
    show('r-cape', !!cust);
    if (cust) {
      var cg = $('r-cust'), cape = $('r-cape');
      cg.style.setProperty('--pc', shirtVar(cust)); cg.style.setProperty('--sk', skinVar(cust));
      cape.style.setProperty('--pc', shirtVar(cust));
    }
    show('r-eyes-open', !asleep); show('r-eyes-shut', asleep);
    show('r-arm-idle', !cutting); show('r-arm-cut', cutting);
    show('r-bubble', blocked);
    $('room').classList.toggle('cutting', cutting);
    var cap;
    if (asleep) { cap = 'Asleep, wait(customers)'; }
    else if (cutting) { cap = 'Cutting ' + (v.cut || ('0/' + sim.cfg.cutLen)) + (cust ? ', ' + cust : ''); }
    else if (blocked) { cap = 'Blocked, wait(' + b.blockedOn + ')'; }
    else { cap = 'Awake, ' + P.barber[b.pc].text; }
    $('bcap').textContent = cap;
  }

  /* ---------- rendering ---------- */
  var STATUS = {
    running: ['info', 'Running', ''],
    idle: ['info', 'Idle', 'barber asleep, shop empty'],
    closed: ['ok', 'Closed', 'everyone served or turned away'],
    stalled: ['warn', 'Stalled', 'blocked, waiting on a new arrival'],
    deadlock: ['bad', 'Deadlock', 'blocked threads can never wake']
  };

  function renderStatus(st) {
    var s = STATUS[st];
    var pill = $('st-pill'); pill.className = 'pill ' + s[0]; pill.textContent = s[1];
    var last = sim.trace[sim.trace.length - 1], txt = '';
    if (last) { txt = 'tick ' + last.tick + ' · ' + last.who + ' · ' + last.text + (last.note ? ' · ' + last.note : ''); }
    else { txt = 'Press Step to run the first instruction.'; }
    if (s[2]) { txt = s[2] + (sim.cfg.arrivalMode === 'manual' && (st === 'idle' || st === 'stalled') ? ' (press + Customer)' : '') + ' · ' + txt; }
    $('last').textContent = txt;
  }

  function renderShop() {
    var v = Sim.view(sim), c = sim.cfg, N = c.N, i;
    var crowd = v.door.map(function (t) {
      return '<div class="person' + (t.blocked ? ' blk' : '') + '" title="' + esc(t.id + ' at ' + t.where) + '">' + standing(t.id) + t.id +
        (t.blocked ? '<small>blocked</small>' : '') + '</div>';
    }).concat(v.bounced.map(function (id) {
      return '<div class="person go" title="' + id + ' found the room full">' + standing(id) + id + '<small>full</small></div>';
    }));
    $('crowd').innerHTML = crowd.join('') || '<p class="empty">Nobody here.</p>';

    var bySeat = {}, over = [];
    v.seated.forEach(function (s) { if (s.seat < N && !bySeat[s.seat]) { bySeat[s.seat] = s; } else { over.push(s); } });
    var h = '';
    for (i = 0; i < N; i++) {
      var s = bySeat[i];
      h += '<div class="wc' + (s && s.blocked ? ' blk' : '') + '">' + chairSVG(s ? s.id : null) + (s ? s.id : '') + '</div>';
    }
    over.forEach(function (s) { h += '<div class="wc over">' + overSVG(s.id) + s.id + '<small>no chair</small></div>'; });
    $('chairs').innerHTML = h;
    $('wlabel').textContent = 'Waiting area, ' + v.seated.length + ' of ' + N;

    var wbad = sim.waiting < 0 || sim.waiting > N || sim.waiting !== sim.shadow;
    var lock = !c.mutexOn ? 'no lock' : (sim.sems.mutex.v > 0 ? 'lock free' : 'lock taken');
    var clip = $('clip');
    clip.className = 'clip' + (sim.changed.indexOf('w') >= 0 ? ' chg' : '');
    clip.innerHTML = '<span class="clip-t">Sign-in sheet</span><span>waiting <b style="' + (wbad ? 'color:var(--bad)' : '') + '">' + sim.waiting + '</b> / ' + N + '</span><span>' + lock + '</span>';

    renderRoom(v);
    $('tally').innerHTML = 'arrived <b>' + sim.arrived + '</b>/' + c.total + ' · served <b>' + v.served + '</b> · turned away <b>' + v.left + '</b>';
  }

  function qchips(ids) { return ids.map(function (i) { return '<span class="qchip">' + i + '</span>'; }).join(''); }
  function valTile(name, key, v, q) {
    return '<div class="val' + (sim.changed.indexOf(key) >= 0 ? ' chg' : '') + '"><div class="val-n">' + name + '</div>' +
      '<div class="val-v' + (v < 0 ? ' bad' : '') + '">' + v + '</div>' +
      '<div class="val-q">' + (q && q.length ? 'blocked ' + qchips(q) : '') + '</div></div>';
  }
  function renderVals() {
    var s = sim.sems, c = sim.cfg;
    var wbad = sim.waiting !== sim.shadow || sim.waiting < 0 || sim.waiting > c.N;
    $('vals').innerHTML =
      valTile('customers', 'c', s.customers.v, s.customers.q) +
      valTile('barber', 'b', s.barber.v, s.barber.q) +
      valTile(c.mutexOn ? 'mutex' : 'mutex (off)', 'm', s.mutex.v, s.mutex.q) +
      '<div class="val' + (sim.changed.indexOf('w') >= 0 ? ' chg' : '') + '"><div class="val-n">waiting</div>' +
      '<div class="val-v' + (wbad ? ' bad' : '') + '">' + sim.waiting + '</div>' +
      '<div class="val-q">seats taken ' + sim.shadow + '</div></div>';
    var short = { range: '0 ≤ waiting ≤ N', lost: 'waiting = seats taken', seats: 'seats taken ≤ N' };
    $('checks').innerHTML = Sim.checks(sim).map(function (k) {
      var first = sim.vio[k.id];
      var extra = first != null ? ' (broke at tick ' + first + ')' : '';
      return '<span class="chk" title="' + esc(k.detail) + '"><span class="pill ' + (k.ok ? 'ok' : 'bad') + '">' + (k.ok ? 'OK' : 'Fail') + '</span>' + short[k.id] + extra + '</span>';
    }).join('');
  }

  function renderCodeBlock(el, prog, kind) {
    var c = sim.cfg, at = {};
    sim.threads.forEach(function (t) {
      if (t.kind !== kind || (t.state !== 'ready' && t.state !== 'blocked')) { return; }
      (at[t.pc] = at[t.pc] || []).push(t);
    });
    el.innerHTML = prog.map(function (ins, i) {
      var skip = ins.mux && !c.mutexOn;
      var cm = ins.note || '';
      if (ins.op === 'iffull') { cm = 'full? N = ' + c.N; }
      if (ins.op === 'work') { cm = c.cutLen + ' ticks'; }
      var here = at[i] || [];
      var shown = here.slice(0, 8).map(function (t) {
        return '<span class="bdg' + (t.kind === 'barber' ? ' b' : '') + (t.state === 'blocked' ? ' blk' : '') + '">' + t.id + '</span>';
      }).join('');
      if (here.length > 8) { shown += '<span class="bdg">+' + (here.length - 8) + '</span>'; }
      return '<div class="ln' + (here.length ? ' here' : '') + (skip ? ' skip' : '') + '">' +
        '<span class="no">' + i + '</span>' +
        '<span class="tx">' + esc(ins.text) + (cm ? '  <span class="cm">// ' + esc(cm) + '</span>' : '') + '</span>' +
        '<span class="badges">' + shown + '</span></div>';
    }).join('');
  }

  var VIOL = { range: 'waiting out of range', lost: 'waiting lost an update', seats: 'more people than chairs' };
  function qtxt(q) { return q.length ? '<span class="q">&lt;' + q.join(' ') + '&gt;</span>' : ''; }
  function renderTrace() {
    var rows = sim.trace, shownRows = rows.slice(-300), newest = $('o-newest').checked;
    var out = shownRows.map(function (r, idx) {
      var last = idx === shownRows.length - 1;
      function cell(k, v, q) { return '<td class="' + (r.ch.indexOf(k) >= 0 ? 'chg' : '') + '">' + v + qtxt(q) + '</td>'; }
      var wbad = r.w < 0 || r.w > sim.cfg.N;
      var pills = r.viol.map(function (id) { return '<span class="pill bad">' + VIOL[id] + '</span>'; }).join('');
      return '<tr class="' + r.kind + (last ? ' last' : '') + '"><td>' + r.tick + '</td><td>' + r.who + '</td><td>' + esc(r.text) + '</td>' +
        cell('c', r.c, r.cq) + cell('b', r.b, r.bq) + cell('m', r.m, r.mq) +
        '<td class="' + (r.ch.indexOf('w') >= 0 ? 'chg' : '') + (wbad ? ' bad' : '') + '">' + r.w + '</td>' +
        '<td class="note">' + esc(r.note) + pills + '</td></tr>';
    });
    if (newest) { out.reverse(); }
    $('trace-body').innerHTML = out.join('') || '<tr><td colspan="8" class="note">Nothing has run yet.</td></tr>';
    $('trace-foot').textContent = rows.length > 300 ? 'Showing the last 300 of ' + rows.length + ' rows. Copy trace has all of them.' : '';
    var wrap = $('tracewrap');
    wrap.scrollTop = newest ? 0 : wrap.scrollHeight;
  }

  function renderPicker() {
    var el = $('picker');
    if (sim.cfg.sched !== 'manual') { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    var btns = sim.threads.filter(function (t) { return t.state === 'ready' || t.state === 'blocked'; }).map(function (t) {
      return '<button type="button" class="pick" data-id="' + t.id + '"' + (t.state === 'ready' ? '' : ' disabled') + '>' +
        t.id + ': ' + esc(P[t.kind][t.pc].text) + (t.state === 'blocked' ? ' (blocked)' : '') + '</button>';
    });
    el.innerHTML = '<span class="eyebrow">Run one line of</span>' + (btns.join('') || '<span class="last">No threads yet. Press + Customer.</span>');
  }

  function updateButtons() {
    var can = Sim.canStep(sim), manual = sim.cfg.sched === 'manual';
    $('btn-step').textContent = manual ? 'Tick' : 'Step';
    $('btn-step').disabled = !can.ok;
    $('btn-run').disabled = manual || !can.ok;
    $('btn-run').textContent = running ? 'Pause' : 'Run';
    $('btn-back').disabled = sim.hist.length === 0;
    $('btn-arrive').disabled = sim.arrived >= sim.cfg.total;
  }

  function render() {
    renderStatus(Sim.status(sim));
    $('tick').textContent = sim.clock;
    renderShop();
    renderVals();
    renderCodeBlock($('code-barber'), P.barber, 'barber');
    renderCodeBlock($('code-customer'), P.customer, 'customer');
    renderTrace();
    renderPicker();
    updateButtons();
  }

  /* ---------- trace text for copying ---------- */
  function traceText() {
    function pad(s, n) { s = String(s); while (s.length < n) { s += ' '; } return s; }
    function cv(v, q) { return v + (q.length ? ' <' + q.join(' ') + '>' : ''); }
    var cfg = sim.cfg;
    var lines = [
      '# N=' + cfg.N + ' total=' + cfg.total + ' arrivals=' + cfg.arrivalMode + ' haircut=' + cfg.cutLen + ' sched=' + cfg.sched +
        ' seed=' + cfg.seed + ' mutex=' + (cfg.mutexOn ? 'on' : 'off') +
        ' start(customers,barber,mutex)=' + cfg.init.customers + ',' + cfg.init.barber + ',' + cfg.init.mutex,
      [pad('tick', 5), pad('who', 6), pad('instruction', 20), pad('customers', 12), pad('barber', 12), pad('mutex', 12), pad('waiting', 8), 'note'].join(' ')
    ];
    sim.trace.forEach(function (r) {
      lines.push([pad(r.tick, 5), pad(r.who, 6), pad(r.text, 20), pad(cv(r.c, r.cq), 12), pad(cv(r.b, r.bq), 12), pad(cv(r.m, r.mq), 12), pad(r.w, 8),
        r.note + r.viol.map(function (id) { return ' [' + VIOL[id] + ']'; }).join('')].join(' '));
    });
    return lines.join('\n');
  }

  /* ---------- events ---------- */
  function onSettings() { activePreset = null; renderPresets(); syncOutputs(); reset(); }
  ['N', 'total', 'arrivals', 'interval', 'prob', 'cut', 'seed', 'mutex', 'iC', 'iB', 'iM'].forEach(function (k) {
    F[k].addEventListener('input', onSettings);
  });
  F.sched.addEventListener('input', function () {
    sim.cfg.sched = F.sched.value;
    if (F.sched.value === 'manual') { stopRun(); }
    activePreset = null; renderPresets(); render();
  });
  $('btn-seed').addEventListener('click', function () { F.seed.value = 1 + Math.floor(Math.random() * 999999); onSettings(); });
  $('speed').addEventListener('input', function () { $('speed-out').textContent = $('speed').value + '/s'; });

  $('presets').addEventListener('click', function (e) {
    var b = e.target.closest('[data-p]'); if (!b) { return; }
    var p = PRESETS.filter(function (x) { return x.id === b.getAttribute('data-p'); })[0];
    activePreset = p.id; writeCfg(p.cfg); renderPresets(); reset();
  });
  $('btn-reset').addEventListener('click', reset);
  $('btn-back').addEventListener('click', function () { stopRun(); Sim.back(sim); render(); });
  $('btn-step').addEventListener('click', function () { stopRun(); Sim.step(sim); render(); });
  $('btn-run').addEventListener('click', function () {
    if (running) { stopRun(); render(); return; }
    running = true; render(); loop();
  });
  $('btn-arrive').addEventListener('click', function () { Sim.arrive(sim); render(); });
  $('picker').addEventListener('click', function (e) {
    var b = e.target.closest('[data-id]'); if (!b || b.disabled) { return; }
    Sim.step(sim, b.getAttribute('data-id')); render();
  });
  $('o-newest').addEventListener('input', renderTrace);
  $('btn-copy').addEventListener('click', function () {
    var btn = $('btn-copy'), box = $('copy-box'), txt = traceText();
    function say(m) { btn.textContent = m; setTimeout(function () { btn.textContent = 'Copy trace'; }, 1600); }
    function fallback() { box.hidden = false; box.value = txt; box.focus(); box.select(); say('Select and copy'); }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () { box.hidden = true; say('Copied'); }, fallback);
      } else { fallback(); }
    } catch (err) { fallback(); }
  });

  /* ---------- start ---------- */
  buildRoom();
  /* The settings panel sits open beside the shop when the article column is wide
     (>= 860px, matching the container query in simulator.css), closed otherwise.
     Observed rather than measured once: the simulator starts inside a hidden tab, where width is 0. */
  (function () {
    var wrap = root.querySelector('.wrap'), touched = false, box = $('settings');
    box.addEventListener('toggle', function () { touched = true; });
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        if (!touched && wrap.clientWidth >= 860 && !box.open) { box.open = true; }
      }).observe(wrap);
    }
  })();
  activePreset = PRESETS[0].id;
  writeCfg(PRESETS[0].cfg);
  renderPresets();
  reset();
  for (var i = 0; i < 50; i++) { if (!Sim.step(sim).ok) { break; } }
  render();

  }

  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", boot); }
  else { boot(); }
})();
