/**
 * Генератор диаграмм бенчмарка (SVG, без внешних зависимостей).
 *
 *   node scripts/gen-charts.mjs
 *
 * Источник данных — две бенчмарк-сессии (model.json и model.h.json),
 * Firefox 149 / Ubuntu Linux x86_64, 2026-06-23.
 * Результаты → docs/05-benchmark/images/*.svg
 *
 * При новых замерах: обновить объект DATA и перезапустить скрипт.
 */
import { writeFileSync } from "node:fs";

const OUT = new URL("../docs/05-benchmark/images/", import.meta.url);

// ----------------------------------------------------------------------------
//  ДАННЫЕ ЗАМЕРОВ
// ----------------------------------------------------------------------------
const DATA = {
    lo: { name: "model.json", verts: 50970,
        quatWasm: { avg: 0.183, max: 2, fps: 5454.5 },
        quatJs:   { avg: 0.237, max: 2, fps: 4225.4 },
        matWasm:  { avg: 0.153, max: 1, fps: 6521.7 },
        matJs:    { avg: 0.203, max: 1, fps: 4918.0 } },
    hi: { name: "model.h.json", verts: 326786,
        quatWasm: { avg: 1.170, max: 2, fps: 854.7 },
        quatJs:   { avg: 1.460, max: 3, fps: 684.9 },
        matWasm:  { avg: 0.820, max: 2, fps: 1219.5 },
        matJs:    { avg: 1.280, max: 3, fps: 781.3 } }
};

// Удельная стоимость (мс / вершину) по детальной модели — наименее зашумлена
const N = DATA.hi.verts;
const PV = {
    quatWasm: DATA.hi.quatWasm.avg / N,
    quatJs:   DATA.hi.quatJs.avg   / N,
    matWasm:  DATA.hi.matWasm.avg  / N,
    matJs:    DATA.hi.matJs.avg    / N
};

