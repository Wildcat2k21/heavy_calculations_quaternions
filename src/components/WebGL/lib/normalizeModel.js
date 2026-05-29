import * as THREE from "three";

function normalizeModel(model) {
    let min = new THREE.Vector3(Infinity, Infinity, Infinity);
    let max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

    for (const v of model.vertices) {
        min.x = Math.min(min.x, v.x);
        min.y = Math.min(min.y, v.y);
        min.z = Math.min(min.z, v.z);

        max.x = Math.max(max.x, v.x);
        max.y = Math.max(max.y, v.y);
        max.z = Math.max(max.z, v.z);
    }

    const center = new THREE.Vector3(
        (min.x + max.x) / 2,
        (min.y + max.y) / 2,
        (min.z + max.z) / 2
    );

    const size = new THREE.Vector3(
        max.x - min.x,
        max.y - min.y,
        max.z - min.z
    );

    const scale = 2 / Math.max(size.x, size.y, size.z);

    return { center, scale };
}

export { normalizeModel };