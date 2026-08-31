/* ============================================================
   app.js - 主应用逻辑
   包含：编辑器、渲染调度、缩放平移、导出、本地持久化、
        模板/片段/表格转图/历史记录、广告弹窗
   ============================================================ */

// ===== 全局状态 =====
let currentCode = '';
let currentScale = 1;
let currentTranslateX = 0;
let currentTranslateY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let currentTab = 'all';   // 模板库当前标签
let renderTimer = null;
let adCountdownTimer = null;

// localStorage 键名
const LS_CODE = 'mermaid_tool_code';
const LS_FAVORITES = 'mermaid_tool_favorites';
const LS_HISTORY = 'mermaid_tool_history';
const LS_THEME = 'mermaid_tool_theme';
const LS_UI_THEME = 'mermaid_tool_ui_theme';
const LS_DOWNLOAD_COUNT = 'totalProcessedCount';

// ============================================================
// 工具函数
// ============================================================

/** Toast 轻提示 */
function showToast(msg, duration = 2000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), duration);
}

/** 关闭所有模态框与抽屉 */
function closeAllModals() {
  document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
  document.getElementById('snippetsDrawer').classList.remove('active');
  document.getElementById('overlay').classList.remove('active');
}

/** 打开指定模态框 */
function openModal(id) {
  document.getElementById(id).classList.add('active');
  document.getElementById('overlay').classList.add('active');
}

/** 下载文件 */
function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// 代码编辑器（CodeMirror 5）
// ============================================================

let editorInstance = null; // CodeMirror 实例
const LS_FONT_SIZE = 'mermaid_tool_fontsize';

/** 获取编辑器代码（兼容 CM 与 textarea） */
function getEditorCode() {
  return editorInstance ? editorInstance.getValue() : (document.getElementById('codeEditor') || {}).value || '';
}
/** 设置编辑器代码 */
function setEditorCode(code) {
  if (editorInstance) editorInstance.setValue(code);
  else { const e = document.getElementById('codeEditor'); if (e) e.value = code; }
}

function initEditor() {
  const textarea = document.getElementById('codeEditor');
  // 加载保存的代码，无则用默认示例
  const saved = localStorage.getItem(LS_CODE);
  const defaultCode =
`flowchart TD
    A[开始使用] --> B[编写 Mermaid 代码]
    B --> C[实时预览图表]
    C --> D[切换学术/PPT主题]
    D --> E[导出 SVG / 高清 PNG]
    E --> F[用于论文 / PPT 汇报]
    F --> G[完成 🎉]`;
  textarea.value = saved || defaultCode;
  currentCode = textarea.value;

  // 初始化 CodeMirror：语法高亮 + 行号 + 自动换行 + 括号匹配 + 补全
  editorInstance = CodeMirror.fromTextArea(textarea, {
    mode: 'mermaid',
    lineNumbers: true,
    lineWrapping: true,
    matchBrackets: true,
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false,
    extraKeys: {
      'Ctrl-Space': 'autocomplete',   // 手动触发补全
      'Alt-/': 'autocomplete',
      Tab: (cm) => {                  // Tab 插入两个空格
        cm.replaceSelection('  ', 'end');
      }
    },
    hintOptions: {
      completeSingle: false,
      // 自定义补全项渲染：显示标签 + 类型徽章（keyword/variable/snippet）
      render: function (elt, self, data) {
        const label = data.displayText || data.text;
        const typeMap = { keyword: '关键字', variable: '标识符', snippet: '片段' };
        const tag = data.type ? '<span class="hint-type"></span>' : '';
        elt.innerHTML = '<span class="hint-label"></span>' + tag;
        elt.querySelector('.hint-label').textContent = label;
        if (data.type) elt.querySelector('.hint-type').textContent = typeMap[data.type] || data.type;
        elt.className += ' hint-row';
      }
    }
  });

  // 挂到 window，供其他脚本（snippets.js 等）使用
  window.editorInstance = editorInstance;

  // 应用上次字号
  applyFontSize();

  // 输入防抖：渲染 + 保存
  let renderTimer = null;
  editorInstance.on('change', () => {
    currentCode = editorInstance.getValue();
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => { scheduleRender(); saveCode(); }, 200);
  });

  // 清空
  document.getElementById('btnClear').addEventListener('click', () => {
    const editorPane = document.querySelector('.editor-pane');
    if (editorPane && !editorPane.classList.contains('text-view')) {
      // 电池块视图：清空所有节点
      if (window.CardEditor) window.CardEditor.clearAll();
      return;
    }
    if (confirm('确定要清空编辑器吗？')) {
      editorInstance.setValue('');
      currentCode = '';
      scheduleRender();
      saveCode();
    }
  });

  // 格式化（去除多余空行和行尾空格）
  document.getElementById('btnFormat').addEventListener('click', () => {
    const editorPane = document.querySelector('.editor-pane');
    if (editorPane && !editorPane.classList.contains('text-view')) {
      // 电池块视图：格式化生成的代码
      if (window.CardEditor) window.CardEditor.formatCode();
      return;
    }
    let code = editorInstance.getValue();
    code = code.replace(/\n{3,}/g, '\n\n');
    code = code.replace(/[ \t]+$/gm, '');
    code = code.trim();
    editorInstance.setValue(code);
    currentCode = code;
    scheduleRender();
    saveCode();
    showToast('已格式化');
  });

  // 字号调节
  document.getElementById('btnFontDec').addEventListener('click', () => changeFontSize(-1));
  document.getElementById('btnFontInc').addEventListener('click', () => changeFontSize(1));

  // ===== 电池卡片编辑器事件监听 =====
  document.addEventListener('card-editor-change', (e) => {
    const editorPane = document.querySelector('.editor-pane');
    if (editorPane && !editorPane.classList.contains('text-view')) {
      currentCode = e.detail.code || '';
      scheduleRender();
    }
  });
  document.addEventListener('view-switched', (e) => {
    if (e.detail.view === 'text') {
      // 切到文本视图，从编辑器获取代码
      currentCode = editorInstance.getValue();
    } else {
      // 切到卡片视图，从卡片编辑器获取代码
      if (window.CardEditor) {
        currentCode = window.CardEditor.generateMermaidCode() || '';
      }
    }
    scheduleRender();
  });
}

