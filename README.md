# Mermaid 图表工坊

纯前端 Mermaid 图表编辑工具，学术论文与 PPT 汇报双主题体系，全部浏览器本地渲染，零后端、零上传、零登录。内置 Mermaid v11，支持手绘线条 / 反相两种风格叠加修饰。

## 功能特性

- **主题体系（5 套基础风格）**：学术风（纯白/淡蓝，低饱和适合论文）+ PPT 风（商务浅/柔和彩色/暗色，适合投影），一键切换即时重绘
- **实时预览**：左右双栏布局，代码即写即渲染，支持缩放/平移/适应窗口（图表始终居中适配）；「白底预览」勾选项可在预览区填充白色背景模拟白纸/论文观感（默认关闭，仅影响预览显示，导出 SVG/PNG 均不含该白色）
- **风格叠加修饰**（独立勾选项，叠加在基础主题之上，不改变色彩）：「手绘」仅让框线和箭头变手绘、色彩不变；「反相」颜色反相（白变黑、黑变白），可叠加使用，导出 SVG/PNG 同步生效
- **图表风格与 UI 主题分离**：风格下拉只改图表配色，UI 由月亮/太阳按钮独立切换纯黑（默认，纯黑无偏色）/纯白
- **导出优化**：导出 SVG / 高清 PNG / 复制 SVG 前会自动把 foreignObject 节点文字转为原生 SVG text，确保 Word/PPT 正常显示文字、PNG 导出不丢字不报错
- **模板库**：学术论文模板 + PPT 汇报模板双标签，一键加载完整代码
- **专业代码编辑器（CodeMirror）**：VSCode 风格语法高亮（关键字/节点/字符串/注释/数字分色，深浅主题自适应）、行号、自动换行、括号匹配；字号可调（A−/A+，10~28px 持久化）；Ctrl+Space / Alt+/ 触发代码补全（图表关键字 + 文档内节点标识符 + 常用完整片段）
- **表格转图**：粘贴 Excel/TSV/CSV 数据，自动生成饼图或柱状图代码
- **导出功能**：SVG 矢量图、高清 PNG（1x/2x/3x 倍率，默认透明背景可切白底）、一键复制 SVG 到剪贴板、导出 .mmd 源码
- **本地持久化**：自动保存当前代码、模板收藏、最近 5 条绘图历史
- **错误友好**：语法错误时预览区展示友好提示，不白屏
- **支持图表**：流程图、时序图、ER 图、甘特图、饼图、类图、思维导图、状态图、Git 分支图、柱状图（自定义渲染）

## 快速开始

### 本地运行

```bash
cd mermaid-chart-tool
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

> 请勿直接用 `file://` 协议打开，否则 `config.json` 无法加载。

### 部署到 Vercel

1. 推送项目到 GitHub 仓库
2. 登录 [vercel.com](https://vercel.com) → New Project → 导入仓库
3. Framework Preset 选 **Other**，Build Command 留空，Output Directory 填 `./`
4. 点击 Deploy

### 部署到 GitHub Pages

1. 推送项目到 GitHub 仓库
2. Settings → Pages → Source 选 "Deploy from a branch"
3. Branch 选 `main` / 根目录 → Save

## 配置说明

编辑 `config.json`：

| 字段 | 说明 |
|------|------|
| `avatarUrl` | "关注我"按钮前的头像 URL |
| `homeUrl` | 站点主页链接（备用） |
| `wechatName` | 微信公众号名称（关注弹窗 + 广告弹窗显示，支持一键复制） |
| `wechatQrUrl` | 微信公众号二维码图片 URL（关注弹窗显示） |
| `moreToolsUrl` | "更多工具"跳转链接（如 https://jojocharm.top） |
| `uiTheme` | 默认 UI 主题：`dark`（纯黑）/ `light`（纯白） |
| `helpDocs` | 帮助弹窗语法卡片数组，每项含 `type/name/icon/code/url`，`url` 留空则显示"链接待添加"，填入后跳转 |
| `siteTitle` | 网站标题 |
| `author` | 作者名（导航栏显示） |
| `cdnBase` | Mermaid 库 CDN 基地址（国内可替换为 bootcdn 等） |
| `mermaidVersion` | Mermaid 版本号（默认 11.17.2，支持 handDrawn 手绘） |
| `adPopup.firstTrigger` | 首次触发广告弹窗的下载次数（默认 6） |
| `adPopup.interval` | 之后每隔多少次触发一次（默认 3） |
| `adPopup.countdownSeconds` | 弹窗按钮倒计时秒数（默认 5） |

## 项目结构

```
mermaid-chart-tool/
├── index.html          # 主页面
├── config.json         # 配置文件
├── README.md
├── css/
│   └── style.css       # 样式（含 5 套主题 CSS 变量）
└── js/
    ├── config.js       # 配置加载与应用（含更多工具/关注弹窗/帮助文档/UI主题）
    ├── themes.js       # 图表风格系统（学术/PPT 共 5 套，只改图表）
    ├── templates.js    # 模板库数据（12 个内置模板）
    ├── snippets.js     # 语法片段数据（11 类）
    ├── bar-chart.js    # 自定义 SVG 柱状图渲染器
    └── app.js          # 主应用逻辑
```

## 柱状图使用说明

Mermaid 原生不支持柱状图，本工具内置轻量 SVG 柱状图渲染器，以特殊注释开头识别：

```
%% @chart bar
title: 季度销售额
x-label: 季度
y-label: 万元
colors: #4A90D9,#7ED321,#F5A623,#D0021B
data:
Q1: 120
Q2: 185
Q3: 240
Q4: 310
```

也可使用顶部"表格转图"按钮，粘贴数据自动生成。

## 隐私说明

- 所有代码与图表均在浏览器本地渲染，不向任何服务器上传
- 不接入大模型 API，无后端接口
- 不使用第三方追踪或广告埋点
- localStorage 仅用于保存代码、收藏、历史和下载计数

## License

MIT
