import Quat from "../../../math/qut";
import Vec3 from "../../../math/vec3";

function buildResultQuaternion(rotationItems) {
    // identity quaternion
    let qResult = Quat.Identity();

    for (const item of rotationItems) {
        const s = item.state;

        // axis
        const axis = new Vec3(
            s.ui,
            s.uj,
            s.uk
        ).normalize();

        const angle = s.amin + (s.amax - s.amin) * s.progress;

        // local quaternion
        const qLocal = Quat.FromAxisAngle(
            axis,
            angle
        );

        // composition:
        // порядок важен!
        qResult = qResult.mul(qLocal);
    }

    return qResult.normalize();
}

export { buildResultQuaternion };