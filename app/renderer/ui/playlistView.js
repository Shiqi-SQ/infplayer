import {
    getState,
    subscribe,
    removeAt,
    reorder
} from '../store/playlistStore.js';
import {
    makeSortable
} from '../dnd/sortableList.js';
const listEl = document.getElementById('playlist');
const ctxMenu = document.getElementById('ctx-menu');
const ctxDelete = document.getElementById('ctx-delete');
let ctxIndex = null;
export function initPlaylistView({
    onPlayIndex
}) {
    render();
    subscribe(render);
    listEl.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (!li) return;
        if (e.target.tagName === 'BUTTON') return;
        const i = parseInt(li.dataset.index, 10);
        onPlayIndex?.(i)
    });
    listEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const li = e.target.closest('li');
        if (!li) return;
        ctxIndex = parseInt(li.dataset.index, 10);
        ctxMenu.style.left = e.clientX + 'px';
        ctxMenu.style.top = e.clientY + 'px';
        ctxMenu.classList.remove('hidden')
    });
    window.addEventListener('click', () => ctxMenu.classList.add('hidden'));
    ctxDelete.addEventListener('click', () => {
        if (ctxIndex != null) removeAt(ctxIndex);
        ctxMenu.classList.add('hidden')
    });
    makeSortable(listEl, {
        onReorder: (from, to) => reorder(from, to)
    })
}

function minsSecs(sec) {
    if (!sec) return '--:--';
    const m = Math.floor(sec / 60);
    const s = String(Math.floor(sec % 60)).padStart(2, '0');
    return `${m}:${s}`
}

function esc(s = '') {
    return s.replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    } [c]))
}

function render() {
    const {
        tracks,
        currentIndex
    } = getState();
    listEl.innerHTML = '';
    tracks.forEach((t, i) => {
        const li = document.createElement('li');
        li.dataset.index = String(i);
        if (i === currentIndex) li.classList.add('active');
        const info = document.createElement('div');
        info.innerHTML = `<div class="li-title">${esc(t.title)}</div><div class="li-sub">${esc(t.artist)}·${esc(t.album)}·${minsSecs(t.duration)}</div>`;
        const actions = document.createElement('div');
        actions.className = 'li-actions';
        const btnDel = document.createElement('button');
        btnDel.textContent = '删除';
        btnDel.addEventListener('click', (e) => {
            e.stopPropagation();
            removeAt(i)
        });
        actions.appendChild(btnDel);
        li.appendChild(info);
        li.appendChild(actions);
        listEl.appendChild(li)
    })
}