export default defineAppConfig({
  header: {
    title: 'Nuxt MCP Toolkit 中文文档',
  },
  seo: {
    titleTemplate: '%s - Nuxt MCP Toolkit 中文文档',
    title: 'Nuxt MCP Toolkit 中文文档',
    description: '在 Nuxt 应用中直接创建 MCP 服务器。使用简洁直观的 API 定义工具、资源和提示词。',
  },
  toc: {
    title: '本页目录',
    bottom: {
      title: '相关链接',
    },
  },
  socials: {
    x: 'https://x.com/nuxt_js',
    discord: 'https://discord.com/invite/ps2h6QT',
    nuxt: 'https://nuxt.com',
  },
  github: {
    rootDir: 'apps/docs',
  },
  assistant: {
    faqQuestions: [
      {
        category: '入门',
        items: [
          '什么是 Nuxt MCP Toolkit？',
          '如何安装这个模块？',
          '如何使用 DevTools？',
        ],
      },
      {
        category: '核心功能',
        items: [
          '如何创建新的 MCP Tool？',
          '如何添加 MCP Resource？',
          '如何配置 Prompt？',
        ],
      },
      {
        category: '进阶',
        items: [
          '可以把 API 路由暴露为 MCP Tool 吗？',
          '是否支持 TypeScript？',
          '如何添加自定义 MCP 服务器？',
        ],
      },
    ],
  },
  ui: {
    colors: {
      neutral: 'zinc',
    },
    button: {
      slots: {
        base: 'active:translate-y-px transition-transform duration-300',
      },
    },
    contentSurround: {
      variants: {
        direction: {
          left: {
            linkLeadingIcon: [
              'group-active:-translate-x-0',
            ],
          },
          right: {
            linkLeadingIcon: [
              'group-active:translate-x-0',
            ],
          },
        },
      },
    },
  },
})
