const {
    app,
    BrowserWindow,
    dialog,
    ipcMain,
    Menu
} = require("electron");
const path = require("node:path");
const fs = require("node:fs").promises;
const mm = require("music-metadata");

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: "#0b0c10",
        autoHideMenuBar: true,
        titleBarStyle: "hidden",
        titleBarOverlay: {
            color: "#0f172a",
            symbolColor: "#e5e7eb",
            height: 32,
        },
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    Menu.setApplicationMenu(null);
    if (!app.isPackaged) win.webContents.openDevTools({
        mode: "detach",
    });
    win.loadFile(path.join(__dirname, "renderer", "index.html"))
}
app.whenReady().then(() => {
    app.setAppUserModelId("com.infplayer.app");
    createWindow();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
});
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit()
});
const AUDIO_EXT = new Set([".mp3", ".flac", ".m4a", ".aac", ".wav", ".ogg", ".opus", ".aiff", ".wma", ]);

function coverToDataURL(picture) {
    if (!picture || !picture.data) return null;
    const mime = picture.format || "image/png";
    return `data:${mime};base64,${picture.data.toString("base64")}`
}
async function readTrackMeta(p) {
    const ext = path.extname(p).toLowerCase();
    if (!AUDIO_EXT.has(ext)) return null;
    try {
        const meta = await mm.parseFile(p, {
            duration: true,
        });
        const pic = meta.common.picture && meta.common.picture[0];
        return {
            path: p,
            title: meta.common.title || path.basename(p),
            artist: meta.common.artist || "",
            album: meta.common.album || "",
            duration: meta.format.duration || 0,
            coverDataUrl: coverToDataURL(pic),
        }
    } catch {
        return {
            path: p,
            title: path.basename(p),
            artist: "",
            album: "",
            duration: 0,
            coverDataUrl: null,
        }
    }
}
async function scanDir(root) {
    const list = [];
    async function walk(dir) {
        const ents = await fs.readdir(dir, {
            withFileTypes: true,
        });
        for (const e of ents) {
            const p = path.join(dir, e.name);
            if (e.isDirectory()) {
                await walk(p);
                continue
            }
            const t = await readTrackMeta(p);
            if (t) list.push(t)
        }
    }
    await walk(root);
    list.sort((a, b) => a.title.localeCompare(b.title));
    return list
}
const {
    selectFolder,
    selectFolders,
    selectFiles
} = dialog;
ipcMain.handle("select-folder", async () => {
    const {
        canceled,
        filePaths
    } = await dialog.showOpenDialog({
        properties: ["openDirectory"],
    });
    if (canceled || !filePaths[0]) return null;
    return filePaths[0]
});
ipcMain.handle("select-folders", async () => {
    const {
        canceled,
        filePaths
    } = await dialog.showOpenDialog({
        properties: ["openDirectory", "multiSelections"],
    });
    return canceled ? [] : filePaths
});
ipcMain.handle("select-files", async () => {
    const {
        canceled,
        filePaths
    } = await dialog.showOpenDialog({
        properties: ["openFile", "multiSelections"],
        filters: [{
            name: "Audio",
            extensions: Array.from(AUDIO_EXT).map((e) => e.slice(1)),
        }, ],
    });
    return canceled ? [] : filePaths
});
ipcMain.handle("scan-folder", async (_e, root) => root ? await scanDir(root) : [], );
ipcMain.handle("scan-folders", async (_e, roots = []) => {
    const r = [];
    for (const d of roots) r.push(...(await scanDir(d)));
    return r
});
ipcMain.handle("scan-files", async (_e, files = []) => {
    const out = [];
    for (const f of files) {
        const t = await readTrackMeta(f);
        if (t) out.push(t)
    }
    return out
});
let lastExpandedSize = null;
ipcMain.on("ui:togglePlaylist", (evt, collapsed) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    if (!win) return;
    const [w, h] = win.getSize();
    if (collapsed) {
        lastExpandedSize = [w, h];
        const targetW = 460;
        win.setMinimumSize(420, 480);
        win.setSize(Math.max(targetW, 420), h, true)
    } else {
        const restore = lastExpandedSize || [900, h];
        win.setMinimumSize(800, 480);
        win.setSize(restore[0], restore[1], true)
    }
});
ipcMain.handle('read-file', async (_e, p) => {
    const buf = await fs.readFile(p);
    return buf
});