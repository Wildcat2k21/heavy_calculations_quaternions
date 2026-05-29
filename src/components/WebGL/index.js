import * as THREE from "three";
import Component from "../../utils/Component.js";
import './index.css';

import { initScene } from "./initScene.js";

import {
    applyNormalize,
    buildResultQuaternion,
    makeArrow,
    normalizeModel,
    quatToAxisAngle,
    updateUnits,
    createRotationItem
} from './lib';

import init, {
    rotate_vertices_axis_angle_inplace,
    rot_by_rotmat_inplace
} from "../rotation-core-wasm/rotation_core.js";

import Quaternion from '../Quaternion';
import Rotmat from '../Rotmat';

let Sketch = new Component(/*html*/`
    <div class="main"></div>
    <div class="panel">
        <div class="control">
            <img src="./quat.png" class="method-info" alt="quat"></img>
        </div>
        <input type="button" value="Через ось r" id="add-q-unit" ></input>
        <input type="button" value="Матрица поворота X или Y или Z" id="add-rotmat" ></input>
        <input type="button" value="Очистить все" id="clear-all" ></input>
    </div>
`);

function clearAllRotations(rotationItems = []){    
    rotationItems.forEach((item) => item.remove());
    rotationItems.length = 0;
}

function addRotationItem(rotation, defrm, container, comp){
    if(rotation.method !== defrm) {
        clearAllRotations(rotation.items);
    }

    createRotationItem(container, rotation.items, comp);
    rotation.method = defrm;
}

Sketch.onMount = async (comp) => {

    let { container, _ } = comp;

    await init();
    const { scene, camera, renderer, controls } = initScene(
        container.querySelector(".main")
    );

    // Хранилище вращений объекта
    let rotation = {
        method: null, // 1 - группа вращений через unit вектор и угол. 2 - матрицы Rx, Ry, Rz
        items: []
    };

    container.querySelector("#add-q-unit").addEventListener('click', () =>
        addRotationItem(rotation, 1, container, Quaternion));

    container.querySelector("#add-rotmat").addEventListener('click', () =>
        addRotationItem(rotation, 2, container, Rotmat));

    container.querySelector("#clear-all").addEventListener('click', () => {
        if(rotation.items.length !== 0) {
            clearAllRotations(rotation.items);
        }
    });

    // Освещение
    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);

    // Правим поворот сцены
    scene.rotation.x = -Math.PI / 2;

    // Загрузка JSON модели
    const model = await fetch("/model.h.json") //model.h.obj model.obj
        .then(r => r.json());

    // Нормалищация модели
    const norm = normalizeModel(model);

    // Созадем bufferArray
    const baseVertices = applyNormalize(model, norm);
    const workingVertices = new Float32Array(baseVertices);

    // Объект geomtry
    const geometry = new THREE.BufferGeometry();

    // Рабочие вершины
    const positionAttr = new THREE.Float32BufferAttribute(workingVertices, 3);
    geometry.setAttribute("position", positionAttr);

    const material = new THREE.LineBasicMaterial({
        color: 0x000000
    });

    const lines = new THREE.LineSegments(
        geometry,
        material
    );

    lines.scale.setScalar(5); // Маштаб
    scene.add(lines);

    // Вспомогательные оси
    // X (i) красный
    // Y (j) зелёный
    // Z (k) синий
    const axes = new THREE.AxesHelper(2);
    scene.add(axes);

    // Стрелка результирующего кватерниона
    let arrow = makeArrow(scene, "#d90000");
    scene.add(arrow);

    let last = performance.now();

    // Цикл анимации
    function animate() {
        requestAnimationFrame(animate);

        const now = performance.now();
        const dt = (now - last) / 1000;
        last = now;

        updateUnits(rotation.items, dt);

        // Визуализация вращений через unit вектор и угол
        if (rotation.method === 1) {
            const qFinal = buildResultQuaternion(rotation.items);
            const { axis, angle } = quatToAxisAngle(qFinal);

            // 1. Сброс
            workingVertices.set(baseVertices);

            // 2. Вращение
            rotate_vertices_axis_angle_inplace(
                workingVertices,
                ...axis,
                angle
            );

            // 3. push to GPU
            positionAttr.array.set(workingVertices);
            positionAttr.needsUpdate = true;

            const dir = new THREE.Vector3(axis[0], axis[1], axis[2]).normalize();
            arrow.setDirection(dir);
        }

        // Визуализация вращений посредством матриц поворота X Y Z
        if (rotation.method === 2) {

            // 1. Сброс
            workingVertices.set(baseVertices);

            // 2. Применение вращения
            for (const item of rotation.items) {
                const s = item.state;

                const angle =
                    s.amin + (s.amax - s.amin) * s.progress;

                rot_by_rotmat_inplace(
                    workingVertices,
                    angle,
                    s.rotm
                );
            }

            positionAttr.array.set(workingVertices);
            positionAttr.needsUpdate = true;
        }

        controls.update();
        renderer.render(scene, camera);
    }

    animate();
};

export default Sketch;