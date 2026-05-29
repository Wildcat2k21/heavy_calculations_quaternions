use crate::vec3::Vec3;
use crate::mat3::Mat3;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Quaternion {
    pub w: f32,
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl Quaternion {
    /* ------------------------------------------------------------
     * CONSTRUCTORS
     * ------------------------------------------------------------ */

    pub fn new(w: f32, x: f32, y: f32, z: f32) -> Self {
        Self { w, x, y, z }
    }

    /// Единичный кватернион
    pub fn identity() -> Self {
        Self::new(1.0, 0.0, 0.0, 0.0)
    }

    /// Кватернион из оси и угла (основной способ вращения)
    pub fn from_axis_angle(axis: Vec3, angle: f32) -> Self {
        let half = angle * 0.5;
        let s = half.sin();

        let n = axis.normalize();

        Self {
            w: half.cos(),
            x: n.x * s,
            y: n.y * s,
            z: n.z * s,
        }
    }

    /* ------------------------------------------------------------
     * BASIC MATH
     * ------------------------------------------------------------ */

    /// Сложение (редко используется в практике вращений, но есть)
    pub fn add(self, q: Quaternion) -> Quaternion {
        Quaternion::new(
            self.w + q.w,
            self.x + q.x,
            self.y + q.y,
            self.z + q.z,
        )
    }

    /// Вычитание
    pub fn sub(self, q: Quaternion) -> Quaternion {
        Quaternion::new(
            self.w - q.w,
            self.x - q.x,
            self.y - q.y,
            self.z - q.z,
        )
    }

    /* ------------------------------------------------------------
     * MULTIPLICATION (главная операция!)
     * ------------------------------------------------------------ */

    pub fn mul(self, q: Quaternion) -> Quaternion {
        Quaternion {
            w: self.w * q.w - self.x * q.x - self.y * q.y - self.z * q.z,
            x: self.w * q.x + self.x * q.w + self.y * q.z - self.z * q.y,
            y: self.w * q.y - self.x * q.z + self.y * q.w + self.z * q.x,
            z: self.w * q.z + self.x * q.y - self.y * q.x + self.z * q.w,
        }
    }

    /* ------------------------------------------------------------
     * NORM / LENGTH
     * ------------------------------------------------------------ */

    pub fn norm(&self) -> f32 {
        self.w * self.w
            + self.x * self.x
            + self.y * self.y
            + self.z * self.z
    }

    pub fn magnitude(&self) -> f32 {
        self.norm().sqrt()
    }

    /* ------------------------------------------------------------
     * NORMALIZATION
     * ------------------------------------------------------------ */

    pub fn normalize(&self) -> Quaternion {
        let m = self.magnitude();

        if m == 0.0 {
            return Quaternion::identity();
        }

        Quaternion::new(
            self.w / m,
            self.x / m,
            self.y / m,
            self.z / m,
        )
    }

    /* ------------------------------------------------------------
     * INVERSE
     * ------------------------------------------------------------ */

    pub fn inverse(&self) -> Quaternion {
        let n = self.norm();

        if n == 0.0 {
            return Quaternion::identity();
        }

        Quaternion::new(
            self.w / n,
            -self.x / n,
            -self.y / n,
            -self.z / n,
        )
    }

    /* ------------------------------------------------------------
     * APPLY ROTATION TO VECTOR
     * ------------------------------------------------------------ */

    pub fn rotate_vec3(&self, v: Vec3) -> Vec3 {
        let qv = Quaternion::new(0.0, v.x, v.y, v.z);

        let res = self
            .mul(qv)
            .mul(self.inverse());

        Vec3::new(res.x, res.y, res.z)
    }

    /* ------------------------------------------------------------
     * CONVERSION TO MATRIX (очень важно для сравнения!)
     * ------------------------------------------------------------ */

    pub fn to_mat3(&self) -> Mat3 {
        let q = self.normalize();

        let w = q.w;
        let x = q.x;
        let y = q.y;
        let z = q.z;

        Mat3::new([
            [
                1.0 - 2.0 * (y * y + z * z),
                2.0 * (x * y - z * w),
                2.0 * (x * z + y * w),
            ],
            [
                2.0 * (x * y + z * w),
                1.0 - 2.0 * (x * x + z * z),
                2.0 * (y * z - x * w),
            ],
            [
                2.0 * (x * z - y * w),
                2.0 * (y * z + x * w),
                1.0 - 2.0 * (x * x + y * y),
            ],
        ])
    }
}