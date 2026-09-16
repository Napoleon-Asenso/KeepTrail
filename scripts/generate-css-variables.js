const fs = require("fs");
const path = require("path");

const DEFAULT_INPUT = path.join(process.cwd(), "matisse-tokens-all.json");
const DEFAULT_OUTPUT = path.join(process.cwd(), "matisse-tokens.css");

const inputPath = process.argv[2] || DEFAULT_INPUT;
const outputPath = process.argv[3] || DEFAULT_OUTPUT;

const tokens = JSON.parse(fs.readFileSync(inputPath, "utf8"));

const { color = {}, ...globalCategories } = tokens;

const rootLines = [];
const darkLines = [];

for (const values of Object.values(globalCategories)) {
  for (const [name, value] of Object.entries(values)) {
    rootLines.push(`  --${name}: ${value};`);
  }
}

for (const [name, value] of Object.entries(color.light || {})) {
  rootLines.push(`  --${name}: ${value};`);
}

for (const [name, value] of Object.entries(color.dark || {})) {
  darkLines.push(`  --${name}: ${value};`);
}

const css = [
  ":root {",
  ...rootLines,
  "}",
  "",
  '[data-theme="dark"] {',
  ...darkLines,
  "}",
  "",
];

fs.writeFileSync(outputPath, css.join("\n"), "utf8");
console.log(`Generated ${outputPath} (${css.length} lines)`);