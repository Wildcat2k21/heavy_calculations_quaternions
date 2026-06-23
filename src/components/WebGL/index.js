import * as THREE from "three";
import Component from "../../utils/Component.js";
import './index.css';

import { initScene } from "./initScene.js";

import {
    applyNormalize,
    buildResultQuaternion,
    makeArrow,
    normalizeModel,
    quatToAxisAngle,
    updateUnits,
    createRotationItem
} from './lib';

import init, {
    rotate_vertices_axis_angle_inplace,
    rot_by_rotmat_inplace
} from "../rotation-core-wasm/rotation_core.js";

// JS-fallback ядро вычислений (см. src/math/rotations-js.js)
import {
    rotateVerticesAxisAngleJS,
    rotByRotmatJS
} from "../../math/rotations-js.js";

import Quaternion from '../Quaternion';
import Rotmat from '../Rotmat';

// Доступные модели для исследования масштабируемости
const MODELS = {
    "model.json":   { path: "/model.json",   label: "model.json (менее детальная)" },
    "model.h.json": { path: "/model.h.json", label: "model.h.json (детальная)" }
};

let Sketch = new Component(/*html*/`
    <div class="main">
        <div class="metrics-overlay" id="metrics-overlay">
            <div class="metrics-row">Движок: <b id="m-engine">WASM</b></div>
            <div class="metrics-row">FPS: <b id="m-fps">—</b></div>
            <div class="metrics-row">Кадр (compute): <b id="m-frame">—</b> ms</div>
            <div class="metrics-row">Вершин: <b id="m-verts">—</b></div>
        </div>
    </div>
    <div class="panel">
        <div class="control">
            <img src="./quat.png" class="method-info" alt="quat"></img>
        </div>

        <div class="bench-bar">
            <label class="bench-bar__field">
                <span>Движок:</span>
                <button id="engine-toggle" class="engine-btn" type="button">WASM</button>
            </label>
            <label class="bench-bar__field">
                <span>Модель:</span>
                <select id="model-select">
                    <option value="model.h.json">model.h.json (детальная)</option>
                    <option value="model.json">model.json (менее детальная)</option>
                </select>
            </label>
        </div>

        <input type="button" value="Через ось r" id="add-q-unit" ></input>
        <input type="button" value="Матрица поворота X или Y или Z" id="add-rotmat" ></input>
        <input type="button" value="Очистить все" id="clear-all" ></input>

        <input type="button" value="▶ Запустить бенчмарк (300 кадров × 4 режима)" id="run-benchmark" class="bench-run-btn"></input>
        <div id="benchmark-results" class="bench-results"></div>
    </div>
`);

function clearAllRotations(rotationItems = []){
    rotationItems.forEach((item) => item.remove());
    rotationItems.length = 0;
}

function addRotationItem(rotation, defrm, container, comp){
    if(rotation.method !== defrm) {
        clearAllRotations(rotation.items);
    }

    createRotationItem(container, rotation.items, comp);
    rotation.method = defrm;
}

// Ожидание следующего кадра — даёт браузеру перерисовать UI между этапами бенчмарка
function nextFrame(){
    return new Promise(requestAnimationFrame);
}

// Статистика по массиву времён кадров (мс)
function frameStats(times){
    let min = Infinity, max = -Infinity, sum = 0;
    for (const t of times) {
        if (t < min) min = t;
        if (t > max) max = t;
        sum += t;
    }
    const avg = sum / times.length;
    return { min, max, avg, fps: avg > 0 ? 1000 / avg : 0 };
}