const COL = {
    wasm: "#7c3aed",   // фиолетовый (как кнопка движка)
    js:   "#d97706",   // оранжевый
    wasm2:"#a78bfa",
    js2:  "#fbbf24",
    grid: "#e6e6e6",
    axis: "#333",
    txt:  "#222",
    sub:  "#666",
    budget60: "#dc2626",
    budget120:"#0ea5e9"
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f = (v, d = 2) => Number(v).toFixed(d);
const nf = (v) => v.toLocaleString("ru-RU");

function svg(w, h, body) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" font-family="'Segoe UI',Roboto,Arial,sans-serif">
<rect width="${w}" height="${h}" fill="#ffffff"/>
${body}
</svg>\n`;
}
function title(w, t, sub) {
    return `<text x="${w/2}" y="30" text-anchor="middle" font-size="18" font-weight="700" fill="${COL.txt}">${esc(t)}</text>` +
        (sub ? `<text x="${w/2}" y="50" text-anchor="middle" font-size="13" fill="${COL.sub}">${esc(sub)}</text>` : "");
}
function legend(x, y, items) {
    return items.map((it, i) => {
        const yy = y + i * 22;
        return `<rect x="${x}" y="${yy-10}" width="14" height="14" rx="2" fill="${it.color}"/>` +
            `<text x="${x+20}" y="${yy+2}" font-size="13" fill="${COL.txt}">${esc(it.label)}</text>`;
    }).join("");
}

// ----------------------------------------------------------------------------
//  Универсальный групповой столбчатый график
// ----------------------------------------------------------------------------
function barChart({ w = 780, h = 470, t, sub, yLabel, categories, series, yMax, fmt = (v) => f(v, 2), legendItems }) {
    const m = { top: 64, right: 200, bottom: 64, left: 66 };
    const pw = w - m.left - m.right, ph = h - m.top - m.bottom;
    const ymax = yMax ?? Math.max(...series.flatMap(s => s.values)) * 1.18;
    const x0 = m.left, y0 = m.top + ph;
    const groupW = pw / categories.length;
    const barW = groupW / (series.length + 1);
    const el = [title(w, t, sub)];

    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
        const v = ymax * i / ticks, y = y0 - ph * i / ticks;
        el.push(`<line x1="${x0}" y1="${y}" x2="${x0+pw}" y2="${y}" stroke="${COL.grid}"/>`);
        el.push(`<text x="${x0-8}" y="${y+4}" text-anchor="end" font-size="11" fill="${COL.sub}">${fmt(v)}</text>`);
    }
    if (yLabel) el.push(`<text x="${16}" y="${m.top+ph/2}" transform="rotate(-90 16 ${m.top+ph/2})" text-anchor="middle" font-size="12" fill="${COL.sub}">${esc(yLabel)}</text>`);

    categories.forEach((cat, ci) => {
        const gx = x0 + groupW * ci;
        series.forEach((s, si) => {
            const v = s.values[ci];
            const bh = ph * v / ymax;
            const bx = gx + barW * (si + 0.5);
            const by = y0 - bh;
            el.push(`<rect x="${bx}" y="${by}" width="${barW}" height="${bh}" fill="${s.color}" rx="2"/>`);
            el.push(`<text x="${bx+barW/2}" y="${by-6}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${COL.txt}">${fmt(v)}</text>`);
        });
        el.push(`<text x="${gx+groupW/2}" y="${y0+22}" text-anchor="middle" font-size="13" fill="${COL.txt}">${esc(cat)}</text>`);
    });

    el.push(`<line x1="${x0}" y1="${y0}" x2="${x0+pw}" y2="${y0}" stroke="${COL.axis}"/>`);
    el.push(`<line x1="${x0}" y1="${m.top}" x2="${x0}" y2="${y0}" stroke="${COL.axis}"/>`);
    el.push(legend(x0 + pw + 24, m.top + 10, legendItems ?? series.map(s => ({ color: s.color, label: s.name }))));
    return svg(w, h, el.join("\n"));
}

// ----------------------------------------------------------------------------
//  Линейный график (для деградации и потенциала)
// ----------------------------------------------------------------------------
function lineChart({ w = 820, h = 480, t, sub, xLabel, yLabel, xMax, yMax, lines, hlines = [], xticks = 5, yticks = 5, xfmt = (v) => v, yfmt = (v) => f(v, 1), annotate = [] }) {
    const m = { top: 64, right: 210, bottom: 66, left: 70 };
    const pw = w - m.left - m.right, ph = h - m.top - m.bottom;
    const x0 = m.left, y0 = m.top + ph;
    const sx = (x) => x0 + pw * x / xMax;
    const sy = (y) => y0 - ph * y / yMax;
    const el = [title(w, t, sub)];

    for (let i = 0; i <= yticks; i++) {
        const v = yMax * i / yticks, y = sy(v);
        el.push(`<line x1="${x0}" y1="${y}" x2="${x0+pw}" y2="${y}" stroke="${COL.grid}"/>`);
        el.push(`<text x="${x0-8}" y="${y+4}" text-anchor="end" font-size="11" fill="${COL.sub}">${yfmt(v)}</text>`);
    }
    for (let i = 0; i <= xticks; i++) {
        const v = xMax * i / xticks, x = sx(v);
        el.push(`<line x1="${x}" y1="${y0}" x2="${x}" y2="${m.top}" stroke="${COL.grid}"/>`);
        el.push(`<text x="${x}" y="${y0+20}" text-anchor="middle" font-size="11" fill="${COL.sub}">${xfmt(v)}</text>`);
    }
    if (xLabel) el.push(`<text x="${x0+pw/2}" y="${h-14}" text-anchor="middle" font-size="12" fill="${COL.sub}">${esc(xLabel)}</text>`);
    if (yLabel) el.push(`<text x="${16}" y="${m.top+ph/2}" transform="rotate(-90 16 ${m.top+ph/2})" text-anchor="middle" font-size="12" fill="${COL.sub}">${esc(yLabel)}</text>`);

    // горизонтальные опорные линии (бюджеты кадра)
    hlines.forEach(hl => {
        const y = sy(hl.y);
        el.push(`<line x1="${x0}" y1="${y}" x2="${x0+pw}" y2="${y}" stroke="${hl.color}" stroke-width="1.5" stroke-dasharray="6 4"/>`);
        el.push(`<text x="${x0+pw-4}" y="${y-6}" text-anchor="end" font-size="11" font-weight="700" fill="${hl.color}">${esc(hl.label)}</text>`);
    });

    // линии данных
    lines.forEach(ln => {
        const pts = ln.points.map(p => `${sx(p[0])},${sy(p[1])}`).join(" ");
        el.push(`<polyline points="${pts}" fill="none" stroke="${ln.color}" stroke-width="${ln.width ?? 2.5}" ${ln.dash ? `stroke-dasharray="${ln.dash}"` : ""}/>`);
        ln.points.forEach(p => { if (p[2]) el.push(`<circle cx="${sx(p[0])}" cy="${sy(p[1])}" r="3.5" fill="${ln.color}"/>`); });
    });

    // аннотации (точки пересечения с бюджетом)
    annotate.forEach(a => {
        el.push(`<circle cx="${sx(a.x)}" cy="${sy(a.y)}" r="4" fill="${a.color}" stroke="#fff" stroke-width="1.5"/>`);
        el.push(`<text x="${sx(a.x)}" y="${sy(a.y)+a.dy}" text-anchor="${a.anchor||'middle'}" font-size="11" font-weight="700" fill="${a.color}">${esc(a.label)}</text>`);
    });

    el.push(`<line x1="${x0}" y1="${y0}" x2="${x0+pw}" y2="${y0}" stroke="${COL.axis}"/>`);
    el.push(`<line x1="${x0}" y1="${m.top}" x2="${x0}" y2="${y0}" stroke="${COL.axis}"/>`);
    el.push(legend(x0 + pw + 22, m.top + 8, lines.map(l => ({ color: l.color, label: l.name }))));
    return svg(w, h, el.join("\n"));
}

// ----------------------------------------------------------------------------
//  Радарная диаграмма
// ----------------------------------------------------------------------------
function radarChart({ w = 640, h = 600, t, sub, axes, series }) {
    const cx = w / 2, cy = h / 2 + 20, R = 200;
    const A = axes.length;
    const ang = (i) => -Math.PI / 2 + i * 2 * Math.PI / A;
    const pt = (i, r) => [cx + R * r * Math.cos(ang(i)), cy + R * r * Math.sin(ang(i))];
    const el = [title(w, t, sub)];

    for (let g = 1; g <= 4; g++) {
        const r = g / 4;
        const poly = axes.map((_, i) => pt(i, r).join(",")).join(" ");
        el.push(`<polygon points="${poly}" fill="none" stroke="${COL.grid}"/>`);
    }
    axes.forEach((ax, i) => {
        const [x, y] = pt(i, 1);
        el.push(`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${COL.grid}"/>`);
        const [lx, ly] = pt(i, 1.16);
        const anchor = Math.abs(lx - cx) < 6 ? "middle" : (lx > cx ? "start" : "end");
        el.push(`<text x="${lx}" y="${ly+4}" text-anchor="${anchor}" font-size="12.5" font-weight="600" fill="${COL.txt}">${esc(ax)}</text>`);
    });
    series.forEach(s => {
        const poly = s.values.map((v, i) => pt(i, v).join(",")).join(" ");
        el.push(`<polygon points="${poly}" fill="${s.color}" fill-opacity="0.12" stroke="${s.color}" stroke-width="2.5"/>`);
        s.values.forEach((v, i) => { const [x, y] = pt(i, v); el.push(`<circle cx="${x}" cy="${y}" r="3" fill="${s.color}"/>`); });
    });
    el.push(legend(24, h - 24 - (series.length - 1) * 22, series.map(s => ({ color: s.color, label: s.name }))));
    return svg(w, h, el.join("\n"));
}

