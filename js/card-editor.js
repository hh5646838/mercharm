/**
 * 电池卡片编辑器
 * 两套系统独立：卡片视图生成 Mermaid 代码，文本视图手写代码
 */
(function () {
  'use strict';

  // ===== 组件定义 =====
  // ===== 通用流程图组件（全集） =====
  const COMPONENTS = [
    // 流程图组件
    { type: 'startend',    label: '开始/结束', shape: 'stadium',      mermaid: '([text])',  defaultText: '开始', category: 'flowchart' },
    { type: 'process',     label: '处理',     shape: 'rect',         mermaid: '[text]',    defaultText: '处理步骤', category: 'flowchart' },
    { type: 'decision',    label: '判断',     shape: 'diamond',      mermaid: '{text}',    defaultText: '是否满足?', category: 'flowchart' },
    { type: 'io',          label: '输入输出', shape: 'parallelogram', mermaid: '[/text/]', defaultText: '数据输入', category: 'flowchart' },
    { type: 'subroutine',  label: '子程序',   shape: 'subroutine',   mermaid: '[[text]]',  defaultText: '子程序', category: 'flowchart' },
    { type: 'database',    label: '数据库',   shape: 'database',     mermaid: '[(text)]',  defaultText: '数据库', category: 'flowchart' },
    { type: 'circle',      label: '圆形',     shape: 'circle',       mermaid: '((text))',  defaultText: '节点', category: 'flowchart' },
    { type: 'hexagon',     label: '六边形',   shape: 'hexagon',      mermaid: '{{text}}',  defaultText: '准备', category: 'flowchart' },
    { type: 'trapezoid',   label: '梯形',     shape: 'trapezoid',    mermaid: '[//text//]', defaultText: '手动操作', category: 'flowchart' },
    { type: 'subgraph',    label: '子图容器', shape: 'subgraph',     mermaid: 'subgraph',   defaultText: '子图', category: 'flowchart' },
    // 状态图组件
    { type: 'state_start', label: '开始',     shape: 'circle',       mermaid: '[*]',        defaultText: '开始', category: 'state', isStart: true },
    { type: 'state',       label: '状态',     shape: 'stadium',      mermaid: 'text',       defaultText: '状态', category: 'state' },
    { type: 'state_choice',label: '选择',     shape: 'diamond',      mermaid: 'text <<choice>>', defaultText: '条件?', category: 'state' },
    { type: 'state_fork',  label: '分叉',     shape: 'rect',         mermaid: 'text <<fork>>',   defaultText: '分叉', category: 'state' },
    { type: 'state_join',  label: '汇合',     shape: 'rect',         mermaid: 'text <<join>>',   defaultText: '汇合', category: 'state' },
    { type: 'state_end',   label: '结束',     shape: 'circle',       mermaid: '[*]',        defaultText: '结束', category: 'state', isEnd: true }
  ];

  // ===== 状态 =====
  const state = {
    nodes: [],
    edges: [],
    selectedNode: null,
    selectedNodes: [],
    selectedEdge: null,
    layoutDirection: 'TD',
    diagramType: 'flowchart',
    nodeIdCounter: 0,
    edgeIdCounter: 0,
    isDraggingNode: false,
    dragNode: null,
    dragOffset: { x: 0, y: 0 },
    isConnecting: false,
    connectFrom: null,
    tempLine: null,
    isSelecting: false,
    selectStart: { x: 0, y: 0 },
    selectionBox: null,
    history: [],
    historyIndex: -1
  };

  // ===== DOM 引用 =====
  let canvas, nodesLayer, edgesLayer, componentList;
  let cardEditorContainer;
  let btnCardView, btnTextView;
  let editorPane;

  // ===== 初始化 =====
  function init() {
    cardEditorContainer = document.getElementById('cardEditorContainer');
    canvas = document.getElementById('cardCanvas');
    nodesLayer = document.getElementById('cardNodes');
    edgesLayer = document.getElementById('cardEdges');
    componentList = document.getElementById('componentList');
    btnCardView = document.getElementById('btnCardView');
    btnTextView = document.getElementById('btnTextView');
    editorPane = document.querySelector('.editor-pane');

    if (!canvas) return;

    // SVG 箭头标记
    edgesLayer.innerHTML = '<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#666"/></marker></defs>';

    renderComponentList();
    bindLayoutDirection();
    bindCanvasEvents();
    bindViewToggle();

    // 组件菜单折叠/展开（支持多个菜单）
    document.querySelectorAll('.component-menu-header').forEach(header => {
      header.addEventListener('click', () => {
        const menu = header.closest('.component-menu');
        if (menu) menu.classList.toggle('collapsed');
      });
    });

    // 电池文本输入框实时更新
    const textInput = document.getElementById('cardNodeTextInput');
    if (textInput) {
      textInput.addEventListener('input', () => {
        if (state.selectedNode) {
          const node = state.selectedNode;
          node.text = textInput.value || '未命名';
          const el = document.getElementById(node.id);
          if (el) {
            const textEl = el.querySelector('.node-text');
            if (textEl) textEl.textContent = node.text;
          }
          renderEdges();
          saveHistory();
          updatePreview();
        }
      });
    }

    // 默认添加一个开始节点
    addNode('start', 80, 80);
  }

  function getShapeSVG(shape) {
    const stroke = '#333';
    const sw = '1.5';
    let inner = '';
    switch (shape) {
      case 'stadium':
        inner = '<rect x="1" y="1" width="26" height="18" rx="9" fill="#fff" stroke="' + stroke + '" stroke-width="' + sw + '"/>';
        break;
      case 'rect':
        inner = '<rect x="1" y="1" width="26" height="18" rx="2" fill="#fff" stroke="' + stroke + '" stroke-width="' + sw + '"/>';
        break;
      case 'diamond':
        inner = '<polygon points="14,2 26,10 14,18 2,10" fill="#fff" stroke="' + stroke + '" stroke-width="' + sw + '"/>';
        break;
      case 'parallelogram':
        inner = '<polygon points="5,2 27,2 23,18 1,18" fill="#fff" stroke="' + stroke + '" stroke-width="' + sw + '"/>';
        break;
      case 'subroutine':
        inner = '<rect x="1" y="1" width="26" height="18" rx="2" fill="#fff" stroke="' + stroke + '" stroke-width="' + sw + '"/><rect x="4" y="1" width="20" height="18" fill="none" stroke="' + stroke + '" stroke-width="' + sw + '"/>';
        break;
      case 'database':
        inner = '<ellipse cx="14" cy="4" rx="12" ry="3" fill="#fff" stroke="' + stroke + '" stroke-width="' + sw + '"/><path d="M2 4v12c0 1.66 5.37 3 12 3s12-1.34 12-3V4" fill="#fff" stroke="' + stroke + '" stroke-width="' + sw + '"/><ellipse cx="14" cy="4" rx="12" ry="3" fill="none" stroke="' + stroke + '" stroke-width="' + sw + '"/>';
        break;
      case 'circle':
        inner = '<circle cx="14" cy="10" r="8" fill="#fff" stroke="' + stroke + '" stroke-width="' + sw + '"/>';
        break;
      case 'hexagon':
        inner = '<polygon points="8,2 20,2 27,10 20,18 8,18 1,10" fill="#fff" stroke="' + stroke + '" stroke-width="' + sw + '"/>';
        break;
      case 'trapezoid':
        inner = '<polygon points="7,2 21,2 27,18 1,18" fill="#fff" stroke="' + stroke + '" stroke-width="' + sw + '"/>';
        break;
      case 'subgraph':
        inner = '<rect x="1" y="1" width="26" height="18" rx="2" fill="none" stroke="#4a6cf7" stroke-width="1.5" stroke-dasharray="3,2"/><line x1="1" y1="6" x2="27" y2="6" stroke="#4a6cf7" stroke-width="1" stroke-dasharray="3,2"/>';
        break;
      default:
        inner = '<rect x="1" y="1" width="26" height="18" rx="2" fill="#fff" stroke="' + stroke + '" stroke-width="' + sw + '"/>';
    }
    return '<svg width="28" height="20" viewBox="0 0 28 20" fill="none" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>';
  }

  // ===== 组件库渲染 =====
  function renderComponentList() {
    // 渲染流程图组件
    const flowList = document.getElementById('componentList');
    if (flowList) {
      flowList.innerHTML = '';
      COMPONENTS.filter(c => c.category === 'flowchart').forEach(comp => {
        const item = createComponentItem(comp);
        flowList.appendChild(item);
      });
    }
    // 渲染状态图组件
    const stateList = document.getElementById('stateComponentList');
    if (stateList) {
      stateList.innerHTML = '';
      COMPONENTS.filter(c => c.category === 'state').forEach(comp => {
        const item = createComponentItem(comp);
        stateList.appendChild(item);
      });
    }
  }

  function createComponentItem(comp) {
    const item = document.createElement('div');
    item.className = 'comp-item';
    item.draggable = true;
    item.dataset.type = comp.type;
    item.innerHTML = '<div class="comp-svg-preview">' + getShapeSVG(comp.shape) + '</div><span>' + comp.label + '</span>';
    item.addEventListener('dragstart', e => {
      e.dataTransfer.setData('component-type', comp.type);
      e.dataTransfer.effectAllowed = 'copy';
    });
    item.addEventListener('click', () => {
      addNode(comp.type, 60 + Math.random() * 100, 60 + Math.random() * 100);
    });
    return item;
  }

  function bindLayoutDirection() {
    document.querySelectorAll('.dir-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.dir-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.layoutDirection = btn.dataset.dir;
        saveHistory();
        updatePreview();
      });
    });
  }
  function bindCanvasEvents() {
    // 拖放组件到画布
    canvas.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    canvas.addEventListener('drop', e => {
      e.preventDefault();
      const type = e.dataTransfer.getData('component-type');
      if (!type) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - 50;
      const y = e.clientY - rect.top - 20;
      addNode(type, x, y);
    });

    // 点击空白处取消选中 / 开始框选
    canvas.addEventListener('mousedown', e => {
      if (e.target === canvas || e.target === nodesLayer || e.target === edgesLayer) {
        if (!e.shiftKey) {
          deselectAll();
          state.selectedEdge = null;
          // 重置连线样式
          document.querySelectorAll('.card-edges g path').forEach(p => {
            p.style.stroke = '#555';
            p.style.strokeWidth = '1.5';
          });
        }
        // 开始框选
        state.isSelecting = true;
        const rect = canvas.getBoundingClientRect();
        state.selectStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        state.selectionBox = document.createElement('div');
        state.selectionBox.className = 'card-selection-box';
        state.selectionBox.style.left = state.selectStart.x + 'px';
        state.selectionBox.style.top = state.selectStart.y + 'px';
        state.selectionBox.style.width = '0px';
        state.selectionBox.style.height = '0px';
        canvas.appendChild(state.selectionBox);
      }
    });

    // 节点拖拽
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // 键盘删除（支持批量节点和连线）
    document.addEventListener('keydown', e => {
      if ((e.key === 'Delete' || e.key === 'Backspace')) {
        if (!e.target.matches('input, textarea')) {
          // 优先删除选中的连线
          if (state.selectedEdge) {
            state.edges = state.edges.filter(ed => ed.id !== state.selectedEdge);
            state.selectedEdge = null;
            renderEdges();
            saveHistory();
            updatePreview();
            return;
          }
          // 删除选中的节点
          if (state.selectedNodes.length > 0) {
            const toDelete = [...state.selectedNodes];
            toDelete.forEach(node => deleteNode(node));
            saveHistory();
          }
        }
      }
    });
  }

  // ===== 节点操作 =====
  function addNode(type, x, y) {
    const comp = COMPONENTS.find(c => c.type === type);
    if (!comp) return;

    const id = 'n' + (++state.nodeIdCounter);
    const node = {
      id,
      type: comp.type,
      shape: comp.shape,
      text: comp.defaultText,
      x: Math.max(10, x),
      y: Math.max(10, y),
      mermaidFmt: comp.mermaid,
      category: comp.category,
      isStart: comp.isStart || false,
      isEnd: comp.isEnd || false,
      width: comp.type === 'subgraph' ? 140 : (comp.isStart || comp.isEnd ? 48 : undefined),
      height: comp.type === 'subgraph' ? 70 : (comp.isStart || comp.isEnd ? 48 : undefined)
    };
    // 设置当前图表类型（只有画布为空时才设置，避免混合使用时被覆盖）
    if (state.nodes.length === 0) {
      state.diagramType = comp.category === 'state' ? 'state' : 'flowchart';
    }
    state.nodes.push(node);
    renderNode(node);
    selectNode(node);
    saveHistory();
    updatePreview();
    return node;
  }

  function renderNode(node) {
    let el = document.getElementById(node.id);
    if (!el) {
      el = document.createElement('div');
      el.id = node.id;
      el.className = 'card-node shape-' + node.shape;
      // 状态图结束节点添加特殊类
      if (node.category === 'state' && node.isEnd) {
        el.classList.add('state-end-node');
      }
      if (node.type === 'subgraph') {
        el.innerHTML = `
          <div class="subgraph-container">
            <div class="subgraph-title"></div>
            <div class="subgraph-body">
              <div class="subgraph-hint">与子图链接会被包含</div>
            </div>
          </div>
          <div class="node-port port-in" data-port="in"></div>
          <div class="node-port port-out" data-port="out"></div>
          <div class="node-actions">
            <button class="node-action-btn btn-copy" title="复制">⧉</button>
            <button class="node-action-btn btn-delete" title="删除">×</button>
          </div>
        `;
      } else {
        el.innerHTML = `
          <div class="node-shape">
            <div class="node-text"></div>
          </div>
          <div class="node-port port-in" data-port="in"></div>
          <div class="node-port port-out" data-port="out"></div>
          <div class="node-actions">
            <button class="node-action-btn btn-copy" title="复制">⧉</button>
            <button class="node-action-btn btn-delete" title="删除">×</button>
          </div>
        `;
      }
      nodesLayer.appendChild(el);
      bindNodeEvents(el, node);
    }
    el.style.left = node.x + 'px';
    el.style.top = node.y + 'px';
    if (node.width) el.style.width = node.width + 'px';
    if (node.height) el.style.height = node.height + 'px';
    // 普通状态节点设置最小宽度，避免文字被截断
    if (node.category === 'state' && !node.isStart && !node.isEnd) {
      if (node.shape === 'diamond') {
        // 菱形设置相等宽高，避免被压扁
        if (!node.width) {
          el.style.width = '80px';
          el.style.height = '80px';
        }
      } else {
        if (!node.width) el.style.minWidth = '90px';
        if (!node.height) el.style.minHeight = '44px';
      }
    }
    const titleEl = el.querySelector('.subgraph-title');
    if (titleEl) titleEl.textContent = node.text;
    const textEl = el.querySelector('.node-text');
    if (textEl) {
      // 状态图开始/结束不显示文字（它们是 [*]）
      if (node.category === 'state' && (node.isStart || node.isEnd)) {
        textEl.textContent = '';
        textEl.style.display = 'none';
      } else {
        textEl.textContent = node.text;
        textEl.style.display = '';
      }
    }
  }

  function bindNodeEvents(el, node) {
    // 拖拽移动
    el.addEventListener('mousedown', e => {
      if (e.target.classList.contains('node-port')) return;
      if (e.target.closest('.node-actions')) return;
      e.preventDefault();
      state.isDraggingNode = true;
      state.dragNode = node;
      const rect = el.getBoundingClientRect();
      state.dragOffset.x = e.clientX - rect.left;
      state.dragOffset.y = e.clientY - rect.top;
      selectNode(node);
    });

    // 点击选中并读入文本到顶部输入框
    el.addEventListener('click', e => {
      if (e.target.classList.contains('node-port')) return;
      selectNode(node);
      const textInput = document.getElementById('cardNodeTextInput');
      if (textInput) {
        textInput.value = node.text;
        textInput.focus();
      }
    });

    // 右键弹出菜单更换类型（子图容器除外）
    el.addEventListener('contextmenu', e => {
      if (node.type === 'subgraph') return;
      e.preventDefault();
      e.stopPropagation();
      showNodeTypeMenu(node, e.clientX, e.clientY);
    });

    // 输出点开始连线
    el.querySelector('.port-out').addEventListener('mousedown', e => {
      e.stopPropagation();
      e.preventDefault();
      state.isConnecting = true;
      state.connectFrom = node;
      const rect = canvas.getBoundingClientRect();
      const portRect = e.target.getBoundingClientRect();
      const startX = portRect.left - rect.left + 5;
      const startY = portRect.top - rect.top + 5;
      state.tempLine = createTempLine(startX, startY);
    });

    // 输入点结束连线
    el.querySelector('.port-in').addEventListener('mouseup', e => {
      if (state.isConnecting && state.connectFrom && state.connectFrom.id !== node.id) {
        addEdge(state.connectFrom.id, node.id);
      }
    });

    // 复制按钮
    el.querySelector('.btn-copy').addEventListener('click', e => {
      e.stopPropagation();
      copyNode(node);
    });

    // 删除按钮
    el.querySelector('.btn-delete').addEventListener('click', e => {
      e.stopPropagation();
      deleteNode(node);
    });
  }

  function copyNode(node) {
    const newNode = addNode(node.type, node.x + 30, node.y + 30);
    newNode.text = node.text;
    newNode.mermaidFmt = node.mermaidFmt;
    renderNode(newNode);
    saveHistory();
    updatePreview();
  }

  function deleteNode(node) {
    state.nodes = state.nodes.filter(n => n.id !== node.id);
    state.edges = state.edges.filter(e => e.from !== node.id && e.to !== node.id);
    const el = document.getElementById(node.id);
    if (el) el.remove();
    if (state.selectedNode === node) state.selectedNode = null;
    state.selectedNodes = state.selectedNodes.filter(n => n.id !== node.id);
    renderEdges();
    saveHistory();
    updatePreview();
  }

  function selectNode(node, additive) {
    if (!additive) {
      deselectAll();
    }
    state.selectedNode = node;
    if (!state.selectedNodes.includes(node)) {
      state.selectedNodes.push(node);
    }
    const el = document.getElementById(node.id);
    if (el) el.classList.add('selected');
  }

  function deselectAll() {
    state.selectedNode = null;
    state.selectedNodes = [];
    document.querySelectorAll('.card-node.selected').forEach(el => el.classList.remove('selected'));
  }

  // ===== 连线操作 =====
  function addEdge(fromId, toId) {
    // 防重复
    if (state.edges.some(e => e.from === fromId && e.to === toId)) return;
    const id = 'e' + (++state.edgeIdCounter);
    state.edges.push({ id, from: fromId, to: toId, label: '' });
    renderEdges();
    saveHistory();
    updatePreview();
  }

  function renderEdges() {
    // 清除旧的连线（保留 defs）
    const defs = edgesLayer.querySelector('defs');
    edgesLayer.innerHTML = '';
    if (defs) edgesLayer.appendChild(defs);

    state.edges.forEach(edge => {
      const fromNode = state.nodes.find(n => n.id === edge.from);
      const toNode = state.nodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) return;

      const fromEl = document.getElementById(fromNode.id);
      const toEl = document.getElementById(toNode.id);
      if (!fromEl || !toEl) return;

      const rect = canvas.getBoundingClientRect();
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      const x1 = fromRect.right - rect.left;
      const y1 = fromRect.top - rect.top + fromRect.height / 2;
      const x2 = toRect.left - rect.left;
      const y2 = toRect.top - rect.top + toRect.height / 2;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('data-edge-id', edge.id);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const midX = (x1 + x2) / 2;
      path.setAttribute('d', `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
      path.style.pointerEvents = 'none';
      path.style.strokeWidth = '1.5';
      path.style.stroke = '#555';
      path.style.fill = 'none';
      g.appendChild(path);

      // 连线标签
      if (edge.label) {
        const labelX = (x1 + x2) / 2;
        const labelY = (y1 + y2) / 2 - 14;
        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        const textWidth = edge.label.length * 12 + 12;
        bgRect.setAttribute('x', labelX - textWidth / 2);
        bgRect.setAttribute('y', labelY - 10);
        bgRect.setAttribute('width', textWidth);
        bgRect.setAttribute('height', 20);
        bgRect.setAttribute('rx', 3);
        bgRect.setAttribute('fill', '#fff');
        bgRect.setAttribute('stroke', '#999');
        bgRect.setAttribute('stroke-width', '1');
        g.appendChild(bgRect);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', labelX);
        text.setAttribute('y', labelY + 4);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '12');
        text.setAttribute('fill', '#333');
        text.textContent = edge.label;
        g.appendChild(text);
      }

      // 中间锚点：点击编辑标签
      const anchorX = (x1 + x2) / 2;
      const anchorY = (y1 + y2) / 2;
      const anchor = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      anchor.setAttribute('cx', anchorX);
      anchor.setAttribute('cy', anchorY);
      anchor.setAttribute('r', '8');
      anchor.setAttribute('fill', '#fff');
      anchor.setAttribute('stroke', '#888');
      anchor.setAttribute('stroke-width', '2');
      anchor.style.cursor = 'pointer';
      anchor.style.pointerEvents = 'all';
      anchor.addEventListener('mouseenter', () => {
        anchor.setAttribute('fill', '#4a6cf7');
        anchor.setAttribute('stroke', '#4a6cf7');
      });
      anchor.addEventListener('mouseleave', () => {
        anchor.setAttribute('fill', '#fff');
        anchor.setAttribute('stroke', '#888');
      });
      anchor.addEventListener('click', (e) => {
        e.stopPropagation();
        openEdgeEditModal(edge);
      });
      g.appendChild(anchor);

      // 起点端点：拖拽 = 从该节点新增连线
      const startDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      startDot.setAttribute('cx', x1);
      startDot.setAttribute('cy', y1);
      startDot.setAttribute('r', '7');
      startDot.setAttribute('fill', '#4a6cf7');
      startDot.setAttribute('stroke', '#fff');
      startDot.setAttribute('stroke-width', '2');
      startDot.style.cursor = 'crosshair';
      startDot.style.pointerEvents = 'all';
      startDot.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startNewEdgeDrag(fromNode.id, e);
      });
      g.appendChild(startDot);

      // 末端端点：拖拽到其他节点更改连线，拖到空白删除
      const endDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      endDot.setAttribute('cx', x2);
      endDot.setAttribute('cy', y2);
      endDot.setAttribute('r', '9');
      endDot.setAttribute('fill', '#e74c3c');
      endDot.setAttribute('stroke', '#fff');
      endDot.setAttribute('stroke-width', '2');
      endDot.style.cursor = 'grab';
      endDot.style.pointerEvents = 'all';
      endDot.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startEdgeDeleteDrag(edge, e);
      });
      g.appendChild(endDot);



      edgesLayer.appendChild(g);
    });
  }

  // ===== 起点端点：新增连线拖拽 =====
  let newEdgeDragState = null;

  function startNewEdgeDrag(fromNodeId, e) {
    newEdgeDragState = { fromNodeId, startX: e.clientX, startY: e.clientY };
    const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.id = 'new-edge-temp';
    tempPath.setAttribute('stroke', '#4a6cf7');
    tempPath.setAttribute('stroke-width', '2');
    tempPath.setAttribute('stroke-dasharray', '6,3');
    tempPath.setAttribute('fill', 'none');
    edgesLayer.appendChild(tempPath);
  }

  // ===== 末端端点：删除连线拖拽 =====
  let deleteEdgeDragState = null;

  function startEdgeDeleteDrag(edge, e) {
    deleteEdgeDragState = { edge, startX: e.clientX, startY: e.clientY, moved: false };
    const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.id = 'delete-edge-temp';
    tempPath.setAttribute('stroke', '#e74c3c');
    tempPath.setAttribute('stroke-width', '2');
    tempPath.setAttribute('stroke-dasharray', '6,3');
    tempPath.setAttribute('fill', 'none');
    edgesLayer.appendChild(tempPath);
  }

  document.addEventListener('mousemove', e => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // 新增连线拖拽
    if (newEdgeDragState) {
      const fromEl = document.getElementById(newEdgeDragState.fromNodeId);
      if (fromEl) {
        const fromRect = fromEl.getBoundingClientRect();
        const sx = fromRect.right - rect.left;
        const sy = fromRect.top - rect.top + fromRect.height / 2;
        const tempPath = document.getElementById('new-edge-temp');
        if (tempPath) {
          const midX = (sx + mx) / 2;
          tempPath.setAttribute('d', `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${my}, ${mx} ${my}`);
        }
      }
    }

    // 删除连线拖拽
    if (deleteEdgeDragState) {
      const { edge } = deleteEdgeDragState;
      if (Math.abs(e.clientX - deleteEdgeDragState.startX) > 3 || Math.abs(e.clientY - deleteEdgeDragState.startY) > 3) {
        deleteEdgeDragState.moved = true;
      }
      const fromNode = state.nodes.find(n => n.id === edge.from);
      const fromEl = fromNode ? document.getElementById(fromNode.id) : null;
      if (fromEl) {
        const fromRect = fromEl.getBoundingClientRect();
        const sx = fromRect.right - rect.left;
        const sy = fromRect.top - rect.top + fromRect.height / 2;
        const tempPath = document.getElementById('delete-edge-temp');
        if (tempPath) {
          const midX = (sx + mx) / 2;
          tempPath.setAttribute('d', `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${my}, ${mx} ${my}`);
        }
      }
    }
  });

  document.addEventListener('mouseup', e => {
    // 新增连线：释放在节点上则创建，释放空白处则显示组件菜单
    if (newEdgeDragState) {
      const tempPath = document.getElementById('new-edge-temp');
      if (tempPath) tempPath.remove();
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const targetNode = target ? target.closest('.card-node') : null;
      if (targetNode && targetNode.id !== newEdgeDragState.fromNodeId) {
        const exists = state.edges.some(ed => ed.from === newEdgeDragState.fromNodeId && ed.to === targetNode.id);
        if (!exists) {
          state.edges.push({ id: 'e' + Date.now(), from: newEdgeDragState.fromNodeId, to: targetNode.id, label: '' });
          renderEdges();
          saveHistory();
          updatePreview();
        }
      } else if (!targetNode) {
        // 释放空白处：显示组件选择菜单
        showComponentMenu(e.clientX, e.clientY, newEdgeDragState.fromNodeId);
      }
      newEdgeDragState = null;
    }

    // 末端端点拖拽：拖到其他节点更改连线，拖到空白处删除
    if (deleteEdgeDragState) {
      const tempPath = document.getElementById('delete-edge-temp');
      if (tempPath) tempPath.remove();
      if (deleteEdgeDragState.moved) {
        const edge = deleteEdgeDragState.edge;
        // 遍历节点检测鼠标位置（SVG在上层，elementFromPoint不可靠）
        let targetNode = null;
        state.nodes.forEach(node => {
          const el = document.getElementById(node.id);
          if (el) {
            const r = el.getBoundingClientRect();
            if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
              targetNode = node;
            }
          }
        });
        if (targetNode && targetNode.id !== edge.from) {
          // 拖到其他节点：更改连线目标
          const exists = state.edges.some(ed => ed.from === edge.from && ed.to === targetNode.id && ed.id !== edge.id);
          if (!exists) {
            edge.to = targetNode.id;
            renderEdges();
            saveHistory();
            updatePreview();
          }
        } else if (!targetNode) {
          // 拖到空白处：删除连线
          state.edges = state.edges.filter(ed => ed.id !== edge.id);
          renderEdges();
          saveHistory();
          updatePreview();
        }
      }
      deleteEdgeDragState = null;
    }
  });

  // ===== 连线标签编辑弹窗 =====
  function openEdgeEditModal(edge) {
    const modal = document.createElement('div');
    modal.className = 'card-edit-modal';
    modal.innerHTML = '<div class="modal-box">' +
      '<div class="modal-title">编辑连线标签</div>' +
      '<div class="form-group">' +
      '<label>标签文字（留空则不显示）</label>' +
      '<input type="text" id="editEdgeLabel" value="' + (edge.label || '') + '" placeholder="例如：是 / 否 / 完成">' +
      '</div>' +
      '<div class="modal-actions">' +
      '<button id="edgeEditCancel">取消</button>' +
      '<button class="btn-primary" id="edgeEditSave">保存</button>' +
      '</div></div>';
    document.body.appendChild(modal);

    modal.querySelector('#edgeEditCancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    modal.querySelector('#edgeEditSave').addEventListener('click', () => {
      edge.label = modal.querySelector('#editEdgeLabel').value.trim();
      renderEdges();
      saveHistory();
      updatePreview();
      modal.remove();
    });

    modal.querySelector('#editEdgeLabel').focus();
    modal.querySelector('#editEdgeLabel').addEventListener('keydown', e => {
      if (e.key === 'Enter') modal.querySelector('#edgeEditSave').click();
    });
  }

  function createTempLine(x, y) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('edge-temp');
    path.setAttribute('d', `M ${x} ${y} L ${x} ${y}`);
    edgesLayer.appendChild(path);
    return path;
  }

  // ===== 鼠标事件 =====
  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();

    // 框选
    if (state.isSelecting && state.selectionBox) {
      const curX = e.clientX - rect.left;
      const curY = e.clientY - rect.top;
      const x = Math.min(state.selectStart.x, curX);
      const y = Math.min(state.selectStart.y, curY);
      const w = Math.abs(curX - state.selectStart.x);
      const h = Math.abs(curY - state.selectStart.y);
      state.selectionBox.style.left = x + 'px';
      state.selectionBox.style.top = y + 'px';
      state.selectionBox.style.width = w + 'px';
      state.selectionBox.style.height = h + 'px';
      return;
    }

    // 拖拽节点（支持批量移动）
    if (state.isDraggingNode && state.dragNode) {
      const x = e.clientX - rect.left - state.dragOffset.x;
      const y = e.clientY - rect.top - state.dragOffset.y;
      const dx = x - state.dragNode.x;
      const dy = y - state.dragNode.y;
      // 移动所有选中的节点
      state.selectedNodes.forEach(n => {
        n.x = Math.max(0, n.x + dx);
        n.y = Math.max(0, n.y + dy);
        const nel = document.getElementById(n.id);
        if (nel) {
          nel.style.left = n.x + 'px';
          nel.style.top = n.y + 'px';
        }
      });
      renderEdges();
      return;
    }

    // 连线中
    if (state.isConnecting && state.tempLine) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const startD = state.tempLine.getAttribute('d').split(' C ')[0];
      const [sx, sy] = startD.replace('M ', '').split(' ').map(Number);
      const midX = (sx + x) / 2;
      state.tempLine.setAttribute('d', `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${y}, ${x} ${y}`);
    }
  }

  function onMouseUp(e) {
    // 框选结束
    if (state.isSelecting && state.selectionBox) {
      const boxRect = state.selectionBox.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const boxX = boxRect.left - canvasRect.left;
      const boxY = boxRect.top - canvasRect.top;
      const boxW = boxRect.width;
      const boxH = boxRect.height;
      // 选中框内的节点
      if (boxW > 5 || boxH > 5) {
        state.nodes.forEach(node => {
          const el = document.getElementById(node.id);
          if (el) {
            const nodeRect = el.getBoundingClientRect();
            const nx = nodeRect.left - canvasRect.left;
            const ny = nodeRect.top - canvasRect.top;
            const nw = nodeRect.width;
            const nh = nodeRect.height;
            // 节点中心在框内
            const cx = nx + nw / 2;
            const cy = ny + nh / 2;
            if (cx >= boxX && cx <= boxX + boxW && cy >= boxY && cy <= boxY + boxH) {
              selectNode(node, true);
            }
          }
        });
      }
      state.selectionBox.remove();
      state.selectionBox = null;
      state.isSelecting = false;
      saveHistory();
      return;
    }

    if (state.isDraggingNode) {
      state.isDraggingNode = false;
      state.dragNode = null;
      updatePreview();
      saveHistory();
    }
    if (state.isConnecting) {
      const fromNodeId = state.connectFrom ? state.connectFrom.id : null;
      state.isConnecting = false;
      state.connectFrom = null;
      if (state.tempLine) {
        state.tempLine.remove();
        state.tempLine = null;
      }
      // 检查是否释放在节点上（扩大判定范围，节点任意位置都可以）
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const nodeEl = target ? target.closest('.card-node') : null;
      if (nodeEl && fromNodeId && nodeEl.id !== fromNodeId) {
        // 释放在节点上：创建连线
        const exists = state.edges.some(ed => ed.from === fromNodeId && ed.to === nodeEl.id);
        if (!exists) {
          state.edges.push({ id: 'e' + (++state.edgeIdCounter), from: fromNodeId, to: nodeEl.id, label: '' });
          renderEdges();
          saveHistory();
          updatePreview();
        }
      } else if (!nodeEl && fromNodeId) {
        // 释放空白处：显示组件选择菜单
        showComponentMenu(e.clientX, e.clientY, fromNodeId);
      }
    }
  }

  // ===== 编辑弹窗 =====
  // ===== 右键更换节点类型菜单 =====
  function showNodeTypeMenu(node, x, y) {
    const oldMenu = document.getElementById('nodeTypeMenu');
    if (oldMenu) oldMenu.remove();

    const menu = document.createElement('div');
    menu.id = 'nodeTypeMenu';
    menu.style.cssText = 'position:fixed;left:' + x + 'px;top:' + y + 'px;background:#2a2a2a;border:1px solid #444;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.5);z-index:10000;min-width:140px;max-height:300px;overflow-y:auto;';

    const types = [
      { shape: 'rect', label: '矩形' },
      { shape: 'stadium', label: '圆角矩形' },
      { shape: 'diamond', label: '菱形/判断' },
      { shape: 'parallelogram', label: '平行四边形' },
      { shape: 'subroutine', label: '子程序' },
      { shape: 'database', label: '数据库' },
      { shape: 'circle', label: '圆形' },
      { shape: 'hexagon', label: '六边形' },
      { shape: 'trapezoid', label: '梯形' },
      { shape: 'subgraph', label: '子图容器' }
    ];

    types.forEach(t => {
      const item = document.createElement('div');
      item.style.cssText = 'padding:8px 12px;cursor:pointer;font-size:12px;color:#e0e0e0;display:flex;align-items:center;gap:8px;';
      item.innerHTML = '<span style="width:20px;height:14px;display:inline-flex;align-items:center;justify-content:center;">' + getShapeSVG(t.shape) + '</span><span>' + t.label + '</span>';
      if (node.shape === t.shape) {
        item.style.background = '#3a3a3a';
        item.style.color = '#4a6cf7';
      }
      item.addEventListener('mouseenter', () => { item.style.background = '#3a3a3a'; });
      item.addEventListener('mouseleave', () => { if (node.shape !== t.shape) item.style.background = 'transparent'; });
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        node.shape = t.shape;
        const fmts = { rect: '[text]', stadium: '([text])', diamond: '{text}', parallelogram: '[/text/]', subroutine: '[[text]]', database: '[(text)]', circle: '((text))', hexagon: '{{text}}', trapezoid: '[//text//]', subgraph: 'subgraph' };
        node.mermaidFmt = fmts[t.shape] || '[text]';
        // 重新渲染整个节点（不同形状内部结构不同）
        const oldEl = document.getElementById(node.id);
        if (oldEl) {
          const parent = oldEl.parentNode;
          oldEl.remove();
          const newEl = renderNode(node);
          parent.appendChild(newEl);
        }
        renderEdges();
        saveHistory();
        updatePreview();
        menu.remove();
      });
      menu.appendChild(item);
    });

    // 删除选项
    const delItem = document.createElement('div');
    delItem.style.cssText = 'padding:8px 12px;cursor:pointer;font-size:12px;color:#ff6b6b;border-top:1px solid #444;';
    delItem.textContent = '🗑️ 删除节点';
    delItem.addEventListener('mouseenter', () => { delItem.style.background = '#3a2a2a'; });
    delItem.addEventListener('mouseleave', () => { delItem.style.background = 'transparent'; });
    delItem.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteNode(node.id);
      menu.remove();
    });
    menu.appendChild(delItem);

    document.body.appendChild(menu);

    setTimeout(() => {
      document.addEventListener('click', function closeMenu() {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      });
    }, 10);
  }

  function openEditModal(node) {
    const modal = document.createElement('div');
    modal.className = 'card-edit-modal';
    modal.innerHTML = `
      <div class="modal-box">
        <div class="modal-title">编辑节点</div>
        <div class="form-group">
          <label>节点文字</label>
          <textarea id="editNodeText">${node.text}</textarea>
        </div>
        <div class="form-group">
          <label>节点形状</label>
          <select id="editNodeShape">
            <option value="stadium" ${node.shape === 'stadium' ? 'selected' : ''}>体育场形（开始/结束）</option>
            <option value="rect" ${node.shape === 'rect' ? 'selected' : ''}>矩形（处理）</option>
            <option value="diamond" ${node.shape === 'diamond' ? 'selected' : ''}>菱形（判断）</option>
            <option value="parallelogram" ${node.shape === 'parallelogram' ? 'selected' : ''}>平行四边形（输入输出）</option>
            <option value="subroutine" ${node.shape === 'subroutine' ? 'selected' : ''}>双边框（子程序）</option>
            <option value="database" ${node.shape === 'database' ? 'selected' : ''}>圆柱形（数据库）</option>
            <option value="circle" ${node.shape === 'circle' ? 'selected' : ''}>圆形</option>
            <option value="hexagon" ${node.shape === 'hexagon' ? 'selected' : ''}>六边形</option>
            <option value="trapezoid" ${node.shape === 'trapezoid' ? 'selected' : ''}>梯形</option>
            <option value="subgraph" ${node.shape === 'subgraph' ? 'selected' : ''}>子图容器</option>
          </select>
        </div>
        <div class="modal-actions">
          <button id="editCancel">取消</button>
          <button class="btn-primary" id="editSave">保存</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#editCancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    modal.querySelector('#editSave').addEventListener('click', () => {
      node.text = modal.querySelector('#editNodeText').value || '未命名';
      node.shape = modal.querySelector('#editNodeShape').value;
      // 更新 mermaid 格式
      const fmts = { rect: '[text]', stadium: '([text])', diamond: '{text}', parallelogram: '[/text/]', subroutine: '[[text]]', database: '[(text)]', circle: '((text))', hexagon: '{{text}}', trapezoid: '[//text//]', subgraph: 'subgraph' };
      node.mermaidFmt = fmts[node.shape] || '[text]';
      const el = document.getElementById(node.id);
      if (el) {
        el.className = 'card-node shape-' + node.shape;
        el.querySelector('.node-text').textContent = node.text;
      }
      renderEdges();
      saveHistory();
      updatePreview();
      modal.remove();
    });

    const textarea = modal.querySelector('#editNodeText');
    textarea.focus();
    // Enter 确认保存，Shift+Enter 换行
    textarea.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        modal.querySelector('#editSave').click();
      }
    });
  }

  // ===== 生成状态图代码 =====
  function generateStateDiagramCode() {
    let code = 'stateDiagram-v2\n';
    // 节点定义（开始/结束用 [*]，不需要定义）
    state.nodes.forEach(node => {
      if (node.isStart || node.isEnd) return;
      const fmt = node.mermaidFmt || 'text';
      // 确保文字不为空，空文字会导致节点显示ID
      let text = (node.text && node.text.trim()) ? node.text.trim() : '状态';
      // 转义引号
      text = text.replace(/"/g, '\"');
      // 所有状态节点统一用 state "名称" as id，确保显示文字
      // （choice/fork/join 的 <<stereotype>> 会导致 Mermaid 渲染成无文字的菱形/横条）
      code += '  state "' + text + '" as ' + node.id + '\n';
    });
    // 连线（开始/结束用 [*] 代替节点ID）
    state.edges.forEach(edge => {
      const fromNode = state.nodes.find(n => n.id === edge.from);
      const toNode = state.nodes.find(n => n.id === edge.to);
      const fromId = (fromNode && (fromNode.isStart || fromNode.isEnd)) ? '[*]' : edge.from;
      const toId = (toNode && (toNode.isStart || toNode.isEnd)) ? '[*]' : edge.to;
      if (edge.label) {
        code += '  ' + fromId + ' --> ' + toId + ' : ' + edge.label + '\n';
      } else {
        code += '  ' + fromId + ' --> ' + toId + '\n';
      }
    });
    return code;
  }

  // ===== 生成 Mermaid 代码 =====
  function generateMermaidCode() {
    if (state.nodes.length === 0) return '';

    // 状态图生成
    if (state.diagramType === 'state') {
      return generateStateDiagramCode();
    }

    let code = 'flowchart ' + state.layoutDirection + '\n';

    // 找出所有 subgraph 节点和归属关系（双向：节点→子图 或 子图→节点 都表示包含）
    const subgraphNodes = state.nodes.filter(n => n.type === 'subgraph');
    const nodeToSubgraph = {};
    state.edges.forEach(edge => {
      const fromNode = state.nodes.find(n => n.id === edge.from);
      const toNode = state.nodes.find(n => n.id === edge.to);
      // 节点 → 子图：节点被包含
      if (toNode && toNode.type === 'subgraph' && fromNode && fromNode.type !== 'subgraph') {
        nodeToSubgraph[edge.from] = edge.to;
      }
      // 子图 → 节点：节点被包含
      if (fromNode && fromNode.type === 'subgraph' && toNode && toNode.type !== 'subgraph') {
        nodeToSubgraph[edge.to] = edge.from;
      }
    });

    // 普通节点定义（不属于任何 subgraph 的）
    state.nodes.forEach(node => {
      if (node.type === 'subgraph') return;
      if (nodeToSubgraph[node.id]) return;
      let fmt = node.mermaidFmt || '[text]';
      // 兼容状态图节点：mermaidFmt='text' 时用矩形
      if (fmt === 'text' || !fmt.includes('text')) {
        fmt = '[text]';
      }
      const text = escapeMermaidText(node.text);
      const nodeDef = fmt.replace('text', text);
      code += `  ${node.id}${nodeDef}\n`;
    });

    // subgraph 定义（包含归属节点，双向收集）
    subgraphNodes.forEach(sg => {
      const sgText = escapeMermaidText(sg.text);
      code += `  subgraph ${sg.id} ["${sgText}"]\n`;
      // 收集所有归属到这个 subgraph 的节点
      const childIds = Object.keys(nodeToSubgraph).filter(nid => nodeToSubgraph[nid] === sg.id);
      childIds.forEach(nid => {
        const childNode = state.nodes.find(n => n.id === nid);
        if (childNode && childNode.type !== 'subgraph') {
          const fmt = childNode.mermaidFmt || '[text]';
          const text = escapeMermaidText(childNode.text);
          const nodeDef = fmt.replace('text', text);
          code += `    ${childNode.id}${nodeDef}\n`;
        }
      });
      code += `  end\n`;
    });

    // 连线（排除涉及 subgraph 的连线，归属关系已通过 subgraph 语法表达）
    state.edges.forEach(edge => {
      const fromNode = state.nodes.find(n => n.id === edge.from);
      const toNode = state.nodes.find(n => n.id === edge.to);
      // 排除涉及 subgraph 的连线（双向）
      if ((fromNode && fromNode.type === 'subgraph') || (toNode && toNode.type === 'subgraph')) return;
      if (edge.label) {
        code += `  ${edge.from} -->|${edge.label}| ${edge.to}\n`;
      } else {
        code += `  ${edge.from} --> ${edge.to}\n`;
      }
    });

    return code;
  }

  function escapeMermaidText(text) {
    // 转义特殊字符
    return text.replace(/"/g, '#quot;').replace(/\n/g, '<br/>');
  }

  // ===== 更新预览 =====
  function updatePreview() {
    // 触发自定义事件，让 app.js 监听并更新预览
    const code = generateMermaidCode();
    const event = new CustomEvent('card-editor-change', { detail: { code } });
    document.dispatchEvent(event);
  }

  // ===== 视图切换 =====
  function bindViewToggle() {
    if (!btnCardView || !btnTextView) return;

    btnCardView.addEventListener('click', () => switchView('card'));
    btnTextView.addEventListener('click', () => switchView('text'));
  }

  function switchView(target) {
    const isCard = !editorPane.classList.contains('text-view');
    if ((target === 'card' && isCard) || (target === 'text' && !isCard)) return;

    // 检查是否需要提醒：永久不再提醒 或 今天已提醒过
    const neverRemind = localStorage.getItem('viewSwitch_neverRemind') === '1';
    const today = new Date().toDateString();
    const lastRemindDay = localStorage.getItem('viewSwitch_lastRemindDay');
    if (neverRemind || lastRemindDay === today) {
      // 直接切换，不弹窗
      doSwitchView(target);
      return;
    }

    // 弹出确认
    showSwitchConfirm(target, () => {
      doSwitchView(target);
    });
  }

  function doSwitchView(target) {
    if (target === 'text') {
      editorPane.classList.add('text-view');
      btnCardView.classList.remove('active');
      btnTextView.classList.add('active');
      // 把卡片生成的代码写入 textarea（仅作为参考，用户可以自由编辑）
      const code = generateMermaidCode();
      if (code && window.CodeMirrorEditor) {
        // 尝试设置到 CodeMirror
        const textarea = document.getElementById('codeEditor');
        if (textarea && textarea.CodeMirror) {
          textarea.CodeMirror.setValue(code);
        } else {
          textarea.value = code;
        }
      }
    } else {
      editorPane.classList.remove('text-view');
      btnTextView.classList.remove('active');
      btnCardView.classList.add('active');
    }
    // 切换工具栏：电池块视图显示文本输入框，代码视图显示 A+A-
    const fontSizeCtl = document.querySelector('.font-size-ctl');
    const cardTextCtl = document.getElementById('cardTextCtl');
    if (fontSizeCtl && cardTextCtl) {
      if (target === 'text') {
        fontSizeCtl.style.display = '';
        cardTextCtl.style.display = 'none';
      } else {
        fontSizeCtl.style.display = 'none';
        cardTextCtl.style.display = '';
      }
    }
    // 触发预览更新
    setTimeout(() => {
      const event = new CustomEvent('view-switched', { detail: { view: target } });
      document.dispatchEvent(event);
    }, 50);
  }

  function showSwitchConfirm(target, onConfirm) {
    const targetName = target === 'text' ? '原始Mermaid文本视图' : '电池卡片视图';
    const modal = document.createElement('div');
    modal.className = 'view-switch-confirm';
    modal.innerHTML = `
      <div class="confirm-box">
        <div class="confirm-title">切换视图确认</div>
        <div class="confirm-desc">
          两套系统相互独立，切换到<strong>${targetName}</strong>后，当前视图的内容不会自动同步。<br><br>
          你还有未保存的内容，确定要切换吗？
        </div>
        <label class="confirm-checkbox">
          <input type="checkbox" id="switchNeverRemind">
          <span>以后不再提醒</span>
        </label>
        <div class="confirm-actions">
          <button id="switchCancel">取消</button>
          <button class="btn-primary" id="switchConfirm">确定切换</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#switchCancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    modal.querySelector('#switchConfirm').addEventListener('click', () => {
      // 记录今天已提醒过（一天只提醒一次）
      localStorage.setItem('viewSwitch_lastRemindDay', new Date().toDateString());
      // 如果勾选了"以后不再提醒"
      if (modal.querySelector('#switchNeverRemind').checked) {
        localStorage.setItem('viewSwitch_neverRemind', '1');
      }
      modal.remove();
      onConfirm();
    });
  }

  // ===== 历史记录 =====
  function saveHistory() {
    const snapshot = JSON.stringify({ nodes: state.nodes, edges: state.edges, layoutDirection: state.layoutDirection });
    // 撤销后再操作，截断后面的历史
    if (state.historyIndex < state.history.length - 1) {
      state.history = state.history.slice(0, state.historyIndex + 1);
    }
    state.history.push(snapshot);
    state.historyIndex = state.history.length - 1;
    // 最多保存50条
    if (state.history.length > 50) {
      state.history.shift();
      state.historyIndex--;
    }
  }

  function restoreHistory(index) {
    if (index < 0 || index >= state.history.length) return;
    const snapshot = JSON.parse(state.history[index]);
    state.nodes = snapshot.nodes;
    state.edges = snapshot.edges;
    state.layoutDirection = snapshot.layoutDirection;
    state.historyIndex = index;
    // 重新渲染所有节点
    nodesLayer.innerHTML = '';
    state.nodes.forEach(node => renderNode(node));
    renderEdges();
    // 更新方向按钮
    document.querySelectorAll('.dir-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.dir === state.layoutDirection);
    });
    deselectAll();
    updatePreview();
  }

  function showHistoryModal() {
    if (state.history.length === 0) {
      alert('暂无历史记录');
      return;
    }
    const modal = document.createElement('div');
    modal.className = 'card-edit-modal';
    let listHtml = '';
    state.history.forEach((snap, i) => {
      const data = JSON.parse(snap);
      const label = '记录 ' + (i + 1) + ' - ' + data.nodes.length + '个节点, ' + data.edges.length + '条连线';
      const active = i === state.historyIndex ? ' style="background:#e8f0fe;font-weight:600;"' : '';
      listHtml += '<div class="history-item" data-index="' + i + '"' + active + ' style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #eee;font-size:13px;">' + label + '</div>';
    });
    modal.innerHTML = '<div class="modal-box" style="max-height:400px;overflow-y:auto;"><div class="modal-title">历史记录（共' + state.history.length + '条）</div>' + listHtml + '<div class="modal-actions"><button id="histClose">关闭</button></div></div>';
    document.body.appendChild(modal);
    modal.querySelector('#histClose').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    modal.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        restoreHistory(parseInt(item.dataset.index));
        modal.remove();
      });
    });
  }

  // ===== 格式化代码 =====
  function formatCode() {
    // 重新生成代码就是格式化的
    const code = generateMermaidCode();
    // 触发事件让外部知道代码变了
    const event = new CustomEvent('card-editor-change', { detail: { code } });
    document.dispatchEvent(event);
    alert('代码已格式化');
  }

  // ===== 清空所有节点 =====
  function clearAll() {
    if (confirm('确定要清空所有节点和连线吗？')) {
      state.nodes = [];
      state.edges = [];
      state.selectedNodes = [];
      state.selectedNode = null;
      state.diagramType = 'flowchart';
      nodesLayer.innerHTML = '';
      renderEdges();
      saveHistory();
      updatePreview();
    }
  }

  // ===== 拖拽到空白处的组件选择菜单 =====
  let componentMenuEl = null;

  // ===== 形状缩略图 SVG =====
  function getShapeThumbSVG(shape) {
    const w = 24, h = 16;
    const svg = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">';
    let inner = '';
    switch(shape) {
      case 'stadium':
        inner = '<rect x="1" y="3" width="22" height="10" rx="5" fill="none" stroke="#aaa" stroke-width="1.2"/>';
        break;
      case 'rect':
        inner = '<rect x="2" y="3" width="20" height="10" fill="none" stroke="#aaa" stroke-width="1.2"/>';
        break;
      case 'diamond':
        inner = '<polygon points="12,2 22,8 12,14 2,8" fill="none" stroke="#aaa" stroke-width="1.2"/>';
        break;
      case 'parallelogram':
        inner = '<polygon points="6,3 22,3 18,13 2,13" fill="none" stroke="#aaa" stroke-width="1.2"/>';
        break;
      case 'subroutine':
        inner = '<rect x="2" y="3" width="20" height="10" fill="none" stroke="#aaa" stroke-width="1.2"/><line x1="5" y1="3" x2="5" y2="13" stroke="#aaa" stroke-width="1.2"/><line x1="19" y1="3" x2="19" y2="13" stroke="#aaa" stroke-width="1.2"/>';
        break;
      case 'database':
        inner = '<ellipse cx="12" cy="4" rx="9" ry="2.5" fill="none" stroke="#aaa" stroke-width="1.2"/><path d="M3,4 L3,12 M21,4 L21,12" stroke="#aaa" stroke-width="1.2"/><ellipse cx="12" cy="12" rx="9" ry="2.5" fill="none" stroke="#aaa" stroke-width="1.2"/>';
        break;
      case 'circle':
        inner = '<circle cx="12" cy="8" r="6" fill="none" stroke="#aaa" stroke-width="1.2"/>';
        break;
      case 'hexagon':
        inner = '<polygon points="7,2 17,2 22,8 17,14 7,14 2,8" fill="none" stroke="#aaa" stroke-width="1.2"/>';
        break;
      case 'trapezoid':
        inner = '<polygon points="6,3 18,3 22,13 2,13" fill="none" stroke="#aaa" stroke-width="1.2"/>';
        break;
      default:
        inner = '<rect x="2" y="3" width="20" height="10" fill="none" stroke="#aaa" stroke-width="1.2"/>';
    }
    return svg + inner + '</svg>';
  }

  function showComponentMenu(clientX, clientY, fromNodeId) {
    if (componentMenuEl) componentMenuEl.remove();

    const menu = document.createElement('div');
    menu.className = 'card-component-menu';
    menu.style.left = clientX + 'px';
    menu.style.top = clientY + 'px';

    const title = document.createElement('div');
    title.className = 'menu-title';
    title.textContent = '添加组件';
    menu.appendChild(title);

    COMPONENTS.forEach(comp => {
      const item = document.createElement('div');
      item.className = 'menu-item';
      // 形状缩略图
      const thumb = document.createElement('span');
      thumb.className = 'menu-thumb';
      thumb.innerHTML = getShapeThumbSVG(comp.shape);
      item.appendChild(thumb);
      // 文字
      const label = document.createElement('span');
      label.className = 'menu-label';
      label.textContent = comp.label;
      item.appendChild(label);
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const canvasRect = canvas.getBoundingClientRect();
        const x = clientX - canvasRect.left - 40;
        const y = clientY - canvasRect.top - 15;
        const newNode = addNode(comp.type, Math.max(10, x), Math.max(10, y));
        // 自动连线
        state.edges.push({ id: 'e' + (++state.edgeIdCounter), from: fromNodeId, to: newNode.id, label: '' });
        renderEdges();
        saveHistory();
        updatePreview();
        menu.remove();
        componentMenuEl = null;
      });
      menu.appendChild(item);
    });

    document.body.appendChild(menu);
    componentMenuEl = menu;

    setTimeout(() => {
      document.addEventListener('click', closeComponentMenu, { once: true });
      document.addEventListener('keydown', escCloseMenu, { once: true });
    }, 50);
  }

  function closeComponentMenu(e) {
    if (componentMenuEl && e && !componentMenuEl.contains(e.target)) {
      componentMenuEl.remove();
      componentMenuEl = null;
    }
  }

  function escCloseMenu(e) {
    if (e.key === 'Escape' && componentMenuEl) {
      componentMenuEl.remove();
      componentMenuEl = null;
    }
  }

  // ===== 暴露 API =====
  window.CardEditor = {
    init,
    generateMermaidCode,
    getState: () => state,
    clear: clearAll,
    clearAll,
    formatCode,
    showHistory: showHistoryModal,
    saveHistory,
    restoreHistory,
    editEdge: openEdgeEditModal
  };

  // DOM 就绪后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
