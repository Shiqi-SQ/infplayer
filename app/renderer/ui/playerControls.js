export function initPlayerControls({
    engine,
    onRepeatChange
}) {
    const $ = (s) => document.querySelector(s);
    $('#btn-prev').addEventListener('click', () => engine.prev());
    $('#btn-next').addEventListener('click', () => engine.next());
    $('#btn-play').addEventListener('click', () => engine.pauseOrResume());
    $('#btn-repeat').addEventListener('click', () => {
        const btn = $('#btn-repeat');
        const on = !btn.classList.contains('active');
        btn.classList.toggle('active', on);
        onRepeatChange?.(on)
    });
    engine.onPlayState = (st) => {
        const play = document.getElementById('ico-play');
        const pause = document.getElementById('ico-pause');
        if (st === 'playing') {
            play.classList.add('hidden');
            pause.classList.remove('hidden')
        } else {
            pause.classList.add('hidden');
            play.classList.remove('hidden')
        }
    }
}