/** 调整代码字号（10~28px），持久化到 localStorage */
function changeFontSize(delta) {
  let size = parseInt(localStorage.getItem(LS_FONT_SIZE) || '13', 10);
  size = Math.max(10, Math.min(28, size + delta));
  localStorage.setItem(LS_FONT_SIZE, String(size));
  applyFontSize();
}

/** 应用字号：通过 CSS 变量控制 CodeMirror 字号 */
function applyFontSize() {
  const size = parseInt(localStorage.getItem(LS_FONT_SIZE) || '13', 10);
  const host = editorInstance ? editorInstance.getWrapperElement() : document.querySelector('.editor-wrapper');
  if (host) host.style.setProperty('--cm-font-size', size + 'px');
  const val = document.getElementById('fontSizeVal');
  if (val) val.textContent = size;
}

function saveCode() {
  localStorage.setItem(LS_CODE, currentCode);
}

// ============================================================
// 图表渲染（Mermaid + 自定义柱状图）
// ============================================================

/** 防抖渲染 */
function scheduleRender() {
  if (renderTimer) clearTimeout(renderTimer);
  renderTimer = setTimeout(renderChart, 300);
}

/**
 * 核心渲染函数
 * 先检测是否为自定义柱状图，否则走 Mermaid
 */

/**
 * 清除Mermaid渲染失败时直接输出到body底部的错误信息
 * （带炸弹图标的大块文字，如 "Syntax error in text"）
 */
function clearMermaidErrorOutput() {
  const knownIds = ['navbar', 'mainContainer', 'footer', 'templatesModal',
    'snippetsDrawer', 'tableModal', 'exportModal', 'historyModal', 'adModal',
    'overlay', 'toast'];
  const knownClasses = ['navbar', 'main-container', 'footer', 'modal',
    'drawer', 'overlay', 'toast'];
  Array.from(document.body.children).forEach(el => {
    if (el.tagName === 'HEADER' || el.tagName === 'MAIN' || el.tagName === 'FOOTER' || el.tagName === 'SCRIPT') return;
    if (el.id && knownIds.includes(el.id)) return;
    if (el.classList && knownClasses.some(c => el.classList.contains(c))) return;
    // 仅移除含Mermaid错误特征文本的DIV（Syntax error / mermaid version）
    if (el.tagName === 'DIV' && el.textContent &&
        /Syntax error|mermaid version|Parse error/i.test(el.textContent)) {
      el.remove();
    }
  });
}


/**
 * 监听body子元素变化，自动移除Mermaid插入的错误信息
 * （带炸弹图标的 "Syntax error in text" 大块文字）
 * 无论Mermaid何时、以何种方式插入，都能立即捕获并移除
 */
function initMermaidErrorObserver() {
  const knownIds = ['navbar', 'mainContainer', 'footer', 'templatesModal',
    'snippetsDrawer', 'tableModal', 'exportModal', 'historyModal', 'adModal',
    'overlay', 'toast'];
  const knownClasses = ['navbar', 'main-container', 'footer', 'modal',
    'drawer', 'overlay', 'toast'];

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.tagName === 'HEADER' || node.tagName === 'MAIN' ||
            node.tagName === 'FOOTER' || node.tagName === 'SCRIPT') return;
        if (node.id && knownIds.includes(node.id)) return;
        if (node.classList && knownClasses.some(c => node.classList.contains(c))) return;
        if (node.tagName !== 'DIV') return;
        // 延迟检查：Mermaid先插入空容器再填充文本，需等内容就绪
        setTimeout(() => {
          if (node.isConnected && node.textContent &&
              /Syntax error|mermaid version|Parse error/i.test(node.textContent)) {
            node.remove();
          }
        }, 100);
      });
    });
  });

  observer.observe(document.body, { childList: true });
}


/** 在代码区下方显示错误提示条 */
function showEditorError(detail, hints) {
  const errEl = document.getElementById('editorError');
  const hintsHtml = (hints && hints.length)
    ? `<ul class="err-hints">${hints.map(h => `<li>${h}</li>`).join('')}</ul>`
    : '';
  errEl.innerHTML =
    `<div class="err-title">⚠️ Mermaid 语法错误</div>` +
    hintsHtml +
    `<div class="err-detail">${(detail || '').replace(/</g, '&lt;')}</div>`;
  errEl.style.display = 'block';
}

/** 隐藏代码区下方的错误提示条 */
function hideEditorError() {
  const errEl = document.getElementById('editorError');
  if (errEl) errEl.style.display = 'none';
}

/** 预览区渲染失败时的简单占位提示 */
function showPreviewError() {
  document.getElementById('previewContent').innerHTML =
    '<div class="preview-fail">⚠️ 渲染失败<br><small>请查看代码区下方的错误详情</small></div>';
}

