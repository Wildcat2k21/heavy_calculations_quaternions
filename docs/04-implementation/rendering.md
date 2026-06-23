# Рендеринг (Three.js / WebGL)

Three.js используется **только для визуализации** — вся математика вращения живёт
в Compute-слое.

## Инициализация сцены (`initScene.js`)

- `THREE.Scene` с фоновым цветом;
- `THREE.PerspectiveCamera` (FOV 75°, позиция `(5, 5, −5)`, взгляд в начало);
- `THREE.WebGLRenderer({ antialias: true })`, размер 800×800;
- `OrbitControls` с демпфированием — вращение/зум/панорама мышью.

## Геометрия модели

Модель отрисовывается как **каркас** (`THREE.LineSegments`):

```js
const geometry = new THREE.BufferGeometry();
let positionAttr = new THREE.Float32BufferAttribute(workingVertices, 3);
geometry.setAttribute("position", positionAttr);
const lines = new THREE.LineSegments(geometry, material);
lines.scale.setScalar(5);
```

`workingVertices` — это плоский `Float32Array` отрезков рёбер
(`[x1,y1,z1, x2,y2,z2, …]`), общий с Compute-слоем.

## Inplace-обновление буфера на GPU

Каждый кадр после вращения вершин:

```js
positionAttr.array.set(workingVertices);   // запись в буфер атрибута
positionAttr.needsUpdate = true;            // пометка «обновить на GPU»
```

`needsUpdate = true` заставляет Three.js перезалить буфер на GPU. Сам массив
**не пересоздаётся** — это и есть inplace-парадигма: минимум аллокаций, минимум
нагрузки на сборщик мусора.

## Вспомогательная визуализация

- `THREE.AxesHelper` — координатные оси (X-красный, Y-зелёный, Z-синий);
- `THREE.ArrowHelper` (`makeArrow.js`) — стрелка оси результирующего вращения в
  кватернионном режиме; направление обновляется каждый кадр
  `arrow.setDirection(dir)`.

## Смена модели без утечек

При выборе другой модели создаётся **новый** `Float32BufferAttribute` нужного
размера и подставляется через `geometry.setAttribute("position", …)`; ссылка
`positionAttr` переназначается. Цикл анимации читает актуальные `workingVertices`
и `positionAttr` через замыкание.

## Граница ответственности

| Делает Three.js | Не делает Three.js |
|-----------------|--------------------|
| Сцена, камера, рендер | Вращение вершин (это WASM/JS) |
| Передача буфера на GPU | Композиция кватернионов |
| Управление камерой | Замер производительности |

Такое разделение гарантирует, что бенчмарк измеряет именно стоимость **вращения**,
а не рендеринга, который одинаков для обоих движков.
