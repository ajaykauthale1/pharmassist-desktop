# PharmAssist (Desktop / Local-Embeddings Edition)

The second iteration of [PharmAssist](https://github.com/ajaykauthale1/pharmassist), rebuilt as a desktop-ready app that runs **embeddings fully in the browser** with Transformers.js, so medical reference search works with no server and no network.

> ⚠️ Decision-support prototype only. Not a substitute for professional medical judgment.

## What's new in this version
- **Local embeddings** (`@xenova/transformers`) run in Web Workers with a worker pool, so large PDFs index without freezing the UI
- **Parallel PDF extraction** in a dedicated pdf.js worker, plus a built-in PDF viewer that jumps to the matching passage
- **Persistent storage** of resources and vectors via localforage
- **Symptom entry → results flow** with remedy parsing and a global processing progress bar
- Material UI interface; Electron-ready packaging

## Tech
React 18, TypeScript, Vite 5, Material UI 6, Transformers.js, pdf.js, localforage, Electron.

## Run
```bash
npm install
npm run dev
```
