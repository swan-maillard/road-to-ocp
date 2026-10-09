// Build-time mode flag. Vite replaces __OFFLINE__ with true/false:
//   - vite.config.js (server build & dev)  -> false
//   - vite.offline.config.js (GitHub Pages)-> true
export const OFFLINE = typeof __OFFLINE__ !== 'undefined' && __OFFLINE__ === true;
