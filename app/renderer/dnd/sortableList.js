export function makeSortable(listEl, {
    onReorder
}) {
    let drag = null;
    listEl.addEventListener('pointerdown', (e) => {
        const li = e.target.closest('li');
        if (!li || e.button !== 0 || e.target.tagName === 'BUTTON') return;
        const listRect = listEl.getBoundingClientRect();
        const liRect = li.getBoundingClientRect();
        const ph = document.createElement('div');
        ph.className = 'li-placeholder';
        ph.style.height = liRect.height + 'px';
        listEl.insertBefore(ph, li);
        const left0 = liRect.left - listRect.left;
        const top0 = li.offsetTop;
        drag = {
            el: li,
            from: parseInt(li.dataset.index, 10),
            height: liRect.height,
            offsetY: e.clientY - liRect.top,
            placeholder: ph
        };
        li.classList.add('li-ghost');
        li.style.position = 'absolute';
        li.style.left = left0 + 'px';
        li.style.top = top0 + 'px';
        li.style.width = liRect.width + 'px';
        li.style.zIndex = 4;
        listEl.setPointerCapture(e.pointerId)
    });
    listEl.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const listRect = listEl.getBoundingClientRect();
        let y = (e.clientY - listRect.top) + listEl.scrollTop - drag.offsetY;
        y = Math.max(0, Math.min(y, listEl.scrollHeight - drag.height));
        drag.el.style.top = y + 'px';
        const items = Array.from(listEl.querySelectorAll('li')).filter(n => n !== drag.el);
        let insertBefore = null;
        for (const it of items) {
            const r = it.getBoundingClientRect();
            const mid = r.top + r.height / 2;
            if (e.clientY < mid) {
                insertBefore = it;
                break
            }
        }
        if (insertBefore) listEl.insertBefore(drag.placeholder, insertBefore);
        else listEl.appendChild(drag.placeholder);
        const edge = 40;
        if (e.clientY < listRect.top + edge) listEl.scrollTop -= 12;
        else if (e.clientY > listRect.bottom - edge) listEl.scrollTop += 12
    });
    window.addEventListener('pointerup', () => {
        if (!drag) return;
        const children = Array.from(listEl.children);
        const phIdx = children.indexOf(drag.placeholder);
        const to = children.slice(0, phIdx).filter(n => n.tagName === 'LI').length;
        drag.el.classList.remove('li-ghost');
        drag.el.style.position = '';
        drag.el.style.top = '';
        drag.el.style.left = '';
        drag.el.style.width = '';
        drag.el.style.zIndex = '';
        drag.placeholder.remove();
        if (typeof onReorder === 'function' && to !== drag.from) onReorder(drag.from, to);
        drag = null
    })
}