function renderChart() {
  const preview = document.getElementById('previewContent');
  const code = currentCode.trim();
  // 清除Mermaid可能直接输出到body底部的错误信息（带炸弹图标的大块文字）
  clearMermaidErrorOutput();
  // 清空代码：隐藏错误条，显示空状态
  if (!code) {
    hideEditorError();
    preview.innerHTML = '<div class="empty-state">图表将在此处渲染</div>';
    return;
  }
  // 自定义柱状图
  if (BarChart.isBarChart(code)) {
    try {
      const svg = BarChart.render(code, 800, 500);
      hideEditorError();
      preview.innerHTML = svg;
      ThemeManager.applyOverlays();
    } catch (e) {
      showEditorError(e.message || '柱状图渲染错误');
      showPreviewError();
    }
    return;
  }
  // Mermaid 渲染
  if (!window.mermaid) {
    preview.innerHTML = '<div class="empty-state">Mermaid 库加载中...</div>';
    return;
  }
  try {
    const id = 'mermaid-svg-' + Date.now();
    mermaid.render(id, code).then(({ svg }) => {
      clearMermaidErrorOutput();
      hideEditorError();
      preview.innerHTML = svg;
      ThemeManager.applyOverlays();
      postProcessOverlays();
    }).catch(err => {
      // 清除Mermaid直接输出到body的错误信息（同步+延迟，因为可能异步插入）
      clearMermaidErrorOutput();
      setTimeout(clearMermaidErrorOutput, 50);
      setTimeout(clearMermaidErrorOutput, 200);
      // 错误详情显示在代码区下方
      showEditorError(
        err.message || String(err),
        [
          '节点名称含特殊字符未加引号',
          '箭头语法错误（应为 --&gt; 或 ---）',
          '图表类型拼写错误',
          '缩进 / 括号不匹配'
        ]
      );
      // 预览区仅显示简单占位
      showPreviewError();
    });
  } catch (e) {
    showEditorError(e.message || '渲染异常');
    showPreviewError();
  }
}
window.renderChart = renderChart;

/**
 * 叠加修饰后处理：
 * ① 圆角：节点矩形框加 rx/ry；
 * ② 虚线箭头：箭头连线改虚线。
 * 两个功能独立，分别由 overlays.rounded / dashedArrow 控制。
 */
function postProcessOverlays() {
  const svg = document.querySelector('#previewContent svg');
  if (!svg) return;

  // ① 圆角：节点矩形加圆角
  if (ThemeManager.overlays.rounded) {
    svg.querySelectorAll('.node, .cluster, .subgraph, g[class*="node"], g[class*="cluster"]').forEach(group => {
      group.querySelectorAll('rect').forEach(el => {
        el.setAttribute('rx', '10');
        el.setAttribute('ry', '10');
      });
    });
  }

  // ② 虚线箭头：连线改虚线
  if (ThemeManager.overlays.dashedArrow) {
    svg.querySelectorAll('g').forEach(g => {
      const cls = g.getAttribute('class') || '';
      if (!/edgePath|edge-paths|edges/i.test(cls)) return;
      g.querySelectorAll('path, line, polyline').forEach(el => {
        if (el.closest('marker')) return;
        el.style.strokeDasharray = '6 4';
        el.style.strokeLinecap = 'round';
      });
    });
  }
}

// ============================================================
// 预览画布：缩放 + 拖拽平移
// ============================================================

