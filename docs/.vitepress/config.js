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
          text: '3. 代码理解与操作',
          collapsed: false,
          items: [
            { text: '3.1 终端工具', link: '/spec#bash-tool' },
            { text: '3.2 文件搜索与探索', link: '/spec#file-exploration' },
            { text: '3.3 文件操作工具', link: '/spec#file-operations' },
            { text: '3.4 文件差异对比', link: '/spec#diff-viewer' },
            { text: '3.5 LSP 代码智能', link: '/spec#lsp-intelligence' },
            { text: '3.6 视觉理解', link: '/spec#vision-understanding' },
          ],
        },
        {
          text: '4. 权限与安全',
          collapsed: false,
          items: [
            { text: '4.1 代码修改确认', link: '/spec#code-edit-confirmation' },
            { text: '4.2 命令执行确认', link: '/spec#bash-command-confirmation' },
            { text: '4.3 计划执行确认', link: '/spec#plan-confirmation' },
            { text: '4.4 进入计划模式确认', link: '/spec#enter-plan-mode' },
            { text: '4.5 错误消息展示', link: '/spec#error-message-display' },
          ],
        },
        {
          text: '5. 任务管理',
          collapsed: false,
          items: [
            { text: '5.1 任务列表', link: '/spec#task-list' },
            { text: '5.2 后台任务通知', link: '/spec#task-notification' },
            { text: '5.3 后台任务系统', link: '/spec#mechanism-background-tasks' },
          ],
        },
        {
          text: '6. 能力扩展',
          collapsed: false,
          items: [
            { text: '6.1 子代理状态', link: '/spec#subagent-display' },
            { text: '6.2 Skill 技能系统', link: '/spec#skill-system' },
            { text: '6.3 MCP 协议集成', link: '/spec#mcp-integration' },
          ],
        },
        {
          text: '7. AI 表达与交互',
          collapsed: false,
          items: [
            { text: '7.1 Mermaid 图表渲染', link: '/spec#mermaid-rendering' },
            { text: '7.2 交互式提问', link: '/spec#ask-user' },
            { text: '7.3 AI 思考过程', link: '/spec#ai-reasoning' },
          ],
        },
        {
          text: '8. 完整工具清单',
          collapsed: true,
          items: [
            { text: '8.1 Bash', link: '/spec#tool-bash' },
            { text: '8.2 Read', link: '/spec#tool-read' },
            { text: '8.3 Glob', link: '/spec#tool-glob' },
            { text: '8.4 Grep', link: '/spec#tool-grep' },
            { text: '8.5 Write', link: '/spec#tool-write' },
            { text: '8.6 Edit', link: '/spec#tool-edit' },
            { text: '8.7 LSP', link: '/spec#tool-lsp' },
            { text: '8.8 AskUserQuestion', link: '/spec#tool-askuser' },
            { text: '8.9 WebFetch', link: '/spec#tool-webfetch' },
            { text: '8.10 ToolSearch', link: '/spec#tool-toolsearch' },
            { text: '8.11 Worktree', link: '/spec#tool-worktree' },
            { text: '8.12 Cron', link: '/spec#tool-cron' },
            { text: '8.13 Task', link: '/spec#tool-task' },
            { text: '8.14 TaskStop', link: '/spec#tool-taskstop' },
          ],
        },
        {
          text: '9. 会话与持久化',
          collapsed: true,
          items: [
            { text: '9.1 会话恢复与多会话', link: '/spec#mechanism-session-restore' },
            { text: '9.2 文件修改回滚', link: '/spec#mechanism-reversion' },
            { text: '9.3 会话管理', link: '/spec#session-management' },
          ],
        },
        {
          text: '10. 记忆系统',
          collapsed: true,
          items: [
            { text: '10.1 消息压缩', link: '/spec#mechanism-context-management' },
            { text: '10.2 自动记忆系统', link: '/spec#mechanism-auto-memory' },
            { text: '10.3 记忆规则', link: '/spec#mechanism-memory-rules' },
          ],
        },
        {
          text: '11. 配置管理',
          collapsed: false,
          items: [
            { text: '11.1 配置设置', link: '/spec#configuration-settings' },
            { text: '11.2 语言设置', link: '/spec#language-settings' },
          ],
        },
        {
          text: '12. 插件系统',
          collapsed: false,
          items: [
            { text: '12.1 概述', link: '/spec#plugin-overview' },
            { text: '12.2 探索新插件', link: '/spec#explore-plugins' },
            { text: '12.3 已激活插件', link: '/spec#installed-plugins' },
            {
              text: '12.4 官方插件市场',
              collapsed: false,
              items: [
                { text: 'document-skills', link: '/spec#plugin-document-skills' },
                { text: 'typescript-lsp', link: '/spec#plugin-typescript-lsp' },
                { text: 'chrome-devtools', link: '/spec#plugin-chrome-devtools' },
                { text: 'code2spec', link: '/spec#plugin-code2spec' },
                { text: 'code2cwspec', link: '/spec#plugin-code2cwspec' },
                { text: 'commit-skills', link: '/spec#plugin-commit-skills' },
                { text: 'speckit', link: '/spec#plugin-speckit' },
                { text: 'deep-wiki', link: '/spec#plugin-deep-wiki' },
                { text: 'tavily-search', link: '/spec#plugin-tavily-search' },
                { text: 'lcap-extension-component', link: '/spec#plugin-lcap-extension-component' },
                { text: 'frontend-design', link: '/spec#plugin-frontend-design' },
              ],
            },
          ],
        },
        {
          text: '13. 内置 Skills 与 Subagents',
          collapsed: false,
          items: [
            {
              text: '13.1 Settings Skill',
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
              text: '13.2 其他内置 Skills',
              collapsed: false,
              items: [
                { text: 'init — 代码库初始化', link: '/spec#skill-init' },
                { text: 'loop — 定时循环任务', link: '/spec#skill-loop' },
              ],
            },
            {
              text: '13.3 内置 Subagents',
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
