## GitHub Copilot Chat

- Extension: 0.50.1 (prod)
- VS Code: 1.122.1 (8761a5560cfd65fdd19ce7e2bd18dab5c0a4d84e)
- OS: linux 6.17.0-23-generic x64
- Remote Name: ssh-remote
- Extension Kind: Workspace
- GitHub Account: donzeg

## Network

User Settings:
```json
  "http.systemCertificatesNode": true,
  "github.copilot.advanced.debug.useElectronFetcher": true,
  "github.copilot.advanced.debug.useNodeFetcher": false,
  "github.copilot.advanced.debug.useNodeFetchFetcher": true
```

Connecting to https://api.github.com:
- DNS ipv4 Lookup: Error (8 ms): getaddrinfo EAI_AGAIN api.github.com
- DNS ipv6 Lookup: Error (9 ms): getaddrinfo EAI_AGAIN api.github.com
- Proxy URL: None (2 ms)
- Electron fetch: Unavailable
- Node.js https: Error (209 ms): Error: getaddrinfo EAI_AGAIN api.github.com
	at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)
- Node.js fetch (configured): Error (254 ms): TypeError: fetch failed
	at node:internal/deps/undici/undici:14902:13
	at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
	at async n._fetch (/home/syeed/.vscode-server/cli/servers/Stable-8761a5560cfd65fdd19ce7e2bd18dab5c0a4d84e/server/extensions/copilot/dist/extension.js:5505:6188)
	at async n.fetch (/home/syeed/.vscode-server/cli/servers/Stable-8761a5560cfd65fdd19ce7e2bd18dab5c0a4d84e/server/extensions/copilot/dist/extension.js:5505:5496)
	at async u (/home/syeed/.vscode-server/cli/servers/Stable-8761a5560cfd65fdd19ce7e2bd18dab5c0a4d84e/server/extensions/copilot/dist/extension.js:5537:186)
	at async Cg._executeContributedCommand (file:///home/syeed/.vscode-server/cli/servers/Stable-8761a5560cfd65fdd19ce7e2bd18dab5c0a4d84e/server/out/vs/workbench/api/node/extensionHostProcess.js:502:48807)
  Error: getaddrinfo EAI_AGAIN api.github.com
  	at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)

Connecting to https://api.githubcopilot.com/_ping:
- DNS ipv4 Lookup: Error (8 ms): getaddrinfo EAI_AGAIN api.githubcopilot.com
- DNS ipv6 Lookup: Error (17 ms): getaddrinfo EAI_AGAIN api.githubcopilot.com
- Proxy URL: None (2 ms)
- Electron fetch: Unavailable
- Node.js https: Error (670 ms): Error: getaddrinfo EAI_AGAIN api.githubcopilot.com
	at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)
- Node.js fetch (configured): Error (303 ms): TypeError: fetch failed
	at node:internal/deps/undici/undici:14902:13
	at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
	at async n._fetch (/home/syeed/.vscode-server/cli/servers/Stable-8761a5560cfd65fdd19ce7e2bd18dab5c0a4d84e/server/extensions/copilot/dist/extension.js:5505:6188)
	at async n.fetch (/home/syeed/.vscode-server/cli/servers/Stable-8761a5560cfd65fdd19ce7e2bd18dab5c0a4d84e/server/extensions/copilot/dist/extension.js:5505:5496)
	at async u (/home/syeed/.vscode-server/cli/servers/Stable-8761a5560cfd65fdd19ce7e2bd18dab5c0a4d84e/server/extensions/copilot/dist/extension.js:5537:186)
	at async Cg._executeContributedCommand (file:///home/syeed/.vscode-server/cli/servers/Stable-8761a5560cfd65fdd19ce7e2bd18dab5c0a4d84e/server/out/vs/workbench/api/node/extensionHostProcess.js:502:48807)
  Error: getaddrinfo EAI_AGAIN api.githubcopilot.com
  	at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)

Connecting to https://copilot-proxy.githubusercontent.com/_ping:
- DNS ipv4 Lookup: Error (9 ms): getaddrinfo EAI_AGAIN copilot-proxy.githubusercontent.com
- DNS ipv6 Lookup: Error (9 ms): getaddrinfo EAI_AGAIN copilot-proxy.githubusercontent.com
- Proxy URL: None (1 ms)
- Electron fetch: Unavailable
- Node.js https: Error (193 ms): Error: getaddrinfo EAI_AGAIN copilot-proxy.githubusercontent.com
	at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)
