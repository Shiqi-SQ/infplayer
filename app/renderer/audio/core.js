export class AudioCore {
    constructor() {
        this.ctx = new(window.AudioContext || window.webkitAudioContext)({
            sampleRate: 48000
        });
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        const limiter = this.ctx.createDynamicsCompressor();
        limiter.threshold.value = -2;
        limiter.knee.value = 1;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.10;
        this.master.connect(limiter).connect(this.analyser).connect(this.ctx.destination);
        this.gainA = this.ctx.createGain();
        this.gainB = this.ctx.createGain();
        this.gainA.gain.value = 1.0;
        this.gainB.gain.value = 0.0;
        this.gainA.connect(this.master);
        this.gainB.connect(this.master);
        this.preGainA = this.ctx.createGain();
        this.preGainB = this.ctx.createGain();
        this.elA = new Audio();
        this.elA.preload = 'auto';
        this.elB = new Audio();
        this.elB.preload = 'auto';
        this.srcA = this.ctx.createMediaElementSource(this.elA);
        this.srcB = this.ctx.createMediaElementSource(this.elB);
        this.srcA.connect(this.preGainA).connect(this.gainA);
        this.srcB.connect(this.preGainB).connect(this.gainB);
        this.currentTag = 'A'
    }
    get gCurr() {
        return this.currentTag === 'A' ? this.gainA : this.gainB
    }
    get gNext() {
        return this.currentTag === 'A' ? this.gainB : this.gainA
    }
    get preCurr() {
        return this.currentTag === 'A' ? this.preGainA : this.preGainB
    }
    get preNext() {
        return this.currentTag === 'A' ? this.preGainB : this.preGainA
    }
    get elCurr() {
        return this.currentTag === 'A' ? this.elA : this.elB
    }
    get elNext() {
        return this.currentTag === 'A' ? this.elB : this.elA
    }
    switchDeck() {
        this.currentTag = (this.currentTag === 'A' ? 'B' : 'A')
    }
    setDeckGainDb(tag, db) {
        const g = Math.pow(10, (db || 0) / 20);
        (tag === 'A' ? this.preGainA : this.preGainB).gain.setValueAtTime(g, this.ctx.currentTime + 0.001)
    }
    setDeckPlaybackRate(tag, rate = 1.0) {
        (tag === 'A' ? this.elA : this.elB).playbackRate = rate
    }
    static pathToURL(p) {
        let u = p.replace(/\\/g, '/');
        if (!u.startsWith('/')) u = '/' + u;
        return encodeURI('file://' + u)
    }
}