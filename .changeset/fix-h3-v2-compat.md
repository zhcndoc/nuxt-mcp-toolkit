---
'@nuxtjs/mcp-toolkit': patch
---

Fix h3 v1/v2 compatibility in compat layer and node transport

- Replace dynamic `import('h3')` with static imports of `getRequestURL`, `getMethod`, `getRequestHeaders`, `getRequestWebStream` — these exist in both h3 v1 and v2, unlike `toWebRequest` which h3 v2 does not export
- Make `toWebRequest` synchronous with a manual `Request` construction fallback
- Add duck-type check for srvx `Request` objects that may not pass `instanceof` across realms
- Safe `event.node.res` access in node transport (h3 v2 may not have `event.node`)
- Mark `secure-exec` as Nitro external to suppress build warnings