function initPreviewControls() {
  const canvas = document.getElementById('previewCanvas');
  const content = document.getElementById('previewContent');

  function updateTransform() {
    // translate(-50%,-50%)：把元素中心对齐到画布中心（preview-content 位于 50%/50%）
    // 再叠加拖拽偏移与缩放，保证缩放/平移始终围绕画布中心
    content.style.transform =
      `translate(-50%, -50%) translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
    document.getElementById('zoomLevel').textContent = Math.round(currentScale * 100) + '%';
  }

  // 鼠标滚轮缩放
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    currentScale = Math.max(0.2, Math.min(5, currentScale + delta));
    updateTransform();
  }, { passive: false });

  // 按钮缩放
  document.getElementById('btnZoomIn').addEventListener('click', () => {
    currentScale = Math.min(5, currentScale + 0.2);
    updateTransform();
  });
  document.getElementById('btnZoomOut').addEventListener('click', () => {
    currentScale = Math.max(0.2, currentScale - 0.2);
    updateTransform();
  });
  document.getElementById('btnZoomReset').addEventListener('click', () => {
    currentScale = 1;
    currentTranslateX = 0;
    currentTranslateY = 0;
    updateTransform();
  });

  // 适应窗口：计算原始尺寸后等比缩放，并居中显示
  document.getElementById('btnFit').addEventListener('click', () => {
    const svg = content.querySelector('svg');
    if (!svg) return;
    const rect = canvas.getBoundingClientRect();
    // 优先用 getBoundingClientRect（当前缩放后的尺寸）/ currentScale 还原真实尺寸
    const r = svg.getBoundingClientRect();
    let svgW = r.width / (currentScale || 1);
    let svgH = r.height / (currentScale || 1);
    // 兜底：viewBox / width / height 属性
    if (!svgW || !svgH) {
      const vb = svg.viewBox && svg.viewBox.baseVal;
      if (vb && vb.width) { svgW = vb.width; svgH = vb.height; }
    }
    if (!svgW || !svgH) {
      const aw = parseFloat(svg.getAttribute('width') || '');
      const ah = parseFloat(svg.getAttribute('height') || '');
      if (aw) { svgW = aw; svgH = ah; }
    }
    if (!svgW || !svgH) { svgW = 800; svgH = 600; }
    const pad = 56;
    const scaleX = (rect.width - pad) / svgW;
    const scaleY = (rect.height - pad) / svgH;
    // 等比适配，最小 0.05，最大不超过 3（不把小图放得过大）
    currentScale = Math.max(0.05, Math.min(scaleX, scaleY, 3));
    currentTranslateX = 0;
    currentTranslateY = 0;
    updateTransform();
  });

  // 拖拽平移
  canvas.addEventListener('mousedown', (e) => {
    if (e.target.closest('button')) return;
    isDragging = true;
    dragStartX = e.clientX - currentTranslateX;
    dragStartY = e.clientY - currentTranslateY;
    canvas.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    currentTranslateX = e.clientX - dragStartX;
    currentTranslateY = e.clientY - dragStartY;
    updateTransform();
  });
  window.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
  });

  updateTransform();
}


// ============================================================
// 模板库
// ============================================================

function initTemplates() {
  document.getElementById('btnTemplates').addEventListener('click', () => {
    openModal('templatesModal');
    renderTemplates(currentTab);
  });
  document.getElementById('closeTemplates').addEventListener('click', closeAllModals);

  document.querySelectorAll('#templatesModal .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#templatesModal .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      renderTemplates(currentTab);
    });
  });
}

/** 渲染模板网格（全局函数，供 templates.js 内部调用） */
function renderTemplates(tab) {
  const favorites = getFavorites();
  Templates.render(tab, document.getElementById('templateGrid'), favorites);
}

/** 加载模板代码到编辑器 */
function loadTemplate(code) {
  setEditorCode(code);
  currentCode = code;
  scheduleRender();
  saveCode();
  addToHistory(code);
}

// ============================================================
// 模板收藏
// ============================================================

function getFavorites() {
  try { return JSON.parse(localStorage.getItem(LS_FAVORITES) || '[]'); }
  catch { return []; }
}

function toggleFavorite(tpl) {
  let favorites = getFavorites();
  const idx = favorites.findIndex(f => f.id === tpl.id);
  if (idx >= 0) {
    favorites.splice(idx, 1);
    showToast('已取消收藏');
  } else {
    favorites.push(tpl);
    showToast('已收藏到「我的收藏」');
  }
  localStorage.setItem(LS_FAVORITES, JSON.stringify(favorites));
}

// ============================================================
// 历史记录（最近 5 条）
// ============================================================

function addToHistory(code) {
  let history = [];
  try { history = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]'); } catch {}
  const item = {
    code,
    time: new Date().toLocaleString('zh-CN', { hour12: false }),
    preview: code.substring(0, 60).replace(/\n/g, ' ')
  };
  history.unshift(item);
  history = history.slice(0, 5);
  localStorage.setItem(LS_HISTORY, JSON.stringify(history));
}

function initHistory() {
  document.getElementById('btnHistory').addEventListener('click', () => {
    const editorPane = document.querySelector('.editor-pane');
    if (editorPane && !editorPane.classList.contains('text-view')) {
      // 电池块视图：显示节点编辑历史
      if (window.CardEditor) window.CardEditor.showHistory();
      return;
    }
    renderHistory();
    openModal('historyModal');
  });
  document.getElementById('closeHistory').addEventListener('click', closeAllModals);
}

function renderHistory() {
  const list = document.getElementById('historyList');
  let history = [];
  try { history = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]'); } catch {}

  if (history.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px 0;">暂无历史记录</p>';
    return;
  }

  list.innerHTML = '';
  history.forEach((item, idx) => {
    const el = document.createElement('div');
    el.className = 'history-item';
    el.innerHTML = `
      <div class="history-info">
        <div class="history-time">${item.time}</div>
        <div class="history-preview">${item.preview}...</div>
      </div>
      <div class="history-actions">
        <button class="icon-btn" title="加载">📂</button>
        <button class="icon-btn" title="删除">🗑️</button>
      </div>`;
    // 加载
    el.querySelector('.history-actions button:first-child').addEventListener('click', () => {
      loadTemplate(item.code);
      closeAllModals();
      showToast('历史记录已加载');
    });
    // 删除
    el.querySelector('.history-actions button:last-child').addEventListener('click', () => {
      let h = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
      h.splice(idx, 1);
      localStorage.setItem(LS_HISTORY, JSON.stringify(h));
      renderHistory();
    });
    list.appendChild(el);
  });
}

// ============================================================
// 语法片段抽屉
// ============================================================

function initSnippets() {
  document.getElementById('btnSnippets').addEventListener('click', () => {
    const drawer = document.getElementById('snippetsDrawer');
    const overlay = document.getElementById('overlay');
    drawer.classList.toggle('active');
    overlay.classList.toggle('active');
  });
  document.getElementById('closeSnippets').addEventListener('click', () => {
    document.getElementById('snippetsDrawer').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
  });
  Snippets.render(document.getElementById('snippetsList'));
}

// ============================================================
// 表格数据转图表
// ============================================================

function initTableToChart() {
  document.getElementById('btnTableToChart').addEventListener('click', () => openModal('tableModal'));
  document.getElementById('closeTable').addEventListener('click', closeAllModals);

  document.getElementById('btnGenerateFromTable').addEventListener('click', () => {
    const input = document.getElementById('tableInput').value.trim();
    const type = document.getElementById('tableChartType').value;
    const title = document.getElementById('tableTitle').value.trim() || '数据统计';

    if (!input) { showToast('请输入数据'); return; }

    // 解析：支持 Tab / 逗号 / 中文逗号分隔
    const lines = input.split('\n').filter(l => l.trim());
    const data = [];
    for (const line of lines) {
      const parts = line.split(/[\t,，]/).map(p => p.trim());
      if (parts.length >= 2) {
        const val = parseFloat(parts[parts.length - 1]);
        if (!isNaN(val)) {
          data.push({ label: parts.slice(0, -1).join(' '), value: val });
        }
      }
    }

    if (data.length === 0) { showToast('未解析到有效数据'); return; }

    // 生成代码
    let code = '';
    if (type === 'pie') {
      code = `pie title ${title}\n`;
      data.forEach(d => { code += `    "${d.label}" : ${d.value}\n`; });
    } else {
      code = `%% @chart bar\ntitle: ${title}\nx-label: 类别\ny-label: 数值\ndata:\n`;
      data.forEach(d => { code += `${d.label}: ${d.value}\n`; });
    }

    loadTemplate(code);
    closeAllModals();
    showToast(`已生成 ${type === 'pie' ? '饼图' : '柱状图'} 代码`);
  });
}

// ============================================================
// 导出功能
// ============================================================

function initExport() {
  document.getElementById('btnExport').addEventListener('click', () => openModal('exportModal'));
  document.getElementById('closeExport').addEventListener('click', closeAllModals);

  document.getElementById('btnExportSvg').addEventListener('click', exportSVG);
  document.getElementById('btnExportPng').addEventListener('click', exportPNG);
  document.getElementById('btnCopySvg').addEventListener('click', copySVG);
  document.getElementById('btnExportMmd').addEventListener('click', exportMMD);
}

/** 获取当前预览区的 SVG 源码 */
function getCurrentSVG() {
  const content = document.getElementById('previewContent');
  const svg = content.querySelector('svg');
  return svg ? svg.outerHTML : null;
}

/**
 * 导出前规范化 SVG：把 Mermaid 用 <foreignObject> 渲染的 HTML 节点文字
 * 转换为原生 SVG <text>，避免 Word/PPT 无法显示 foreignObject，
 * 也避免 PNG 导出时 canvas 被跨源污染 / 文字丢失。
 * 保留 label 容器的 transform 定位，text 落在 foreignObject 中心。
 */
function svgNormalize(svgCode) {
  try {
    const doc = new DOMParser().parseFromString(svgCode, 'image/svg+xml');
    if (doc.querySelector('parsererror')) return svgCode; // 解析失败则原样返回
    const foList = doc.querySelectorAll('foreignObject');
    foList.forEach(fo => {
      const textContent = (fo.textContent || '').trim();
      const w = parseFloat(fo.getAttribute('width')) || 100;
      const h = parseFloat(fo.getAttribute('height')) || 20;
      const x = parseFloat(fo.getAttribute('x')) || 0;
      const y = parseFloat(fo.getAttribute('y')) || 0;
      // 删除同容器内的占位 <rect>（Mermaid 用于撑开布局的空 rect）
      const parent = fo.parentNode;
      if (parent) {
        const placeholder = parent.querySelector('rect');
        if (placeholder && !placeholder.getAttribute('class')) placeholder.remove();
      }
      // 多行文字拆分为 tspan
      const t = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', String(x + w / 2));
      t.setAttribute('y', String(y + h / 2));
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('dominant-baseline', 'central');
      const lines = textContent.split(/\n+/);
      if (lines.length === 1) {
        t.textContent = textContent;
      } else {
        const lineH = 1.2;
        lines.forEach((ln, i) => {
          const ts = doc.createElementNS('http://www.w3.org/2000/svg', 'tspan');
          ts.setAttribute('x', String(x + w / 2));
          const dy = i === 0 ? (-(lines.length - 1) * lineH) / 2 : lineH;
          ts.setAttribute('dy', String(dy));
          ts.textContent = ln;
          t.appendChild(ts);
        });
      }
      fo.replaceWith(t);
    });
    return new XMLSerializer().serializeToString(doc);
  } catch (e) {
    return svgCode; // 任何异常都不阻断导出
  }
}

/** 导出 SVG 矢量图 */
function exportSVG() {
  const svg = getCurrentSVG();
  if (!svg) { showToast('没有可导出的图表'); return; }
  const width = document.getElementById('exportWidth').value || 800;
  const height = document.getElementById('exportHeight').value || 600;
  // 规范化：foreignObject -> SVG text，确保 Word/PPT 可显示文字
  let svgCode = svgNormalize(svg);
  // 确保 SVG 有 xmlns 和尺寸
  if (!svgCode.includes('xmlns=')) {
    svgCode = svgCode.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  }
  // 覆盖 width/height
  svgCode = svgCode.replace(/width="[^"]*"/, `width="${width}"`);
  svgCode = svgCode.replace(/height="[^"]*"/, `height="${height}"`);
  if (!svgCode.includes('width=')) {
    svgCode = svgCode.replace('<svg ', `<svg width="${height}" `);
  }
  // 反相叠加：导出 SVG 时注入反相滤镜，保证导出与预览一致
  if (ThemeManager.overlays.invert) {
    const invertFilter = '<defs><filter id="invert-overlay"><feColorMatrix type="matrix" values="-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0"/></filter></defs>';
    if (svgCode.includes('<defs>')) {
      svgCode = svgCode.replace('<defs>', '<defs><filter id="invert-overlay"><feColorMatrix type="matrix" values="-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0"/></filter>');
    } else {
      svgCode = svgCode.replace('>', '>' + invertFilter, 1);
    }
    svgCode = svgCode.replace('<svg ', '<svg filter="url(#invert-overlay)" ');
  }
  downloadFile(svgCode, 'chart.svg', 'image/svg+xml');
  incrementDownloadCount();
  showToast('SVG 已导出');
}

/** 导出高清 PNG */
function exportPNG() {
  const svg = getCurrentSVG();
  if (!svg) { showToast('没有可导出的图表'); return; }
  const width = parseInt(document.getElementById('exportWidth').value) || 800;
  const height = parseInt(document.getElementById('exportHeight').value) || 600;
  const scale = parseInt(document.getElementById('exportScale').value) || 2;

  // 规范化：foreignObject -> SVG text，避免 canvas 污染与文字丢失
  let svgCode = svgNormalize(svg);
  // 确保 SVG 有 xmlns
  if (!svgCode.includes('xmlns=')) {
    svgCode = svgCode.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  }

  // 透明背景：默认勾选，不填充白色；不勾选则填充白底
  const transparent = document.getElementById('exportTransparent').checked;
  // 反相叠加：导出时也应用颜色反相
  const invert = ThemeManager.overlays.invert;
  const svgBlob = new Blob([svgCode], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!transparent) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (invert) ctx.filter = 'invert(1)';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (invert) ctx.filter = 'none';
    canvas.toBlob((blob) => {
      if (!blob) { showToast('PNG 导出失败'); return; }
      const pngUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `chart_${scale}x.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(pngUrl);
    }, 'image/png');
    URL.revokeObjectURL(url);
  };
  img.onerror = () => {
    showToast('PNG 导出失败，请检查图表');
    URL.revokeObjectURL(url);
  };
  img.src = url;
  incrementDownloadCount();
  showToast('PNG 导出中...');
}

