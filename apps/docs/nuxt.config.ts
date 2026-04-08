export default defineNuxtConfig({
  extends: ['docus'],

  modules: [
    '@nuxtjs/mcp-toolkit',
    'motion-v/nuxt',
    'nuxt-studio',
    '@vercel/analytics',
    '@vercel/speed-insights',
  ],

  app: {
    head: {
      script: [
        {
          src: 'https://www.zhcndoc.com/js/common.js',
          async: true,
        },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  site: {
    name: 'Nuxt MCP Toolkit 中文文档',
  },

  mdc: {
    highlight: {
      noApiRoute: false,
    },
  },

  routeRules: {
    '/core-concepts/configuration': { redirect: '/getting-started/configuration' },
  },

  experimental: {
    asyncContext: true,
  },

  nitro: {
    externals: {
      inline: ['minimark'],
    },
  },

  icon: {
    customCollections: [
      {
        prefix: 'custom',
        dir: './app/assets/icons',
      },
    ],
    clientBundle: {
      scan: true,
      includeCustomCollections: true,
    },
    provider: 'iconify',
  },

  llms: {
    domain: 'https://nuxt-mcp-toolkit.zhcndoc.com',
    title: 'Nuxt MCP Toolkit 中文文档',
    description: '在 Nuxt 应用中直接创建 MCP 服务器。使用简洁直观的 API 定义工具、资源和提示词。',
    full: {
      title: 'Nuxt MCP Toolkit 中文文档',
      description: '在 Nuxt 应用中直接创建 MCP 服务器。使用简洁直观的 API 定义工具、资源和提示词。',
    },
  },

  mcp: {
    name: 'Nuxt MCP Toolkit 中文文档',
  },

  studio: {
    route: '/admin',
    repository: {
      provider: 'github',
      owner: 'nuxt-modules',
      repo: 'mcp-toolkit',
      branch: 'main',
      rootDir: 'apps/docs',
    },
    development: {
      sync: true,
    },
  },
})
