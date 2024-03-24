import path from "path";
import esbuild from "rollup-plugin-esbuild";

process.env.NODE_ENV === "production";
export default async () => {
  return {
    input: "./server/index.ts",
    output: {
      file: "./dist/server.js",
    },
    external: ["socket.io", "http", "os", "express", "process"],
    plugins: [
      esbuild({
        exclude: [/node_modules/],
        target: "esnext",
        minify: true,
        charset: "utf8"
      }),
    ],
  };
};
