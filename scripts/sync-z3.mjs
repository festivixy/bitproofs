import { copyFileSync } from "node:fs";

copyFileSync("node_modules/z3-solver/build/z3-built.js", "public/z3-built.js");
copyFileSync("node_modules/z3-solver/build/z3-built.wasm", "public/z3-built.wasm");
