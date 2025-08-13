export function estimateBPM({
    sampleRate,
    channels
}) {
    const x = channels[0];
    const hop = 1024,
        win = 2048;
    const env = [];
    let prev = 0;
    for (let i = 0; i + win < x.length; i += hop) {
        let s = 0;
        for (let k = 0; k < win; k++) {
            const v = x[i + k];
            s += v * v
        }
        const e = Math.max(0, s / win - prev);
        env.push(e);
        prev = s / win
    }
    for (let i = 1; i < env.length; i++) env[i] = env[i - 1] * 0.8 + env[i] * 0.2;
    const fps = sampleRate / hop;
    const minLag = Math.floor(fps * 60 / 180);
    const maxLag = Math.floor(fps * 60 / 60);
    let bestLag = minLag,
        bestVal = -1;
    for (let lag = minLag; lag <= maxLag; lag++) {
        let s = 0;
        for (let i = lag; i < env.length; i++) s += env[i] * env[i - lag];
        if (s > bestVal) {
            bestVal = s;
            bestLag = lag
        }
    }
    const bpm = Math.round((60 * fps) / bestLag);
    const peaks = [];
    for (let i = 1; i < env.length - 1; i++) {
        if (env[i] > env[i - 1] && env[i] > env[i + 1] && env[i] > 0.0005) peaks.push(i)
    }
    const firstBeatSec = (peaks[0] || 0) / fps;
    const beatSec = 60 / bpm;
    const grid = [];
    for (let t = firstBeatSec; t < 300; t += beatSec) grid.push(t);
    return {
        bpm,
        beatGrid: grid
    }
}