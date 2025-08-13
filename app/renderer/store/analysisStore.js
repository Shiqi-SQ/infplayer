const KEY = 'infplayer.analysis.v1';
const cache = JSON.parse(localStorage.getItem(KEY) || '{}');
export function getAnalysis(path) {
    return cache[path] || null
}
export function setAnalysis(path, data) {
    cache[path] = data;
    localStorage.setItem(KEY, JSON.stringify(cache))
}