// ============================================================================
//  ПОСТРОЕНИЕ ДИАГРАММ
// ============================================================================

// 1. Среднее время кадра (детальная модель) — bar
writeFileSync(new URL("frame-time-chart.svg", OUT), barChart({
    t: "Среднее время кадра (compute)",
    sub: `${DATA.hi.name} · ${nf(DATA.hi.verts)} вершин · меньше — лучше`,
    yLabel: "Время кадра, мс",
    categories: ["Кватернион", "Матрица"],
    series: [
        { name: "WASM", color: COL.wasm, values: [DATA.hi.quatWasm.avg, DATA.hi.matWasm.avg] },
        { name: "JS",   color: COL.js,   values: [DATA.hi.quatJs.avg,   DATA.hi.matJs.avg] }
    ],
    fmt: (v) => f(v, 2)
}));

// 2. Средний FPS (детальная модель) — bar
writeFileSync(new URL("fps-chart.svg", OUT), barChart({
    t: "Средний FPS (потолок по compute)",
    sub: `${DATA.hi.name} · ${nf(DATA.hi.verts)} вершин · больше — лучше`,
    yLabel: "FPS = 1000 / avg",
    categories: ["Кватернион", "Матрица"],
    series: [
        { name: "WASM", color: COL.wasm, values: [DATA.hi.quatWasm.fps, DATA.hi.matWasm.fps] },
        { name: "JS",   color: COL.js,   values: [DATA.hi.quatJs.fps,   DATA.hi.matJs.fps] }
    ],
    fmt: (v) => f(v, 0)
}));

