<h1 align="center">
<img src="https://raw.githubusercontent.com/DataXResearch/rabbithole/main/src/assets/icons/logo.png" alt="Rabbithole logo" title="Rabbithole logo" width="200">
<br>
rabbithole
</h1>
<p align="center" style="font-size: 1.2rem;">An extension to track your internet rabbitholes</p>

<hr />

## Features

-   [Svelte](https://svelte.dev/)
-   [TypeScript](https://www.typescriptlang.org/)
-   [Vite](https://vitejs.dev/)
-   [CRXJS Vite Plugin](https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin/README.md)
-   [Chrome Extensions Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)

## Development

```bash
# install dependencies
npm i

# build files to `/dist` directory
# HMR for extension pages and content scripts
npm run dev
```

## Build

```bash
# build files to `/dist` directory
$ npm run build
```

## Load unpacked extensions

[Getting Started Tutorial](https://developer.chrome.com/docs/extensions/mv3/getstarted/)

1. Open the Extension Management page by navigating to `chrome://extensions`.
2. Enable Developer Mode by clicking the toggle switch next to `Developer mode`.
3. Click the `LOAD UNPACKED` button and select the `/dist` directory.

![Example](https://wd.imgix.net/image/BhuKGJaIeLNPW9ehns59NfwqKxF2/vOu7iPbaapkALed96rzN.png?auto=format&w=571)
