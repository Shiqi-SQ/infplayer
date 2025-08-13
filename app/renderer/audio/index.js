import {
    AudioCore
} from './core.js';
const CURVE_STEPS = 128;
const curveOut = new Float32Array(CURVE_STEPS);
const curveIn = new Float32Array(CURVE_STEPS);
for (let i = 0; i < CURVE_STEPS; i++) {
    const x = i / (CURVE_STEPS - 1);
    curveOut[i] = Math.cos(0.5 * Math.PI * x);
    curveIn[i] = Math.sin(0.5 * Math.PI * x)
}

function normalizeBPM(bpm, min = 80, max = 180) {
    if (!bpm || !isFinite(bpm)) return 0;
    let n = bpm;
    while (n > 0 && n < min) n *= 2;
    while (n > max) n /= 2;
    return Math.round(n)
}

function calcRate(bpmCurr, bpmNext, clampLow, clampHigh) {
    const c = normalizeBPM(bpmCurr);
    const n = normalizeBPM(bpmNext);
    if (!c || !n) return {
        rate: 1.0,
        normCurr: c,
        normNext: n,
        rawCurr: bpmCurr,
        rawNext: bpmNext
    };
    let r = c / n;
    const unclamped = r;
    r = Math.max(clampLow, Math.min(clampHigh, r));
    return {
        rate: r,
        unclamped,
        normCurr: c,
        normNext: n,
        rawCurr: bpmCurr,
        rawNext: bpmNext
    }
}
const ANALYSIS_KEY = 'infplayer.analysis.v2';
const analysisCache = (() => {
    try {
        return JSON.parse(localStorage.getItem(ANALYSIS_KEY) || '{}')
    } catch {
        return {}
    }
})();

function getAnalysis(path) {
    return analysisCache[path] || null
}

