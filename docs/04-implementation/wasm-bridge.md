# WASM-мост и JS-fallback

## Генерация обвязки (wasm-bindgen)

Rust-крейт `rotation-core` компилируется в WASM; `wasm-bindgen` генерирует
JS-обвязку в `src/components/rotation-core-wasm/`:

```
rotation-core-wasm/
├── rotation_core.js        # init() + JS-обёртки экспортируемых функций
├── rotation_core_bg.wasm   # бинарный модуль
├── rotation_core.d.ts      # типы
└── package.json
```

Инициализация в стенде:

```js
import init, {
    rotate_vertices_axis_angle_inplace,
    rot_by_rotmat_inplace
} from "../rotation-core-wasm/rotation_core.js";

await init();   // загрузка и инстанцирование .wasm перед использованием
```

## Маршалинг `Float32Array`

Каждый WASM-вызов с массивом проходит через копирование в линейную память WASM и
обратно:

```js
function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);   // JS → WASM
    return ptr;
}
// после вызова результат копируется обратно в исходный Float32Array (JS ← WASM)
```

> **Важно для исследования.** Этот маршалинг — реальная цена WASM-пути, поэтому он
> **включён** в измеряемый блок. На малых массивах накладные расходы копирования
> могут нивелировать выигрыш от нативного кода (гипотеза H5).

## JS-fallback: `src/math/rotations-js.js`

Чтобы сравнение «WASM vs JS» было корректным, JS-реализация **построчно повторяет
алгоритмы Rust** (та же формула Родрига, те же матрицы Rx/Ry/Rz, тоже inplace):

| WASM (Rust, `lib.rs`) | JS-fallback (`rotations-js.js`) |
|-----------------------|----------------------------------|
| `rotate_vertices_axis_angle_inplace` | `rotateVerticesAxisAngleJS` |
| `rot_by_rotmat_inplace` | `rotByRotmatJS` |

### Единая точка переключения
В [WebGL/index.js](../../src/components/WebGL/index.js) выбор движка скрыт за
диспетчерами:

```js
function rotateQuat(buffer, axis, angle){
    engineMode === "wasm"
        ? rotate_vertices_axis_angle_inplace(buffer, axis[0], axis[1], axis[2], angle)
        : rotateVerticesAxisAngleJS(buffer, axis[0], axis[1], axis[2], angle);
}
```

Остальной код (анимация, метрики, бенчмарк) не знает, какой движок активен.

## Проверка корректности (принцип «математика важнее скорости»)

JS-fallback численно сверен с WASM на наборе тестовых векторов и углов:

```
Кватернион: worst |WASM − JS| ≈ 3.05·10⁻⁵
Матрица:    worst |WASM − JS| ≈ 1.91·10⁻⁵
```

Расхождение — на уровне точности `f32` (Rust считает в `f32`, JS — в `f64` с
усечением до `f32`). В самом стенде та же проверка выполняется в конце
бенчмарк-сессии (`maxDiff()`), и её результат попадает в отчёт. Тем самым
выполнен принцип: **результаты движков идентичны**, сравнивается одна математика.
