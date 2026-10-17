(() => {
  "use strict";

  const root = document.documentElement;
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const frozen = new URLSearchParams(location.search).has("static");
  const calm = () => still.matches || frozen;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  if (frozen) root.classList.add("reveal-all", "static");

  function watch(el, enter, leave, threshold = 0.35) {
    if (!el) return;
    if (!("IntersectionObserver" in window)) { enter(); return; }
    new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? enter() : leave && leave()));
    }, { threshold }).observe(el);
  }

  $$(".reveal").forEach((el) => {
    if (el.classList.contains("hero")) {
      requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.add("in"); clearTimeout(window.__rv); }));
      return;
    }
    watch(el, () => el.classList.add("in"), null, 0.12);
  });
  $$("[data-live]").forEach((el) => {
    if (frozen) return;
    watch(el, () => el.classList.add("live"), () => el.classList.remove("live"), 0);
  });

  $$(".fan").forEach((fan) => {
    const items = $$(".fan-item", fan);
    const n = items.length;
    items.forEach((el, i) => {
      const deg = 162 + (18 - 162) * (n > 1 ? i / (n - 1) : 0.5);
      const rad = (deg * Math.PI) / 180;
      el.style.setProperty("--i", i);
      el.style.setProperty("--x", (Math.cos(rad) * 262).toFixed(1));
      el.style.setProperty("--y", (18 + Math.sin(rad) * 112).toFixed(1));
      el.style.setProperty("--r", ((90 - deg) * -0.07).toFixed(2) + "deg");
    });
  });

  function tween(from, to, ms, onStep) {
    if (calm() || ms <= 0) { onStep(to); return; }
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      onStep(from + (to - from) * ease(t));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const scores = $("[data-stage=scores]");
  if (scores) {
    const rings = $$(".ring", scores);
    const note = $(".score-note", scores);
    const fill = () => rings.forEach((r) => {
      const v = Number(r.dataset.value);
      const b = $("b", r);
      tween(0, v, 900, (x) => { r.style.setProperty("--p", x.toFixed(2)); b.textContent = Math.round(x); });
    });
    if (calm()) fill();
    else {
      rings.forEach((r) => r.style.setProperty("--p", 0));
      let done = false;
      watch(scores, () => { if (!done) { done = true; fill(); } }, null, 0.4);
    }
    rings.forEach((r) => r.addEventListener("click", () => {
      rings.forEach((o) => o.setAttribute("aria-pressed", String(o === r)));
      $("b", note).textContent = r.dataset.title;
      $("span", note).textContent = r.dataset.note;
    }));
  }

  const fast = $("[data-stage=fasting]");
  if (fast) {
    const phases = JSON.parse($("#phases").textContent);
    const input = $("input", fast);
    const arc = $(".arc", fast);
    const len = 2 * Math.PI * 130;
    const goal = 16;
    const dots = $(".phase-dots", fast);
    const ticks = $(".ticks-g", fast);
    phases.forEach((p) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-label", `${p.title}, from hour ${p.hours}`);
      btn.innerHTML = `<img src="img/icons/${p.icon}.webp" alt="" width="28" height="28" />`;
      btn.addEventListener("click", () => { input.value = Math.max(p.hours, 0.5); paint(); });
      dots.appendChild(btn);
      const a = (p.hours / 24) * 2 * Math.PI;
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", (150 + 130 * Math.cos(a)).toFixed(1));
      c.setAttribute("cy", (150 + 130 * Math.sin(a)).toFixed(1));
      c.setAttribute("r", "6");
      c.setAttribute("class", "tick");
      ticks.appendChild(c);
    });
    arc.style.strokeDasharray = `${len}`;
    const fmt = (h) => `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, "0")}m`;
    function paint() {
      const h = Number(input.value);
      let cur = 0;
      phases.forEach((p, i) => { if (p.hours <= h) cur = i; });
      const p = phases[cur];
      const next = phases[cur + 1];
      arc.style.strokeDashoffset = String(len * (1 - h / 24));
      $(".fast-mid b", fast).textContent = fmt(h);
      const left = Math.max(0, goal - h);
      $(".fast-mid span", fast).textContent = left > 0 ? `${fmt(left)} left of ${goal}:8` : `${goal}:8 goal reached`;
      $(".fast-mid img", fast).src = `img/icons/${p.icon}.webp`;
      $(".phase img", fast).src = `img/icons/${p.icon}.webp`;
      $(".phase b", fast).textContent = p.title;
      $(".phase p", fast).textContent = p.body;
      $(".phase-next", fast).innerHTML = next ? `Next: <b>${next.title}</b> in ${fmt(next.hours - h)}` : "The deepest phase Sage tracks.";
      $$("button", dots).forEach((b, i) => { b.classList.toggle("on", i <= cur); b.classList.toggle("cur", i === cur); });
      $$("circle", ticks).forEach((c, i) => c.classList.toggle("on", i <= cur));
      input.setAttribute("aria-valuetext", `${fmt(h)}, ${p.title}`);
    }
    input.addEventListener("input", paint);
    paint();
    if (!calm()) {
      let played = false;
      watch(fast, () => {
        if (played) return;
        played = true;
        const target = Number(input.value);
        tween(0, target, 1400, (x) => { input.value = x; paint(); });
      }, null, 0.5);
    }
  }

  const water = $("[data-stage=water]");
  if (water) {
    const goal = Number(water.dataset.goal);
    const start = Number(water.dataset.start);
    let ml = start;
    let shown = start;
    let count = Number(water.dataset.drinks);
    const out = $(".ml span", water);
    const set = () => {
      const pct = Math.min(100, Math.round((ml / goal) * 100));
      water.style.setProperty("--fill", pct);
      $(".pct", water).textContent = `${pct}%`;
      $(".drinks", water).textContent = `${count} drink${count === 1 ? "" : "s"} today`;
      const from = shown;
      shown = ml;
      tween(from, ml, 620, (x) => { out.textContent = Math.round(x).toLocaleString("en-GB"); });
    };
    $$(".cup", water).forEach((b) => b.addEventListener("click", () => { ml += Number(b.dataset.ml); count += 1; set(); }));
    $(".reset", water).addEventListener("click", () => { ml = start; count = Number(water.dataset.drinks); set(); });
    set();
  }

  const stack = $("[data-stage=stack]");
  if (stack) {
    const rows = $$(".pill-row", stack);
    const toast = $(".xp-toast", stack);
    const base = Number(stack.dataset.xp);
    const max = Number(stack.dataset.max);
    const per = 10;
    let timer = 0;
    const paint = (flash) => {
      const done = rows.filter((r) => r.getAttribute("aria-pressed") === "true").length;
      const xp = base + done * per;
      $(".xp", stack).textContent = `${xp.toLocaleString("en-GB")} / ${max.toLocaleString("en-GB")} XP`;
      $(".lvl .bar", stack).style.setProperty("--fill", ((xp / max) * 100).toFixed(1));
      $(".count", stack).textContent = `${done}/${rows.length} taken`;
      if (flash && !calm()) {
        toast.classList.add("on");
        clearTimeout(timer);
        timer = setTimeout(() => toast.classList.remove("on"), 1100);
      }
    };
    rows.forEach((r) => r.addEventListener("click", () => {
      const on = r.getAttribute("aria-pressed") !== "true";
      r.setAttribute("aria-pressed", String(on));
      const s = $(".streak b", r);
      if (s) s.textContent = Number(s.textContent) + (on ? 1 : -1);
      paint(on);
    }));
    paint(false);
  }
})();
