// /sobre: the one-page pitch for the jury. Problem, solution, how it works, revenue, child safety, next steps.
import '../ui/style.css';
import '../ui/pages.css';
import './site.css';
import './about.css';
import { EVENT_NAME, TITLE } from '../config';
import { MANIFEST, assetUrl } from '../core/catalog';
import { dayKey } from '../core/dates';
import { eventToken, qrUrl } from '../core/qr';
import { el, esc, itemUrl } from '../ui/dom';
import { siteBar } from './bar';

interface Item {
  icon: string;
  title: string;
  text: string;
}

const HOW: Item[] = [
  { icon: 'nav_home', title: 'Casa e jardim', text: 'A criança decora uma casa e cuida de um jardim com bichos brasileiros que produzem moedas. É o jogo do dia a dia.' },
  { icon: 'mappin', title: 'Visita real', text: 'Itens exclusivos só chegam depois de uma visita a um parceiro: Local, Foto do lugar e Carimbo no passaporte.' },
  { icon: 'family', title: 'Clube Família', text: 'Expedição da semana, saída combinada com a família, missões semanais e medalhas. Tudo com recompensa conhecida antes.' },
  { icon: 'school', title: 'Modo Escola', text: 'O professor monta uma expedição digital (antes, durante e depois da visita) e acompanha a turma, sem notas e sem ranking.' },
  { icon: 'gear', title: 'Painel da cidade', text: 'A prefeitura vê onde as visitas acontecem e se a campanha espalhou o público. Só números por lugar, a partir de 20 visitas.' },
];

const REVENUE: Item[] = [
  { icon: 'school', title: 'Escola, por licença anual', text: 'A escola paga uma licença por ano para usar o Modo Escola com suas turmas.' },
  { icon: 'mappin', title: 'Parceiros culturais', text: 'Museus, parques e centros entram no mapa, ganham carimbo próprio e relatório de visitas.' },
  { icon: 'ribbon_limited', title: 'Eventos patrocinados', text: 'Eventos distribuem um item de edição limitada por QR, como o Troféu Coruja.' },
  { icon: 'family', title: 'Assinatura Clube Família', text: 'Recursos extras de planejamento para a família. O jogo base continua gratuito.' },
  { icon: 'star', title: 'Cosméticos a preço fixo', text: 'Itens de decoração com preço conhecido. Nada de sorteio pago.' },
  { icon: 'calendar', title: 'Painel da cidade', text: 'Assinatura para secretarias que querem medir e orientar campanhas de visitação.' },
];

const SAFETY = [
  'Sem chat livre: só reações e frases prontas.',
  'Sem fotos de pessoas: a dica "Fotografe o lugar, sem pessoas" aparece sempre.',
  'Fotos ficam só no aparelho da criança.',
  'Compras bloqueadas por padrão, controladas pelos pais com PIN.',
  'Sem anúncios e sem recompensa aleatória paga: toda recompensa é conhecida antes.',
  'Sem ranking e sem notas em lugar nenhum. Ausência nunca é punida: os bichos só dormem.',
  'Dados da cidade só com mínimo de 20 visitas por local.',
];

const NEXT = [
  'Validar o piloto com 2 escolas e 3 parceiros culturais.',
  'Trocar a validação demo dos QR por um servidor com códigos assinados.',
  'Contas de pais e escolas com consentimento (LGPD).',
  'Publicar como app instalável e medir o efeito das campanhas.',
  'Integrar com a agenda cultural da cidade.',
];

const card = (i: Item) => `<li class="parch"><img src="${itemUrl(i.icon)}" alt=""><div><b>${esc(i.title)}</b><span>${esc(i.text)}</span></div></li>`;
const section = (id: string, title: string, body: string) => `<section id="${id}" class="sec"><h2>${esc(title)}</h2>${body}</section>`;

export function mount(root: HTMLElement): void {
  document.title = `Sobre o projeto · ${TITLE}`;
  const frame = el('div', 'site-frame');
  const page = el('div', 'site-body about');
  frame.append(siteBar('sobre'), page);
  root.appendChild(frame);

  const today = qrUrl(eventToken(dayKey(Date.now())));
  const art = assetUrl(MANIFEST.opening);
  page.innerHTML = `
    <header class="hero" style="background-image:url(${art})"><div><h1>${esc(TITLE)}</h1><p>Um jogo de casa e jardim que leva as famílias para fora de casa.</p><img src="${itemUrl('ribbon_demo')}" alt="DEMO: protótipo" class="ribbon"></div></header>
    <div class="content">
      ${section('problema', 'O problema', '<p>Museus, parques e centros de ciência ficam vazios em dias comuns, enquanto as crianças passam horas em telas. Famílias não sabem por onde começar, escolas têm dificuldade de organizar saídas e a cidade não sabe onde as visitas realmente acontecem.</p>')}
      ${section('solucao', 'A solução', '<p>Um jogo cujo melhor prêmio só se ganha numa visita real. Cada visita vira carimbo no passaporte, foto no álbum e bichos novos no jardim, e a escola e a cidade enxergam o resultado.</p>')}
      ${section('como', 'Como funciona', `<ul class="cards">${HOW.map(card).join('')}</ul>`)}
      ${section('receita', 'Modelo de receita', `<ul class="cards">${REVENUE.map(card).join('')}</ul>`)}
      ${section('seguranca', 'Regras de segurança de menores', `<ul class="checks">${SAFETY.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`)}
      ${section('proximos', 'Próximos passos', `<ol class="checks">${NEXT.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`)}
      ${section('links', 'Ver o protótipo', `<div class="links"><a class="btn" href="/">Jogar em família</a><a class="btn" href="/escola">Modo Escola</a><a class="btn" href="/cidade">Painel da cidade</a><a class="btn secondary" href="/qr-evento.html">QR do evento (tela cheia)</a></div>
        <p class="small">Evento de demonstração: ${esc(EVENT_NAME)}. Link do QR de hoje, para testar: <code>${esc(today)}</code></p>
        <p class="small">Tudo que é simulado neste protótipo mostra o selo DEMO. Nenhum dado sai do aparelho.</p>`)}
    </div>`;
}
