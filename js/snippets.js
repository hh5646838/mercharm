/* ============================================================
   snippets.js - 语法片段数据
   11 类常用 Mermaid 语法片段，点击插入光标位置
   ============================================================ */

const Snippets = {
  categories: [
    {
      name: '流程图',
      items: [
        {
          name: '基础流程图',
          code: `flowchart TD
    A[开始] --> B{判断条件}
    B -->|是| C[执行操作1]
    B -->|否| D[执行操作2]
    C --> E[结束]
    D --> E`
        },
        {
          name: '子图分组',
          code: `flowchart TD
    subgraph 输入层
        A[数据采集]
        B[数据清洗]
    end
    subgraph 处理层
        C[特征提取]
        D[模型训练]
    end
    subgraph 输出层
        E[结果预测]
        F[可视化展示]
    end
    A --> B --> C --> D --> E --> F`
        },
        {
          name: '多种节点形状',
          code: `flowchart LR
    A([开始]) --> B[/输入数据/]
    B --> C[处理数据]
    C --> D{是否有效?}
    D -->|是| E[(保存到数据库)]
    D -->|否| F[/提示错误/]
    E --> G([结束])
    F --> G`
        },
        {
          name: '左右方向布局',
          code: `flowchart LR
    A[源] --> B[处理1]
    B --> C[处理2]
    C --> D[结果]`
        }
      ]
    },
    {
      name: '时序图',
      items: [
        {
          name: '基础时序图',
          code: `sequenceDiagram
    participant 用户
    participant 前端
    participant 后端
    participant 数据库
    用户->>前端: 点击登录
    前端->>后端: 发送登录请求
    后端->>数据库: 查询用户信息
    数据库-->>后端: 返回用户数据
    后端-->>前端: 返回登录结果
    前端-->>用户: 显示登录成功`
        },
        {
          name: '带注释和循环',
          code: `sequenceDiagram
    participant C as 客户端
    participant S as 服务器
    Note over C,S: TCP三次握手
    C->>S: SYN
    S-->>C: SYN+ACK
    C->>S: ACK
    Note over C,S: 数据传输
    loop 每次请求
        C->>S: HTTP Request
        S-->>C: HTTP Response
    end`
        },
        {
          name: '可选分支 alt/else',
          code: `sequenceDiagram
    participant U as 用户
    participant A as 认证服务
    participant D as 数据库
    U->>A: 提交账号密码
    A->>D: 查询用户
    alt 验证成功
        D-->>A: 返回用户信息
        A-->>U: 登录成功，返回Token
    else 验证失败
        D-->>A: 用户不存在或密码错误
        A-->>U: 登录失败
    end`
        }
      ]
    },
    {
      name: 'ER图',
      items: [
        {
          name: '数据库ER图',
          code: `erDiagram
    STUDENT ||--o{ ENROLLMENT : "选修"
    COURSE ||--o{ ENROLLMENT : "被选"
    TEACHER ||--o{ COURSE : "教授"
    STUDENT {
        int id PK "学号"
        string name "姓名"
        string major "专业"
        date enroll_date "入学日期"
    }
    COURSE {
        int id PK "课程号"
        string name "课程名"
        int credit "学分"
        int teacher_id FK "教师ID"
    }
    TEACHER {
        int id PK "教师号"
        string name "姓名"
        string title "职称"
    }
    ENROLLMENT {
        int student_id FK "学号"
        int course_id FK "课程号"
        float score "成绩"
    }`
        }
      ]
    },
    {
      name: '甘特图',
      items: [
        {
          name: '科研项目甘特图',
          code: `gantt
    title 毕业论文研究计划
    dateFormat YYYY-MM-DD
    axisFormat %m月%d日
    section 文献调研
    查阅文献           :a1, 2024-03-01, 14d
    撰写文献综述       :a2, after a1, 10d
    section 实验设计
    确定研究方法       :b1, after a2, 7d
    搭建实验环境       :b2, after b1, 10d
    section 数据采集
    采集实验数据       :c1, after b2, 21d
    数据清洗与分析     :c2, after c1, 14d
    section 论文撰写
    撰写论文初稿       :d1, after c2, 21d
    修改与定稿         :d2, after d1, 14d`
        }
      ]
    },
    {
      name: '饼图',
      items: [
        {
          name: '数据统计饼图',
          code: `pie title 研究方法分布
    "文献研究" : 35
    "实验研究" : 40
    "问卷调查" : 15
    "案例分析" : 10`
        }
      ]
    },
    {
      name: '类图',
      items: [
        {
          name: '面向对象类图',
          code: `classDiagram
    class Animal {
        +String name
        +int age
        +eat()
        +sleep()
    }
    class Dog {
        +String breed
        +bark()
        +fetch()
    }
    class Cat {
        +String color
        +meow()
        +climb()
    }
    Animal <|-- Dog
    Animal <|-- Cat
    Animal --> Owner : has`
        }
      ]
    },
    {
      name: '思维导图',
      items: [
        {
          name: '论文框架思维导图',
          code: `mindmap
  root((毕业论文))
    绪论
      研究背景
      研究意义
      研究问题
    文献综述
      国内外研究现状
      研究空白
      理论基础
    研究方法
      研究设计
      数据收集
      分析方法
    研究结果
      数据分析
      结果讨论
    结论
      研究发现
      研究局限
      未来展望`
        }
      ]
    },
    {
      name: '状态图',
      items: [
        {
          name: '订单状态流转',
          code: `stateDiagram-v2
    [*] --> 待支付
    待支付 --> 已支付: 支付成功
    待支付 --> 已取消: 超时/取消
    已支付 --> 待发货: 确认收款
    待发货 --> 已发货: 发货
    已发货 --> 已签收: 确认收货
    已签收 --> 已完成: 评价完成
    已取消 --> [*]
    已完成 --> [*]`
        }
      ]
    },
    {
      name: 'Git分支图',
      items: [
        {
          name: 'Git分支演进',
          code: `gitGraph
    commit id: "初始提交"
    branch develop
    checkout develop
    commit id: "开发功能A"
    commit id: "开发功能B"
    branch feature/login
    checkout feature/login
    commit id: "实现登录"
    checkout develop
    merge feature/login
    checkout main
    merge develop
    commit id: "发布v1.0" tag: "v1.0"`
        }
      ]
    },
    {
      name: '柱状图',
      items: [
        {
          name: '基础柱状图',
          code: `%% @chart bar
title: 季度销售额统计
x-label: 季度
y-label: 万元
data:
Q1: 120
Q2: 185
Q3: 240
Q4: 310`
        },
        {
          name: '自定义颜色柱状图',
          code: `%% @chart bar
title: 各渠道流量对比
x-label: 渠道
y-label: 访问量
colors: #FF6B6B,#4ECDC4,#45B7D1,#96CEB4,#FFEAA7
data:
搜索引擎: 4500
社交媒体: 3200
直接访问: 2800
邮件营销: 1500
广告投放: 2100`
        }
      ]
    },
    {
      name: '通用技巧',
      items: [
        {
          name: '添加样式class',
          code: `flowchart LR
    A[重要节点] --> B[普通节点]
    B --> C[警告节点]
    classDef important fill:#ff6b6b,stroke:#c0392b,color:#fff,stroke-width:2px
    classDef warning fill:#ffd93d,stroke:#f39c12,color:#333
    class A important
    class C warning`
        },
        {
          name: '链接样式',
          code: `flowchart TD
    A[开始] -->|正常流程| B[处理]
    B -.->|异步通知| C[日志服务]
    C ==>|重要告警| D[管理员]
    B -->|完成| E[结束]`
        }
      ]
    }
  ],

  /** 渲染片段列表到抽屉 */
  render(container) {
    container.innerHTML = '';
    this.categories.forEach(cat => {
      // 分类标题
      const titleEl = document.createElement('div');
      titleEl.className = 'snippet-cat-title';
      titleEl.textContent = cat.name;
      container.appendChild(titleEl);

      cat.items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'snippet-item';
        el.innerHTML = `
          <div class="snippet-header">
            <span>${item.name}</span>
            <button class="snippet-insert-btn">插入</button>
          </div>
          <pre class="snippet-code">${this._esc(item.code)}</pre>
        `;
        const header = el.querySelector('.snippet-header');
        const insertBtn = el.querySelector('.snippet-insert-btn');
        // 点击头部展开/收起
        header.addEventListener('click', (e) => {
          if (e.target === insertBtn) return;
          el.classList.toggle('expanded');
        });
        // 插入按钮
        insertBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.insertAtCursor(item.code);
          showToast('片段已插入');
        });
        container.appendChild(el);
      });
    });
  },

  /** 在编辑器光标位置插入代码 */
  insertAtCursor(code) {
    // 使用 CodeMirror 的 replaceSelection 插入片段，光标落在片段末尾
    if (window.editorInstance) {
      const cm = window.editorInstance;
      const cur = cm.getCursor();
      const line = cm.getLine(cur.line) || '';
      // 光标不在行首时先换行
      const prefix = cur.ch === 0 ? '' : '\n';
      cm.replaceSelection(prefix + code, 'end');
      // 光标定位到插入内容末尾
      const pos = cm.getCursor();
      cm.setCursor({ line: pos.line, ch: pos.ch });
      cm.focus();
      // 触发渲染与保存（change 事件已自动处理）
      if (typeof scheduleRender === 'function') scheduleRender();
      if (typeof saveCode === 'function') saveCode();
      return;
    }
    // 降级：原生 textarea
    const editor = document.getElementById('codeEditor');
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const text = editor.value;
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const prefix = lineStart === start ? '' : '\n';
    editor.value = text.substring(0, start) + prefix + code + text.substring(end);
    const newPos = start + prefix.length + code.length;
    editor.selectionStart = editor.selectionEnd = newPos;
    editor.focus();
    editor.dispatchEvent(new Event('input'));
  },

  /** HTML 转义 */
  _esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
