# Casa Brasil (protótipo)

Jogo de navegador em retrato: escolha um avatar, decore uma casa isométrica e cuide de um jardim com bichos brasileiros que produzem moedas. Os melhores itens só chegam com uma **visita real** a museus, parques e centros de ciência (Local, Foto, Carimbo). Em volta do jogo há o **Clube Família**, o **Modo Escola**, o **painel da cidade** e uma página **Sobre** para a banca.

Tudo que é simulado mostra o selo **DEMO**. Nenhum dado sai do aparelho.

## Como rodar

```
npm install
npm run dev
```

Abra o endereço mostrado (o jogo é pensado para celular em pé; no computador aparece numa caixa 9:16).

Parâmetros úteis na URL:

| parâmetro | efeito |
| --- | --- |
| `?demo=1` | carrega a família de demonstração (pede confirmação se já houver jogo salvo) |
| `?demo=1&rapido=1` | idem, e o jardim produz 10x mais rápido (para apresentar) |
| `?qr=<token>` | simula ler um QR (veja "QR" abaixo) |
| `?debug=1` | mostra a grade isométrica e as coordenadas |

## Rotas

| rota | o que é |
| --- | --- |
| `/` | o jogo (abertura com 4 entradas) |
| `/escola` | Modo Escola: `#professor` (turma, expedições, relatórios) e `#aluno` (celular) |
| `/cidade` | painel da cidade, dados fictícios, mínimo de 20 visitas por local |
| `/sobre` | problema, solução, receita, segurança de menores, próximos passos |
| `/qr-evento.html` | QR do evento em tela cheia ("Escaneie e ganhe o Troféu Coruja") |
| `/qr.html` | QR dos 4 parceiros, para imprimir |

## Scripts

| comando | o que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento (Vite) |
| `npm run build` | checagem de tipos + build em `dist/` (inclui PWA e service worker) |
| `npm run preview` | serve o build local |
| `npm test` | testes Vitest (lógica pura: grade, produção, visitas, missões, escola, QR, PIN...) |
| `npm run e2e` | testes Playwright de ponta a ponta (jornada da família e da escola), sobre o build |
| `npm run assets` | recorta `assets/raw/*.png` em `public/assets/` (WebP + PNG de reserva) e gera `src/data/manifest.json` |
| `npm run icons` | ícones do app, favicon e `public/og.jpg` a partir da arte |
| `npm run qr -- AAAA-MM-DD --base https://seu-site` | gera os QR (veja abaixo) |
| `npm run shots -- <fluxo> [--debug]` | screenshots 390x844 e 1280x800 (fluxos em `tools/flows.mjs`) |

`npm run assets`, `icons` e `qr` precisam de Python 3 com `pillow numpy qrcode` (`pip install pillow numpy qrcode`).

## QR do evento e dos parceiros

O token do evento é `sha256("<EVENT_SECRET>:evento:<data>")` cortado em 8 caracteres e vale **no dia e no dia seguinte**. O dos parceiros é fixo por lugar. O segredo está em `src/config.ts` (e, por isso, é só demonstração: a validação de verdade teria de ser num servidor).

```
npm run qr -- 2026-10-08 --base https://seu-site.vercel.app
```

Gera `public/qr/evento-<data>.png`, `public/qr/parceiro-<id>.png`, `public/qr-evento.html` (tela cheia, para o telão do evento) e `public/qr.html` (os 4 cartazes dos parceiros). Gere um novo a cada evento e publique de novo. O nome do evento está em `EVENT_NAME` (`src/config.ts`), só como texto.

## Trocar a arte

1. Coloque o PNG novo em `assets/raw/` (o nome do arquivo é o número da folha; `N (2).png` vence `N.png` se for maior).
2. `npm run assets`. Confira `debug/contact_<folha>.png` (cada item recortado com o nome).
3. Se mudou o tamanho de algo, recalibre pela tela com `?debug=1` (`src/data/calibration.json`, `furniture.json`, `animals.json`) e tire a marca `provisorio` do item.

As folhas 30 a 34 (carimbos, medalhas, ícones, itens e animais novos) são nomeadas em `tools/process_assets.py` (`SHEETS`).

## Resetar e carregar a demonstração

- No jogo: engrenagem (canto superior) → **Carregar dados de demonstração** ou **Apagar tudo e recomeçar** (pede confirmação duas vezes).
- Pela URL: `/?demo=1`.
- Na mão: apague `jogocasa.save.v2` do `localStorage` e o banco `casa-brasil-photos` do IndexedDB.

O save é versionado (`v2`); um save `v1` antigo é migrado sem perder nada.

## Onde mexer

- `src/config.ts`: título, moedas iniciais, tempos, raio da visita (200 m), multiplicador 2x por 7 dias, PIN, evento.
- `src/data/*.json`: catálogo de móveis e animais, parceiros, missões, turma e modelos de expedição, dados da cidade.
- `src/core/`: regras puras e testadas (sem DOM). `src/ui/`: telas HTML. `src/game/` e `src/scenes/`: Phaser. `src/school/`, `src/site/`: páginas leves sem Phaser.

## Deploy (Vercel)

Importe o repositório; o preset **Vite** serve (`vercel.json` já define o build, os rewrites de `/escola`, `/cidade` e `/sobre` e os cabeçalhos de segurança). Para o Open Graph funcionar com endereço absoluto, defina `VITE_SITE_URL=https://seu-site.vercel.app` nas variáveis de ambiente.

## Regras de produto (valem para tudo)

- Menores: sem chat livre (só reações e frases prontas), sem fotos de pessoas (dica "Fotografe o lugar, sem pessoas"), fotos só no aparelho (IndexedDB), compras bloqueadas por padrão, sem anúncios, sem recompensa aleatória paga. Toda recompensa é conhecida antes.
- Sem ranking e sem notas em lugar nenhum. Sem punição por ausência: os animais só dormem.
- A fonte (Pixelify Sans, licença OFL) é servida pelo próprio site: o navegador da criança não chama terceiros.

## O que é DEMO

Localização e visitas com o botão "Modo demonstração", PIN dos pais (fica só no aparelho), QR com segredo público, turma e alunos fictícios, dados da cidade, "IA" de sugestão de expedição (modelos prontos, sem API), círculo fechado de amigos (só visual) e compras (não existe pagamento).
