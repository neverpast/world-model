# World Models

一套持续演化的认知操作系统：用模型解释世界、预测变化并指导决策。

这里不以“收集了多少知识”为目标。每次新增内容都必须提升至少一种能力：

- **解释力**：揭示现象背后的机制。
- **预测力**：产生可以被未来证伪的预期。
- **决策力**：说明哪些变量值得观察或干预。
- **迁移力**：能在多个领域复用，而非只解释单一案例。

## 系统入口

- [可视化网站](web/index.html)：浏览地图、搜索模型、阅读正文与查看关系网络。
- [项目宪法](CONSTITUTION.md)：原则、质量标准与维护规则。
- [模型注册表](_system/MODEL_REGISTRY.md)：所有正式模型的唯一总索引。
- [连接索引](_system/CONNECTIONS.md)：跨模型支持、冲突与组合关系。
- [模型模板](_system/templates/model.md)：新增或更新模型时使用。
- [演化日志](99%20Evolution%20Log/README.md)：记录系统层面的增删改与原因。

## 可视化网站

网站以现有 Markdown 为唯一内容源，不需要数据库或前端框架。每次模型发生变化后重新生成网页数据：

```bash
npm run build:web
```

本地预览：

```bash
npm run dev
```

然后访问 `http://127.0.0.1:4173`。`web/` 目录是完整静态站点，可直接部署到 GitHub Pages、Cloudflare Pages、Netlify 或任意静态文件服务器。

## 世界地图

| 地图 | 研究范围 |
|---|---|
| [00 Meta](00%20Meta/README.md) | 学习、思维、认知、模型、科学方法 |
| [01 AI](01%20AI/README.md) | Model、Reasoning、Agent、Memory、Tool、MCP、Skill、Chat、Work、Code |
| [02 Product](02%20Product/README.md) | User、JTBD、PMF、Growth、Flywheel、Pricing |
| [03 Business](03%20Business/README.md) | Competition、Strategy、Organization、Moat、Economics |
| [04 Investment](04%20Investment/README.md) | Macro、Industry、Company、Management、Financial Statements、Cash Flow、Competitive Advantage、Valuation、Risk、Decision Making |
| [05 Human](05%20Human/README.md) | Psychology、Learning、Motivation、Attention、Behavioral Economics |
| [06 Complex Systems](06%20Complex%20Systems/README.md) | Feedback、Emergence、Control、Evolution、Complexity |
| [07 Technology](07%20Technology/README.md) | Software、Architecture、Engineering、Infrastructure |
| [08 Philosophy](08%20Philosophy/README.md) | Epistemology、Logic、First Principles、Scientific Thinking |
| [99 Evolution Log](99%20Evolution%20Log/README.md) | 整个系统的演化历史 |

## 一次讨论如何进入系统

1. 先检索模型注册表和相关地图，判断它是新模型、更新、连接、修正还是反例。
2. 只有在现有模型无法容纳时才新增模型；优先更新、连接或合并。
3. 使用统一模板写入模型，明确假设、范围、失效条件、预测和可信度，并加入至少一幅带编号、标题、替代文本和图注的关键机制图。
4. 同步更新地图索引、模型注册表、连接索引和演化日志。
5. 若只有素材而没有稳定机制，暂不提升为正式模型。
