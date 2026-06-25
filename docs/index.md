---
layout: home
title: Wave 代码智聊
---

# Wave 代码智聊

集成在 VS Code 中的 AI 辅助编程扩展，提升您的编码效率。

[下载最新版本](https://github.com/netease-lcap/wave-vsce/releases) · [查看产品规格](/spec)

## 鉴权配置说明（以下两种方案二选一）

插件提供两种认证方式，选择其一即可。

### 方案一：SSO 单点登录（推荐内部使用）

在聊天框中输入 `/login`，填写 **服务端链接** 后，点击 `SSO 登录` 按钮完成认证。支持网易内部 SSO，也支持企业配置自己的 SSO（需联系开发者配置），无需手动管理密钥。

### 方案二：API Key 鉴权

在聊天框中输入 `/config` 打开配置面板。只要是 OpenAI 兼容格式都可以，如 OpenAI、DeepSeek 等。

配置项：

| 字段 | 说明 | 示例 |
| --- | --- | --- |
| **Base URL** | API 服务地址 | `https://api.openai.com/v1` |
| **API Key** | 访问密钥 | `sk-xxxxxxxxxxxxxxxx` |
| **Model** | 主模型名称 | `gpt-4` |
| **Fast Model** | 快速模型名称 | `gpt-3.5-turbo` |

## 环境变量配置（可选）

以上配置项均可通过环境变量预设，表单中会显示为占位符（敏感信息已脱敏）：

| 环境变量 | 对应配置项 |
| --- | --- |
| `WAVE_SERVER_URL` | 服务端链接 |
| `WAVE_API_KEY` | API Key（占位符中显示为 `****`） |
| `WAVE_CUSTOM_HEADERS` | Headers |
| `WAVE_BASE_URL` | Base URL |
| `WAVE_MODEL` | Model |
| `WAVE_FAST_MODEL` | Fast Model |
