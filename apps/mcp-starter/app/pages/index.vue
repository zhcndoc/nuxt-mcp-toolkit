<script setup lang="ts">
const mcpPath = '/mcp'
</script>

<template>
  <main class="page">
    <h1>Nuxt MCP Starter</h1>
    <p>
      MCP endpoint (HTTP):
      <code>{{ mcpPath }}</code>
    </p>
    <p class="hint">
      Use this app with an MCP client pointed at your dev or deployed URL. Extend the server under
      <code>server/mcp/</code>.
    </p>
  </main>
</template>

<style scoped>
.page {
  font-family: ui-sans-serif, system-ui, sans-serif;
  max-width: 40rem;
  margin: 3rem auto;
  padding: 0 1.5rem;
  line-height: 1.6;
}

code {
  font-size: 0.95em;
  padding: 0.15em 0.35em;
  border-radius: 4px;
  background: #f4f4f5;
}

.hint {
  color: #52525b;
  font-size: 0.95rem;
}
</style>
