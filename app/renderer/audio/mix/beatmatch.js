export function planBeatmatch({
    currGrid,
    nextGrid,
    bpmCurr,
    bpmNext,
    fadeSec,
    nowCurrTime
}) {
    if (!currGrid?.length || !nextGrid?.length || !bpmCurr || !bpmNext) {
        return {
            startOffset: 0,
            nextStartSec: 0,
            playbackRate: 1.0
        }
    }
    const idealStart = nowCurrTime - fadeSec;
    let startBeat = currGrid.reduce((best, t) => Math.abs(t - idealStart) < Math.abs(best - idealStart) ? t : best, currGrid[0]);
    const beatLenCurr = 60 / bpmCurr,
        beatLenNext = 60 / bpmNext;
    let rate = bpmCurr / bpmNext;
    if (rate < 0.94) rate = 0.94;
    if (rate > 1.06) rate = 1.06;
    const nextStartSec = 0;
    return {
        startOffset: startBeat - idealStart,
        nextStartSec,
        playbackRate: rate
    }
}