use wasm_bindgen::prelude::*;

pub mod objp;

//Вращение с использованием матриц X Y Z
#[wasm_bindgen]
pub fn rot_by_rotmat_inplace(
    vertices: &mut [f32],
    angle: f32,
    axis: u8
) {
    let cos = angle.cos();
    let sin = angle.sin();

    for i in (0..vertices.len()).step_by(3) {
        let x = vertices[i];
        let y = vertices[i + 1];
        let z = vertices[i + 2];

        let (nx, ny, nz) = match axis {
            0 => ( // X
                x,
                y * cos - z * sin,
                y * sin + z * cos
            ),
            1 => ( // Y
                x * cos + z * sin,
                y,
                -x * sin + z * cos
            ),
            2 => ( // Z
                x * cos - y * sin,
                x * sin + y * cos,
                z
            ),
            _ => (x, y, z)
        };

        vertices[i] = nx;
        vertices[i + 1] = ny;
        vertices[i + 2] = nz;
    }
}

// Вращение с использованием кватернионов
//
// rotate_vertices_axis_angle
//
// Принимает flat-массив вершин:
//
// [x1, y1, z1, x2, y2, z2, ...]
//
// и вращает ВСЕ вершины вокруг оси
//
// axis = (ax, ay, az)
//
// на угол angle (в радианах)
//
// Возвращает новый flat-массив:
//
// [x1', y1', z1', x2', y2', z2', ...]
//
#[wasm_bindgen]
pub fn rotate_vertices_axis_angle_inplace(
    vertices: &mut [f32],
    ax: f32,
    ay: f32,
    az: f32,
    angle: f32,
) {
    // -----------------------------
    // 1. normalize axis
    // -----------------------------
    let axis_len = (ax * ax + ay * ay + az * az).sqrt();

    if axis_len == 0.0 {
        return;
    }

    let ux = ax / axis_len;
    let uy = ay / axis_len;
    let uz = az / axis_len;

    // -----------------------------
    // 2. quaternion
    // -----------------------------
    let half = angle * 0.5;
    let sin_half = half.sin();
    let cos_half = half.cos();

    let qw = cos_half;
    let qx = ux * sin_half;
    let qy = uy * sin_half;
    let qz = uz * sin_half;

    // -----------------------------
    // 3. rotate INPLACE
    // -----------------------------
    for i in (0..vertices.len()).step_by(3) {
        let x = vertices[i];
        let y = vertices[i + 1];
        let z = vertices[i + 2];

        // u × v
        let uv_x = qy * z - qz * y;
        let uv_y = qz * x - qx * z;
        let uv_z = qx * y - qy * x;

        // u × (u × v)
        let uuv_x = qy * uv_z - qz * uv_y;
        let uuv_y = qz * uv_x - qx * uv_z;
        let uuv_z = qx * uv_y - qy * uv_x;

        vertices[i]     = x + 2.0 * (qw * uv_x + uuv_x);
        vertices[i + 1] = y + 2.0 * (qw * uv_y + uuv_y);
        vertices[i + 2] = z + 2.0 * (qw * uv_z + uuv_z);
    }
}