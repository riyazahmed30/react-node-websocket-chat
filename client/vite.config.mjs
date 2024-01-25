import { defineConfig, transformWithEsbuild } from "vite";
import react from "@vitejs/plugin-react";
import eslint from "vite-plugin-eslint";

export default () => {
  return defineConfig({
    plugins: [
      react(),
      eslint(),
      // Workaround
      {
        name: "load+transform-js-files-as-jsx",
        async transform(code, id) {
          if (!id.match(/src\/.*\.js$/)) {
            return null;
          }

          // Use the exposed transform from vite, instead of directly
          // transforming with esbuild
          return transformWithEsbuild(code, id, {
            loader: "jsx",
            jsx: "automatic", // 👈 this is important
          });
        },
      },
      // End workaround
    ],
    // Workaround before renaming .js to .jsx
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          ".js": "jsx",
        },
      },
    },
    // End workaround
    envPrefix: "REACT_APP_",
    build: {
      // outDir: "build",

      sourcemap: false,

      rollupOptions: {
        onLog(level, log, handler) {
          if (
            log.cause &&
            log.cause.message === `Can't resolve original location of error.`
          ) {
            return;
          }
          handler(level, log);
        },
      },
    },
  });
};
