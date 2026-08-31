/* ============================================================
   mermaid-mode.js - Mermaid 语法高亮（CodeMirror 5 defineSimpleMode）
   + 基础代码补全（关键词 + 文档内标识符 + 常用片段）
   纯本地，无外部依赖
   ============================================================ */

// ---- Mermaid 关键字表 ----
const MERMAID_KEYWORDS = [
  // 图表类型
  'flowchart', 'graph', 'subgraph', 'end',
  'sequenceDiagram', 'participant', 'actor', 'activate', 'deactivate',
  'note', 'loop', 'alt', 'else', 'opt', 'par', 'critical', 'and', 'rect',
  'gantt', 'title', 'dateFormat', 'axisFormat', 'excludes', 'todayMarker',
  'section', 'done', 'active', 'crit',
  'pie', 'showData', 'erDiagram', 'classDiagram', 'class', 'namespace', 'direction',
  'mindmap', 'root', 'stateDiagram', 'stateDiagram-v2', 'state', 'choice', 'fork', 'join',
  'gitGraph', 'commit', 'branch', 'checkout', 'merge', 'reset', 'cherry-pick',
  'journey', 'quadrantChart', 'xychart-beta', 'requirementDiagram', 'requirement',
  'element', 'satisfies', 'contains', 'architecture-beta',
  // 方向
  'TD', 'TB', 'LR', 'RL', 'BT'
];
const MERMAID_KEYWORD_SET = {};
MERMAID_KEYWORDS.forEach(k => { MERMAID_KEYWORD_SET[k] = true; });

// ---- 常用补全片段（点击后插入完整骨架） ----
const MERMAID_SNIPPETS = [
  { label: 'flowchart TD 垂直流程图', text: 'flowchart TD\n    A[开始] --> B{判断}\n    B -->|是| C[结束]\n    B -->|否| D[其他]' },
  { label: 'flowchart LR 水平流程图', text: 'flowchart LR\n    A[输入] --> B[处理] --> C[输出]' },
  { label: 'sequenceDiagram 时序图', text: 'sequenceDiagram\n    participant A as 用户\n    participant B as 系统\n    A->>B: 请求\n    B-->>A: 响应' },
  { label: 'gantt 甘特图', text: 'gantt\n    title 项目排期\n    dateFormat YYYY-MM-DD\n    section 研发\n    需求: 2026-09-01, 7d\n    开发: 2026-09-08, 14d' },
  { label: 'pie 饼图', text: 'pie title 数据占比\n    "分类一" : 40\n    "分类二" : 30\n    "分类三" : 30' },
  { label: 'erDiagram ER 图', text: 'erDiagram\n    USER ||--o{ ORDER : places\n    ORDER ||--|{ ITEM : contains' },
  { label: 'classDiagram 类图', text: 'classDiagram\n    class Animal {\n        +String name\n        +makeSound()\n    }\n    Animal <|-- Dog' },
  { label: 'mindmap 思维导图', text: 'mindmap\n  root((项目))\n    需求\n      调研\n    设计\n      原型' },
  { label: 'stateDiagram 状态图', text: 'stateDiagram-v2\n    [*] --> 待处理\n    待处理 --> 处理中 : 开始\n    处理中 --> 完成 : 完成\n    完成 --> [*]' },
  { label: 'gitGraph 提交图', text: 'gitGraph\n    commit id: "A"\n    branch feature\n    checkout feature\n    commit id: "B"\n    checkout main\n    merge feature' }
];

// ---- 语法高亮：defineSimpleMode ----
CodeMirror.defineSimpleMode('mermaid', {
  start: [
    // 注释
    { regex: /%%.*/, token: 'comment' },
    // 字符串
    { regex: /"(?:[^"\\]|\\.)*"/, token: 'string' },
    { regex: /'(?:[^'\\]|\\.)*'/, token: 'string' },
    // 数字
    { regex: /\d+(?:\.\d+)?/, token: 'number' },
    // 连接符 / 关系符号
    { regex: /(?:-->>?|->>?|==>?|-\.->|-\.-|---|~~~|:::|[|{}[\]()])/, token: 'operator' },
    // 图表类型与关键字
    { regex: new RegExp('\\b(?:' + MERMAID_KEYWORDS.join('|') + ')\\b'), token: 'keyword' },
    // 大写标识符（节点 / 参与者等）
    { regex: /\b[A-Z][A-Z0-9_]*\b/, token: 'def' },
    // 普通单词
    { regex: /[\w\u4e00-\u9fa5]+/, token: 'variable' },
    // 其余
    { regex: /[\s\S]/, token: null }
  ],
  meta: {
    lineComment: '%%',
    dontIndentStates: []
  }
});
CodeMirror.defineMIME('text/x-mermaid', 'mermaid');

// ---- 补全：关键词 + 文档内标识符 + 片段 ----
function mermaidHint(cm, options) {
  const cur = cm.getCursor();
  const line = cm.getLine(cur.line) || '';
  let start = cur.ch, end = cur.ch;
  while (start > 0 && /[\w\u4e00-\u9fa5]/.test(line.charAt(start - 1))) start--;
  while (end < line.length && /[\w\u4e00-\u9fa5]/.test(line.charAt(end))) end++;
  const word = line.slice(start, end);

  // 收集文档中已出现的大写标识符（节点 A/B 等）
  const idSet = new Set();
  cm.eachLine(l => {
    const m = (l.text || '').match(/\b[A-Z][A-Z0-9_]*\b/g);
    if (m) m.forEach(x => idSet.add(x));
  });

  const list = [];
  // 1. 语法片段（前缀匹配）
  if (!word) {
    MERMAID_SNIPPETS.forEach(s => list.push({ text: s.text, displayText: s.label, type: 'snippet' }));
  } else {
    // 2. 关键字
    MERMAID_KEYWORDS.filter(k => k.toLowerCase().startsWith(word.toLowerCase())).forEach(k => {
      list.push({ text: k, displayText: k, type: 'keyword' });
    });
    // 3. 文档内标识符
    idSet.forEach(i => {
      if (i.toLowerCase().startsWith(word.toLowerCase()) && i !== word && !MERMAID_KEYWORD_SET[i]) {
        list.push({ text: i, displayText: i, type: 'variable' });
      }
    });
  }

  // 去重 + 排序（keyword > variable > snippet）
  const seen = {};
  const deduped = [];
  list.forEach(it => {
    const key = it.displayText + it.type;
    if (seen[key]) return;
    seen[key] = true;
    deduped.push(it);
  });
  deduped.sort((a, b) => {
    const rank = { keyword: 0, variable: 1, snippet: 2 };
    return (rank[a.type] - rank[b.type]) || a.displayText.localeCompare(b.displayText);
  });

  return {
    list: deduped.slice(0, 30),
    from: CodeMirror.Pos(cur.line, start),
    to: CodeMirror.Pos(cur.line, end)
  };
}
CodeMirror.registerHelper('hint', 'mermaid', mermaidHint);
