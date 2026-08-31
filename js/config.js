/* ============================================================
   config.js - 配置加载与应用
   从 config.json 读取站点信息、CDN 地址、广告弹窗参数、更多工具链接、UI主题、帮助文档
   ============================================================ */
const AppConfig = {
  // 默认配置（config.json 加载失败时降级使用）
  data: {
    siteTitle: 'Mermaid 图表工坊',
    author: '图表工坊',
    avatarUrl: '',
    homeUrl: '',
    wechatName: '',
    wechatQrUrl: '',
    moreToolsUrl: '',
    uiTheme: 'dark',            // 默认纯黑 UI
    helpDocs: [],
    cdnBase: 'https://cdn.jsdelivr.net/npm',
    mermaidVersion: '10.9.1',
    adPopup: {
      firstTrigger: 6,
      interval: 3,
      countdownSeconds: 5
    }
  },
  loaded: false,
  /** 异步加载 config.json */
  async load() {
    try {
      const res = await fetch('config.json', { cache: 'no-cache' });
      if (res.ok) {
        const json = await res.json();
        // 深合并 adPopup
        if (json.adPopup) {
          json.adPopup = { ...this.data.adPopup, ...json.adPopup };
        }
        this.data = { ...this.data, ...json };
      }
    } catch (e) {
      console.warn('[config] config.json 加载失败，使用默认配置:', e.message);
    }
    this.loaded = true;
    this.apply();
  },
  /** 将配置应用到 DOM */
  apply() {
    const d = this.data;
    // 站点标题
    document.getElementById('siteTitle').textContent = d.siteTitle;
    document.title = d.siteTitle;
    // 作者
    if (d.author) {
      document.getElementById('siteAuthor').textContent = d.author;
    }
    // 头像（显示在"关注我"按钮前）
    if (d.avatarUrl) {
      const avatar = document.getElementById('followAvatar');
      if (avatar) {
        avatar.src = d.avatarUrl;
        avatar.style.display = 'block';
      }
    }
    // 更多工具：跳转到配置的主页链接（更多工具不再用下拉）
    const moreBtn = document.getElementById('btnMoreTools');
    if (moreBtn) {
      if (d.moreToolsUrl) {
        moreBtn.href = d.moreToolsUrl;
      } else {
        moreBtn.href = d.homeUrl || '#'; // 未配置时回退到 homeUrl
      }
    }
    // 关注我弹窗：公众号名称 + 二维码
    if (d.wechatName) {
      const followName = document.getElementById('followWechatName');
      if (followName) followName.textContent = d.wechatName;
    }
    const followQr = document.getElementById('followQrImg');
    if (followQr) {
      if (d.wechatQrUrl) {
        followQr.src = d.wechatQrUrl;
        followQr.style.display = 'block';
      } else {
        followQr.style.display = 'none';
        document.getElementById('followQrPlaceholder').style.display = 'flex';
      }
    }
    // 帮助文档：按 config.helpDocs 渲染语法卡片（url 为空则为占位）
    this.renderHelpDocs(d.helpDocs);
    // 广告弹窗：微信名
    if (d.wechatName) {
      document.getElementById('adWechatName').textContent = '微信公众号：' + d.wechatName;
    }
    // 广告弹窗：二维码
    if (d.wechatQrUrl) {
      document.getElementById('adQrImg').src = d.wechatQrUrl;
    } else {
      // 无二维码时显示占位
      document.getElementById('adQr').innerHTML =
        '<div style="color:#999;font-size:13px;">请在 config.json<br>配置 wechatQrUrl</div>';
    }
  },
  /** 渲染帮助弹窗里的语法卡片（由 config.helpDocs 驱动） */
  renderHelpDocs(docs) {
    const grid = document.getElementById('helpGrid');
    if (!grid) return;
    if (!docs || !docs.length) {
      grid.innerHTML = '<div style="color:var(--text-muted);font-size:13px;">请在 config.json 的 helpDocs 中配置语法卡片</div>';
      return;
    }
    grid.innerHTML = docs.map(doc => {
      const code = (doc.code || '').replace(/</g, '&lt;');
      const link = doc.url
        ? `<a class="help-card-link" href="${doc.url}" target="_blank" rel="noopener">文档 →</a>`
        : `<span class="help-card-link pending">链接待添加</span>`;
      return `
        <div class="help-card">
          <div class="help-card-title">${doc.icon || ''} ${doc.name || ''}</div>
          <code>${code}</code>
          ${link}
        </div>`;
    }).join('');
  },
  /** 获取配置项 */
  get(key) {
    return key ? this.data[key] : this.data;
  }
};
