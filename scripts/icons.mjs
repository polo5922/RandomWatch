// Génère les icônes PNG de l'extension à partir de assets/logo.svg : `npm run icons`
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const svg = readFileSync(new URL('../assets/logo.svg', import.meta.url));
mkdirSync(new URL('../public/icon/', import.meta.url), { recursive: true });
for (const size of [16, 32, 48, 96, 128]) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(new URL(`../public/icon/${size}.png`, import.meta.url), png);
}
console.log('Icônes générées dans public/icon/');
