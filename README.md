# Casa Brasil (protótipo)

Jogo de navegador em retrato: escolha um avatar, decore uma casa isométrica e cuide de um jardim com bichos brasileiros que produzem moedas. Itens exclusivos (onça-pintada e peças de museu) são liberados por "visita real"; no protótipo, por botões de demonstração.

## Rodar

```
npm install
npm run dev
```

Abra o endereço mostrado. `?debug=1` mostra a grade isométrica e coordenadas.

## Scripts

| comando | o que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento (Vite) |
| `npm run build` | checagem de tipos + build em `dist/` |
| `npm test` | testes Vitest (grade, posicionamento, produção offline) |
| `npm run assets` | recorta `assets/raw/*.png` em `public/assets/` e gera `src/data/manifest.json` (Python + Pillow + numpy) |
| `npm run shots -- <fluxo> [--debug]` | screenshots Playwright em 390x844 e 1280x800 (fluxos em `tools/flows.mjs`) |

## Onde mexer

- `src/config.ts`: título, moedas iniciais, tempos e limites.
- `src/data/furniture.json`, `src/data/animals.json`: catálogo, preços, escalas, posições.
- `src/data/calibration.json`: cantos do piso da sala e do jardim (calibre com `?debug=1`).

## Deploy (Vercel)

Importe o repositório na Vercel; o preset **Vite** detecta tudo (build `npm run build`, saída `dist`). Nenhuma configuração extra.
