# 实施计划: [功能]

**分支**: `[###-功能名称]` | **日期**: [日期] | **规格**: [链接]
**输入**: 来自 `/specs/[###-功能名称]/spec.md` 的功能规格说明

**注意**: 此模板由 `/speckit.plan` 命令填写。有关执行工作流程，请参阅 `.specify/templates/commands/plan.md`。

## 摘要

[从功能规格中提取：主要需求 + 来自研究的技术方法]

## 技术上下文

<!--
  需要采取行动：用项目的技术细节替换本节中的内容。
  这里的结构以建议身份呈现，以指导迭代过程。
-->

**语言/版本**: [例如，Python 3.11、Swift 5.9、Rust 1.75 或需要澄清]  
**主要依赖项**: [例如，FastAPI、UIKit、LLVM 或需要澄清]  
**存储**: [如果适用，例如，PostgreSQL、CoreData、文件 或 N/A]  
**测试**: [例如，pytest、XCTest、cargo test 或需要澄清]  
**目标平台**: [例如，Linux 服务器、iOS 15+、WASM 或需要澄清]
**项目类型**: [单体/网页/移动 - 决定源码结构]  
**性能目标**: [特定领域，例如，1000 req/s、10k lines/sec、60 fps 或需要澄清]  
**约束条件**: [特定领域，例如，<200ms p95、<100MB 内存、离线功能 或需要澄清]  
**规模/范围**: [特定领域，例如，10k 用户、1M LOC、50 个屏幕 或需要澄清]

## 章程检查

*门控：必须在阶段 0 研究之前通过。在阶段 1 设计后重新检查。*

### 原则 I: 核心用例测试检查
- [ ] 主要用户旅程已识别并有测试场景（开启聊天、发送消息、接收响应）
- [ ] 关键集成点已规划测试（扩展-webview通信、Wave Agent SDK）
- [ ] 避免了过度的边缘案例测试以保持开发速度

### 原则 II: 最小数据设计检查  
- [ ] 数据模型仅包含必需字段（消息：内容、角色、时间戳、流式状态）
- [ ] 避免了推测性或便利性属性
- [ ] 数据结构保持简单，无嵌套复杂性

### 原则 III: TypeScript严格安全检查
- [ ] 启用严格TypeScript配置（strict、noImplicitAny、strictNullChecks）
- [ ] 为VS Code API交互和Wave SDK合约定义接口
- [ ] 避免过度工程化的复杂类型定义

### 原则 IV: 扩展API集成检查
- [ ] 直接使用VS Code扩展API而无抽象层
- [ ] 遵循VS Code模式：WebviewPanel、命令、激活事件
- [ ] 使用VS Code消息传递而无中间件

### 原则 V: Webpack双重构建检查
- [ ] 扩展构建目标Node.js，webview目标web
- [ ] 清晰分离：dist/用于扩展，webview/dist/用于webview
- [ ] 仅在真正共享时共享依赖项（TypeScript类型）

## 项目结构

### 文档（此功能）

```
specs/[###-功能]/
├── plan.md              # 此文件（/speckit.plan 命令输出）
├── research.md          # 阶段 0 输出（/speckit.plan 命令）
├── data-model.md        # 阶段 1 输出（/speckit.plan 命令）
├── quickstart.md        # 阶段 1 输出（/speckit.plan 命令）
├── contracts/           # 阶段 1 输出（/speckit.plan 命令）
└── tasks.md             # 阶段 2 输出（/speckit.tasks 命令 - 不是由 /speckit.plan 创建）
```

### 源码（仓库根目录）
<!--
  需要采取行动：用此功能的具体布局替换下面的占位符树。
  删除未使用的选项，并用真实路径（例如，apps/admin、packages/something）扩展选择的结构。
  交付的计划不得包含选项标签。
-->

```
# [如果未使用则删除] 选项 1：单一项目（默认）
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [如果未使用则删除] 选项 2：网页应用（当检测到"前端" + "后端"时）
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [如果未使用则删除] 选项 3：移动 + API（当检测到"iOS/Android"时）
api/
└── [与上面的后端相同]

ios/ 或 android/
└── [平台特定结构：功能模块、UI 流程、平台测试]
```

**结构决策**: [记录选择的结构并引用上面捕获的真实目录]

## 复杂性跟踪

*仅在章程检查有必须证明的违规时填写*

| 违规 | 为什么需要 | 拒绝更简单替代方案的原因 |
|------|-----------|----------------------|
| [例如，第4个项目] | [当前需求] | [为什么3个项目不够] |
| [例如，Repository模式] | [具体问题] | [为什么直接数据库访问不够] |

