---
layout: home
title: Wave 代码智聊
---

# Wave 代码智聊

集成在 VS Code 中的 AI 辅助编程扩展，提升您的编码效率。

[下载最新版本](https://github.com/netease-lcap/wave-vsce/releases) · [查看产品规格](/spec)

## 鉴权配置说明（以下三种方案三选一）

插件提供三种认证方式，选择其一即可：

### 方案一：SSO 单点登录（推荐内部使用）

填写 **服务端链接** 后，点击 `SSO 登录` 按钮完成认证。支持网易内部 SSO，无需手动管理密钥。

### 方案二：API Key 鉴权

只要是 OpenAI 兼容格式都可以。网易内部推荐使用互娱服务：[AIGW 文档](https://aigw.doc.nie.netease.com/)。外网可使用 OpenAI 或 DeepSeek 官方服务。

配置项：

| 字段 | 说明 | 示例 |
| --- | --- | --- |
| **Base URL** | API 服务地址 | `https://api.openai.com/v1` |
| **API Key** | 访问密钥 | `sk-xxxxxxxxxxxxxxxx` |
| **Model** | 主模型名称 | `gpt-4` |
| **Fast Model** | 快速模型名称 | `gpt-3.5-turbo` |

### 方案三：Headers 自定义鉴权（网易内部 AIGW）

1. 打开 [ModelSpace App 管理](https://modelspace.netease.com/model_access/app_manage)，新建 App，生成的 **App Code** 将作为 `X-AIGW-APP`。
2. 给 App 添加成员。
3. 每个成员访问 [权限控制台](https://console-auth.nie.netease.com/mymessage/mymessage)，复制 **v2 Token** 内容，作为 `X-Access-Token`。
4. 选择 `Headers` 认证方式，在 Headers 配置中添加（每行一个 `Key: Value`）：

```
X-AIGW-APP: your_app_code
X-Access-Token: your_access_token
```

5. 将 **Base URL** 配置为：`https://aigw.netease.com/v1`

## 环境变量配置（可选）

以上配置项均可通过环境变量预设，表单中会显示为占位符（敏感信息已脱敏）：

| 环境变量 | 对应配置项 |
| --- | --- |
| `WAVE_AI_URL` | 服务端链接 |
| `WAVE_API_KEY` | API Key（占位符中显示为 `****`） |
| `WAVE_CUSTOM_HEADERS` | Headers |
| `WAVE_BASE_URL` | Base URL |
| `WAVE_MODEL` | Model |
| `WAVE_FAST_MODEL` | Fast Model |