/** 复制 SVG 到剪贴板（可直接粘贴 Word/PPT） */
async function copySVG() {
  const svg = svgNormalize(getCurrentSVG() || '');
  if (!svg) { showToast('没有可复制的图表'); return; }

  try {
    // 以 HTML 格式写入，Word/PPT 可识别为图片
    const htmlBlob = new Blob([`<div>${svg}</div>`], { type: 'text/html' });
    const textBlob = new Blob([svg], { type: 'text/plain' });
    await navigator.clipboard.write([
      new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })
    ]);
    showToast('SVG 已复制，可直接粘贴到 Word / PPT');
  } catch (e) {
    // 降级：复制纯文本
    try {
      await navigator.clipboard.writeText(svg);
      showToast('SVG 源码已复制（纯文本）');
    } catch {
      showToast('复制失败，请手动复制');
    }
  }
}

/** 导出 .mmd 源码文件 */
function exportMMD() {
  if (!currentCode.trim()) { showToast('没有可导出的代码'); return; }
  downloadFile(currentCode, 'diagram.mmd', 'text/plain');
  incrementDownloadCount();
  showToast('源码已导出');
}

// ============================================================
// 下载计数与广告弹窗
// ============================================================

/** 增加下载计数并检查是否触发广告 */
function incrementDownloadCount() {
  let count = parseInt(localStorage.getItem(LS_DOWNLOAD_COUNT) || '0');
  count++;
  localStorage.setItem(LS_DOWNLOAD_COUNT, count.toString());
  checkAdTrigger(count);
}

