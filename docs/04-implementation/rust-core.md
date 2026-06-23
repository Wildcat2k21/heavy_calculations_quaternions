# Rust-ядро (rotation-core)

Каталог `rotation-core/` — отдельный Cargo-крейт, компилируемый в WebAssembly.

```
rotation-core/
├── Cargo.toml          # crate-type = ["cdylib", "rlib"]; wasm-bindgen, serde
└── src/
    ├── lib.rs          # экспортируемые в WASM функции вращения
    ├── vec3.rs         # Vec3 — векторная алгебра
    ├── quat.rs         # Quaternion — кватернионы
    ├── mat3.rs         # Mat3 — матрицы 3×3
    ├── objp.rs         # парсер OBJ → Mesh (vertices/edges/faces)
    └── main.rs         # CLI-утилита (конвертация OBJ → JSON)
```

## Экспортируемые функции (`lib.rs`)

Помечены `#[wasm_bindgen]` и доступны из JS. Обе работают **inplace** над
`&mut [f32]` (срез, отображённый на `Float32Array`).

### `rotate_vertices_axis_angle_inplace(vertices, ax, ay, az, angle)`
Поворот всех вершин вокруг оси `(ax, ay, az)` на угол `angle` через кватернион
(формула Родрига). Алгоритм:

1. нормировать ось;
2. построить кватернион `q = (cos(θ/2), û·sin(θ/2))`;
3. для каждой вершины: `v' = v + 2·(q_w·(u×v) + u×(u×v))`.

### `rot_by_rotmat_inplace(vertices, angle, axis)`
Поворот вершин вокруг координатной оси матрицей: `axis = 0 → Rx`, `1 → Ry`,
`2 → Rz`. Косинус/синус вычисляются один раз на вызов.

> Эти две функции — **единственная** часть системы, измеряемая в бенчмарке, и
> именно для них написан построчно идентичный JS-аналог (см.
> [wasm-bridge.md](wasm-bridge.md) и `src/math/rotations-js.js`).

## Математические типы

### `Vec3` (`vec3.rs`)
Вектор `f32`-компонент с операторами (`Add`, `Sub`, `Mul`, `Div`, …): длина,
нормализация, скалярное и векторное произведения. Документация:
[devDocs/vec3.doc.md](../../devDocs/vec3.doc.md).

### `Quaternion` (`quat.rs`)
Кватернион `(w, x, y, z)`: `identity()`, `from_axis_angle()`, умножение,
нормализация, перевод в матрицу. Документация:
[devDocs/quat.doc.md](../../devDocs/quat.doc.md).

### `Mat3` (`mat3.rs`)
Матрица 3×3: `identity()`, базовые повороты, умножение на вектор/матрицу.
Документация: [devDocs/mat3.doc.md](../../devDocs/mat3.doc.md).

> В «горячем» пути вращения (`lib.rs`) типы намеренно не используются — там код
> развёрнут в плоские циклы по `&mut [f32]` ради скорости и отсутствия аллокаций.
> Типы служат для CLI-утилиты и переиспользования.

## OBJ-парсер (`objp.rs`)
Структуры `Vertex`, `Edge`, `Mesh` с `serde`-сериализацией. Читает `.obj`,
извлекает уникальные рёбра (через `HashSet`) и сериализует в JSON, который затем
грузит фронтенд (`public/model.json`, `public/model.h.json`).

## Сборка ядра
См. [07-final/dev-guide.md](../07-final/dev-guide.md) — сборка через
`wasm-pack` / `wasm-bindgen`, статический анализ `cargo clippy`.
