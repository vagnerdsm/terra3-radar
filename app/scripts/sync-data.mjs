// Copia data/processed/radar.json para public/ antes do dev/build.
// O pipeline (pandas) grava NaN literal em `faixa` dos clientes sem compra,
// o que não é JSON válido para o navegador: aqui vira null.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../../data/processed/radar.json');
const dst = resolve(here, '../public/radar.json');

if (!existsSync(src)) {
  if (existsSync(dst)) {
    console.log('[sync-data] base não encontrada; usando public/radar.json existente');
    process.exit(0);
  }
  console.error(`[sync-data] ${src} não existe. Rode o pipeline primeiro.`);
  process.exit(1);
}

const raw = readFileSync(src, 'utf-8');
const fixed = raw.replace(/(:\s*)(-?Infinity|NaN)(?=\s*[,}\]])/g, '$1null');
const data = JSON.parse(fixed); // falha aqui se ainda houver algo inválido
writeFileSync(dst, JSON.stringify(data));
console.log(`[sync-data] radar.json copiado (${data.clientes.length} clientes)`);