/**
 * 检查是否触发广告弹窗
 * 首次超过 firstTrigger 次触发，之后每 interval 次触发一次
 */
function checkAdTrigger(count) {
  const cfg = AppConfig.get('adPopup') || { firstTrigger: 6, interval: 3 };
  const firstTrigger = cfg.firstTrigger || 6;
  const interval = cfg.interval || 3;

  if (count === firstTrigger) { showAdPopup(); return; }
  if (count > firstTrigger && (count - firstTrigger) % interval === 0) {
    showAdPopup();
  }
}

/** 显示广告弹窗（带倒计时按钮） */
function showAdPopup() {
  const modal = document.getElementById('adModal');
  const btn = document.getElementById('adCloseBtn');
  const cfg = AppConfig.get('adPopup') || { countdownSeconds: 5 };
  const seconds = cfg.countdownSeconds || 5;

  modal.classList.add('active');
  document.getElementById('overlay').classList.add('active');

  btn.disabled = true;
  let remaining = seconds;
  btn.textContent = `已知晓，继续使用 (${remaining}s)`;

  if (adCountdownTimer) clearInterval(adCountdownTimer);
  adCountdownTimer = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(adCountdownTimer);
      btn.disabled = false;
      btn.textContent = '已知晓，继续使用';
    } else {
      btn.textContent = `已知晓，继续使用 (${remaining}s)`;
    }
  }, 1000);
}

function initAdPopup() {
  document.getElementById('adCloseBtn').addEventListener('click', () => {
    if (document.getElementById('adCloseBtn').disabled) return;
    document.getElementById('adModal').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
  });
}

// ============================================================
// 导航栏附加：帮助 / 更多工具下拉 / 关注我
// ============================================================

function initNavExtra() {
  // UI 主题切换（纯黑/纯白），默认纯黑
  initUITheme();
  // 帮助（Mermaid 语法大全）
  const btnHelp = document.getElementById('btnHelp');
  if (btnHelp) {
    btnHelp.addEventListener('click', () => openModal('helpModal'));
  }
  const closeHelp = document.getElementById('closeHelp');
  if (closeHelp) closeHelp.addEventListener('click', closeAllModals);

  // 关注我：打开二维码 + 公众号复制弹窗
  const followBtn = document.getElementById('btnFollow');
  if (followBtn) {
    followBtn.addEventListener('click', () => openModal('followModal'));
  }
  const closeFollow = document.getElementById('closeFollow');
  if (closeFollow) closeFollow.addEventListener('click', closeAllModals);
  // 复制公众号名称
  const copyBtn = document.getElementById('btnCopyWechat');
  if (copyBtn) {
    copyBtn.addEventListener('click', copyWechatName);
  }
}

