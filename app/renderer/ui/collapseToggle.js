import {
    native
} from '../services/native.js';
export function initCollapseToggle() {
    const layoutRoot = document.getElementById('layoutRoot');
    const btn = document.getElementById('btn-toggle-pl');
    btn.addEventListener('click', () => {
        const collapsed = !layoutRoot.classList.contains('collapsed');
        layoutRoot.classList.toggle('collapsed', collapsed);
        native.togglePlaylist(collapsed)
    })
}