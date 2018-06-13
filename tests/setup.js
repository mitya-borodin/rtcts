const path = require("path");
const fs = require("fs");

try {
  require('ts-node')
    .register(
      {
        project: path.resolve(process.cwd(), "tests/tsconfig.json"),
        fast: true,
        typeCheck: true,
        cache: false,
      }
    );
} catch (error) {
  console.log('[ERROR] ' + error.message);
  process.exit(1);
}