// 3. Радар — многокритериальная оценка (нормировано 0..1, выше — лучше)
writeFileSync(new URL("radar-chart.svg", OUT), radarChart({
    t: "Многокритериальная оценка",
    sub: "нормировано 0…1 (детальная модель); часть осей — качественные",
    axes: ["Производительность", "Точность", "Масштабируемость", "Простота", "Стабильность"],
    series: [
        { name: "WASM · Матрица",    color: COL.wasm,  values: [1.00, 1.00, 1.00, 0.65, 0.85] },
        { name: "WASM · Кватернион", color: COL.wasm2, values: [0.70, 1.00, 0.84, 0.55, 0.90] },
        { name: "JS · Матрица",      color: COL.js,    values: [0.64, 1.00, 0.85, 1.00, 0.70] },
        { name: "JS · Кватернион",   color: COL.js2,   values: [0.56, 1.00, 0.87, 0.85, 0.65] }
    ]
}));

// 4. Деградация по вершинам (измеренные точки lo→hi) — line
const degMax = 360000;
const degLine = (key, name, color, dash) => ({
    name, color, dash,
    points: [[0, 0, false], [DATA.lo.verts, DATA.lo[key].avg, true], [DATA.hi.verts, DATA.hi[key].avg, true]]
});
writeFileSync(new URL("degradation-chart.svg", OUT), lineChart({
    t: "Деградация: время кадра vs число вершин",
    sub: "измеренные точки (50 970 и 326 786 вершин) — рост близок к линейному",
    xLabel: "Число вершин буфера (рёбра × 2)",
    yLabel: "Среднее время кадра, мс",
    xMax: degMax, yMax: 1.6, xticks: 6, yticks: 4,
    xfmt: (v) => (v / 1000).toFixed(0) + "k",
    yfmt: (v) => f(v, 2),
    lines: [
        degLine("quatWasm", "WASM · Кватернион", COL.wasm),
        degLine("quatJs",   "JS · Кватернион",   COL.js),
        degLine("matWasm",  "WASM · Матрица",    COL.wasm2),
        degLine("matJs",    "JS · Матрица",      COL.js2)
    ]
}));

