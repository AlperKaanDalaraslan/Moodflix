/**
 * uiPacks.generated.json içindeki her pakete strings.en.js’teki eksik anahtarları ekler.
 * Tam çeviri için: npm run i18n:build
 */
import {readFileSync, writeFileSync} from 'fs';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const {default: en} = await import(join(root, 'src/i18n/strings.en.js'));
const {default: trHand} = await import(join(root, 'src/i18n/strings.tr.js'));
const {default: deHand} = await import(join(root, 'src/i18n/strings.de.js'));
const {default: frHand} = await import(join(root, 'src/i18n/strings.fr.js'));
const handByPack = {tr: trHand, de: deHand, fr: frHand};
const dest = join(root, 'src/i18n/uiPacks.generated.json');
const packs = JSON.parse(readFileSync(dest, 'utf8'));
for (const packId of Object.keys(packs)) {
  const p = packs[packId];
  const hand = handByPack[packId];
  for (const k of Object.keys(en)) {
    if (p[k] === undefined || p[k] === '') {
      p[k] = (hand && hand[k]) || en[k];
    }
  }
}
writeFileSync(dest, JSON.stringify(packs, null, 2), 'utf8');
console.log('Merged EN keys into all ui packs →', dest);
