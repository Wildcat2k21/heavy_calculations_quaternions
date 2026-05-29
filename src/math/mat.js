
// Составим соглашение, по которому матрица строка или матрица столбец не будут являтся матрицами
// А будут являться векторами. Чтобы разгроничить понятия "Вектор" и "Матрица".
// Явно не запретим их использование.

class Matrix {

    static Rotation(n, i, j, angle){

        if(i === j){
            throw new Error("Индексы вращения должны отличаться");
        }

        if(i >= n || j >= n){
            throw new Error("Индекс выходит за размерность матрицы");
        }

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const mx = Matrix.IdentityMN(n, n).toArr();

        mx[i][i] = cos;
        mx[j][j] = cos;

        mx[i][j] = -sin;
        mx[j][i] = sin;

        return new Matrix(mx);
    }

    static IsMatrix(matrix) {
        return matrix instanceof Matrix;
    }

    static FromNMV(m, n, fill = 0) {
        return new Matrix(
            Array.from({ length: m }, () =>
                Array.from({ length: n }, () => fill)
            )
        );
    }

    static Identity(n) {
        const m = Matrix.FromNMV(n, n, 0)._val;

        for (let i = 0; i < n; i++) {
            m[i][i] = 1;
        }

        return new Matrix(m);
    }

    constructor(mx){

        if(!(mx instanceof Array) || !mx.length || !(mx[0] instanceof Array) || !mx[0].length || mx.flat().length !== mx.length * mx[0].length || mx.flat().some(val => isNaN(val))){
            throw new Error("Передана не матрица. Должна удоавлитворять условиям: /n1. Не пустого массива/n2. Элементы массива также массивы/n3.Массив не зубчатого вида/n4. Элементы массива числа");
        }

       this.m = mx.length
       this.n = mx[0].length;
       this._val = mx;
    }

    mulVec(vec) {
        return this.mul(Matrix.FromNMV(vec.size, 1, 0)
            .setColumn(0, vec._components))
            .toVec();
    }

    applyVecs(vectors) {
        return vectors.map(v => this.mulVec(v));
    }

    getCol(n){
        if(n > this.n) {
            throw new Error("Индекс n столбца не представлен в матрице");
        }

        return this.toArr().flat().filter((_, i) => n === (i % this.n));
    }

    getRow(m){
        if(m > this.m) {
            throw new Error("Индекс n столбца не представлен в матрице");
        }

        return this.toArr()[m];
    }

    toArr(){
        return JSON.parse(JSON.stringify(this._val));
    }

    toVec() {
        if (this.n !== 1) {
            throw new Error("not column vector");
        }

        return new Vec(...this._val.map(r => r[0]));
    }

    // Сравние для композиции
    mulCmp(omx){
        if(!Matrix.IsMatrix(omx)) {
            throw new Error("Передан не экземпляр матрицы");
        }

        let cmxCN = this.toArr() / omx.length;

        // Сравниваем число столбцов текущей матрицы и преобразуемой
        // Текущая как матрица преобразования
        return cmxCN === omx.length;
    }

    // Транспанирование
    trp() {
        const res = Matrix.FromNMV(this.n, this.m)._val;

        for (let i = 0; i < this.m; i++) {
            for (let j = 0; j < this.n; j++) {
                res[j][i] = this._val[i][j];
            }
        }

        return new Matrix(res);
    }

    mul(other) {
        if (!Matrix.IsMatrix(other)) {
            throw new Error("not matrix");
        }

        if (this.n !== other.m) {
            throw new Error("dimension mismatch");
        }

        const res = Matrix.FromNMV(this.m, other.n, 0)._val;

        for (let i = 0; i < this.m; i++) {
            for (let k = 0; k < this.n; k++) {
                for (let j = 0; j < other.n; j++) {
                    res[i][j] += this._val[i][k] * other._val[k][j];
                }
            }
        }

        return new Matrix(res);
    }
}

export default Matrix;