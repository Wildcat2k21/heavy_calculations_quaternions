
function quatToAxisAngle(q) {
    const nq = q.clone().normalize();

    const angle = 2 * Math.acos(nq.w);

    const s = Math.sqrt(
        1 - nq.w * nq.w
    );

    // защита от near-zero
    if (s < 0.0001) {
        return {
            axis: [1, 0, 0],
            angle: 0
        };
    }

    return {
        axis: [
            nq.x / s,
            nq.y / s,
            nq.z / s
        ],
        angle
    };
}

export { quatToAxisAngle };