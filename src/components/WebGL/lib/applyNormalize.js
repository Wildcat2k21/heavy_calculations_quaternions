function applyNormalize(model, norm){
    let positions = [];

    for (const e of model.edges) {
        const a = model.vertices[e.a];
        const b = model.vertices[e.b];

        positions.push(
            (a.x - norm.center.x) * norm.scale,
            (a.y - norm.center.y) * norm.scale,
            (a.z - norm.center.z) * norm.scale,

            (b.x - norm.center.x) * norm.scale,
            (b.y - norm.center.y) * norm.scale,
            (b.z - norm.center.z) * norm.scale
        );
    };

    return positions;
}

export { applyNormalize };