export function estimateGainDb({
    sampleRate,
    channels
}) {
    const x = channels[0];
    const win = 4800;
    let sum = 0;
    for (let i = 0; i < win; i++) sum += x[i] * x[i];
    let maxRms = Math.sqrt(sum / win);
    for (let i = win; i < x.length; i++) {
        sum += x[i] * x[i] - x[i - win] * x[i - win];
        const rms = Math.sqrt(sum / win);
        if (rms > maxRms) maxRms = rms
    }
    const step = 2048,
        vals = [];
    for (let i = 0; i + step < x.length; i += step) {
        let s = 0;
        for (let k = 0; k < step; k++) s += x[i + k] * x[i + k];
        vals.push(Math.sqrt(s / step))
    }
    vals.sort((a, b) => a - b);
    const rms90 = vals[Math.floor(vals.length * 0.9)] || maxRms || 1e-6;
    const rmsDb = 20 * Math.log10(rms90 + 1e-9);
    const targetDb = -14;
    const gainDb = Math.min(6, Math.max(-12, targetDb - rmsDb));
    return {
        gainDb
    }
}