# infplayer

**infplayer** 是一个基于 Electron 开发的跨平台音乐播放器原型，支持自动混音（Auto Mix）过渡播放效果，效果学习 Apple Music。

## ✨ 特性

- 🎵 **自动混音过渡**  
  播放两首歌曲时，自动进行 **BPM / 音调 / 音量** 的平滑过渡，可自定义最小重叠时长。
- 🎚 **本地音乐播放**  
  支持加载本地音乐文件（单曲、多选、文件夹批量导入）。
- 📂 **播放列表管理**  
  - 添加单首歌曲 / 多首歌曲 / 文件夹  
  - 删除单曲  
  - 拖拽排序（实时调整列表顺序）  
  - 可隐藏/展开播放列表
- 📊 **可视化频谱波浪**  
  波浪贴底显示，随音频频谱动态变化，其他 UI 悬浮于上方。
- 🖼 **专辑封面显示**  
  自动读取歌曲封面，如无封面则显示默认音符占位图。
- ⏯ **基础播放控制**  
  单曲循环、上一首、暂停/继续、下一首等常用功能。
- 🖥 **简洁美观的 UI**  
  无传统菜单栏，支持调整窗口大小，播放列表可收缩以专注播放界面。

---

## 📦 安装与运行

### 1. 克隆项目
```bash
git clone https://github.com/Shiqi-SQ/infplayer.git
cd infplayer
```

### 2. 安装依赖

> 推荐切换到国内镜像加速依赖安装

```bash
npm config set registry https://registry.npmmirror.com
npm install
```

### 3. 启动开发模式

```bash
npm start
```

------

## 🔨 构建发行版

> **注意**：Electron Builder 会从 GitHub 下载 Electron / NSIS 相关依赖，如在国内网络建议提前缓存或设置镜像。

```bash
npm run build
```

构建产物会生成在：

```
dist/
```

Windows 平台默认输出 `infplayer Setup 版本号.exe` 安装包。

### 国内构建加速

```powershell
# PowerShell
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
npm run build
```

------

## ⚙️ 配置

### 最小过渡时间

可在 `core.js` 或 `audioEngine.js` 中设置：

```js
engine.setMinOverlapSec(5); // 两曲至少5秒重叠过渡
```

### BPM 范围修正

- 低于 90 BPM 的倍增
- 高于 200 BPM 的降倍
- 避免极端数值影响对拍

------

## 📋 待办计划

-  核心混音过渡优化
-  在线音乐播放支持（API 集成）
-  播放历史与收藏功能
-  EQ 均衡器调节
-  全局快捷键控制
-  多主题 UI