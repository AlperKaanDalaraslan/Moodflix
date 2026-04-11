/**
 * Writes shims/@env/index.js from the project root .env (Metro runs this in Node).
 * Keeps secrets out of source while fixing "Unable to resolve module @env".
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
const outDir = path.join(root, 'shims', '@env');
const outFile = path.join(outDir, 'index.js');

function parseEnv(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) {
    return out;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = parseEnv(envPath);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, {recursive: true});
}
const body = `/* eslint-disable */\n/* Auto-generated from .env — do not edit */\nmodule.exports = ${JSON.stringify(
  env,
)};\n`;
fs.writeFileSync(outFile, body, 'utf8');
