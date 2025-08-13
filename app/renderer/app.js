import {
    native
} from './services/native.js';
import {
    getState,
    setTracks,
    setCurrentIndex,
    upsertUnique,
    removeAt
} from './store/playlistStore.js';
import {
    initPlaylistView
} from './ui/playlistView.js';
import {
    initPlayerControls
} from './ui/playerControls.js';
import {
    initProgressBar
} from './ui/progressBar.js';
import {
    initCollapseToggle
} from './ui/collapseToggle.js';
import {
    InfAudioEngine
} from './audio/index.js';
const engine = new InfAudioEngine();
const stopViz = window.startWaveVisualizer(document.getElementById('viz-bg'), engine.analyser);
const debugPanel = document.getElementById('debug-panel');
let logs = [];
engine.setMinOverlapSec(20);
engine.setFadeSec(8);
engine.setRateClamp(0.92, 1.10);
engine.setDebug(true);

function renderDebug() {
    debugPanel.textContent = logs.slice(-40).map(e => {
        const t = new Date(e.t).toLocaleTimeString();
        return `${t}[${e.tag}]` + JSON.stringify(e, (k, v) => (k === 't' || k === 'tag') ? undefined : v, 2)
    }).join('\n\n')
}
engine.setDebug(true);
engine.onDebug = (evt) => {
    logs.push(evt);
    renderDebug()
};
window.addEventListener('keydown', (e) => {
    if (e.key === 'F10') {
        const on = debugPanel.classList.toggle('hidden');
        engine.setDebug(!on)
    }
});

function renderNowPlaying() {
    const {
        tracks,
        currentIndex
    } = getState();
    const tr = tracks[currentIndex];
    const title = document.getElementById('now-title');
    const artist = document.getElementById('now-artist');
    const img = document.getElementById('cover');
    const ph = document.getElementById('cover-ph');
    title.textContent = tr?.title || '—';
    artist.textContent = tr?.artist || '—';
    if (tr?.coverDataUrl) {
        img.src = tr.coverDataUrl;
        img.style.display = 'block';
        ph.style.display = 'none'
    } else {
        img.style.display = 'none';
        ph.style.display = 'grid'
    }
}
engine.onTrackChanged = () => {
    setCurrentIndex(engine.index);
    renderNowPlaying()
};
initPlayerControls({
    engine,
    onRepeatChange: (on) => engine.setRepeatOne(on),
});
initProgressBar({
    engine
});
initPlaylistView({
    onPlayIndex: (i) => {
        setCurrentIndex(i);
        engine.playIndex(i)
    }
});
initCollapseToggle();
document.getElementById('btn-add-files').addEventListener('click', async () => {
    const files = await native.selectFiles();
    if (!files?.length) return;
    const list = await native.scanFiles(files);
    upsertUnique(list);
    const {
        currentIndex,
        tracks
    } = getState();
    if (currentIndex < 0 && tracks.length) {
        setCurrentIndex(0);
        engine.setList(tracks);
        engine.playIndex(0)
    } else {
        engine.setList(getState().tracks)
    }
});
document.getElementById('btn-add-folders').addEventListener('click', async () => {
    const roots = await native.selectFolders();
    if (!roots?.length) return;
    const list = await native.scanFolders(roots);
    upsertUnique(list);
    const {
        currentIndex,
        tracks
    } = getState();
    if (currentIndex < 0 && tracks.length) {
        setCurrentIndex(0);
        engine.setList(tracks);
        engine.playIndex(0)
    } else {
        engine.setList(getState().tracks)
    }
});
document.getElementById('btn-del-selected').addEventListener('click', () => {
    const {
        currentIndex
    } = getState();
    if (currentIndex < 0) return;
    removeAt(currentIndex);
    const after = getState();
    engine.setList(after.tracks);
    if (after.tracks.length === 0) {
        try {
            if (!engine.isPaused()) engine.pauseOrResume()
        } catch {}(function refreshNow() {
            const tr = null
        })();
        return
    }
    engine.playIndex(after.currentIndex)
});
renderNowPlaying();