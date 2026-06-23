# Поток данных

## Инициализация (однократно при загрузке)

```
  model.json / model.h.json
         │  fetch + JSON.parse
         ▼
  { vertices:[{x,y,z}…], edges:[{a,b}…] }
         │  normalizeModel()   → { center, scale }
         ▼
  applyNormalize()  — рёбра → плоский массив отрезков
         │
         ▼
  baseVertices : Float32Array  [x1,y1,z1, x2,y2,z2, …]   (эталон, не меняется)
         │  copy
         ▼
  workingVertices : Float32Array   (рабочий буфер, вращается каждый кадр)
         │  setAttribute("position")
         ▼
  THREE.BufferGeometry → THREE.LineSegments → scene
```

## Кадровый цикл `animate()` (каждый кадр)

```
            requestAnimationFrame
                    │
                    ▼
        dt = (now - last) / 1000          ← обновление FPS (EMA)
                    │
       benchmarkRunning ? ── да ──► пропустить вычисление (только render)
                    │ нет
                    ▼
        updateUnits(items, dt)            ← анимация прогресса угла
                    │
                    ▼
        ┌───────── applyRotation() ─────────┐
        │  workingVertices.set(baseVertices) │  ← сброс к эталону
        │  ┌──────── ИЗМЕРЯЕМЫЙ БЛОК ───────┐ │
        │  │ t0 = performance.now()         │ │
        │  │ rotateQuat() / rotateMat()     │ │  ← WASM или JS (по engineMode)
        │  │ dt = performance.now() - t0    │ │
        │  └────────────────────────────────┘ │
        │  positionAttr.array.set(working)    │  ← push на GPU
        │  positionAttr.needsUpdate = true    │
        └─────────────────────────────────────┘
                    │  возвращает время блока (мс)
                    ▼
        computeEMA ← сглаживание; updateMetrics()
                    │
                    ▼
        controls.update(); renderer.render(scene, camera)
```

### Ключевые свойства потока

1. **Эталон + рабочий буфер.** `baseVertices` хранит исходную геометрию;
   `workingVertices` каждый кадр сбрасывается к эталону и поворачивается заново.
   Это исключает накопление ошибки между кадрами.
2. **Изолированный замер.** Измеряется **только** вызов вращения. Сброс буфера и
   передача на GPU — общие для обоих движков и в замер не входят.
3. **Маршалинг для WASM.** При WASM-вызове `Float32Array` копируется в линейную
   память WASM и обратно (через `wasm-bindgen`). Этот накладной расход — часть
   честной цены WASM и входит в измеряемый блок.

## Поток данных в бенчмарк-сессии

```
  Запуск бенчмарка
        │  benchmarkRunning = true  (живой расчёт приостановлен)
        ▼
  для каждого сочетания {Кватернион,Матрица} × {WASM,JS}:
        │  buf.set(baseVertices)                    ← сброс (вне замера)
        │  прогрев 30 кадров
        │  300 кадров: измерить время одного вращения, угол свипуется 0..2π
        │  каждые 50 кадров — уступить поток браузеру (nextFrame)
        ▼
  frameStats(times) → { min, max, avg, fps = 1000/avg }
        │
        ▼
  maxDiff("quat"), maxDiff("mat")  ← проверка корректности WASM vs JS
        │
        ▼
  HTML-таблица + текстовый отчёт "=== BENCHMARK SESSION ==="
```

## Переключение модели (ЭКС-5)

```
  select.change → loadModel(path)
        → новый baseVertices / workingVertices
        → новый Float32BufferAttribute → geometry.setAttribute("position")
        → updateMetrics()
```