Sketch.onMount = async (comp) => {

    let { container, _ } = comp;

    await init();
    const { scene, camera, renderer, controls } = initScene(
        container.querySelector(".main")
    );

    // --- Состояние исследовательского стенда ---
    let engineMode = "wasm"; // 'wasm' | 'js' — активный движок вычислений
    let benchmarkRunning = false;
    let currentModelKey = "model.h.json";

    // Хранилище вращений объекта
    let rotation = {
        method: null, // 1 - группа вращений через unit вектор и угол. 2 - матрицы Rx, Ry, Rz
        items: []
    };

    container.querySelector("#add-q-unit").addEventListener('click', () =>
        addRotationItem(rotation, 1, container, Quaternion));

    container.querySelector("#add-rotmat").addEventListener('click', () =>
        addRotationItem(rotation, 2, container, Rotmat));

    container.querySelector("#clear-all").addEventListener('click', () => {
        if(rotation.items.length !== 0) {
            clearAllRotations(rotation.items);
        }
    });

    // Освещение
    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);

    // Правим поворот сцены
    scene.rotation.x = -Math.PI / 2;

    // --- Загрузка модели (с возможностью переключения) ---
    async function loadModel(path){
        const model = await fetch(path).then(r => r.json());
        const norm = normalizeModel(model);
        const base = new Float32Array(applyNormalize(model, norm));
        const working = new Float32Array(base);
        return { base, working };
    }

    let { base: baseVertices, working: workingVertices } =
        await loadModel(MODELS[currentModelKey].path);

    // Объект geometry
    const geometry = new THREE.BufferGeometry();
    let positionAttr = new THREE.Float32BufferAttribute(workingVertices, 3);
    geometry.setAttribute("position", positionAttr);

    const material = new THREE.LineBasicMaterial({
        color: 0x000000
    });

    const lines = new THREE.LineSegments(
        geometry,
        material
    );

    lines.scale.setScalar(5); // Маштаб
    scene.add(lines);

    // Вспомогательные оси
    // X (i) красный
    // Y (j) зелёный
    // Z (k) синий
    const axes = new THREE.AxesHelper(2);
    scene.add(axes);

    // Стрелка результирующего кватерниона
    let arrow = makeArrow(scene, "#d90000");
    scene.add(arrow);

    // --- Элементы оверлея метрик ---
    const mEngine = container.querySelector("#m-engine");
    const mFps = container.querySelector("#m-fps");
    const mFrame = container.querySelector("#m-frame");
    const mVerts = container.querySelector("#m-verts");

    let fpsEMA = 0;       // сглаженный FPS
    let computeEMA = 0;   // сглаженное время блока вычислений (мс)

    function updateMetrics(){
        mEngine.textContent = engineMode.toUpperCase();
        mFps.textContent = fpsEMA ? Math.round(fpsEMA) : "—";
        mFrame.textContent = computeEMA ? computeEMA.toFixed(3) : "—";
        mVerts.textContent = (workingVertices.length / 3).toLocaleString("ru-RU");
    }
    updateMetrics();

    // --- Переключатель движка WASM / JS ---
    const engineToggle = container.querySelector("#engine-toggle");
    engineToggle.addEventListener("click", () => {
        engineMode = engineMode === "wasm" ? "js" : "wasm";
        engineToggle.textContent = engineMode.toUpperCase();
        engineToggle.classList.toggle("engine-btn--js", engineMode === "js");
        computeEMA = 0; // сброс сглаживания при смене движка
        updateMetrics();
    });

    // --- Селектор модели ---
    const modelSelect = container.querySelector("#model-select");
    modelSelect.value = currentModelKey;
    modelSelect.addEventListener("change", async () => {
        currentModelKey = modelSelect.value;
        const { base, working } = await loadModel(MODELS[currentModelKey].path);
        baseVertices = base;
        workingVertices = working;
        positionAttr = new THREE.Float32BufferAttribute(workingVertices, 3);
        geometry.setAttribute("position", positionAttr);
        computeEMA = 0;
        updateMetrics();
    });

    // --- Единая точка вызова вычислительного ядра ---
    // Возвращает время блока вычислений (мс) для активного движка.
    function rotateQuat(buffer, axis, angle){
        if (engineMode === "wasm") {
            rotate_vertices_axis_angle_inplace(buffer, axis[0], axis[1], axis[2], angle);
        } else {
            rotateVerticesAxisAngleJS(buffer, axis[0], axis[1], axis[2], angle);
        }
    }

    function rotateMat(buffer, angle, rotm){
        if (engineMode === "wasm") {
            rot_by_rotmat_inplace(buffer, angle, rotm);
        } else {
            rotByRotmatJS(buffer, angle, rotm);
        }
    }

    // Применяет текущее вращение к рабочему буферу. Возвращает время
    // блока вычислений (мс) либо null, если метод не выбран.
    function applyRotation(){
        if (rotation.method === 1) {
            const qFinal = buildResultQuaternion(rotation.items);
            const { axis, angle } = quatToAxisAngle(qFinal);

            workingVertices.set(baseVertices);              // сброс

            const t0 = performance.now();
            rotateQuat(workingVertices, axis, angle);       // вращение (измеряем)
            const dt = performance.now() - t0;

            positionAttr.array.set(workingVertices);        // push to GPU
            positionAttr.needsUpdate = true;

            const dir = new THREE.Vector3(axis[0], axis[1], axis[2]).normalize();
            arrow.setDirection(dir);

            return dt;
        }

        if (rotation.method === 2) {
            workingVertices.set(baseVertices);              // сброс

            const t0 = performance.now();
            for (const item of rotation.items) {            // вращение (измеряем)
                const s = item.state;
                const angle = s.amin + (s.amax - s.amin) * s.progress;
                rotateMat(workingVertices, angle, s.rotm);
            }
            const dt = performance.now() - t0;

            positionAttr.array.set(workingVertices);        // push to GPU
            positionAttr.needsUpdate = true;

            return dt;
        }

        return null;
    }

    let last = performance.now();

    // Цикл анимации
    function animate() {
        requestAnimationFrame(animate);

        const now = performance.now();
        const dt = (now - last) / 1000;
        last = now;

        // FPS — экспоненциальное скользящее среднее
        if (dt > 0) {
            const inst = 1 / dt;
            fpsEMA = fpsEMA ? fpsEMA * 0.9 + inst * 0.1 : inst;
        }

        // Во время бенчмарка живой цикл не считает вращение,
        // чтобы не конкурировать за CPU с замером.
        if (!benchmarkRunning) {
            updateUnits(rotation.items, dt);

            const computeMs = applyRotation();
            if (computeMs !== null) {
                computeEMA = computeEMA ? computeEMA * 0.9 + computeMs * 0.1 : computeMs;
            }

            updateMetrics();
        }

        controls.update();
        renderer.render(scene, camera);
    }

    animate();

    // ============================================================
    //  БЕНЧМАРК-СЕССИЯ
    //  Прогон 300 кадров для всех 4 комбинаций {метод} × {движок}.
    //  Измеряется время блока вычислений (только сама операция
    //  вращения — общая для обоих движков часть, reset/GPU/render,
    //  из замера исключена, чтобы изолировать разницу движков).
    // ============================================================
    const runBtn = container.querySelector("#run-benchmark");
    const resultsEl = container.querySelector("#benchmark-results");

    const FRAMES = 300;
    const WARMUP = 30;

    // Фиксированная ось для кватерниона (нормированная (1,1,1))
    const benchAxis = (() => {
        const l = Math.sqrt(3);
        return [1 / l, 1 / l, 1 / l];
    })();

    // Один проход замера: 300 кадров, угол свипуется по 0..2π.
    // Каждые YIELD_EVERY кадров уступаем поток браузеру, чтобы вкладка
    // не «зависала» на тяжёлой модели (на сам измеряемый блок не влияет —
    // время каждого кадра меряется независимо через performance.now()).
    const YIELD_EVERY = 50;
    async function measure(kind, engine, buf){
        const rotate = (angle) => {
            if (kind === "quat") {
                if (engine === "wasm")
                    rotate_vertices_axis_angle_inplace(buf, benchAxis[0], benchAxis[1], benchAxis[2], angle);
                else
                    rotateVerticesAxisAngleJS(buf, benchAxis[0], benchAxis[1], benchAxis[2], angle);
            } else {
                if (engine === "wasm")
                    rot_by_rotmat_inplace(buf, angle, 0);  // Rx
                else
                    rotByRotmatJS(buf, angle, 0);
            }
        };

        // Прогрев (JIT, кэши) — не учитывается
        for (let f = 0; f < WARMUP; f++) {
            buf.set(baseVertices);
            rotate((f / FRAMES) * Math.PI * 2);
        }

        const times = new Array(FRAMES);
        for (let f = 0; f < FRAMES; f++) {
            const angle = (f / FRAMES) * Math.PI * 2;
            buf.set(baseVertices);              // сброс (вне замера)
            const t0 = performance.now();
            rotate(angle);                      // ← измеряемый блок
            times[f] = performance.now() - t0;

            if ((f + 1) % YIELD_EVERY === 0) await nextFrame();
        }

        return frameStats(times);
    }

    // Проверка математической корректности: max |WASM − JS| на одном кадре
    function maxDiff(kind){
        const angle = Math.PI / 3;
        const a = new Float32Array(baseVertices);
        const b = new Float32Array(baseVertices);
        if (kind === "quat") {
            rotate_vertices_axis_angle_inplace(a, benchAxis[0], benchAxis[1], benchAxis[2], angle);
            rotateVerticesAxisAngleJS(b, benchAxis[0], benchAxis[1], benchAxis[2], angle);
        } else {
            rot_by_rotmat_inplace(a, angle, 0);
            rotByRotmatJS(b, angle, 0);
        }
        let d = 0;
        for (let i = 0; i < a.length; i++) {
            const diff = Math.abs(a[i] - b[i]);
            if (diff > d) d = diff;
        }
        return d;
    }

    function fmt(n, digits = 3){
        return Number(n).toFixed(digits);
    }

    async function runBenchmark(){
        if (benchmarkRunning) return;
        benchmarkRunning = true;
        runBtn.disabled = true;
        const prevEngineLabel = engineMode.toUpperCase();

        const vertCount = workingVertices.length / 3;
        const modelLabel = MODELS[currentModelKey].label;

        resultsEl.innerHTML =
            `<p class="bench-status">Идёт замер… (модель: ${modelLabel}, вершин: ${vertCount.toLocaleString("ru-RU")})</p>`;
        await nextFrame();
        await nextFrame();

        const buf = new Float32Array(baseVertices);

        // Порядок: чередуем движки, чтобы сгладить тепловой/частотный дрейф CPU
        const combos = [
            { key: "quat-wasm", method: "Кватернион", engine: "WASM", kind: "quat", eng: "wasm" },
            { key: "quat-js",   method: "Кватернион", engine: "JS",   kind: "quat", eng: "js"   },
            { key: "mat-wasm",  method: "Матрица",    engine: "WASM", kind: "mat",  eng: "wasm" },
            { key: "mat-js",    method: "Матрица",    engine: "JS",   kind: "mat",  eng: "js"   }
        ];

        const results = [];
        for (const c of combos) {
            resultsEl.innerHTML =
                `<p class="bench-status">Замер: ${c.method} / ${c.engine}…</p>`;
            await nextFrame();
            await nextFrame();
            const stat = await measure(c.kind, c.eng, buf);
            results.push({ ...c, ...stat });
        }

        const diffQuat = maxDiff("quat");
        const diffMat = maxDiff("mat");

        // --- HTML-таблица ---
        const rows = results.map(r => `
            <tr>
                <td>${r.method}</td>
                <td><b>${r.engine}</b></td>
                <td>${vertCount.toLocaleString("ru-RU")}</td>
                <td>${fmt(r.fps, 1)}</td>
                <td>${fmt(r.min)}</td>
                <td>${fmt(r.max)}</td>
                <td>${fmt(r.avg)}</td>
            </tr>`).join("");

        // Ускорение WASM относительно JS
        const speedup = (kind) => {
            const w = results.find(r => r.kind === kind && r.eng === "wasm");
            const j = results.find(r => r.kind === kind && r.eng === "js");
            return (j.avg / w.avg);
        };

        // --- Текстовый блок в формате п.10 плана (для передачи нейросети) ---
        const now = new Date();
        const date = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;
        const ua = navigator.userAgent;

        const block = (r) =>
`--- ${r.engine} / ${r.method} ---
Frames: ${FRAMES}
Min frame time: ${fmt(r.min)} ms
Max frame time: ${fmt(r.max)} ms
Avg frame time: ${fmt(r.avg)} ms
Avg FPS: ${fmt(r.fps, 1)}`;

        const sessionText =
`=== BENCHMARK SESSION ===
Дата: ${date}
Браузер/UA: ${ua}
Модель: ${MODELS[currentModelKey].path.replace("/", "")}
Кол-во вершин (буфер, len/3): ${vertCount}
Прогрев: ${WARMUP} кадров (не учитывается)

${results.map(block).join("\n\n")}

--- КОРРЕКТНОСТЬ (max |WASM − JS|) ---
Кватернион: ${diffQuat.toExponential(3)}
Матрица:    ${diffMat.toExponential(3)}

--- УСКОРЕНИЕ WASM vs JS (по avg frame time) ---
Кватернион: x${fmt(speedup("quat"), 2)}
Матрица:    x${fmt(speedup("mat"), 2)}
=========================`;

        resultsEl.innerHTML = `
            <h3 class="bench-title">Результаты бенчмарка</h3>
            <p class="bench-meta">Модель: <b>${modelLabel}</b> · вершин: <b>${vertCount.toLocaleString("ru-RU")}</b> · кадров: <b>${FRAMES}</b></p>
            <table class="bench-table">
                <thead>
                    <tr>
                        <th>Метод</th><th>Движок</th><th>Вершин</th>
                        <th>Ср. FPS</th><th>Min, ms</th><th>Max, ms</th><th>Ср., ms</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            <p class="bench-meta">
                Ускорение WASM vs JS: кватернион <b>×${fmt(speedup("quat"), 2)}</b>,
                матрица <b>×${fmt(speedup("mat"), 2)}</b>
            </p>
            <p class="bench-meta">
                Корректность (max |WASM−JS|): кватернион <b>${diffQuat.toExponential(2)}</b>,
                матрица <b>${diffMat.toExponential(2)}</b>
            </p>
            <p class="bench-meta">Скопируйте блок ниже и передайте для оформления docs/05-benchmark/:</p>
            <textarea class="bench-session" readonly rows="22">${sessionText}</textarea>
            <button type="button" class="bench-copy-btn" id="bench-copy">Копировать в буфер обмена</button>
        `;

        const copyBtn = container.querySelector("#bench-copy");
        copyBtn.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(sessionText);
                copyBtn.textContent = "Скопировано ✓";
            } catch {
                const ta = container.querySelector(".bench-session");
                ta.select();
                document.execCommand("copy");
                copyBtn.textContent = "Скопировано ✓";
            }
            setTimeout(() => { copyBtn.textContent = "Копировать в буфер обмена"; }, 1500);
        });

        // Восстановление живого режима
        benchmarkRunning = false;
        runBtn.disabled = false;
        engineToggle.textContent = prevEngineLabel;
        computeEMA = 0;
    }

    runBtn.addEventListener("click", runBenchmark);
};

export default Sketch;
