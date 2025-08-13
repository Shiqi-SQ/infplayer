export function setupNormalizer(core) {
    const limiter = core.ctx.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-2, core.ctx.currentTime);
    limiter.knee.setValueAtTime(1, core.ctx.currentTime);
    limiter.ratio.setValueAtTime(20, core.ctx.currentTime);
    limiter.attack.setValueAtTime(0.003, core.ctx.currentTime);
    limiter.release.setValueAtTime(0.1, core.ctx.currentTime);
    core.master.disconnect();
    limiter.connect(core.analyser);
    core.master.disconnect(core.analyser);
    core.master.connect(limiter);
    core.preGainA = core.ctx.createGain();
    core.preGainB = core.ctx.createGain();
    core.srcA.disconnect();
    core.srcB.disconnect();
    core.srcA.connect(core.preGainA).connect(core.gainA);
    core.srcB.connect(core.preGainB).connect(core.gainB);
    return {
        setDeckGainDb(tag, db) {
            const g = Math.pow(10, db / 20);
            (tag === 'A' ? core.preGainA : core.preGainB).gain.setValueAtTime(g, core.ctx.currentTime + 0.001)
        }
    }
}