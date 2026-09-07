(() => {
  "use strict";

  const root = document.getElementById("ar-lab");
  if (!root) return;

  const targets = {
    beta: {
      tex: "f(x)=60x^3(1-x)^2,\\quad 0\\leq x\\leq1",
      support: "unit",
      xMax: 1,
      target: x => x >= 0 && x <= 1 ? 60 * x ** 3 * (1 - x) ** 2 : 0,
    },
    gamma: {
      tex: "f(x)=\\dfrac{x^{1/2}e^{-x}}{\\Gamma(3/2)},\\quad x>0",
      support: "positive",
      xMax: 8,
      target: x => x > 0 ? (2 / Math.sqrt(Math.PI)) * Math.sqrt(x) * Math.exp(-x) : 0,
    }
  };

  const proposals = {
    uniform1: {
      tex: "g(x)=1,\\quad 0\\leq x\\leq1",
      support: "bounded",
      upper: 1,
      proposal: x => x >= 0 && x <= 1 ? 1 : 0,
      draw: () => Math.random()
    },
    uniform2: {
      tex: "g(x)=\\dfrac12,\\quad 0\\leq x\\leq2",
      support: "bounded",
      upper: 2,
      proposal: x => x >= 0 && x <= 2 ? .5 : 0,
      draw: () => 2 * Math.random()
    },
    exponential: {
      tex: "g(x)=\\dfrac23e^{-2x/3},\\quad x\\geq0",
      support: "positive",
      proposal: x => x >= 0 ? (2 / 3) * Math.exp(-2 * x / 3) : 0,
      draw: () => -1.5 * Math.log(1 - Math.random())
    }
  };

  function checkedValue(name) {
    return document.querySelector(`input[name="${name}"]:checked`).value;
  }

  function makeExperiment() {
    const target = targets[checkedValue("ar-target")];
    const proposal = proposals[checkedValue("ar-proposal")];
    const complete = target.support === "unit" || proposal.support === "positive";
    const envelopeMax = proposal.upper === undefined ? target.xMax : Math.min(target.xMax, proposal.upper);
    let cMin = 0;
    let coveredMass = 0;
    const steps = 30000;
    for (let i = 0; i <= steps; i++) {
      const x = envelopeMax * i / steps;
      const g = proposal.proposal(x);
      if (g > 0) cMin = Math.max(cMin, target.target(x) / g);
      if (!complete) {
        const weight = i === 0 || i === steps ? .5 : 1;
        coveredMass += weight * target.target(x);
      }
    }
    coveredMass = complete ? 1 : coveredMass * envelopeMax / steps;
    const cMax = Math.ceil(Math.max(cMin * 2, cMin + 1.5) * 10) / 10;
    return {
      targetTex: target.tex,
      proposalTex: proposal.tex,
      targetSupport: target.support,
      proposalSupport: proposal.support,
      upper: proposal.upper,
      xMax: target.xMax,
      target: target.target,
      proposal: proposal.proposal,
      draw: proposal.draw,
      complete,
      coveredMass,
      cMin,
      cMax
    };
  }

  const $ = id => document.getElementById(id);
  const ui = {
    targetInputs: [...document.querySelectorAll('input[name="ar-target"]')],
    proposalInputs: [...document.querySelectorAll('input[name="ar-proposal"]')],
    c: $("ar-c"), cValue: $("ar-c-value"), cMin: $("ar-c-min"),
    cMax: $("ar-c-max"), n: $("ar-n"), nValue: $("ar-n-value"), formula: $("ar-formula"),
    run: $("ar-run"), step: $("ar-step"), reset: $("ar-reset"), accepted: $("ar-accepted"),
    trials: $("ar-trials"), rate: $("ar-rate"), theory: $("ar-theory"), status: $("ar-status"),
    envelope: $("ar-envelope"), histogram: $("ar-histogram")
  };

  let experiment;
  let state = { accepted: [], points: [], trials: 0, running: false };

  function current() { return experiment; }
  function cValue() { return Number(ui.c.value); }
  function fmt(value, digits = 3) { return value.toFixed(digits); }

  function configureExample() {
    experiment = makeExperiment();
    const ex = current();
    if (window.MathJax?.typesetClear) window.MathJax.typesetClear([ui.formula]);
    const safeMin = Math.ceil(ex.cMin * 10000) / 10000;
    ui.c.min = safeMin.toFixed(4);
    ui.c.max = ex.cMax;
    ui.c.value = safeMin.toFixed(4);
    ui.cMin.textContent = `${ex.complete ? "最小" : "覆盖区间内最小"} ${ex.cMin.toFixed(3)}`;
    ui.cMax.textContent = ex.cMax.toFixed(1);
    const warning = ex.complete ? "" : `<p class="ar-warning">警告：\\(g\\) 只覆盖到 \\(x=${ex.upper}\\)。实验可以运行，但接受的样本服从截断分布 \\(X\\mid X\\leq ${ex.upper}\\)，不能完整生成目标分布 \\(f\\)。</p>`;
    ui.formula.innerHTML = `<strong>\\(${ex.targetTex}\\)</strong><span>\\(${ex.proposalTex}\\)</span>${warning}`;
    ui.formula.classList.toggle("is-invalid", !ex.complete);
    ui.c.disabled = false;
    if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise([ui.formula]);
    reset();
  }

  function resizeCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(300, rect.width);
    const height = Math.max(240, rect.height);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width, height };
  }

  function plotFrame(canvas, yMax, xMax) {
    const { ctx, width, height } = resizeCanvas(canvas);
    const pad = { left: 48, right: 18, top: 18, bottom: 34 };
    const px = x => pad.left + x / xMax * (width - pad.left - pad.right);
    const py = y => height - pad.bottom - y / yMax * (height - pad.top - pad.bottom);
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "#d9e2ec";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, height - pad.bottom);
    ctx.lineTo(width - pad.right, height - pad.bottom);
    ctx.stroke();
    ctx.fillStyle = "#637083";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "center";
    for (let i = 0; i <= 4; i++) {
      const x = xMax * i / 4;
      ctx.fillText(xMax <= 1 ? x.toFixed(2) : x.toFixed(0), px(x), height - 12);
    }
    ctx.textAlign = "right";
    for (let i = 0; i <= 3; i++) {
      const y = yMax * i / 3;
      ctx.fillText(y.toFixed(yMax < 2 ? 2 : 1), pad.left - 8, py(y) + 4);
    }
    return { ctx, width, height, pad, px, py };
  }

  function curve(ctx, px, py, fn, xMax, color, dash = []) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.setLineDash(dash);
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) {
      const x = xMax * i / 240;
      const y = fn(x);
      if (i === 0) ctx.moveTo(px(x), py(y)); else ctx.lineTo(px(x), py(y));
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawEnvelope() {
    const ex = current();
    const c = cValue();
    let yMax = 0;
    for (let i = 0; i <= 200; i++) {
      const x = ex.xMax * i / 200;
      yMax = Math.max(yMax, ex.target(x), c * ex.proposal(x));
    }
    yMax *= 1.12;
    const { ctx, px, py } = plotFrame(ui.envelope, yMax, ex.xMax);
    curve(ctx, px, py, x => c * ex.proposal(x), ex.xMax, ex.complete ? "#8b9aae" : "#e15d44", [7, 5]);
    curve(ctx, px, py, ex.target, ex.xMax, "#145da0");
    for (const p of state.points) {
      if (p.y > ex.xMax) continue;
      ctx.beginPath();
      ctx.fillStyle = p.ok ? "rgba(24, 154, 122, .68)" : "rgba(225, 93, 68, .62)";
      ctx.arc(px(p.y), py(p.z), 3.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = "italic 600 15px Georgia, serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#145da0";
    ctx.fillText("f(x)", px(ex.xMax * .82), py(ex.target(ex.xMax * .82)) - 8);
    ctx.fillStyle = "#637083";
    const proposalLabelX = ex.complete ? ex.xMax * .68 : Math.min(ex.xMax * .68, ex.upper * .7);
    ctx.fillText("c g(x)", px(proposalLabelX), py(c * ex.proposal(proposalLabelX)) - 8);
  }

  function drawHistogram() {
    const ex = current();
    const bins = ex.xMax === 1 ? 20 : 24;
    const counts = Array(bins).fill(0);
    state.accepted.forEach(x => { if (x <= ex.xMax) counts[Math.min(bins - 1, Math.floor(x / ex.xMax * bins))]++; });
    const binWidth = ex.xMax / bins;
    const density = counts.map(v => state.accepted.length ? v / (state.accepted.length * binWidth) : 0);
    let yMax = Math.max(...density, .1);
    for (let i = 0; i <= 200; i++) yMax = Math.max(yMax, ex.target(ex.xMax * i / 200));
    yMax *= 1.16;
    const { ctx, px, py } = plotFrame(ui.histogram, yMax, ex.xMax);
    const base = py(0);
    density.forEach((d, i) => {
      const x0 = px(i * binWidth), x1 = px((i + 1) * binWidth);
      ctx.fillStyle = "rgba(84, 169, 211, .32)";
      ctx.strokeStyle = "rgba(20, 93, 160, .55)";
      ctx.fillRect(x0 + 1, py(d), Math.max(1, x1 - x0 - 2), base - py(d));
      ctx.strokeRect(x0 + 1, py(d), Math.max(1, x1 - x0 - 2), base - py(d));
    });
    curve(ctx, px, py, ex.target, ex.xMax, "#145da0");
  }

  function update() {
    const ex = current();
    const c = cValue();
    ui.cValue.textContent = fmt(c, c < 2 ? 3 : 2);
    ui.nValue.textContent = ui.n.value;
    ui.accepted.textContent = state.accepted.length.toLocaleString("zh-CN");
    ui.trials.textContent = state.trials.toLocaleString("zh-CN");
    ui.rate.textContent = state.trials ? `${fmt(100 * state.accepted.length / state.trials, 1)}%` : "—";
    ui.theory.textContent = `${fmt(100 * ex.coveredMass / c, 1)}%`;
    drawEnvelope();
    drawHistogram();
  }

  function trial() {
    const ex = current();
    const y = ex.draw();
    const z = Math.random() * cValue() * ex.proposal(y);
    const ok = z <= ex.target(y);
    state.trials++;
    state.points.push({ y, z, ok });
    if (ok) state.accepted.push(y);
    return ok;
  }

  function run() {
    if (state.running) return;
    state.running = true;
    ui.run.disabled = true;
    ui.status.textContent = "正在抽样…";
    const target = Number(ui.n.value);
    const remaining = Math.max(0, target - state.accepted.length);
    const expectedRate = Math.max(.01, current().coveredMass / cValue());
    const expectedTrials = remaining / expectedRate;
    const durationMs = 2000;
    const trialsPerMs = expectedTrials / durationMs;
    let lastTime;
    let trialBudget = 0;
    const tick = now => {
      if (lastTime === undefined) lastTime = now;
      trialBudget += Math.max(0, now - lastTime) * trialsPerMs;
      lastTime = now;
      let attempts = Math.max(1, Math.floor(trialBudget));
      trialBudget = Math.max(0, trialBudget - attempts);
      while (state.accepted.length < target && attempts-- > 0) trial();
      update();
      if (state.accepted.length < target) requestAnimationFrame(tick);
      else {
        state.running = false;
        ui.run.disabled = false;
        ui.status.textContent = `完成 · 接受 ${target} 个样本`;
      }
    };
    requestAnimationFrame(tick);
  }

  function reset() {
    state = { accepted: [], points: [], trials: 0, running: false };
    ui.run.disabled = false;
    ui.step.disabled = false;
    ui.status.textContent = current().complete ? "等待实验" : "可运行 · 输出为截断分布";
    update();
  }

  [...ui.targetInputs, ...ui.proposalInputs].forEach(input => input.addEventListener("change", configureExample));
  ui.c.addEventListener("input", reset);
  ui.n.addEventListener("input", () => { ui.nValue.textContent = ui.n.value; });
  ui.run.addEventListener("click", run);
  ui.step.addEventListener("click", () => {
    if (state.running) return;
    const ok = trial();
    ui.status.textContent = ok ? "本次：接受" : "本次：拒绝";
    update();
  });
  ui.reset.addEventListener("click", reset);
  window.addEventListener("resize", update);
  configureExample();
})();
