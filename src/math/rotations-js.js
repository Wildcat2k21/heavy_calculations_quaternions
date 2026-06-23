/**
 * JS-fallback реализации функций вращения из WASM-ядра
 * (см. rotation-core/src/lib.rs).
 *
 * Назначение — исследовательское: позволяет сравнить производительность
 * нативного WASM (Rust) и интерпретируемого JavaScript на ИДЕНТИЧНЫХ
 * алгоритмах. Это центральный инструмент исследования (траектория
 * «Исследование», см. docs/05-benchmark/).
 *
 * ПРИНЦИПЫ (см. п.11 плана приведения проекта):
 *   - Алгоритмы математически идентичны WASM-версии: та же формула
 *     вращения вектора кватернионом (Rodrigues через q·v·q*) и те же
 *     матрицы поворота Rx / Ry / Rz. Иначе сравнение некорректно.
 *   - Обе функции работают INPLACE над flat-массивом
 *     [x1, y1, z1, x2, y2, z2, ...] — как и WASM-версия.
 *
 * Отличие от WASM по точности: Rust-ядро считает в f32, JS — в f64
 * с последующим усечением до f32 при записи в Float32Array. Расхождение
 * результатов — на уровне погрешности f32 (~1e-6), что проверяется
 * в бенчмарк-сессии (метрика «max |WASM − JS|»).
 */

/**
 * Аналог rotate_vertices_axis_angle_inplace (WASM).
 * Вращает все вершины вокруг оси (ax, ay, az) на угол angle (радианы)
 * посредством единичного кватerniона.
 *
 * @param {Float32Array} vertices flat-массив вершин (мутируется inplace)
 * @param {number} ax компонента оси X
 * @param {number} ay компонента оси Y
 * @param {number} az компонента оси Z
 * @param {number} angle угол поворота в радианах
 */
export function rotateVerticesAxisAngleJS(vertices, ax, ay, az, angle) {
    // 1. Нормализация оси
    const len = Math.sqrt(ax * ax + ay * ay + az * az);
    if (len === 0) return;

    const ux = ax / len, uy = ay / len, uz = az / len;

    // 2. Построение кватерниона q = (qw, qx, qy, qz)
    const half = angle * 0.5;
    const sh = Math.sin(half), ch = Math.cos(half);

    const qw = ch, qx = ux * sh, qy = uy * sh, qz = uz * sh;

    // 3. Поворот вектора v: v' = v + 2·(q_w·(u×v) + u×(u×v))
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i], y = vertices[i + 1], z = vertices[i + 2];

        // u × v
        const uvx = qy * z - qz * y;
        const uvy = qz * x - qx * z;
        const uvz = qx * y - qy * x;

        // u × (u × v)
        const uuvx = qy * uvz - qz * uvy;
        const uuvy = qz * uvx - qx * uvz;
        const uuvz = qx * uvy - qy * uvx;

        vertices[i]     = x + 2 * (qw * uvx + uuvx);
        vertices[i + 1] = y + 2 * (qw * uvy + uuvy);
        vertices[i + 2] = z + 2 * (qw * uvz + uuvz);
    }
}

/**
 * Аналог rot_by_rotmat_inplace (WASM).
 * Вращает все вершины вокруг одной из координатных осей матрицей
 * поворота Rx / Ry / Rz.
 *
 * @param {Float32Array} vertices flat-массив вершин (мутируется inplace)
 * @param {number} angle угол поворота в радианах
 * @param {number} axis ось: 0 → Rx, 1 → Ry, 2 → Rz
 */
export function rotByRotmatJS(vertices, angle, axis) {
    const cos = Math.cos(angle), sin = Math.sin(angle);

    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i], y = vertices[i + 1], z = vertices[i + 2];
        let nx, ny, nz;

        if (axis === 0) {          // Rx
            nx = x;
            ny = y * cos - z * sin;
            nz = y * sin + z * cos;
        } else if (axis === 1) {   // Ry
            nx = x * cos + z * sin;
            ny = y;
            nz = -x * sin + z * cos;
        } else {                   // Rz
            nx = x * cos - y * sin;
            ny = x * sin + y * cos;
            nz = z;
        }

        vertices[i]     = nx;
        vertices[i + 1] = ny;
        vertices[i + 2] = nz;
    }
}
