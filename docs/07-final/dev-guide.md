# Руководство разработчика

## Требования

- **Node.js** ≥ 18 и npm;
- **Rust** (stable) + target `wasm32-unknown-unknown` — только если нужно
  пересобирать WASM-ядро;
- браузер с поддержкой WebAssembly и WebGL.

## Структура репозитория

```
.
├── public/                     # статика: модели (model.json, model.h.json), картинки
├── src/
│   ├── main.js                 # точка входа фронтенда
│   ├── components/
│   │   ├── WebGL/index.js       # стенд: сцена, метрики, бенчмарк, переключение движка
│   │   ├── Quaternion.js / Rotmat.js
│   │   └── rotation-core-wasm/  # сгенерированная wasm-bindgen обвязка + .wasm
│   ├── math/
│   │   ├── qut.js · vec3.js · mat.js
│   │   └── rotations-js.js      # JS-fallback ядра (предмет сравнения)
│   └── utils/Component.js
├── rotation-core/               # Rust-крейт (ядро вращений)
│   └── src/lib.rs · vec3.rs · quat.rs · mat3.rs · objp.rs · main.rs
├── docs/                        # эта документация
└── package.json                # vite, three
```

## Запуск фронтенда

```bash
npm install
npm run dev        # dev-сервер Vite (горячая перезагрузка)
npm run build      # production-сборка в dist/
npm run preview    # предпросмотр собранной статики
```

> Развёртывание — статическое: содержимое `dist/` кладётся на любой статический
> хостинг. Серверная часть и БД не требуются.

## Пересборка WASM-ядра

Ядро уже собрано в `src/components/rotation-core-wasm/`. Пересборка нужна только
при изменении Rust-кода в `rotation-core/src/`.

### Вариант A — wasm-pack (рекомендуется)
```bash
cargo install wasm-pack          # однократно
cd rotation-core
wasm-pack build --target web --out-dir ../src/components/rotation-core-wasm
```

### Вариант B — cargo + wasm-bindgen-cli
```bash
rustup target add wasm32-unknown-unknown          # однократно
cargo install wasm-bindgen-cli                    # однократно
cd rotation-core
cargo build --release --target wasm32-unknown-unknown
wasm-bindgen target/wasm32-unknown-unknown/release/rotation_core.wasm \
  --target web --out-dir ../src/components/rotation-core-wasm
```

После пересборки убедитесь, что в `rotation_core.js` экспортируются
`rotate_vertices_axis_angle_inplace` и `rot_by_rotmat_inplace`.

## Статический анализ и качество

```bash
cd rotation-core
cargo clippy --all-targets        # линт Rust-кода (целевое: без предупреждений)
cargo fmt                          # форматирование
cargo test                         # модульные тесты ядра (если добавлены)
```

JS — без обязательного линтера; стиль следует существующему коду
(`src/utils/Component.js` и др.).

## Конвертация моделей OBJ → JSON

CLI-утилита `rotation-core/src/main.rs` читает `.obj`, извлекает уникальные рёбра
и сериализует в JSON (формат `{ vertices, edges, faces }`), который грузит
фронтенд:

```bash
cd rotation-core
cargo run --release        # см. путь к входному .obj в main.rs
```

Готовые модели лежат в `public/`:

| Файл | Вершин | Рёбер | Назначение |
|------|--------|-------|-----------|
| `model.json`   | 12 862 | 25 485 | лёгкая модель |
| `model.h.json` | 81 277 | 163 393 | детальная модель |

## Точки расширения

- **новый алгоритм вращения** — добавить функцию в `lib.rs` (WASM) и
  построчно-идентичный аналог в `rotations-js.js`, затем диспетчер в
  `WebGL/index.js`;
- **новые метрики** — расширить `frameStats()` и блок вывода бенчмарка;
- **новые модели** — добавить запись в объект `MODELS` и `<option>` в селектор.
