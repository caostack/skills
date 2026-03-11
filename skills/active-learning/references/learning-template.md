# 知识文件模板

AI 学习成果的存储模板，保存在项目目录 `<项目根目录>/.claude/memory/knowledge/` 下。

这些知识会内化为 AI 的**记忆、第一反应、直觉**，可提交到 Git 供团队共享。

## 快速 / 实用 模板

适用于：一次性使用或项目常用

```markdown
# [知识领域名称]

## What
[一句话描述]

## Patterns
1. [模式名称]
   [代码示例]

2. [模式名称]
   [代码示例]

## Gotchas
- [要避免什么]: [为什么]
- [要避免什么]: [为什么]

## Project Notes
[本项目特定的决策]
```

## 深度模板

适用于：项目核心技术栈，需要深度掌握

```markdown
# [知识领域名称]

## What
[一句话描述]

## How It Works
[原理/架构 - 理解本质帮助调试]

## Patterns
1. [模式名称]
   [代码示例]
   Why: [为什么有效]

2. [模式名称]
   [代码示例]
   Why: [为什么有效]

## Edge Cases
- [特殊场景]: [如何处理]
- [特殊场景]: [如何处理]

## Debugging
- [现象]: [可能原因 → 修复方法]
- [现象]: [可能原因 → 修复方法]

## Gotchas
- [常见陷阱]: [为什么以及如何避免]
- [常见陷阱]: [为什么以及如何避免]

## Project Notes
[本项目的决策和学习]
```

## 术语说明

| 术语 | 含义 | 示例 |
|------|------|------|
| **Patterns** | 成功的做法 | "用 async/await 处理异步" |
| **Gotchas** | 失败的教训（提炼后） | "忘记 await 会导致 Promise 未 resolve" |
| **Edge Cases** | 边界情况 | "空数组时 reduce 会报错" |
| **Debugging** | 调试经验 | "Promise pending → 检查是否忘记 await" |
| **Knowledge** | 内化的知识 | 成为第一反应，不需要查阅 |

## MEMORY.md 索引

```markdown
## Knowledge

AI 内化的知识（成为第一反应）：

- [zig](knowledge/zig.md) - 系统编程语言
- [docker](knowledge/docker.md) - 容器化部署
- [webgl](knowledge/webgl.md) - 3D渲染API
```
