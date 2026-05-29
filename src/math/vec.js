import Matrix from "./mat";

class Vec {

    static IsVector(vec){
        return vec instanceof Vec;
    }

    static FromMatrix(matrix) {
        if (!Matrix.IsMatrix(matrix) || matrix.n !== 1) {
            throw new Error("not column matrix");
        }

        return new Vec(...matrix._val.map(r => r[0]));
    }

    static ToMatrix(vec){
        if(!Vec.IsVector(vec)) {
            throw new Error("Передан не экземпляр вектора");
        }

        return new Matrix(vec._components.map(cvs => [cvs]));
    }

    constructor(...args){
        this._components = Array.from(args);
        this.size = args.length;
    }

    toArr(){
        return this._components;
    }

    cmp(ov){
        if(!Vec.IsVector(ov)) {
            throw new Error("Передан не экземпляр вектора");
        }

        if(ov.size !== this.size) {
            return false;
        }

        return this.toArr().every((cvv, i) => cvv === ov.toArr()[i]);
    }

    add(ov){
        if(!Vec.IsVector(ov)) {
            throw new Error("Передан не экземпляр вектора");
        }

        if(ov.size !== this.size) {
            throw new Error("Векторы v и o не соблюдают равенство n = m");
        }

        return new Vec(...this.toArr().map((cvs, i) => cvs + ov.toArr()[i]));
    }

    sub(ov) {
        if (!Vec.IsVector(ov)) throw new Error("bad vector");
        if (ov.size !== this.size) throw new Error("size mismatch");

        return new Vec(...this._components.map((v, i) => v - ov._components[i]));
    }

    dot(ov) {
        if (!Vec.IsVector(ov)) throw new Error("bad vector");

        let sum = 0;
        for (let i = 0; i < this.size; i++) {
            sum += this._components[i] * ov._components[i];
        }
        
        return sum;
    }

    mod(){
        let cv = this.toArr();
        return Math.sqrt(cv.map((cvs) => cvs**2).reduce((pVal, cVal) => pVal + cVal, 0));
    }

    arg(ov){
        if(!Vec.IsVector(ov)) {
            throw new Error("Передан не экземпляр вектора");
        }

        if(ov.size !== this.size) {
            throw new Error("Вектор ov для расчета аргумента не может выступать в качестве опорного");
        }

        let cvr = this.toArr();

        if(cvr.every(e => e === 0) || cvr.every(e => e === 0)) {
            throw new Error("Аругмент нуливого вектора (или в сравнении с нуливом вектором) не может быть определен");
        }

        let cosf = cvr.map((e1, i) => e1 * ov.toArr()[i]).reduce((pVal, cVal) => pVal + cVal, 0) / (this.mod() * ov.mod());
        
        return Math.acos(cosf);
    }

    scale(coef) {
        let cvrc = this.toArr().map(v => v * coef);
        return new Vec(...cvrc);
    }

    changeMod(mod){
        if(this.mod() === 0) {
            throw new Error("Нуливой модуль не может быть изменен");
        }

        let coef = mod / this.mod();
        return this.scale(coef);
    }

    normalize() {
        const m = this.mod();
        if (m === 0) throw new Error("zero vector");

        return this.scale(1 / m);
    }

    distance(ov) {
        return this.sub(ov).mod();
    }

    transform(matrix) {
        if (!Matrix.IsMatrix(matrix)) {
            throw new Error("not matrix");
        }

        const m = Matrix.FromNMV(matrix.m, 1, 0);

        for (let i = 0; i < this.size; i++) {
            m._val[i][0] = this._components[i];
        }

        return Vec.FromMatrix(matrix.mul(m));
    }
}

export default Vec;