// 5. ПОТЕНЦИАЛ WASM — экстраполяция к крупным сценам + бюджеты кадра
const potMaxX = 10_000_000;
const potMaxY = 45;
const FPS60 = 1000 / 60, FPS120 = 1000 / 120;
const potLine = (key, name, color, dash) => ({
    name, color, dash, width: 2.5,
    points: [[0, 0, false], [potMaxX, PV[key] * potMaxX, false]]
});
const cap = (key, budget) => budget / PV[key]; // вершин при заданном бюджете
writeFileSync(new URL("wasm-potential.svg", OUT), lineChart({
    t: "Потенциал WASM: запас геометрии при реальном времени",
    sub: "экстраполяция удельной стоимости на крупные сцены · ниже линии бюджета = укладываемся в FPS",
    xLabel: "Число вершин (экстраполяция)",
    yLabel: "Прогноз времени кадра, мс",
    xMax: potMaxX, yMax: potMaxY, xticks: 5, yticks: 5,
    xfmt: (v) => (v / 1e6).toFixed(0) + "M",
    yfmt: (v) => f(v, 0),
    hlines: [
        { y: FPS60, color: COL.budget60, label: "бюджет 60 FPS (16.7 мс)" },
        { y: FPS120, color: COL.budget120, label: "бюджет 120 FPS (8.3 мс)" }
    ],
    lines: [
        potLine("quatWasm", "WASM · Кватернион", COL.wasm),
        potLine("quatJs",   "JS · Кватернион",   COL.js),
        potLine("matWasm",  "WASM · Матрица",    COL.wasm2),
        potLine("matJs",    "JS · Матрица",      COL.js2)
    ],
    annotate: [
        { x: cap("matWasm", FPS60),  y: FPS60, color: COL.wasm2, label: (cap("matWasm", FPS60)/1e6).toFixed(1)+"M", dy: -8, anchor: "middle" },
        { x: cap("quatWasm", FPS60), y: FPS60, color: COL.wasm,  label: (cap("quatWasm", FPS60)/1e6).toFixed(1)+"M", dy: 18, anchor: "middle" },
        { x: cap("matJs", FPS60),    y: FPS60, color: COL.js2,   label: (cap("matJs", FPS60)/1e6).toFixed(1)+"M", dy: -8, anchor: "middle" },
        { x: cap("quatJs", FPS60),   y: FPS60, color: COL.js,    label: (cap("quatJs", FPS60)/1e6).toFixed(1)+"M", dy: 18, anchor: "middle" }
    ]
}));

// ----------------------------------------------------------------------------
//  Сводка в консоль (для проверки/документации)
// ----------------------------------------------------------------------------
console.log("Удельная стоимость, нс/вершину:");
for (const k of Object.keys(PV)) console.log(`  ${k.padEnd(9)} = ${(PV[k]*1e6).toFixed(2)} нс`);
console.log("\nЁмкость при 60 FPS (16.67 мс), млн вершин:");
for (const k of Object.keys(PV)) console.log(`  ${k.padEnd(9)} = ${(cap(k, FPS60)/1e6).toFixed(2)} M`);
console.log("\nЗапас WASM vs JS при 60 FPS:");
console.log(`  Кватернион: +${((cap("quatWasm",FPS60)-cap("quatJs",FPS60))/1e6).toFixed(2)} M (+${(((cap("quatWasm",FPS60)/cap("quatJs",FPS60))-1)*100).toFixed(0)}%)`);
console.log(`  Матрица:    +${((cap("matWasm",FPS60)-cap("matJs",FPS60))/1e6).toFixed(2)} M (+${(((cap("matWasm",FPS60)/cap("matJs",FPS60))-1)*100).toFixed(0)}%)`);
console.log("\nSVG-диаграммы записаны в docs/05-benchmark/images/");
