// @ts-check
import { defineConfig } from "astro/config";
import { resolve } from "node:path";
import { dataDir } from "./src/lib/paths.mjs";

// Reload the browser when resume data changes. The data lives outside src/
// (in the private repo), so Vite wouldn't otherwise notice edits to it.
const watchData = {
  name: "cvcraft-watch-data",
  configureServer(server) {
    server.watcher.add(dataDir);
    server.watcher.on("change", (file) => {
      if (resolve(file).startsWith(dataDir)) server.ws.send({ type: "full-reload" });
    });
  },
};

export default defineConfig({
  site: "https://yorthehunter.github.io",
  base: "/cvcraft",
  trailingSlash: "always",
  build: { format: "directory" },
  vite: { plugins: [watchData] },
});
