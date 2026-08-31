/* ============================================================
   templates.js - 模板库数据
   全部模板（学术+PPT合并）
   每个模板含 id/name/desc/icon/code
   注意：loadTemplate、closeAllModals、showToast、toggleFavorite、
   renderTemplates、currentTab 定义在 app.js 中，运行时已加载。
   ============================================================ */

const Templates = {
  // ===== 学术论文模板 =====
  // ===== 全部模板（学术+PPT合并） =====
  all: [
{
      id: 'thesis-flow',
      name: '毕业论文流程图',
      desc: '论文研究技术路线',
      icon: '📝',
      code: `flowchart TD
    A[确定研究主题] --> B[文献调研与综述]
    B --> C[提出研究问题与假设]
    C --> D[设计研究方案]
    D --> E{研究类型}
    E -->|实证研究| F[数据采集]
    E -->|理论研究| G[理论建模]
    F --> H[数据分析与处理]
    G --> I[模型验证]
    H --> J[结果讨论]
    I --> J
    J --> K[撰写论文]
    K --> L[修改与答辩]
    L --> M[完成]`
    },
{
      id: 'ppt-mindmap',
      name: '汇报思维导图',
      desc: '项目规划脑图',
      icon: '🧠',
      code: `mindmap
  root((2024战略))
    产品
      新品研发
      体验优化
      技术升级
    市场
      品牌建设
      渠道拓展
      用户增长
    运营
      数据驱动
      效率提升
      成本控制
    团队
      人才招聘
      技能培训
      文化建设`
    },
    {
      id: 'experiment-block',
      name: '实验框图',
      desc: '科研实验系统架构',
      icon: '🔬',
      code: `flowchart LR
    subgraph 输入模块
        A[原始数据采集]
        B[传感器/仪器]
    end
    subgraph 预处理模块
        C[数据清洗]
        D[特征提取]
        E[数据归一化]
    end
    subgraph 核心算法模块
        F[模型训练]
        G[参数优化]
        H[交叉验证]
    end
    subgraph 评估模块
        I[准确率评估]
        J[对比实验]
        K[显著性检验]
    end
    subgraph 输出模块
        L[结果可视化]
        M[结论生成]
    end
    A --> C
    B --> C
    C --> D --> E --> F
    F --> G --> H --> I
    I --> J --> K --> L --> M`
    },
    
    {
      id: 'research-gantt',
      name: '科研甘特图',
      desc: '项目进度规划',
      icon: '📅',
      code: `gantt
    title 科研项目进度计划
    dateFormat YYYY-MM-DD
    axisFormat %m/%d
    section 第一阶段
    文献调研           :a1, 2024-03-01, 21d
    确定研究方案       :a2, after a1, 14d
    section 第二阶段
    搭建实验环境       :b1, after a2, 14d
    数据采集           :b2, after b1, 28d
    数据预处理         :b3, after b2, 14d
    section 第三阶段
    模型训练与优化     :c1, after b3, 28d
    实验对比分析       :c2, after c1, 14d
    section 第四阶段
    论文撰写           :d1, after c2, 35d
    论文修改           :d2, after d1, 14d
    答辩准备           :d3, after d2, 7d`
    },
    
    {
      id: 'algorithm-flow',
      name: '算法流程图',
      desc: '机器学习算法流程',
      icon: '🤖',
      code: `flowchart TD
    A[原始数据集] --> B[数据探索性分析]
    B --> C[数据清洗]
    C --> D[特征工程]
    D --> E[数据集划分]
    E --> F[训练集]
    E --> G[验证集]
    E --> H[测试集]
    F --> I[选择算法模型]
    I --> J[训练模型]
    J --> K{验证集评估}
    K -->|不达标| L[调参优化]
    L --> J
    K -->|达标| M[最终模型]
    M --> N[测试集评估]
    N --> O[模型部署]`
    },

    {
      id: 'ppt-sequence',
      name: 'PPT时序图',
      desc: '业务流程时序',
      icon: '⏱️',
      code: `sequenceDiagram
    participant U as 🙋 用户
    participant F as 🖥️ 前端
    participant G as 🔀 网关
    participant S as ⚙️ 服务
    participant D as 💾 数据库
    U->>F: 提交订单
    F->>G: 请求下单
    G->>S: 调用订单服务
    S->>D: 扣减库存
    D-->>S: 库存充足
    S->>D: 创建订单
    D-->>S: 订单创建成功
    S-->>G: 返回订单号
    G-->>F: 返回结果
    F-->>U: 下单成功🎉`
    },
    {
      id: 'ppt-pie',
      name: '精美饼图',
      desc: '数据占比展示',
      icon: '🥧',
      code: `pie title 市场份额分布
    "产品A" : 42
    "产品B" : 28
    "产品C" : 18
    "其他" : 12`
    },
    {
      id: 'ppt-bar',
      name: '精美柱状图',
      desc: '数据对比展示（自定义渲染）',
      icon: '📊',
      code: `%% @chart bar
title: 年度业绩对比
x-label: 部门
y-label: 万元
colors: #4A90D9,#7ED321,#F5A623,#D0021B,#9013FE
data:
研发部: 320
市场部: 280
销售部: 450
运营部: 190
财务部: 150`
    },
    
    {
      id: 'ppt-data-flow',
      name: '数据流转图',
      desc: '数据处理全链路',
      icon: '🔄',
      code: `flowchart LR
    A[📥 数据采集] --> B[🔧 数据清洗]
    B --> C[🏷️ 数据标注]
    C --> D[📦 数据存储]
    D --> E[🔬 数据分析]
    E --> F[🤖 模型训练]
    F --> G[📈 模型评估]
    G --> H[🚀 模型部署]
    H --> I[📊 结果可视化]
    I --> J[💡 业务决策]`
    }
  ],

  // ===== PPT 汇报模板 =====


  /**
   * 渲染模板卡片网格
   * @param {string} category - academic / ppt / favorites
   * @param {HTMLElement} container - 网格容器
   * @param {Array} favorites - 已收藏模板列表
   */
  render(category, container, favorites) {
    container.innerHTML = '';
    let list = [];
    if (category === 'favorites') {
      list = favorites.map(f => ({ ...f, favorite: true }));
    } else {
      list = this[category] || [];
    }

    if (list.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px 0;">暂无模板，快去全部模板页收藏吧</p>';
      return;
    }

    list.forEach(tpl => {
      const card = document.createElement('div');
      card.className = 'template-card';
      const isFav = favorites.some(f => f.id === tpl.id);
      card.innerHTML = `
        <button class="template-fav ${isFav ? 'active' : ''}" data-id="${tpl.id}" title="收藏">${isFav ? '⭐' : '☆'}</button>
        <div class="template-thumb">${tpl.icon}</div>
        <div class="template-name">${tpl.name}</div>
        <div class="template-desc">${tpl.desc}</div>
      `;
      // 点击卡片加载模板
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('template-fav')) return;
        loadTemplate(tpl.code);
        closeAllModals();
        showToast('模板已加载');
      });
      // 收藏按钮
      card.querySelector('.template-fav').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(tpl);
        renderTemplates(currentTab);
      });
      container.appendChild(card);
    });
  }
};