/** 初始化 UI 主题（纯黑/纯白），默认纯黑 */
function initUITheme() {
  const btn = document.getElementById('btnUITheme');
  if (!btn) return;
  // 优先从 localStorage 读取，否则用 config 的 uiTheme（默认 dark）
  let theme = localStorage.getItem(LS_UI_THEME);
  if (!theme) theme = (AppConfig.get() || {}).uiTheme || 'dark';
  applyUITheme(theme);
  btn.addEventListener('click', () => {
    const next = document.body.classList.contains('ui-dark') ? 'light' : 'dark';
    applyUITheme(next);
    localStorage.setItem(LS_UI_THEME, next);
  });
}

/** 应用 UI 主题到 body，并更新切换按钮图标 */
function applyUITheme(theme) {
  document.body.classList.remove('ui-dark', 'ui-light');
  document.body.classList.add(theme === 'light' ? 'ui-light' : 'ui-dark');
  const btn = document.getElementById('btnUITheme');
  if (btn) {
    btn.textContent = theme === 'light' ? '☀️' : '🌙';
    btn.title = theme === 'light' ? '当前纯白，点击切换纯黑' : '当前纯黑，点击切换纯白';
  }
}

/** 复制公众号名称到剪贴板 */
function copyWechatName() {
  const name = document.getElementById('followWechatName').textContent;
  if (!name || name === '未配置') {
    showToast('请在 config.json 中配置 wechatName');
    return;
  }
  const done = () => {
    showToast('公众号名称已复制');
    const btn = document.getElementById('btnCopyWechat');
    if (btn) btn.textContent = '✅ 已复制';
    setTimeout(() => { if (btn) btn.textContent = '📋 复制'; }, 1600);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(name).then(done).catch(() => fallbackCopy(name, done));
  } else {
    fallbackCopy(name, done);
  }
}

/** 降级复制方案（兼容 http 环境） */
function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); }
  catch (e) { showToast('复制失败，请手动复制'); }
  document.body.removeChild(ta);
}

// ============================================================
// 遮罩 / ESC / 主题持久化
// ============================================================

function initOverlay() {
  document.getElementById('overlay').addEventListener('click', () => {
    // 广告弹窗不允许点击遮罩关闭
    if (document.getElementById('adModal').classList.contains('active')) return;
    closeAllModals();
  });
}

/** 白底预览：勾选后仅预览画布填充白色背景，导出 SVG/PNG 不受影响 */
function initPreviewWhite() {
  const canvas = document.getElementById('previewCanvas');
  const chk = document.getElementById('chkPreviewWhite');
  if (!canvas || !chk) return;
  const LS_KEY = 'mermaid_tool_preview_white';
  // 恢复上次状态（首次访问默认不勾选）
  const saved = localStorage.getItem(LS_KEY) === '1';
  chk.checked = saved;
  canvas.classList.toggle('white-bg', saved);
  chk.addEventListener('change', () => {
    canvas.classList.toggle('white-bg', chk.checked);
    localStorage.setItem(LS_KEY, chk.checked ? '1' : '0');
  });
}

/** 白底预览控件左边缘与上方导航栏"模板库"按钮对齐 */
function alignPreviewBgToggle() {
  const btnTemplates = document.getElementById('btnTemplates');
  const toggle = document.querySelector('.preview-bg-toggle');
  const paneTitle = document.querySelector('.preview-header .pane-title');
  if (!btnTemplates || !toggle || !paneTitle) return;
  const targetLeft = btnTemplates.getBoundingClientRect().left;
  const titleRight = paneTitle.getBoundingClientRect().right;
  const offset = targetLeft - titleRight;
  toggle.style.marginLeft = (offset > 0 ? offset : 14) + 'px';
}

/** 风格叠加修饰：圆角 / 虚线箭头 / 反相（独立勾选项，持久化） */
function initOverlays() {
  const LS_ROUND = 'mermaid_tool_overlay_round';
  const LS_DASH = 'mermaid_tool_overlay_dash';
  const LS_INV = 'mermaid_tool_overlay_invert';
  const chkRound = document.getElementById('chkRounded');
  const chkDash = document.getElementById('chkDashedArrow');
  const chkInv = document.getElementById('chkInvert');
  if (!chkRound || !chkDash || !chkInv) return;
  // 恢复上次状态（默认关闭）
  const roundSaved = localStorage.getItem(LS_ROUND) === '1';
  const dashSaved = localStorage.getItem(LS_DASH) === '1';
  const invSaved = localStorage.getItem(LS_INV) === '1';
  ThemeManager.overlays.rounded = roundSaved;
  ThemeManager.overlays.dashedArrow = dashSaved;
  ThemeManager.overlays.invert = invSaved;
  chkRound.checked = roundSaved;
  chkDash.checked = dashSaved;
  chkInv.checked = invSaved;
  // 圆角：切换后重绘
  chkRound.addEventListener('change', () => {
    ThemeManager.toggleOverlay('rounded', chkRound.checked);
    localStorage.setItem(LS_ROUND, chkRound.checked ? '1' : '0');
  });
  // 虚线箭头：切换后重绘
  chkDash.addEventListener('change', () => {
    ThemeManager.toggleOverlay('dashedArrow', chkDash.checked);
    localStorage.setItem(LS_DASH, chkDash.checked ? '1' : '0');
  });
  // 反相：CSS filter 即时生效
  chkInv.addEventListener('change', () => {
    ThemeManager.toggleOverlay('invert', chkInv.checked);
    localStorage.setItem(LS_INV, chkInv.checked ? '1' : '0');
  });
}