function setAnalysis(path, data) {
    analysisCache[path] = data;
    try {
        localStorage.setItem(ANALYSIS_KEY, JSON.stringify(analysisCache))
    } catch {}
}
async function readFileBuffer(filePath) {
    if (!window.infNative || !window.infNative.readFile) return null;
    const buf = await window.infNative.readFile(filePath);
    return buf?.buffer?.slice?.(buf.byteOffset, buf.byteOffset + buf.byteLength) || null
}
async function analyzeTrack(path, seconds = 20) {
    const cached = getAnalysis(path);
    if (cached) return cached;
    const arr = await readFileBuffer(path);
    if (!arr) {
        const fallback = {
            bpmRaw: 0,
            bpm: 0,
            beatGrid: [],
            gainDb: 0,
            key: null
        };
        setAnalysis(path, fallback);
        return fallback
    }
    const sr = 48000;
    const off = new(window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, sr * seconds, sr);
    const audioBuf = await off.decodeAudioData(arr.slice(0));
    const frames = Math.min(audioBuf.length, seconds * audioBuf.sampleRate);
    const ch0 = audioBuf.getChannelData(0).slice(0, frames);
    const sampleRate = audioBuf.sampleRate;
    const step = 2048;
    const vals = [];
    for (let i = 0; i + step < ch0.length; i += step) {
        let s = 0;
        for (let k = 0; k < step; k++) s += ch0[i + k] * ch0[i + k];
        vals.push(Math.sqrt(s / step))
    }
    vals.sort((a, b) => a - b);
    const rms90 = vals[Math.floor(vals.length * 0.9)] || 1e-6;
    const rmsDb = 20 * Math.log10(rms90 + 1e-9);
    const targetDb = -14;
    const gainDb = Math.min(12, Math.max(-12, targetDb - rmsDb));
    const hop = 1024,
        win = 2048,
        env = [];
    let prev = 0;
    for (let i = 0; i + win < ch0.length; i += hop) {
        let s = 0;
        for (let k = 0; k < win; k++) s += ch0[i + k] * ch0[i + k];
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
    const bpmRaw = Math.round((60 * fps) / bestLag) || 0;
    const bpm = normalizeBPM(bpmRaw);
    const peaks = [];
    for (let i = 1; i < env.length - 1; i++) {
        if (env[i] > env[i - 1] && env[i] > env[i + 1] && env[i] > 0.0005) peaks.push(i)
    }
    const firstBeatSec = (peaks[0] || 0) / fps;
    const beatSec = bpm ? (60 / bpm) : 0;
    const beatGrid = [];
    if (beatSec)
        for (let t = firstBeatSec; t < 600; t += beatSec) beatGrid.push(t);
    const result = {
        bpmRaw,
        bpm,
        beatGrid,
        gainDb,
        key: null
    };
    setAnalysis(path, result);
    return result
}

function planBeatmatchTail({
    aCurr,
    aNext,
    fadeSec,
    remain,
    currentTime,
    clamp
}) {
    const clampLow = clamp?. [0]??0.94;
    const clampHigh = clamp?. [1]??1.06;
    if (!aCurr || !aNext || !aCurr.bpm || !aNext.bpm || !aCurr.beatGrid?.length) {
        return {
            mode: 'fallback',
            startAbsOffset: Math.max(0, remain - fadeSec),
            nextStartSec: 0,
            nextRate: 1.0,
            startBeat: null,
            calc: {
                bpmCurr: aCurr?.bpm || 0,
                bpmNext: aNext?.bpm || 0,
                clampLow,
                clampHigh
            }
        }
    }
    const {
        rate,
        unclamped,
        normCurr,
        normNext
    } = calcRate(aCurr.bpm, aNext.bpm, clampLow, clampHigh);
    const idealStartRel = Math.max(0, remain - fadeSec);
    const idealStartInTrack = currentTime + remain - fadeSec;
    let nearest = aCurr.beatGrid[0];
    let bestErr = Math.abs(nearest - idealStartInTrack);
    for (let i = 1; i < aCurr.beatGrid.length; i++) {
        const e = Math.abs(aCurr.beatGrid[i] - idealStartInTrack);
        if (e < bestErr) {
            bestErr = e;
            nearest = aCurr.beatGrid[i]
        }
        if (aCurr.beatGrid[i] > idealStartInTrack + fadeSec) break
    }
    const startOffset = nearest - idealStartInTrack;
    const startAbsOffset = Math.max(0, idealStartRel + startOffset);
    return {
        mode: 'quantized',
        startAbsOffset,
        startBeat: nearest,
        startOffset,
        nextStartSec: 0,
        nextRate: rate,
        calc: {
            bpmCurr: aCurr.bpm,
            bpmNext: aNext.bpm,
            normCurr,
            normNext,
            unclamped,
            clampLow,
            clampHigh
        }
    }
}
export class InfAudioEngine {
    constructor() {
        this.core = new AudioCore();
        this.analyser = this.core.analyser;
        this.fadeSec = 8;
        this.minOverlapSec = 5;
        this.rateClamp = [0.92, 1.10];
        this.list = [];
        this.index = -1;
        this.repeatOne = false;
        this.debug = false;
        this.onDebug = null;
        this._xfScheduled = false;
        this.onTrackChanged = null;
        this.onPlayState = null;
        this._bindPlayState();
        this._bindTailWatcher()
    }
    setDebug(on) {
        this.debug = !!on
    }
    _debug(tag, payload) {
        if (!this.debug && !this.onDebug) return;
        const evt = {
            tag,
            t: Date.now(),
            ...payload
        };
        try {
            this.onDebug?.(evt)
        } catch {}
        if (this.debug) console.debug('[INF DEBUG]', evt)
    }
    setFadeSec(s) {
        this.fadeSec = Math.max(0, Math.min(20, s | 0))
    }
    setMinOverlapSec(s) {
        this.minOverlapSec = Math.max(0, s | 0)
    }
    setRateClamp(low, high) {
        this.rateClamp = [low, high]
    }
    setList(list) {
        this.list = list || [];
        if (this.index == null) this.index = -1;
        if (this.index >= this.list.length) this.index = this.list.length - 1;
        this._debug('setList', {
            size: this.list.length,
            index: this.index
        })
    }
    setRepeatOne(on) {
        this.repeatOne = !!on;
        this._debug('repeat', {
            on: this.repeatOne
        })
    }
    async playIndex(i) {
        if (!this.list.length) return;
        this.index = (i + this.list.length) % this.list.length;
        const tr = this.list[this.index];
        await this.core.ctx.resume();
        try {
            const ana = await analyzeTrack(tr.path);
            this.core.setDeckGainDb(this.core.currentTag, ana.gainDb || 0);
            this.core.setDeckPlaybackRate(this.core.currentTag, 1.0);
            this._debug('analysis', {
                track: tr.title,
                path: tr.path,
                bpmRaw: ana.bpmRaw,
                bpm: ana.bpm,
                gainDb: ana.gainDb,
                beatGridLen: ana.beatGrid?.length || 0
            })
        } catch (e) {
            this._debug('analysis-error', {
                error: String(e)
            })
        }
        const d = Math.max(this.fadeSec, this.minOverlapSec);
        const url = AudioCore.pathToURL(tr.path);
        const now = this.core.ctx.currentTime + 0.02;
        const oldCurr = this.core.elCurr;
        const oldNext = this.core.elNext;
        oldNext.src = url;
        oldNext.currentTime = 0;
        this.core.gNext.gain.setValueAtTime(0.0001, now);
        oldNext.play();
        this.core.gCurr.gain.cancelScheduledValues(now);
        this.core.gNext.gain.cancelScheduledValues(now);
        this.core.gCurr.gain.setValueCurveAtTime(curveOut, now, d);
        this.core.gNext.gain.setValueCurveAtTime(curveIn, now, d);
        this._debug('playIndex', {
            index: this.index,
            deckFrom: this.core.currentTag,
            fade: d
        });
        setTimeout(() => {
            this.core.switchDeck();
            try {
                oldCurr.pause()
            } catch {}
            this.onTrackChanged?.(tr);
            this._debug('switched', {
                index: this.index,
                deckNow: this.core.currentTag
            })
        }, Math.round(d * 1000) + 60)
    }
    pauseOrResume() {
        const el = this.core.elCurr;
        if (el.paused) {
            this.core.ctx.resume();
            el.play()
        } else {
            el.pause()
        }
    }
    prev() {
        if (!this.list.length) return;
        this.playIndex((this.index - 1 + this.list.length) % this.list.length)
    }
    async next() {
        if (!this.list.length) return;
        const nextIdx = (this.index + 1) % this.list.length;
        await this._crossfadeToIndex(nextIdx, true)
    }
    getTimes() {
        const el = this.core.elCurr;
        return {
            currentTime: Number.isFinite(el.currentTime) ? el.currentTime : 0,
            duration: Number.isFinite(el.duration) ? el.duration : 0
        }
    }
    seekTo(sec) {
        const el = this.core.elCurr;
        if (Number.isFinite(el.duration)) {
            el.currentTime = Math.max(0, Math.min(sec, el.duration));
            if (el.paused) el.play().catch(() => {})
        }
    }
    isPaused() {
        return this.core.elCurr.paused
    }
    _bindPlayState() {
        const hook = () => this.onPlayState?.(this.isPaused() ? 'paused' : 'playing');
        [this.core.elA, this.core.elB].forEach(el => {
            el.addEventListener('play', hook);
            el.addEventListener('pause', hook);
            el.addEventListener('ended', hook)
        })
    }
    _bindTailWatcher() {
        const tick = () => {
            requestAnimationFrame(tick);
            const el = this.core.elCurr;
            if (!el || !isFinite(el.duration)) return;
            if (this.repeatOne) {
                if (el.duration - el.currentTime <= 0.05) {
                    el.currentTime = 0;
                    el.play()
                }
                return
            }
            const d = Math.max(this.fadeSec, this.minOverlapSec);
            const remain = el.duration - el.currentTime;
            if (d > 0 && remain > 0 && remain <= d + 0.25 && !this._xfScheduled && this.list.length > 1) {
                this._xfScheduled = true;
                const nextIdx = (this.index + 1) % this.list.length;
                this._crossfadeToIndex(nextIdx, false).finally(() => {})
            }
        };
        tick()
    }
    async _crossfadeToIndex(nextIdx, immediate) {
        const curr = this.list[this.index];
        const next = this.list[nextIdx];
        if (!next) {
            this._xfScheduled = false;
            return
        }
        let aCurr = null,
            aNext = null;
        try {
            aCurr = await analyzeTrack(curr.path);
            aNext = await analyzeTrack(next.path);
            this._debug('analysis-pair', {
                curr: {
                    title: curr.title,
                    bpmRaw: aCurr?.bpmRaw,
                    bpm: aCurr?.bpm,
                    gainDb: aCurr?.gainDb,
                    grid: aCurr?.beatGrid?.length || 0
                },
                next: {
                    title: next.title,
                    bpmRaw: aNext?.bpmRaw,
                    bpm: aNext?.bpm,
                    gainDb: aNext?.gainDb,
                    grid: aNext?.beatGrid?.length || 0
                }
            })
        } catch (e) {
            this._debug('analysis-error', {
                error: String(e)
            })
        }
        try {
            this.core.setDeckGainDb(this.core.currentTag === 'A' ? 'B' : 'A', aNext?.gainDb || 0)
        } catch {}
        const url = AudioCore.pathToURL(next.path);
        const now = this.core.ctx.currentTime;
        const remain = Math.max(0, this.core.elCurr.duration - this.core.elCurr.currentTime);
        let {
            rate,
            unclamped,
            normCurr,
            normNext
        } = calcRate(aCurr?.bpm, aNext?.bpm, this.rateClamp[0], this.rateClamp[1]);
        const d = Math.max(this.fadeSec, this.minOverlapSec);
        let startAbs = now + (immediate ? 0.02 : Math.max(0, remain - d));
        let nextStartSec = 0;
        let startAbsOffset = null;
        let mode = immediate ? 'immediate' : 'tail';
        let startBeat = null;
        if (!immediate) {
            const plan = planBeatmatchTail({
                aCurr,
                aNext,
                fadeSec: d,
                remain,
                currentTime: this.core.elCurr.currentTime,
                clamp: this.rateClamp
            });
            startAbs = now + (plan.startAbsOffset??Math.max(0, remain - d));
            nextStartSec = plan.nextStartSec || 0;
            rate = plan.nextRate??rate;
            startAbsOffset = plan.startAbsOffset??null;
            mode = plan.mode;
            startBeat = plan.startBeat??null;
            if (plan.calc?.normCurr) normCurr = plan.calc.normCurr;
            if (plan.calc?.normNext) normNext = plan.calc.normNext;
            if (plan.calc?.unclamped) unclamped = plan.calc.unclamped
        }
        const latestStart = now + Math.max(0, remain - d);
        const earliestStart = now + 0.02;
        startAbs = Math.min(startAbs, latestStart);
        startAbs = Math.max(startAbs, earliestStart);
        const overlapPlanned = Math.max(0, remain - (startAbs - now));
        this.core.setDeckPlaybackRate(this.core.currentTag === 'A' ? 'B' : 'A', rate);
        const oldCurr = this.core.elCurr;
        const oldNext = this.core.elNext;
        oldNext.src = url;
        oldNext.currentTime = nextStartSec;
        this.core.gNext.gain.setValueAtTime(0.0001, startAbs - 0.01);
        oldNext.play();
        this.core.gCurr.gain.cancelScheduledValues(startAbs);
        this.core.gNext.gain.cancelScheduledValues(startAbs);
        this.core.gCurr.gain.setValueCurveAtTime(curveOut, startAbs, d);
        this.core.gNext.gain.setValueCurveAtTime(curveIn, startAbs, d);
        this._debug('xf-scheduled', {
            mode,
            fromIndex: this.index,
            toIndex: nextIdx,
            deckFrom: this.core.currentTag,
            remain: +remain.toFixed(2),
            fadeSec: this.fadeSec,
            minOverlapSec: this.minOverlapSec,
            effectiveFade: d,
            latestStart: +latestStart.toFixed(3),
            startAbs: +startAbs.toFixed(3),
            startAbsOffset: startAbsOffset != null ? +startAbsOffset.toFixed(3) : null,
            overlapPlanned: +overlapPlanned.toFixed(3),
            startBeat: startBeat != null ? +startBeat.toFixed(3) : null,
            bpmCurr: aCurr?.bpm,
            bpmNext: aNext?.bpm,
            bpmNormCurr: normCurr,
            bpmNormNext: normNext,
            rateUnclamped: +(unclamped??rate).toFixed(3),
            rateApplied: +rate.toFixed(3),
            rateClamp: this.rateClamp
        });
        const totalMs = (startAbs - now + d) * 1000 + 80;
        setTimeout(() => {
            const before = this.core.currentTag;
            this.core.switchDeck();
            try {
                oldCurr.pause()
            } catch {}
            this.index = nextIdx;
            this.onTrackChanged?.(this.list[this.index]);
            this._xfScheduled = false;
            this._debug('xf-done', {
                deckFrom: before,
                deckNow: this.core.currentTag,
                toIndex: this.index
            })
        }, Math.round(totalMs))
    }
}