function startWaveVisualizerStatic(canvas, analyser) {
    const ctx2d = canvas.getContext("2d");
    const freq = new Uint8Array(analyser.frequencyBinCount);

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = 200
    }
    window.addEventListener("resize", resize);
    resize();
    let smooth = 0;
    const alpha = 0.15;

    function sampleBands(arr, bands) {
        const out = new Array(bands).fill(0);
        for (let i = 0; i < bands; i++) {
            const start = Math.floor((i * arr.length) / bands);
            const end = Math.floor(((i + 1) * arr.length) / bands);
            let s = 0,
                c = 0;
            for (let j = start; j < end; j++) {
                s += arr[j];
                c++
            }
            out[i] = c ? s / c / 255 : 0
        }
        return out
    }
    let raf = 0;

    function render() {
        raf = requestAnimationFrame(render);
        analyser.getByteFrequencyData(freq);
        const low = (() => {
            let s = 0,
                c = 0;
            for (let i = 2; i < Math.min(64, freq.length); i++) {
                s += freq[i];
                c++
            }
            return c ? s / c / 255 : 0
        })();
        smooth = smooth * (1 - alpha) + low * alpha;
        const W = canvas.width,
            H = canvas.height;
        ctx2d.clearRect(0, 0, W, H);
        const g = ctx2d.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "rgba(2,6,23,0)");
        g.addColorStop(1, "rgba(2,6,23,1)");
        ctx2d.fillStyle = g;
        ctx2d.fillRect(0, 0, W, H);
        const bands = 48;
        const bandVals = sampleBands(freq, bands);
        const baseY = H - 10;
        const amp = 12 + smooth * 42;
        ctx2d.beginPath();
        ctx2d.moveTo(0, baseY);
        for (let i = 0; i < bands; i++) {
            const x = i * (W / (bands - 1));
            const v = bandVals[i];
            const y = baseY - v * amp;
            if (i === 0) ctx2d.lineTo(x, y);
            else {
                const px = (i - 1) * (W / (bands - 1));
                const py = baseY - bandVals[i - 1] * amp;
                const cx = (px + x) / 2;
                const cy = (py + y) / 2;
                ctx2d.quadraticCurveTo(px, py, cx, cy)
            }
        }
        ctx2d.lineTo(W, H);
        ctx2d.lineTo(0, H);
        ctx2d.closePath();
        ctx2d.fillStyle = "rgba(99,102,241,0.28)";
        ctx2d.fill();
        ctx2d.beginPath();
        ctx2d.moveTo(0, baseY);
        for (let i = 0; i < bands; i++) {
            const x = i * (W / (bands - 1));
            const y = baseY - bandVals[i] * (amp * 0.6);
            if (i === 0) ctx2d.lineTo(x, y);
            else {
                const px = (i - 1) * (W / (bands - 1));
                const py = baseY - bandVals[i - 1] * (amp * 0.6);
                const cx = (px + x) / 2;
                const cy = (py + y) / 2;
                ctx2d.quadraticCurveTo(px, py, cx, cy)
            }
        }
        ctx2d.lineTo(W, H);
        ctx2d.lineTo(0, H);
        ctx2d.closePath();
        ctx2d.fillStyle = "rgba(56,189,248,0.18)";
        ctx2d.fill()
    }
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf)
}
window.startWaveVisualizer = startWaveVisualizerStatic;