import * as THREE from "three";

function makeArrow(scene, color = 0xff0000) {
    const dir = new THREE.Vector3(1, 0, 0);
    const origin = new THREE.Vector3(0, 0, 0);

    const arrow = new THREE.ArrowHelper(
        dir,
        origin,
        2,
        color
    );

    scene.add(arrow);
    return arrow;
}

export { makeArrow };