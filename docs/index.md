---
layout: home
title: Wave 代码智聊
---

# Wave 代码智聊

集成在 VS Code 中的 AI 辅助编程扩展，提升您的编码效率。

[下载最新版本](https://github.com/netease-lcap/wave-vsce/releases) · [查看产品规格](/spec)

## 鉴权配置说明（以下两种方案二选一）

### 方案一：OpenAI 兼容格式的 KEY

只要是 OpenAI 兼容格式都可以。网易内部推荐使用互娱服务：[AIGW 文档](https://aigw.doc.nie.netease.com/)。外网可使用 OpenAI 或 DeepSeek 官方服务。

### 方案二：用户维度（网易内部）

1. 打开 [ModelSpace App 管理](https://modelspace.netease.com/model_access/app_manage)，新建 App，生成的 **App Code** 将作为 `X-AIGW-APP`。
2. 给 App 添加成员。
3. 每个成员访问 [权限控制台](https://console-auth.nie.netease.com/mymessage/mymessage)，复制 **v2 Token** 内容，作为 `X-Access-Token`。
4. 在插件配置中添加 Headers：

```json
{"X-AIGW-APP": "your_app_code", "X-Access-Token": "your_access_token"}
```

5. 将 **BASE URL** 配置为：`https://aigw.netease.com/v1`
