# JS-слой (координация и состояние)

JavaScript отвечает за состояние стенда, сборку результирующего вращения,
анимацию и подготовку геометрии — но **не** за «горячий» расчёт вершин (он в
Compute-слое).

## Математические типы (`src/math/`)

| Файл | Содержание |
|------|-----------|
| `vec3.js` | `Vec3` — операции с векторами (add, sub, mul, dot, cross, normalize) |
| `qut.js` | `Quat` — кватернион: `Identity()`, `FromAxisAngle()`, `mul()`, `normalize()`, `FromEuler()` |
| `mat.js` | матричные помощники |
| **`rotations-js.js`** | **JS-fallback ядра** — `rotateVerticesAxisAngleJS`, `rotByRotmatJS` |

`rotations-js.js` — ключевой артефакт исследования: построчный аналог Rust-ядра на
чистом JS (см. [wasm-bridge.md](wasm-bridge.md)).

## Хелперы координации (`src/components/WebGL/lib/`)

| Файл | Назначение |
|------|-----------|
| `normalizeModel.js` | вычисляет `{ center, scale }` по габаритам модели |
| `applyNormalize.js` | разворачивает рёбра в плоский массив отрезков, центрирует и масштабирует |
| `buildResultQuaternion.js` | композиция кватернионов всех узлов: `q = q₁·q₂·…·qₙ` |
| `quatToAxisAngle.js` | перевод результирующего кватерниона обратно в ось-угол |
| `updateUnits.js` | анимация прогресса угла (0↔1, bounce) для каждого узла |
| `makeArrow.js` | стрелка-визуализация оси результирующего вращения |
| `createRotationItem.js` | создание/монтаж UI-узла вращения и подписка на удаление |

## Логика построения вращения

### Кватернионный режим (`rmethod = 1`)
```
updateUnits()            → продвинуть прогресс каждого узла
buildResultQuaternion()  → q_final = произведение кватернионов узлов
quatToAxisAngle(q_final) → { axis, angle }
applyRotation()          → rotateQuat(workingVertices, axis, angle)
```

### Матричный режим (`rmethod = 2`)
```
updateUnits()            → продвинуть прогресс
для каждого узла:
    angle = amin + (amax - amin) · progress
    rotateMat(workingVertices, angle, rotm)   // rotm ∈ {0,1,2}
```

## Состояние UI и компонентная модель

Тонкий класс `Component` (`src/utils/Component.js`) даёт шаблонизацию, монтаж и
событийную модель (`on`/`emit` с всплытием). Узлы вращения (`Quaternion`,
`Rotmat`) хранят своё состояние в `store.state` и привязывают DOM-инпуты к нему,
обновляя поля по событию `input`.

Глобальное состояние стенда (`engineMode`, `currentModelKey`, `rotation`,
`benchmarkRunning`) держится в замыкании `Sketch.onMount` —
[src/components/WebGL/index.js](../../src/components/WebGL/index.js).
