const listeners = new Set();
const state = {
    tracks: [],
    currentIndex: -1,
};
export function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn)
}

function emit() {
    listeners.forEach(fn => fn(getState()))
}
export function getState() {
    return {
        ...state
    }
}
export function setTracks(tracks) {
    state.tracks = tracks || [];
    if (state.currentIndex >= state.tracks.length) state.currentIndex = state.tracks.length - 1;
    emit()
}
export function setCurrentIndex(i) {
    state.currentIndex = i;
    emit()
}
export function reorder(from, to) {
    if (from === to) return;
    const arr = state.tracks;
    const item = arr.splice(from, 1)[0];
    arr.splice(to, 0, item);
    if (state.currentIndex === from) state.currentIndex = to;
    else if (from < state.currentIndex && to >= state.currentIndex) state.currentIndex -= 1;
    else if (from > state.currentIndex && to <= state.currentIndex) state.currentIndex += 1;
    emit()
}
export function removeAt(i) {
    if (i < 0 || i >= state.tracks.length) return;
    state.tracks.splice(i, 1);
    if (state.currentIndex === i) state.currentIndex = Math.min(i, state.tracks.length - 1);
    else if (i < state.currentIndex) state.currentIndex -= 1;
    emit()
}
export function upsertUnique(newTracks) {
    const seen = new Set(state.tracks.map(t => t.path));
    for (const t of newTracks)
        if (!seen.has(t.path)) state.tracks.push(t);
    emit()
}