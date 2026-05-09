export default {
  base: '/wave-vsce/',
  title: 'Wave 代码智聊',
  description: '集成在 VS Code 中的 AI 辅助编程扩展',
  themeConfig: {
    nav: [
      { text: '下载', link: '/' },
      { text: '产品规格', link: '/spec' },
    ],
    sidebar: {
      '/spec': [
        {
          text: '1. 核心聊天体验',
          collapsed: false,
          items: [
            { text: '1.1 欢迎界面', link: '/spec#welcome-interface' },
            { text: '1.2 基础对话', link: '/spec#basic-chat' },
            { text: '1.3 消息队列', link: '/spec#message-queuing' },
            { text: '1.4 对话回滚', link: '/spec#rewind-feature' },
            { text: '1.5 工具提示', link: '/spec#tooltips' },
            { text: '1.6 历史记录搜索', link: '/spec#history-search' },
          ],
        },
        {
          text: '2. 智能输入与上下文',
          collapsed: false,
          items: [
            { text: '2.1 代码选择与引用', link: '/spec#code-selection-reference' },
            { text: '2.2 指令系统', link: '/spec#slash-commands' },
            { text: '2.3 文件建议与预览', link: '/spec#file-suggestions' },
            { text: '2.4 权限模式管理', link: '/spec#permission-modes' },
            { text: '2.5 快捷终端命令', link: '/spec#bang-shell-command' },
          ],
        },
        {
          text: '3. 增强型 Agent 能力',
          collapsed: false,
          items: [
            { text: '3.1 终端工具', link: '/spec#bash-tool' },
            { text: '3.2 文件差异对比', link: '/spec#diff-viewer' },
            { text: '3.3 任务列表', link: '/spec#task-list' },
            { text: '3.4 子代理状态', link: '/spec#subagent-display' },
            { text: '3.5 Mermaid 图表渲染', link: '/spec#mermaid-rendering' },
            { text: '3.6 交互式提问', link: '/spec#ask-user' },
            { text: '3.7 计划执行确认', link: '/spec#plan-confirmation' },
            { text: '3.8 代码修改确认', link: '/spec#code-edit-confirmation' },
            { text: '3.9 命令执行确认', link: '/spec#bash-command-confirmation' },
            { text: '3.10 文件搜索与探索', link: '/spec#file-exploration' },
            { text: '3.11 文件操作工具', link: '/spec#file-operations' },
            { text: '3.12 视觉理解', link: '/spec#vision-understanding' },
            { text: '3.13 LSP 代码智能', link: '/spec#lsp-intelligence' },
            { text: '3.14 Skill 技能系统', link: '/spec#skill-system' },
            { text: '3.15 MCP 协议集成', link: '/spec#mcp-integration' },
            { text: '3.16 AI 思考过程', link: '/spec#ai-reasoning' },
            { text: '3.17 错误消息展示', link: '/spec#error-message-display' },
            { text: '3.18 进入计划模式确认', link: '/spec#enter-plan-mode' },
            { text: '3.19 后台任务通知', link: '/spec#task-notification' },
          ],
        },
        {
          text: '4. 会话与配置管理',
          collapsed: false,
          items: [
            { text: '4.1 会话管理', link: '/spec#session-management' },
            { text: '4.2 配置设置', link: '/spec#configuration-settings' },
            { text: '4.3 语言设置', link: '/spec#language-settings' },
            { text: '4.4 插件管理', link: '/spec#plugin-management' },
          ],
        },
        {
          text: '5. 内置 Skills 与 Subagents',
          collapsed: false,
          items: [
            {
              text: '5.1 Settings Skill',
              collapsed: false,
              items: [
                { text: 'settings.json 配置中心', link: '/spec#settings-json' },
                { text: '钩子 (Hooks)', link: '/spec#settings-hooks' },
                { text: '环境变量', link: '/spec#settings-env' },
                { text: '工具权限', link: '/spec#settings-permissions' },
                { text: '模型配置', link: '/spec#settings-models' },
                { text: 'MCP 协议', link: '/spec#settings-mcp' },
                { text: '记忆规则', link: '/spec#settings-memory' },
                { text: '自定义 Skill', link: '/spec#settings-skills' },
                { text: '子代理', link: '/spec#settings-subagents' },
                { text: '插件配置', link: '/spec#settings-plugins' },
                { text: '其他设置', link: '/spec#settings-other' },
              ],
            },
            {
              text: '5.2 其他内置 Skills',
              collapsed: false,
              items: [
                { text: 'init — 代码库初始化', link: '/spec#skill-init' },
                { text: 'loop — 定时循环任务', link: '/spec#skill-loop' },
              ],
            },
            {
              text: '5.3 内置 Subagents',
              collapsed: false,
              items: [
                { text: 'Bash — 命令执行', link: '/spec#subagent-bash' },
                { text: 'Explore — 代码库探索', link: '/spec#subagent-explore' },
                { text: 'Plan — 软件架构师', link: '/spec#subagent-plan' },
                { text: '通用代理', link: '/spec#subagent-general-purpose' },
              ],
            },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/netease-lcap/wave-vsce' },
    ],
  },
  head: [
    ['link', { rel: 'icon', href: 'LOGO.png' }],
  ],
}
