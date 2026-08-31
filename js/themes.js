/* ============================================================
   themes.js - 图表风格系统
   基础主题：学术风（纯白/淡蓝）、PPT风（商务浅/柔和彩色/暗色）
   叠加修饰（独立勾选项，不改变基础主题色彩）：
     - rounded：节点框加圆角
     - dashedArrow：箭头连线改虚线
     - invert：颜色反相（白变黑、黑变白）
   只改图表配色（Mermaid themeVariables / look），不改页面 UI 主题
   UI 纯黑/纯白由 uiTheme 独立控制
   ============================================================ */

/**
 * 由基础色板 cfg 生成完整的 Mermaid themeVariables，
 * 覆盖流程图/时序图/ER/甘特图/状态图/饼图/类图等常用变量，
 * 保证各图表类型配色统一协调
 */
function buildVars(cfg) {
  return {
    // 全局 / 流程图 / 类图
    background: cfg.bkg,
    mainBkg: cfg.primary,
    primaryColor: cfg.primary,
    primaryTextColor: cfg.text,
    primaryBorderColor: cfg.border,
    secondaryColor: cfg.secondary,
    tertiaryColor: cfg.tertiary,
    lineColor: cfg.line,
    lineWidth: 1.4,
    edgeLabelBackground: cfg.bkg,
    edgeLabelColor: cfg.text,
    titleColor: cfg.text,
    textColor: cfg.text,
    nodeBorder: cfg.border,
    nodeTextColor: cfg.text,
    fontSize: cfg.fontSize || '15px',
    fontFamily: cfg.fontFamily,
    // 时序图
    actorBkg: cfg.primary,
    actorBorder: cfg.border,
    actorTextColor: cfg.text,
    actorLineColor: cfg.line,
    signalColor: cfg.line,
    signalTextColor: cfg.text,
    labelBoxBkgColor: cfg.secondary,
    labelBoxBorderColor: cfg.line,
    labelTextColor: cfg.text,
    noteBkgColor: cfg.noteBkg || cfg.secondary,
    noteBorderColor: cfg.line,
    noteTextColor: cfg.text,
    activationBkgColor: cfg.secondary,
    activationBorderColor: cfg.line,
    sequenceNumberColor: cfg.primary,
    // 甘特图
    sectionBkgColor: cfg.section || cfg.secondary,
    sectionBkgColor2: cfg.section2 || cfg.tertiary,
    taskBkgColor: cfg.task || cfg.border,
    taskBorderColor: cfg.border,
    taskTextColor: cfg.taskText || '#ffffff',
    taskTextOutsideColor: cfg.text,
    todayLineColor: cfg.line,
    gridColor: cfg.grid || 'rgba(128,128,128,0.15)',
    // 状态图
    stateBkg: cfg.primary,
    stateBorder: cfg.border,
    stateLabelColor: cfg.text,
    compositeBackground: cfg.tertiary,
    // 饼图
    pie1: cfg.pie.pie1, pie2: cfg.pie.pie2, pie3: cfg.pie.pie3,
    pie4: cfg.pie.pie4, pie5: cfg.pie.pie5, pie6: cfg.pie.pie6,
    pieTitleTextSize: '15px',
    pieTitleTextColor: cfg.text,
    pieSectionTextSize: '13px',
    pieSectionTextColor: cfg.pieSection || '#ffffff',
    pieLegendTextColor: cfg.text,
    pieStrokeColor: cfg.bkg,
    pieStrokeWidth: '1px',
    pieOpacity: '0.9',
    pieOuterStrokeWidth: '1.5px'
  };
}