- Node.js fetch (configured): Error (262 ms): TypeError: fetch failed
	at node:internal/deps/undici/undici:14902:13
	at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
	at async n._fetch (/home/syeed/.vscode-server/cli/servers/Stable-8761a5560cfd65fdd19ce7e2bd18dab5c0a4d84e/server/extensions/copilot/dist/extension.js:5505:6188)
	at async n.fetch (/home/syeed/.vscode-server/cli/servers/Stable-8761a5560cfd65fdd19ce7e2bd18dab5c0a4d84e/server/extensions/copilot/dist/extension.js:5505:5496)
	at async u (/home/syeed/.vscode-server/cli/servers/Stable-8761a5560cfd65fdd19ce7e2bd18dab5c0a4d84e/server/extensions/copilot/dist/extension.js:5537:186)
	at async Cg._executeContributedCommand (file:///home/syeed/.vscode-server/cli/servers/Stable-8761a5560cfd65fdd19ce7e2bd18dab5c0a4d84e/server/out/vs/workbench/api/node/extensionHostProcess.js:502:48807)
  Error: getaddrinfo EAI_AGAIN copilot-proxy.githubusercontent.com
  	at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)

Connecting to https://mobile.events.data.microsoft.com: Error (261 ms): TypeError: fetch failed
	at node:internal/deps/undici/undici:14902:13
	at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
	at async n._fetch (/home/syeed/.vscode-server/cli/servers/Stable-8761a5560cfd65fdd19ce7e2bd18dab5c0a4d84e/server/extensions/copilot/dist/extension.js:5505:6188)
	at async n.fetch (/home/syeed/.vscode-server/cli/servers/Stable-8761a5560cfd65fdd19ce7e2bd18dab5c0a4d84e/server/extensions/copilot/dist/extension.js:5505:5496)
	at async u (/home/syeed/.vscode-server/cli/servers/Stable-8761a5560cfd65fdd19ce7e2bd18dab5c0a4d84e/server/extensions/copilot/dist/extension.js:5542:134)
	at async Cg._executeContributedCommand (file:///home/syeed/.vscode-server/cli/servers/Stable-8761a5560cfd65fdd19ce7e2bd18dab5c0a4d84e/server/out/vs/workbench/api/node/extensionHostProcess.js:502:48807)
  Error: getaddrinfo EAI_AGAIN mobile.events.data.microsoft.com
  	at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)
Connecting to https://dc.services.visualstudio.com: Error (301 ms): TypeError: fetch failed
	at node:internal/deps/undici/undici:14902:13
	at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
	at async n._fetch (/home/syeed/.vscode-server/cli/servers/Stable-8761a5560cfd65fdd19ce7e2bd18dab5c0a4d84e/server/extensions/copilot/dist/extension.js:5505:6188)
	at async n.fetch (/home/syeed/.vscode-server/cli/servers/Stable-8761a5560cfd65fdd19ce7e2bd18dab5c0a4d84e/server/extensions/copilot/dist/extension.js:5505:5496)
	at async u (/home/syeed/.vscode-server/cli/servers/Stable-8761a5560cfd65fdd19ce7e2bd18dab5c0a4d84e/server/extensions/copilot/dist/extension.js:5542:134)
	at async Cg._executeContributedCommand (file:///home/syeed/.vscode-server/cli/servers/Stable-8761a5560cfd65fdd19ce7e2bd18dab5c0a4d84e/server/out/vs/workbench/api/node/extensionHostProcess.js:502:48807)
  Error: getaddrinfo EAI_AGAIN dc.services.visualstudio.com
  	at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)
Connecting to https://copilot-telemetry.githubusercontent.com/_ping: Error (208 ms): Error: getaddrinfo EAI_AGAIN copilot-telemetry.githubusercontent.com
	at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)
Connecting to https://copilot-telemetry.githubusercontent.com/_ping: Error (296 ms): Error: getaddrinfo EAI_AGAIN copilot-telemetry.githubusercontent.com
	at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)
Connecting to https://default.exp-tas.com: Error (211 ms): Error: getaddrinfo EAI_AGAIN default.exp-tas.com
	at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)

Number of system certificates: 435

## Documentation

In corporate networks: [Troubleshooting firewall settings for GitHub Copilot](https://docs.github.com/en/copilot/troubleshooting-github-copilot/troubleshooting-firewall-settings-for-github-copilot).