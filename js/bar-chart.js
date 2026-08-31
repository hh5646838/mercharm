/* ============================================================
   bar-chart.js - 自定义 SVG 柱状图渲染器
   Mermaid 原生不支持柱状图，这里实现轻量 SVG 渲染。
   代码以 "%% @chart bar" 开头时触发本渲染器。
   ============================================================ */

const BarChart = {
  /** 检测代码是否为柱状图 */
  isBarChart(code) {
    return code.trimStart().startsWith('%% @chart bar');
  },

  /**
   * 解析柱状图代码格式：
   *   %% @chart bar
   *   title: 标题
   *   x-label: X轴
   *   y-label: Y轴
   *   colors: #xxx,#yyy
   *   data:
   *   标签A: 100
   *   标签B: 200
   */
  parse(code) {
    const lines = code.trim().split('\n');
    const config = {
      title: '',
      xLabel: '',
      yLabel: '',
      colors: ['#4A90D9', '#7ED321', '#F5A623', '#D0021B', '#9013FE', '#50E3C2', '#FF6B6B'],
      data: []
    };
    let inData = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('%%')) continue;
      if (trimmed === 'data:' || trimmed === 'data：') {
        inData = true;
        continue;
      }
      if (inData) {
        // 数据行：标签: 数值
        const match = trimmed.match(/^(.+?)[:：]\s*([\d.]+)\s*$/);
        if (match) {
          config.data.push({ label: match[1].trim(), value: parseFloat(match[2]) });
        }
      } else {
        // 配置行：key: value
        const kv = trimmed.match(/^([\w-]+)[:：]\s*(.+)$/);
        if (kv) {
          const key = kv[1].toLowerCase();
          const val = kv[2].trim();
          if (key === 'title') config.title = val;
          else if (key === 'x-label' || key === 'xlabel') config.xLabel = val;
          else if (key === 'y-label' || key === 'ylabel') config.yLabel = val;
          else if (key === 'colors') config.colors = val.split(/[,，]/).map(c => c.trim()).filter(Boolean);
        }
      }
    }
    return config;
  },

  /** 生成 SVG 字符串 */
  render(code, width = 800, height = 500) {
    const config = this.parse(code);
    if (config.data.length === 0) {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">' +
        '<text x="200" y="100" text-anchor="middle" fill="#999" font-size="16">暂无数据</text></svg>';
    }

    // 边距与绘图区
    const padding = { top: 60, right: 40, bottom: 70, left: 70 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const maxVal = Math.max(...config.data.map(d => d.value));
    const niceMax = this._niceNumber(maxVal);
    const barWidth = Math.min(60, (chartW / config.data.length) * 0.6);
    const gap = (chartW - barWidth * config.data.length) / (config.data.length + 1);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
    svg += `<rect width="${width}" height="${height}" fill="white"/>`;

    // 标题
    if (config.title) {
      svg += `<text x="${width/2}" y="35" text-anchor="middle" font-size="20" font-weight="bold" ` +
        `fill="#333" font-family="-apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif">${this._esc(config.title)}</text>`;
    }

    // Y 轴网格线 + 刻度
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const y = padding.top + chartH - (chartH * i / yTicks);
      const val = niceMax * i / yTicks;
      svg += `<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartW}" y2="${y}" stroke="#e8e8e8" stroke-width="1"/>`;
      svg += `<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-size="12" fill="#666" font-family="sans-serif">${this._fmt(val)}</text>`;
    }

    // Y 轴标签（旋转）
    if (config.yLabel) {
      const cy = padding.top + chartH / 2;
      svg += `<text x="22" y="${cy}" text-anchor="middle" font-size="13" fill="#666" font-family="sans-serif" ` +
        `transform="rotate(-90, 22, ${cy})">${this._esc(config.yLabel)}</text>`;
    }

    // X 轴基线
    svg += `<line x1="${padding.left}" y1="${padding.top + chartH}" x2="${padding.left + chartW}" y2="${padding.top + chartH}" stroke="#999" stroke-width="1"/>`;

    // 柱子
    config.data.forEach((d, i) => {
      const x = padding.left + gap + i * (barWidth + gap);
      const barH = (d.value / niceMax) * chartH;
      const y = padding.top + chartH - barH;
      const color = config.colors[i % config.colors.length];
      const gradId = `barGrad${i}`;

      // 渐变定义
      svg += `<defs><linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">` +
        `<stop offset="0%" style="stop-color:${color};stop-opacity:1"/>` +
        `<stop offset="100%" style="stop-color:${color};stop-opacity:0.7"/>` +
        `</linearGradient></defs>`;

      // 柱体（带生长动画）
      svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" fill="url(#${gradId})" rx="4" ry="4">` +
        `<animate attributeName="height" from="0" to="${barH}" dur="0.6s" fill="freeze"/>` +
        `<animate attributeName="y" from="${padding.top + chartH}" to="${y}" dur="0.6s" fill="freeze"/>` +
        `</rect>`;

      // 柱顶数值
      svg += `<text x="${x + barWidth/2}" y="${y - 8}" text-anchor="middle" font-size="13" font-weight="bold" ` +
        `fill="${color}" font-family="sans-serif">${this._fmt(d.value)}</text>`;

      // X 轴标签
      svg += `<text x="${x + barWidth/2}" y="${padding.top + chartH + 20}" text-anchor="middle" font-size="12" ` +
        `fill="#666" font-family="sans-serif">${this._esc(d.label)}</text>`;
    });

    // X 轴标签
    if (config.xLabel) {
      svg += `<text x="${padding.left + chartW/2}" y="${height - 15}" text-anchor="middle" font-size="13" ` +
        `fill="#666" font-family="sans-serif">${this._esc(config.xLabel)}</text>`;
    }

    svg += '</svg>';
    return svg;
  },

  /** 将最大值向上取整到"好看"的刻度 */
  _niceNumber(max) {
    if (max <= 0) return 10;
    const exp = Math.floor(Math.log10(max));
    const base = Math.pow(10, exp);
    const norm = max / base;
    let nice;
    if (norm <= 1) nice = 1;
    else if (norm <= 2) nice = 2;
    else if (norm <= 5) nice = 5;
    else nice = 10;
    return nice * base;
  },

  /** 大数字缩写（1200 -> 1.2k） */
  _fmt(n) {
    if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + 'w';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    if (Number.isInteger(n)) return n.toString();
    return n.toFixed(1);
  },

  /** HTML 转义 */
  _esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
