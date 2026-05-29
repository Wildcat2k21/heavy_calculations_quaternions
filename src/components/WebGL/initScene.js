import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

function initScene($container){
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe6e6e6);

    const camera = new THREE.PerspectiveCamera(
        75,
        800 / 800,
        0.1,
        1000
    );

    // camera.position.x = -5;
    camera.position.set(5, 5, -5); // смотрим вдоль X
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(800, 800);
    $container.appendChild(renderer.domElement);

    // Контроллер сцены
    const controls = new OrbitControls(
        camera,
        renderer.domElement
    );

    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    controls.enableZoom = true;
    controls.enablePan = true;

    controls.minDistance = 2;
    controls.maxDistance = 20;

    return { scene, camera, renderer, controls }
}

export { initScene };