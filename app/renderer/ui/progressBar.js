export function initProgressBar({
    engine
}) {
    const seek = document.getElementById('seek');
    const l = document.getElementById('time-elapsed');
    const r = document.getElementById('time-total');
    let seeking = false;
    const fmt = (sec) => {
        if (!sec) return '0:00';
        const m = Math.floor(sec / 60);
        const s = String(Math.floor(sec % 60)).padStart(2, '0');
        return `${m}:${s}`
    };

    function tick() {
        const {
            currentTime,
            duration
        } = engine.getTimes();
        if (!seeking) seek.value = String(duration ? Math.round(currentTime / duration * 1000) : 0);
        l.textContent = fmt(currentTime || 0);
        r.textContent = fmt(duration || 0);
        requestAnimationFrame(tick)
    }
    tick();
    seek.addEventListener('input', () => {
        seeking = true;
        const {
            duration
        } = engine.getTimes();
        const ratio = parseInt(seek.value, 10) / 1000;
        l.textContent = fmt(ratio * (duration || 0))
    });
    seek.addEventListener('change', () => {
        const {
            duration
        } = engine.getTimes();
        engine.seekTo((duration || 0) * (parseInt(seek.value, 10) / 1000));
        seeking = false
    })
}