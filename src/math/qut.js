class Quat {

    static IsQuat(q) {
        return q instanceof Quat;
    }

    // identity quaternion
    static Identity() {
        return new Quat(1, 0, 0, 0);
    }

    // axis-angle (главный способ создания)
    static FromAxisAngle(axisVec, angle) {
        const half = angle / 2;
        const s = Math.sin(half);

        const axis = axisVec.normalize();

        return new Quat(
            Math.cos(half),
            axis.x * s,
            axis.y * s,
            axis.z * s
        );
    }

    // from Euler (если нужно)
    static FromEuler(x, y, z) {
        const cx = Math.cos(x / 2), sx = Math.sin(x / 2);
        const cy = Math.cos(y / 2), sy = Math.sin(y / 2);
        const cz = Math.cos(z / 2), sz = Math.sin(z / 2);

        return new Quat(
            cx * cy * cz + sx * sy * sz,
            sx * cy * cz - cx * sy * sz,
            cx * sy * cz + sx * cy * sz,
            cx * cy * sz - sx * sy * cz
        );
    }

    constructor(w, x, y, z) {
        this.w = w;
        this.x = x;
        this.y = y;
        this.z = z;
    }

    toArr() {
        return [this.w, this.x, this.y, this.z];
    }

    clone() {
        return new Quat(this.w, this.x, this.y, this.z);
    }

    // длина
    norm() {
        return Math.hypot(this.w, this.x, this.y, this.z);
    }

    // нормализация
    normalize() {
        const n = this.norm();
        if (n === 0) throw new Error("zero quaternion");

        return new Quat(
            this.w / n,
            this.x / n,
            this.y / n,
            this.z / n
        );
    }

    // сопряжённый
    conjugate() {
        return new Quat(this.w, -this.x, -this.y, -this.z);
    }

    // умножение (главная операция!)
    mul(q) {
        if (!Quat.IsQuat(q)) throw new Error("not quat");

        return new Quat(
            this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z,
            this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y,
            this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x,
            this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w
        );
    }

    // поворот вектора
    rotateVec3(v) {
        const qVec = new Quat(0, v.x, v.y, v.z);

        const res = this
            .mul(qVec)
            .mul(this.conjugate());

        return new Vec3(res.x, res.y, res.z);
    }

    // интерполяция (SLERP-lite)
    lerp(q, t) {
        return new Quat(
            this.w + (q.w - this.w) * t,
            this.x + (q.x - this.x) * t,
            this.y + (q.y - this.y) * t,
            this.z + (q.z - this.z) * t
        ).normalize();
    }

    // в матрицу вращения 3x3
    toMatrix() {
        const { w, x, y, z } = this;

        return new Matrix([
            [
                1 - 2 * (y * y + z * z),
                2 * (x * y - z * w),
                2 * (x * z + y * w)
            ],
            [
                2 * (x * y + z * w),
                1 - 2 * (x * x + z * z),
                2 * (y * z - x * w)
            ],
            [
                2 * (x * z - y * w),
                2 * (y * z + x * w),
                1 - 2 * (x * x + y * y)
            ]
        ]);
    }
}

export default Quat;