const ThemeManager = {
  currentGroup: 'academic',
  currentTheme: 'academic-white',
  // 叠加修饰状态（独立于基础主题，默认关闭）
  overlays: { rounded: false, dashedArrow: false, invert: false },
  // 用户自定义样式（null 表示使用主题默认值）
  customStyle: { nodeColor: null, lineColor: null, lineWidth: null, borderColor: null },
  // 主题分组
  groups: {
    academic:   { label: '学术风',  themes: ['academic-white', 'academic-blue'] },
    ppt:        { label: 'PPT风',   themes: ['ppt-business', 'ppt-colorful', 'ppt-dark'] }
  },
  // 6 套主题详细配置
  themes: {
    'academic-white': {
      name: '学术纯白',
      group: 'academic',
      cssClass: 'theme-academic-white',
      mermaid: Object.assign({ theme: 'neutral', look: 'classic' }, {
        themeVariables: buildVars({
          bkg: '#ffffff', primary: '#ffffff', text: '#1a1a1a', border: '#333333',
          line: '#555555', secondary: '#f4f4f4', tertiary: '#fafafa',
          noteBkg: '#f7f7f7', section: '#f0f0f0', section2: '#e9e9e9', grid: '#e6e6e6',
          fontFamily: 'Georgia, "Songti SC", "STSong", serif', fontSize: '14px',
          pie: { pie1: '#3a3a3a', pie2: '#5c5c5c', pie3: '#7d7d7d', pie4: '#a0a0a0', pie5: '#c4c4c4', pie6: '#e2e2e2' }
        })
      })
    },
    'academic-blue': {
      name: '学术淡蓝',
      group: 'academic',
      cssClass: 'theme-academic-blue',
      mermaid: Object.assign({ theme: 'base', look: 'classic' }, {
        themeVariables: buildVars({
          bkg: '#ffffff', primary: '#eef4fb', text: '#1a2a3a', border: '#2c5f8d',
          line: '#3a6d99', secondary: '#e0ebf4', tertiary: '#f4f8fb',
          noteBkg: '#f0f5fa', section: '#e6eef5', section2: '#d9e5f0', grid: '#dce7f0',
          fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
          pie: { pie1: '#2c5f8d', pie2: '#4a7fa8', pie3: '#6d9ac0', pie4: '#9dbcd6', pie5: '#c4d8e8', pie6: '#e6eef5' }
        })
      })
    },
    'ppt-business': {
      name: 'PPT商务浅',
      group: 'ppt',
      cssClass: 'theme-ppt-business',
      mermaid: Object.assign({ theme: 'base', look: 'classic' }, {
        themeVariables: buildVars({
          bkg: '#f8fafc', primary: '#eff6ff', text: '#0f2440', border: '#2563eb',
          line: '#3b82f6', secondary: '#dbeafe', tertiary: '#f8fbff',
          noteBkg: '#f0f7ff', section: '#e3edfa', section2: '#d3e4f7', grid: '#dce6f1',
          fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
          pie: { pie1: '#2563eb', pie2: '#3b82f6', pie3: '#60a5fa', pie4: '#93c5fd', pie5: '#bfdbfe', pie6: '#dbeafe' }
        })
      })
    },
    'ppt-colorful': {
      name: 'PPT柔和彩色',
      group: 'ppt',
      cssClass: 'theme-ppt-colorful',
      mermaid: Object.assign({ theme: 'base', look: 'classic' }, {
        themeVariables: buildVars({
          bkg: '#fdfcff', primary: '#f3efff', text: '#2b1b52', border: '#7c3aed',
          line: '#8b5cf6', secondary: '#e9e3fb', tertiary: '#faf8ff',
          noteBkg: '#f6f2ff', section: '#ece6f8', section2: '#e0d8f4', grid: '#e9e3f5',
          fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
          pie: { pie1: '#7c3aed', pie2: '#a78bfa', pie3: '#c4b5fd', pie4: '#ddd6fe', pie5: '#ede9fe', pie6: '#f5f3ff' }
        })
      })
    },
    'ppt-dark': {
      name: 'PPT暗色演示',
      group: 'ppt',
      cssClass: 'theme-ppt-dark',
      mermaid: Object.assign({ theme: 'dark', look: 'classic' }, {
        themeVariables: buildVars({
          bkg: '#0f172a', primary: '#1e293b', text: '#e2e8f0', border: '#38bdf8',
          line: '#60a5fa', secondary: '#334155', tertiary: '#1e293b',
          noteBkg: '#334155', section: '#1e293b', section2: '#2a3a55', grid: '#2a3a55',
          taskText: '#0f172a',
          fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
          pie: { pie1: '#38bdf8', pie2: '#818cf8', pie3: '#f472b6', pie4: '#fb923c', pie5: '#34d399', pie6: '#a3e635' }
        })
      })
    }
  },
  /** 初始化主题系统 */
  init() {
    this.renderAllOptions();
    this.bindEvents();
    this.apply(this.currentTheme);
  },
  /** 渲染全部主题下拉选项（按学术/PPT 分组） */
  renderAllOptions() {
    const select = document.getElementById('themeSelect');
    select.innerHTML = '';
    Object.keys(this.groups).forEach(group => {
      const og = document.createElement('optgroup');
      og.label = this.groups[group].label;
      this.groups[group].themes.forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = this.themes[key].name;
        if (key === this.currentTheme) opt.selected = true;
        og.appendChild(opt);
      });
      select.appendChild(og);
    });
  },
  /** 绑定主题切换事件 */
  bindEvents() {
    // 具体主题切换（下拉）
    document.getElementById('themeSelect').addEventListener('change', (e) => {
      this.apply(e.target.value);
    });
  },
  /** 应用风格主题：只改图表（Mermaid），不改 UI 主题 */
  apply(themeKey) {
    const theme = this.themes[themeKey];
    if (!theme) return;
    this.currentTheme = themeKey;
    this.currentGroup = theme.group;
    // 仅重新初始化 Mermaid 图表主题并重绘；不再修改 body 的 UI 主题类
    if (window.mermaid && typeof window.renderChart === 'function') {
      mermaid.initialize(this.getMermaidConfig());
      window.renderChart();
    }
  },
  /** 组装当前主题的 Mermaid 初始化配置（叠加手绘修饰） */
  getMermaidConfig() {
    const mc = this.themes[this.currentTheme].mermaid;
    const look = mc.look || 'classic';
    return {
      startOnLoad: false,
      theme: mc.theme,
      look: look,
      handDrawnSeed: mc.handDrawnSeed !== undefined ? mc.handDrawnSeed : 0,
      themeVariables: (() => {
        const tv = Object.assign({}, mc.themeVariables);
        if (this.customStyle.nodeColor) { tv.primaryColor = this.customStyle.nodeColor; tv.mainBkg = this.customStyle.nodeColor; }
        if (this.customStyle.lineColor) { tv.lineColor = this.customStyle.lineColor; }
        if (this.customStyle.lineWidth) { tv.lineWidth = parseFloat(this.customStyle.lineWidth); }
        if (this.customStyle.borderColor) { tv.primaryBorderColor = this.customStyle.borderColor; tv.nodeBorder = this.customStyle.borderColor; }
        return tv;
      })(),
      securityLevel: 'loose',
      flowchart: { htmlLabels: false, curve: 'basis', padding: 10 },
      sequence: { mirrorActors: false },
      gantt: { barHeight: 26, barGap: 6 }
    };
  },

  /** 获取当前主题的默认样式值 */
  getCurrentDefaults() {
    const tv = this.themes[this.currentTheme].mermaid.themeVariables;
    return { nodeColor: tv.primaryColor || tv.mainBkg || '#ffffff', lineColor: tv.lineColor || '#555555', lineWidth: tv.lineWidth || '1.4', borderColor: tv.primaryBorderColor || tv.nodeBorder || '#333333' };
  },

  /** 重置用户自定义样式 */
  resetCustomStyle() {
    this.customStyle = { nodeColor: null, lineColor: null, lineWidth: null, borderColor: null };
  },

  /** 应用叠加修饰到预览 SVG（反相用 CSS filter，圆角/虚线箭头由 postProcessOverlays 处理） */
  applyOverlays() {
    const svg = document.querySelector('#previewContent svg');
    if (svg) {
      svg.classList.toggle('invert-overlay', this.overlays.invert);
    }
  },

  /** 切换叠加修饰并触发重绘 */
  toggleOverlay(name, enabled) {
    if (!(name in this.overlays)) return;
    this.overlays[name] = enabled;
    if (name === 'rounded' || name === 'dashedArrow') {
      // 圆角/虚线箭头只需重绘（后处理在渲染后执行）
      if (typeof window.renderChart === 'function') window.renderChart();
    } else if (name === 'invert') {
      this.applyOverlays();
    }
  },
  /** 获取当前主题的 Mermaid 配置 */
  getCurrentMermaidConfig() {
    const mc = this.themes[this.currentTheme].mermaid;
    return {
      theme: mc.theme,
      look: mc.look || 'classic',
      handDrawnSeed: mc.handDrawnSeed !== undefined ? mc.handDrawnSeed : 0,
      themeVariables: mc.themeVariables
    };
  }
};
