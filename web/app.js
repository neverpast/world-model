(() => {
  "use strict";

  const data = window.WORLD_MODEL_DATA;
  const app = document.querySelector("#app");
  const mapNav = document.querySelector("#mapNav");
  const breadcrumbs = document.querySelector("#breadcrumbs");
  const searchInput = document.querySelector("#globalSearch");
  const sidebar = document.querySelector("#sidebar");
  const sidebarScrim = document.querySelector("#sidebarScrim");

  const mapColors = {
    "00": "#a9b6af",
    "01": "#77d7cb",
    "02": "#d8f06a",
    "03": "#f3b866",
    "04": "#82b7ef",
    "05": "#ef9cb0",
    "06": "#b5a4ef",
    "07": "#75c6ef",
    "08": "#ddd0a0",
  };

  const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const slugify = (value) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/(^-|-$)/g, "");
  const colorFor = (mapId) => mapColors[mapId] || "#d8f06a";
  const modelById = (id) => data.models.find((model) => model.id === id);
  const mapById = (id) => data.maps.find((map) => map.id === id);

  function inlineMarkdown(source) {
    const codeTokens = [];
    let output = escapeHtml(source).replace(/`([^`]+)`/g, (_, code) => {
      const token = `%%CODE${codeTokens.length}%%`;
      codeTokens.push(`<code>${code}</code>`);
      return token;
    });
    output = output
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
    codeTokens.forEach((code, index) => { output = output.replace(`%%CODE${index}%%`, code); });
    return output;
  }

  function isBlockStart(lines, index) {
    const line = lines[index] || "";
    const next = lines[index + 1] || "";
    return !line.trim()
      || /^#{1,3}\s/.test(line)
      || /^```/.test(line)
      || /^>\s?/.test(line)
      || /^([-*_])(?:\s*\1){2,}\s*$/.test(line)
      || /^\s*[-*+]\s+/.test(line)
      || /^\s*\d+\.\s+/.test(line)
      || (line.trim().startsWith("|") && /^\s*\|?\s*:?-{3,}/.test(next));
  }

  function parseTableRow(line) {
    return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  }

  function markdownToHtml(markdown) {
    const lines = markdown.split(/\r?\n/);
    const html = [];
    let index = 0;

    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) { index += 1; continue; }

      if (/^```/.test(line)) {
        const language = line.slice(3).trim();
        const code = [];
        index += 1;
        while (index < lines.length && !/^```/.test(lines[index])) code.push(lines[index++]);
        index += 1;
        html.push(`<pre><code${language ? ` class="language-${escapeHtml(language)}"` : ""}>${escapeHtml(code.join("\n"))}</code></pre>`);
        continue;
      }

      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        const text = heading[2].trim();
        html.push(`<h${level} id="${escapeHtml(slugify(text.replace(/\s+\([^)]*\)$/, "")))}">${inlineMarkdown(text)}</h${level}>`);
        index += 1;
        continue;
      }

      if (line.trim().startsWith("|") && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1] || "")) {
        const headers = parseTableRow(line);
        index += 2;
        const rows = [];
        while (index < lines.length && lines[index].trim().startsWith("|")) rows.push(parseTableRow(lines[index++]));
        html.push(`<div class="table-wrap"><table><thead><tr>${headers.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
        continue;
      }

      if (/^\s*[-*+]\s+/.test(line)) {
        const items = [];
        while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
          items.push(lines[index].replace(/^\s*[-*+]\s+/, ""));
          index += 1;
        }
        html.push(`<ul>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
        continue;
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        const items = [];
        while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
          items.push(lines[index].replace(/^\s*\d+\.\s+/, ""));
          index += 1;
        }
        html.push(`<ol>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ol>`);
        continue;
      }

      if (/^>\s?/.test(line)) {
        const quote = [];
        while (index < lines.length && /^>\s?/.test(lines[index])) quote.push(lines[index++].replace(/^>\s?/, ""));
        html.push(`<blockquote>${inlineMarkdown(quote.join(" "))}</blockquote>`);
        continue;
      }

      if (/^([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
        html.push("<hr>");
        index += 1;
        continue;
      }

      const paragraph = [line.trim()];
      index += 1;
      while (index < lines.length && !isBlockStart(lines, index)) paragraph.push(lines[index++].trim());
      html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    }

    return html.join("\n");
  }

  function renderMapNavigation() {
    mapNav.innerHTML = data.maps.map((map) => `
      <a href="#/map/${map.id}" data-map-nav="${map.id}" style="--map-color:${colorFor(map.id)}">
        <span class="map-link-main"><span class="map-number">${map.id}</span>${escapeHtml(map.name)}</span>
        <span class="model-count">${String(map.modelCount).padStart(2, "0")}</span>
      </a>`).join("");
    document.querySelector("#mapCount").textContent = String(data.maps.length).padStart(2, "0");
    document.querySelector("#libraryCount").textContent = `${data.models.length} 个模型 · ${data.maps.length} 张地图`;
    document.querySelector("#syncDate").textContent = data.latestUpdated ? `更新于 ${data.latestUpdated}` : "等待首个模型";
  }

  function setBreadcrumb(items) {
    breadcrumbs.innerHTML = items.map((item, index) => {
      const separator = index ? '<span class="breadcrumb-separator">/</span>' : "";
      const label = item.href ? `<a href="${item.href}">${escapeHtml(item.label)}</a>` : `<span class="current">${escapeHtml(item.label)}</span>`;
      return `${separator}${label}`;
    }).join("");
  }

  function setActiveNavigation(type, mapId = null) {
    document.querySelectorAll("[data-nav], [data-map-nav]").forEach((element) => element.classList.remove("active"));
    if (type) document.querySelector(`[data-nav="${type}"]`)?.classList.add("active");
    if (mapId) document.querySelector(`[data-map-nav="${mapId}"]`)?.classList.add("active");
  }

  function modelRows(models) {
    if (!models.length) return '<div class="empty-state"><strong>这片区域尚未形成正式模型</strong>新模型会在通过结构与证据门槛后出现在这里。</div>';
    return `<div class="model-list">${models.map((model) => `
      <a class="model-row" href="#/model/${model.id}" style="--map-color:${colorFor(model.mapId)}">
        <span class="model-symbol">${model.mapId}</span>
        <span><h3>${escapeHtml(model.title)}</h3><p>${escapeHtml(model.summary)}</p></span>
        <span class="model-meta"><span class="stars">${escapeHtml(model.confidence)}</span>${escapeHtml(model.status)}</span>
      </a>`).join("")}</div>`;
  }

  function modelCards(models) {
    if (!models.length) return '<div class="empty-state"><strong>没有匹配的模型</strong>试试其他关键词或筛选条件。</div>';
    return `<div class="model-card-grid">${models.map((model) => `
      <a class="model-card" href="#/model/${model.id}" style="--map-color:${colorFor(model.mapId)}">
        <span class="model-card-id">${escapeHtml(model.id)} · ${escapeHtml(model.mapName)}</span>
        <h2>${escapeHtml(model.title)}</h2>
        <p>${escapeHtml(model.summary)}</p>
        <span class="model-card-footer"><span class="chip">${escapeHtml(model.status)}</span><span class="stars">${escapeHtml(model.confidence)}</span></span>
      </a>`).join("")}</div>`;
  }

  function renderHome() {
    const statusCounts = data.models.reduce((counts, model) => ({ ...counts, [model.status]: (counts[model.status] || 0) + 1 }), {});
    const confidenceCounts = [1, 2, 3, 4, 5].map((level) => data.models.filter((model) => (model.confidence.match(/★/g) || []).length === level).length);
    const maxConfidence = Math.max(...confidenceCounts, 1);

    document.title = "World Models · 世界模型图谱";
    setBreadcrumb([{ label: "世界模型" }, { label: "总览" }]);
    setActiveNavigation("home");
    app.innerHTML = `
      <section class="hero">
        <div class="eyebrow">World Models Atlas</div>
        <h1 class="page-title">把复杂世界，压缩成<br>可检验的模型。</h1>
        <p class="page-intro">一套持续演化的认知操作系统。穿行于九张世界地图，理解模型的机制、边界、证据与预测。</p>
        <div class="hero-actions">
          <a class="primary-button" href="${data.models[0] ? `#/model/${data.models[0].id}` : "#/"}">开始探索 <span aria-hidden="true">↗</span></a>
          <a class="secondary-button" href="#/connections">查看关系网络</a>
        </div>
        <div class="atlas-orbit" aria-label="九张世界地图快捷入口">
          <span class="orbit-ring"></span><span class="orbit-core">WORLD<br>MAP</span>
          ${data.maps.map((map) => `<button class="orbit-node" data-route="#/map/${map.id}" style="--node-color:${colorFor(map.id)}" title="${escapeHtml(map.name)}">${map.id}</button>`).join("")}
        </div>
      </section>
      <section class="stats-row" aria-label="知识库统计">
        <div class="stat"><strong>${data.models.length}</strong><span>正式模型</span></div>
        <div class="stat"><strong>${data.maps.length}</strong><span>领域地图</span></div>
        <div class="stat"><strong>${statusCounts["候选"] || 0}</strong><span>候选模型</span></div>
        <div class="stat"><strong>${data.connections.length}</strong><span>有效连接</span></div>
      </section>
      <section>
        <div class="section-heading"><div><h2>世界地图</h2><p>每张地图是一组问题的边界；跨领域机制通过连接索引彼此照亮。</p></div></div>
        <div class="map-grid">
          ${data.maps.map((map) => `
            <a class="map-card" href="#/map/${map.id}" data-number="${map.id}" style="--map-color:${colorFor(map.id)}">
              <span class="map-card-top"><span class="map-card-number">MAP / ${map.id}</span><span class="map-card-count">${map.modelCount} MODELS</span></span>
              <h3>${escapeHtml(map.name)}</h3><p>${escapeHtml(map.description)}</p>
            </a>`).join("")}
        </div>
      </section>
      <section class="dashboard-lower">
        <div class="panel"><div class="panel-header"><h2>最近更新</h2><span>${escapeHtml(data.latestUpdated || "—")}</span></div>${modelRows([...data.models].sort((a, b) => String(b.updated).localeCompare(String(a.updated))).slice(0, 5))}</div>
        <aside class="panel system-panel">
          <h2>证据温度</h2><p>按当前可信度分布</p>
          ${confidenceCounts.map((count, index) => `<div class="confidence-row"><span>${"★".repeat(index + 1)}</span><span class="confidence-track"><span class="confidence-fill" style="width:${count / maxConfidence * 100}%"></span></span><strong>${count}</strong></div>`).join("")}
          <div class="principle-card"><span>CONSTITUTION / 01</span><p>“不记录知识，建立模型。”</p></div>
        </aside>
      </section>`;
  }

  function renderMap(mapId) {
    const map = mapById(mapId);
    if (!map) return renderNotFound();
    const models = data.models.filter((model) => model.mapId === mapId);
    document.title = `${map.name} · World Models`;
    setBreadcrumb([{ label: "世界模型", href: "#/" }, { label: `${map.id} ${map.name}` }]);
    setActiveNavigation(null, mapId);
    app.innerHTML = `
      <header class="page-header">
        <div class="eyebrow" style="color:${colorFor(map.id)}">Map / ${map.id}</div>
        <h1 class="page-title">${escapeHtml(map.name)}</h1>
        <p class="page-intro">${escapeHtml(map.description)}</p>
        <div class="header-meta">${map.subfields.map((field) => `<span class="chip">${escapeHtml(field)}</span>`).join("")}<span class="chip accent">${models.length} 个模型</span></div>
      </header>
      <div class="section-heading"><div><h2>模型索引</h2><p>进入模型可查看现象、机制、变量、失效条件与可证伪预测。</p></div></div>
      ${modelCards(models)}`;
  }

  function renderModel(modelId) {
    const model = modelById(modelId);
    if (!model) return renderNotFound();
    const map = mapById(model.mapId);
    document.title = `${model.title} · World Models`;
    setBreadcrumb([{ label: "世界模型", href: "#/" }, { label: `${model.mapId} ${model.mapName}`, href: `#/map/${model.mapId}` }, { label: model.title }]);
    setActiveNavigation(null, model.mapId);

    app.innerHTML = `
      <header class="model-detail-header" data-id="${escapeHtml(model.id)}" style="--map-color:${colorFor(model.mapId)}">
        <div class="detail-id">${escapeHtml(model.id)} / ${escapeHtml(map?.name || model.mapName)}</div>
        <h1>${escapeHtml(model.title)}</h1>
        <p class="detail-summary">${escapeHtml(model.summary)}</p>
        <div class="detail-metadata">
          <span class="chip accent">${escapeHtml(model.status)}</span>
          <span class="chip"><span class="stars">${escapeHtml(model.confidence)}</span></span>
          <span class="chip">更新于 ${escapeHtml(model.updated)}</span>
          ${(model.tags || []).map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}
        </div>
      </header>
      <div class="article-layout">
        <article class="model-article">${markdownToHtml(model.body)}</article>
        <nav class="article-toc" aria-label="文章目录"><h3>On this model</h3>${model.sections.map((section) => `<a href="#/model/${escapeHtml(model.id)}" data-scroll-target="${escapeHtml(section.anchor)}">${escapeHtml(section.title)}</a>`).join("")}</nav>
      </div>`;
  }

  function networkPositions() {
    return {
      "00": [9, 11], "01": [38, 7], "02": [69, 11], "03": [84, 39], "04": [75, 74],
      "05": [45, 81], "06": [16, 73], "07": [5, 42], "08": [43, 43],
    };
  }

  function renderConnections() {
    const positions = networkPositions();
    const modelPositions = {};
    data.models.forEach((model, index) => {
      const [x, y] = positions[model.mapId] || [50, 50];
      modelPositions[model.id] = [Math.min(78, x + (index % 2 ? -3 : 2)), Math.min(87, y + (y < 50 ? 16 : -17))];
    });
    document.title = "关系网络 · World Models";
    setBreadcrumb([{ label: "世界模型", href: "#/" }, { label: "关系网络" }]);
    setActiveNavigation("connections");
    app.innerHTML = `
      <header class="page-header"><div class="eyebrow">Connection Index</div><h1 class="page-title">关系网络</h1><p class="page-intro">模型只在存在可解释机制时连接。地图归属显示知识的位置，连线表达支持、冲突、约束或组成关系。</p></header>
      <div class="network-stage">
        <svg viewBox="0 0 1000 560" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;opacity:.55">
          ${data.models.map((model) => { const [mx, my] = modelPositions[model.id]; const [x, y] = positions[model.mapId]; return `<line x1="${x * 10 + 56}" y1="${y * 5.6 + 18}" x2="${mx * 10 + 80}" y2="${my * 5.6 + 24}" stroke="${colorFor(model.mapId)}" stroke-width="1" stroke-dasharray="5 7"/>`; }).join("")}
          ${data.connections.map((connection) => { const source = modelPositions[connection.source]; const target = modelPositions[connection.target]; return source && target ? `<line x1="${source[0] * 10}" y1="${source[1] * 5.6}" x2="${target[0] * 10}" y2="${target[1] * 5.6}" stroke="#d8f06a" stroke-width="2"/>` : ""; }).join("")}
        </svg>
        ${data.maps.map((map) => { const [x, y] = positions[map.id]; return `<a href="#/map/${map.id}" class="network-node map" style="left:${x}%;top:${y}%;--node-color:${colorFor(map.id)}">${map.id} ${escapeHtml(map.name)}</a>`; }).join("")}
        ${data.models.map((model) => { const [x, y] = modelPositions[model.id]; return `<a href="#/model/${model.id}" class="network-node model" style="left:${x}%;top:${y}%;border-color:${colorFor(model.mapId)}"><strong>${escapeHtml(model.title)}</strong><small>${escapeHtml(model.id)} · ${escapeHtml(model.status)}</small></a>`; }).join("")}
      </div>
      <div class="network-legend"><span><i class="legend-dot" style="background:var(--text-faint)"></i>领域地图</span><span><i class="legend-dot" style="background:var(--accent)"></i>正式模型</span><span><i class="legend-dot" style="background:var(--warm)"></i>${data.connections.length} 条模型关系</span></div>`;
  }

  function renderSearch(query) {
    const normalized = query.trim().toLowerCase();
    const models = data.models.filter((model) => [model.id, model.title, model.summary, model.mapName, ...(model.tags || []), model.body]
      .join(" ").toLowerCase().includes(normalized));
    document.title = `搜索 ${query} · World Models`;
    setBreadcrumb([{ label: "世界模型", href: "#/" }, { label: "搜索" }]);
    setActiveNavigation(null);
    app.innerHTML = `
      <header class="page-header"><div class="eyebrow">Search Library</div><h1 class="page-title">搜索模型</h1></header>
      <p class="search-summary">找到 <strong>${models.length}</strong> 个与“${escapeHtml(query)}”相关的模型</p>
      ${modelCards(models)}`;
  }

  function renderNotFound() {
    document.title = "未找到 · World Models";
    setBreadcrumb([{ label: "世界模型", href: "#/" }, { label: "未找到" }]);
    setActiveNavigation(null);
    app.innerHTML = '<div class="empty-state"><strong>这里还没有模型</strong><a class="text-link" href="#/">返回世界地图总览</a></div>';
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    sidebarScrim.classList.remove("open");
  }

  function renderRoute() {
    closeSidebar();
    const route = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    if (!route.length) renderHome();
    else if (route[0] === "map") renderMap(route[1]);
    else if (route[0] === "model") renderModel(route[1]);
    else if (route[0] === "connections") renderConnections();
    else renderNotFound();
    window.scrollTo({ top: 0, behavior: "instant" });
    app.focus({ preventScroll: true });
  }

  function initializeTheme() {
    const storedTheme = localStorage.getItem("world-models-theme");
    const theme = storedTheme || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    document.documentElement.dataset.theme = theme;
  }

  if (!data) {
    app.innerHTML = '<div class="empty-state"><strong>模型数据尚未生成</strong>请运行 npm run build:web。</div>';
    return;
  }

  initializeTheme();
  renderMapNavigation();
  renderRoute();

  window.addEventListener("hashchange", () => {
    searchInput.value = "";
    renderRoute();
  });
  searchInput.addEventListener("input", (event) => event.target.value.trim() ? renderSearch(event.target.value) : renderRoute());
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== searchInput) { event.preventDefault(); searchInput.focus(); }
    if (event.key === "Escape" && document.activeElement === searchInput) { searchInput.value = ""; searchInput.blur(); renderRoute(); }
  });
  document.addEventListener("click", (event) => {
    const scrollLink = event.target.closest("[data-scroll-target]");
    if (scrollLink) {
      event.preventDefault();
      document.getElementById(scrollLink.dataset.scrollTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const routeButton = event.target.closest("[data-route]");
    if (routeButton) location.hash = routeButton.dataset.route;
  });
  document.querySelector("#menuButton").addEventListener("click", () => {
    sidebar.classList.toggle("open");
    sidebarScrim.classList.toggle("open");
  });
  sidebarScrim.addEventListener("click", closeSidebar);
  document.querySelector("#themeButton").addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("world-models-theme", nextTheme);
  });
})();
