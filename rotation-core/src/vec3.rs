use std::ops::{Add, AddAssign, Div, Mul, Sub, SubAssign};

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl Vec3 {
    /// Создание нового вектора
    pub fn new(x: f32, y: f32, z: f32) -> Self {
        Self { x, y, z }
    }

    /// Нулевой вектор
    pub fn zero() -> Self {
        Self::new(0.0, 0.0, 0.0)
    }

    /// Длина вектора |v|
    pub fn length(&self) -> f32 {
        self.length_squared().sqrt()
    }

    /// Квадрат длины (быстрее, если sqrt не нужен)
    pub fn length_squared(&self) -> f32 {
        self.x * self.x + self.y * self.y + self.z * self.z
    }

    /// Нормализация
    pub fn normalize(&self) -> Self {
        let len = self.length();

        if len == 0.0 {
            Self::zero()
        } else {
            *self / len
        }
    }

    /// Скалярное произведение
    pub fn dot(&self, other: Self) -> f32 {
        self.x * other.x
            + self.y * other.y
            + self.z * other.z
    }

    /// Векторное произведение
    pub fn cross(&self, other: Self) -> Self {
        Self {
            x: self.y * other.z - self.z * other.y,
            y: self.z * other.x - self.x * other.z,
            z: self.x * other.y - self.y * other.x,
        }
    }

    /// Масштабирование на коэффициент k
    pub fn scale(&self, k: f32) -> Self {
        *self * k
    }

    /// Установка длины вектора равной magnitude
    pub fn set_magnitude(&self, magnitude: f32) -> Self {
        self.normalize() * magnitude
    }

    /// Расстояние между двумя точками
    pub fn distance(&self, other: Self) -> f32 {
        (*self - other).length()
    }

    /// Линейная интерполяция
    /// t ∈ [0, 1]
    pub fn lerp(&self, other: Self, t: f32) -> Self {
        *self + (other - *self) * t
    }

    /// Проекция self на other
    pub fn project(&self, other: Self) -> Self {
        let denominator = other.length_squared();

        if denominator == 0.0 {
            Self::zero()
        } else {
            other * (self.dot(other) / denominator)
        }
    }
}

/*
|--------------------------------------------------------------------------
| TRAITS
|--------------------------------------------------------------------------
*/

impl Add for Vec3 {
    type Output = Self;

    fn add(self, rhs: Self) -> Self::Output {
        Self {
            x: self.x + rhs.x,
            y: self.y + rhs.y,
            z: self.z + rhs.z,
        }
    }
}

impl AddAssign for Vec3 {
    fn add_assign(&mut self, rhs: Self) {
        self.x += rhs.x;
        self.y += rhs.y;
        self.z += rhs.z;
    }
}

impl Sub for Vec3 {
    type Output = Self;

    fn sub(self, rhs: Self) -> Self::Output {
        Self {
            x: self.x - rhs.x,
            y: self.y - rhs.y,
            z: self.z - rhs.z,
        }
    }
}

impl SubAssign for Vec3 {
    fn sub_assign(&mut self, rhs: Self) {
        self.x -= rhs.x;
        self.y -= rhs.y;
        self.z -= rhs.z;
    }
}

/// Vec3 * scalar
impl Mul<f32> for Vec3 {
    type Output = Self;

    fn mul(self, rhs: f32) -> Self::Output {
        Self {
            x: self.x * rhs,
            y: self.y * rhs,
            z: self.z * rhs,
        }
    }
}

/// Vec3 / scalar
impl Div<f32> for Vec3 {
    type Output = Self;

    fn div(self, rhs: f32) -> Self::Output {
        Self {
            x: self.x / rhs,
            y: self.y / rhs,
            z: self.z / rhs,
        }
    }
}