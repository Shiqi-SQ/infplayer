export const native = {
    selectFiles: () => window.infNative.selectFiles(),
    selectFolders: () => window.infNative.selectFolders(),
    scanFiles: (files) => window.infNative.scanFiles(files),
    scanFolders: (roots) => window.infNative.scanFolders(roots),
    togglePlaylist: (collapsed) => window.infNative.togglePlaylist(collapsed),
    readFile: (path) => window.infNative.readFile(path),
};