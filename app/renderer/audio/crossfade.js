const CURVE_STEPS = 128;
const curveA = new Float32Array(CURVE_STEPS);
const curveB = new Float32Array(CURVE_STEPS);
for (let i = 0; i < CURVE_STEPS; i++) {
    const x = i / (CURVE_STEPS - 1);
    curveA[i] = Math.cos(0.5 * Math.PI * x);
    curveB[i] = Math.sin(0.5 * Math.PI * x)
}
export function crossfadeNow(core, url, durationSec, onSwitched) {
    const ctx = core.ctx;
    const now = ctx.currentTime + 0.02;
    const oldCurr = core.elCurr;
    const oldNext = core.elNext;
    oldNext.src = url;
    oldNext.currentTime = 0;
    core.gNext.gain.setValueAtTime(0.0001, now);
    oldNext.play();
    core.gCurr.gain.cancelScheduledValues(now);
    core.gNext.gain.cancelScheduledValues(now);
    core.gCurr.gain.setValueCurveAtTime(curveA, now, durationSec);
    core.gNext.gain.setValueCurveAtTime(curveB, now, durationSec);
    setTimeout(() => {
        core.switchDeck();
        try {
            oldCurr.pause()
        } catch {}
        onSwitched?.()
    }, durationSec * 1000 + 60)
}
export function crossfadeAtTail(core, durationSec, nextUrl, onSwitched) {
    const ctx = core.ctx;
    const remain = Math.max(0, core.elCurr.duration - core.elCurr.currentTime);
    const start = ctx.currentTime + Math.max(0, remain - durationSec);
    const oldCurr = core.elCurr;
    const oldNext = core.elNext;
    oldNext.src = nextUrl;
    oldNext.currentTime = 0;
    core.gNext.gain.setValueAtTime(0.0001, ctx.currentTime + 0.02);
    oldNext.play();
    core.gCurr.gain.setValueCurveAtTime(curveA, start, durationSec);
    core.gNext.gain.setValueCurveAtTime(curveB, start, durationSec);
    setTimeout(() => {
        core.switchDeck();
        try {
            oldCurr.pause()
        } catch {}
        onSwitched?.()
    }, (remain * 1000) + 60)
}