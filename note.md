# План проекта: Демонстрация кватернионов для вращения 3D-объектов

## Цель проекта

Разработать интерактивную демонстрацию вращения 3D-объекта с использованием:

- кватернионов
- матриц вращения
- сравнения различных подходов к описанию вращений

Основная цель курсовой:

> показать преимущества кватернионов над классическими матрицами вращения и Эйлеровыми углами на практической визуализации.

---

# Текущая архитектура проекта

```text
OBJ model
↓
Rust parser
↓
JSON mesh
↓
THREE.js renderer
↓
WASM math engine (next step)
↓
Quaternion / Matrix transformations
↓
Visual comparison
````

---

# Что уже готово

---

## 1. Rust-модуль Vec3

Реализована базовая математическая структура:

### `Vec3`

Поддерживает:

### обязательно

* magnitude / length
* normalize
* dot
* cross
* scale
* add
* sub

### полезно

* distance
* lerp
* project

Реализация выполнена через Rust traits + impl blocks.

Это фундамент для:

* кватернионов
* матриц
* вращений
* работы с вершинами модели

---

## 2. Rust OBJ parser

Реализован парсер `.obj` файла.

### Что делает:

Из файла:

```obj
v x y z
f a b c
```

получает структуру:

```json
{
  "vertices": [],
  "edges": [],
  "faces": []
}
```

### Важно:

### edges строятся без повторений

Используется:

```text
HashSet<(min(a,b), max(a,b))>
```

что исключает дублирование рёбер.

---

## 3. JSON export

OBJ успешно конвертируется в:

```text
public/model.json
```

Это позволяет:

* не парсить OBJ в браузере
* не использовать loadModel()
* работать напрямую со структурой mesh

---

## 4. THREE.js renderer

Выполнен переход с p5.js → THREE.js.

Причина:

p5.js плохо масштабируется на больших wireframe моделях.

### Было:

```text
25k line() вызовов на кадр
→ сильные лаги
```

### Стало:

```text
BufferGeometry
+ LineSegments
+ GPU batching
→ стабильный FPS
```

---

## 5. Нормализация модели

Добавлены:

### normalizeModel()

Вычисляет:

* bounding box
* center
* scale

### applyNormalize()

Приводит модель к:

```text
scene space ≈ [-1 ; 1]
```

Это нужно для:

* стабильной камеры
* одинакового масштаба
* корректных вращений

---

## 6. Базовая сцена

Реализованы:

* Scene
* Camera
* Renderer
* AmbientLight
* AxesHelper

через:

```js
initScene()
```

---

# Что предстоит сделать

---

# ЭТАП 1 — Quaternion module (WASM)

## Следующая главная задача

Реализовать:

```text
Rust → WASM
```

модуль для кватернионов.

---

## Нужно сделать:

### Quaternion struct

```rust
struct Quaternion {
    w: f32,
    x: f32,
    y: f32,
    z: f32
}
```

---

## Методы:

### обязательно

* normalize
* multiply
* conjugate
* inverse
* from_axis_angle
* rotate_vec3

### полезно

* to_rotation_matrix
* slerp

---

# ЭТАП 2 — Rotation pipeline

---

## Нужно заменить:

```js
lines.rotation.y += ...
```

на:

```text
WASM quaternion transform
```

---

## Архитектура:

```text
base vertices
↓
WASM rotate(vertices, quaternion)
↓
updated Float32Array
↓
THREE BufferGeometry update
↓
render
```

---

# ЭТАП 3 — Matrix rotation module

---

## Реализовать второй способ вращения:

### rotation matrix

для сравнения с:

### quaternion rotation

---

## Это позволит показать:

* различие подходов
* накопление ошибок
* проблемы Euler angles
* gimbal lock
* стабильность quaternion rotation

---

# ЭТАП 4 — UI для демонстрации

---

## Нужно добавить интерфейс:

### Управление:

* axis selection
* angle slider
* quaternion mode
* matrix mode
* Euler mode (optional)

---

## Визуальное сравнение:

### Side-by-side:

```text
Quaternion | Matrix
```

или

```text
Quaternion | Euler
```

---

# ЭТАП 5 — Демонстрационные сценарии

---

## Что показать в курсовой:

### 1. Gimbal Lock

на Euler углах

---

### 2. Quaternion smooth rotation

без потери степеней свободы

---

### 3. Обратное вращение

Quaternion inverse vs matrix inverse

---

### 4. Composition of rotationItems

сложение нескольких поворотов

---

### 5. Axis-angle representation

наглядное вращение вокруг произвольной оси

---

# Что НЕ нужно делать

---

## Не нужно:

### хранить frames заранее

Почему:

```text
слишком много памяти
хуже производительность
не нужно для realtime
```

---

## Не нужно:

### вращать через THREE built-in rotation

если цель:

```text
демонстрация собственной математики
```

---

# Итоговая цель

---

Получить систему:

```text
Rust (math)
+
WASM (fast transforms)
+
THREE.js (GPU rendering)
=
демонстрационный движок вращений
```

который:

* нагляден
* математически корректен
* производителен
* хорошо подходит для курсовой работы

---

# Ближайший следующий шаг

## Реализовать Quaternion WASM module

Это сейчас главная задача проекта.
