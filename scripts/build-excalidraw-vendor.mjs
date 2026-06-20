import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { build } from "esbuild";

const source = process.env.EXCALIDRAW_BUILD_ROOT;
if (!source) {
  throw new Error("Set EXCALIDRAW_BUILD_ROOT to a built Excalidraw 0.18.0 tree");
}

const packagePath = (name) =>
  path.join(source, "packages", name, "dist", "prod", "index.js");
const sourceModules = path.join(source, "node_modules");
const publicOutput = path.resolve("public/vendor/excalidraw");

await rm(publicOutput, { recursive: true, force: true });
await mkdir(publicOutput, { recursive: true });

await build({
  absWorkingDir: process.cwd(),
  entryPoints: [path.resolve("scripts/excalidraw-bridge.tsx")],
  outfile: path.join(publicOutput, "bridge.js"),
  assetNames: "assets/[name]-[hash]",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  minify: true,
  sourcemap: false,
  loader: {
    ".woff2": "file",
  },
  plugins: [
    {
      name: "local-excalidraw-build",
      setup(buildApi) {
        buildApi.onResolve(
          { filter: /^@excalidraw\/excalidraw$/ },
          () => ({ path: packagePath("excalidraw") }),
        );
        buildApi.onResolve(
          { filter: /^@excalidraw\/excalidraw\/index\.css$/ },
          () => ({
            path: path.join(
              source,
              "packages/excalidraw/dist/prod/index.css",
            ),
          }),
        );
        buildApi.onResolve({ filter: /^react$/ }, () => ({
          path: path.join(sourceModules, "react/index.js"),
        }));
        buildApi.onResolve({ filter: /^react-dom\/client$/ }, () => ({
          path: path.join(sourceModules, "react-dom/client.js"),
        }));
      },
    },
  ],
});
