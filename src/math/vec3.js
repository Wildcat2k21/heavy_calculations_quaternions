class Vec3 {

    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    toArr() {
        return [this.x, this.y, this.z];
    }

    add(v) {
        return new Vec3(
            this.x + v.x,
            this.y + v.y,
            this.z + v.z
        );
    }

    sub(v) {
        return new Vec3(
            this.x - v.x,
            this.y - v.y,
            this.z - v.z
        );
    }

    scale(s) {
        return new Vec3(this.x * s, this.y * s, this.z * s);
    }

    mod() {
        return Math.hypot(this.x, this.y, this.z);
    }

    normalize() {
        const m = this.mod();
        if (m === 0) throw new Error("zero vector");

        return this.scale(1 / m);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(v) {
        return new Vec3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    }
}

export default Vec3;