# 每日一诗 · 古诗词阅读小工具

每天一篇古诗词，在手机上轻松阅读。纯静态网页 + PWA，无后端、无构建步骤，可离线使用。

## 功能

- 📅 **每日一篇**：每天自动切换一篇诗词（以日期为种子确定性选取，同一天所有人看到同一篇）
- 📚 **唐诗三百首 + 宋词三百首**：内置两部经典选集全量原文（另附 50 首精读篇目，含白话译文、注释与赏析）
- 🏫 **自动剔除小学课本篇目**：阅读池自动排除小学语文课本（部编版）及课标必背篇目，不再与你学过的重复
- ⭐ **收藏**：收藏喜欢的诗，随时回看
- 🕘 **历史**：自动记录读过的诗，可回看往日篇章
- 🔊 **朗读**：浏览器语音合成（Web Speech API）朗读全文
- 📱 **PWA**：可添加到手机主屏幕，离线可用

## 使用方式

### 在线访问

已部署在 GitHub Pages，手机浏览器直接打开：

**https://abs370.github.io/daily-poem/**

### 本地预览

```powershell
# 任选其一（需要 Python 或 Node）
python -m http.server 8000
# 或
npx serve .
```

然后手机/浏览器访问 `http://localhost:8000`。

> 注意：Service Worker 与语音朗读需要 `http://` 或 `https://` 环境，直接双击打开 `file://` 页面功能会受限。

### 部署到 GitHub Pages（推荐，手机随时可访问）

1. 把本项目推送到 GitHub 仓库
2. 仓库 Settings → Pages → 选择分支 `main`、目录 `/ (root)`，保存
3. 手机浏览器打开 `https://<你的用户名>.github.io/<仓库名>/`

### 添加到手机主屏幕

- **iOS (Safari)**：分享按钮 → 「添加到主屏幕」
- **Android (Chrome)**：菜单 → 「添加到主屏幕」/「安装应用」

## 项目结构

```
├── index.html            # 主页面
├── manifest.webmanifest  # PWA 清单
├── sw.js                 # Service Worker（离线缓存）
├── css/style.css         # 样式
├── js/
│   ├── data.js           # 内置诗词精选数据（原文/译文/注释/赏析）
│   └── app.js            # 应用逻辑：每日一篇、收藏、历史、朗读
└── icons/                # 应用图标
```

## 数据说明

- **数据来源**：[chinese-poetry](https://github.com/chinese-poetry/chinese-poetry)（MIT License）《唐诗三百首》《宋词三百首》原文，经繁体转简体处理
- **精读篇目**：50 首经典诗词附白话译文、字词注释与赏析（`js/data.js` 中带 `translation` 字段的条目）
- **小学篇目剔除**：`js/data.js` 中的 `window.SCHOOL_POEMS` 数组维护小学语文课本（部编版 1-6 年级）及课标必背篇目清单（格式 `作者|标题`），应用启动时据此构建阅读池。如需恢复某篇，从该数组中删除对应条目即可

## 自定义诗词集

编辑 `js/data.js`：

- 追加新诗词：在 `window.POEMS` 数组末尾按以下格式添加条目
- 调整小学篇目剔除：编辑 `window.SCHOOL_POEMS` 数组（`作者|标题` 键）

```js
{
  title: "静夜思",
  author: "李白",
  dynasty: "唐",
  content: ["床前明月光，", "疑是地上霜。", "举头望明月，", "低头思故乡。"],
  translation: "……",   // 可选：白话译文（缺失则该区块自动隐藏）
  notes: ["床前：……"],  // 可选：字词注释
  appreciation: "……"    // 可选：赏析
}
```

## 技术说明

- 纯原生 HTML/CSS/JS，零依赖、无构建
- 数据存储在浏览器 `localStorage`
- 语音合成使用 `speechSynthesis`，自动选择中文语音（优先 `zh-CN`）