/** 自定义样式：文本框颜色 / 线条颜色 / 线条粗细，选择主题后自动导入默认值 */
function initCustomStyle() {
  const inputNodeColor = document.getElementById('customNodeColor');
  const inputLineColor = document.getElementById('customLineColor');
  const selectLineWidth = document.getElementById('customLineWidth');
  const btnReset = document.getElementById('btnResetCustomStyle');
  const inputBorderColor = document.getElementById('customBorderColor');
  if (!inputNodeColor || !inputBorderColor || !inputLineColor || !selectLineWidth || !btnReset) return;

  function syncControlsFromTheme() {
    const defaults = ThemeManager.getCurrentDefaults();
    inputNodeColor.value = defaults.nodeColor;
    inputLineColor.value = defaults.lineColor;
    inputBorderColor.value = defaults.borderColor;
    const lw = String(defaults.lineWidth);
    let matched = false;
    for (const opt of selectLineWidth.options) {
      if (opt.value === lw) { selectLineWidth.value = lw; matched = true; break; }
    }
    if (!matched) selectLineWidth.value = '1.4';
  }

  function applyCustomStyle() {
    ThemeManager.customStyle.nodeColor = inputNodeColor.value;
    ThemeManager.customStyle.lineColor = inputLineColor.value;
    ThemeManager.customStyle.lineWidth = selectLineWidth.value;
    ThemeManager.customStyle.borderColor = inputBorderColor.value;
    if (window.mermaid) {
      mermaid.initialize(ThemeManager.getMermaidConfig());
      renderChart();
    }
  }

  syncControlsFromTheme();
  inputNodeColor.addEventListener('input', applyCustomStyle);
  inputLineColor.addEventListener('input', applyCustomStyle);
  inputBorderColor.addEventListener('input', applyCustomStyle);
  selectLineWidth.addEventListener('change', applyCustomStyle);

  btnReset.addEventListener('click', () => {
    ThemeManager.resetCustomStyle();
    syncControlsFromTheme();
    if (window.mermaid) {
      mermaid.initialize(ThemeManager.getMermaidConfig());
      renderChart();
    }
  });

  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      setTimeout(() => {
        ThemeManager.resetCustomStyle();
        syncControlsFromTheme();
      }, 0);
    });
  }
}

/** 保存主题到 localStorage */
function saveTheme(themeKey) {
  localStorage.setItem(LS_THEME, themeKey);
}

// ============================================================
// 加载 Mermaid 库（CDN，可在 config.json 配置地址）
// ============================================================

function loadMermaid() {
  const cfg = AppConfig.get();
  const cdnBase = cfg.cdnBase || 'https://cdn.jsdelivr.net/npm';
  const version = cfg.mermaidVersion || '10.9.1';
  const script = document.createElement('script');
  script.src = `${cdnBase}/mermaid@${version}/dist/mermaid.min.js`;

  script.onload = () => {
    // 使用当前主题的完整配置（含 look 手绘风格）
    mermaid.initialize(ThemeManager.getMermaidConfig());
    renderChart();
  };

  script.onerror = () => {
    document.getElementById('previewContent').innerHTML =
      '<div class="error-state"><h4>Mermaid 库加载失败</h4>' +
      '<p>请检查网络连接，或在 config.json 中配置可用的 CDN 地址（cdnBase 字段）。</p></div>';
  };

  document.head.appendChild(script);
}

// ============================================================
// 应用初始化
// ============================================================

async function init() {
  // 1. 加载配置
  await AppConfig.load();

  // 2. 初始化主题
  ThemeManager.init();

  // 恢复保存的主题（下拉菜单直接选中对应主题）
  const savedTheme = localStorage.getItem(LS_THEME);
  if (savedTheme && ThemeManager.themes[savedTheme]) {
    ThemeManager.currentGroup = ThemeManager.themes[savedTheme].group;
    ThemeManager.renderAllOptions();
    document.getElementById('themeSelect').value = savedTheme;
    ThemeManager.apply(savedTheme);
  }

  // 包装 ThemeManager.apply 以持久化主题
  const origApply = ThemeManager.apply.bind(ThemeManager);
  ThemeManager.apply = function (key) {
    origApply(key);
    saveTheme(key);
  };

  // 2.5 监听并自动移除Mermaid插入的错误信息（带炸弹图标的大块文字）
  initMermaidErrorObserver();

  // 3. 加载 Mermaid
  loadMermaid();

  // 4. 初始化各模块
  initEditor();
  initPreviewControls();
  initTemplates();
  initSnippets();
  initTableToChart();
  initExport();
  initHistory();
  initAdPopup();
  initNavExtra();
  initOverlay();
  initPreviewWhite();
  initOverlays();
  initCustomStyle();

  // 白底预览控件与上方"模板库"按钮左对齐（字体加载后再校准一次）
  alignPreviewBgToggle();
  setTimeout(alignPreviewBgToggle, 300);
  setTimeout(alignPreviewBgToggle, 800);
  window.addEventListener('resize', alignPreviewBgToggle);

  // 5. ESC 关闭弹窗（广告弹窗除外）
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (document.getElementById('adModal').classList.contains('active')) return;
      closeAllModals();
    }
  });
}

// DOM 就绪后启动
document.addEventListener('DOMContentLoaded', init);
