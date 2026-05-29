function updateUnits(rotationItems, dt) {

    for (const u of rotationItems) {

        const s = u.state;

        if (!s.anim) continue;

        const step = 0.5; // скорость (можешь потом вынести в UI)

        if (!s._dir) s._dir = 1;

        // движение
        s.progress += s._dir * step * dt;
        u.params["progress"].value = s.progress;

        // clamp + bounce (DESMOS style)
        if (s.progress >= 1) {
            s.progress = 1;
            s._dir = -1;
        }

        if (s.progress <= 0) {
            s.progress = 0;
            s._dir = 1;
        }
    }
}

export { updateUnits };