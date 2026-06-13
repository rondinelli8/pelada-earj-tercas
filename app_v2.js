/* ===== Pelada EARJ v3 — app_v2.js ===== */
'use strict';

let DATA = null;

const MESES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

const STATE = {
  ranking: { ano: 'geral', metrica: 'pontos', limite: 10, ordem: 'desc', tipo: 'linha', mes: 'todos' },
  jogadores: { busca: '', selecionado: null },
  partidas:  { ano: 'todos', mes: 'todos', busca: '' },
  destaques: { ano: null }, // null = ano mais recente
};

// ══════════════════════════════════════
//  Empty states — SVG + título + sub
// ══════════════════════════════════════
const _ES_SVG = {
  search:   '<svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="21" cy="21" r="13" stroke="currentColor" stroke-width="2.5"/><path d="M30 30L44 44" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M17 21H25" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M21 17V25" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  person:   '<svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="26" cy="18" r="9" stroke="currentColor" stroke-width="2.5"/><path d="M8 46c0-9.941 8.059-18 18-18s18 8.059 18 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>',
  calendar: '<svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="10" width="40" height="36" rx="4" stroke="currentColor" stroke-width="2.5"/><path d="M6 22H46" stroke="currentColor" stroke-width="2.5"/><path d="M16 6V14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M36 6V14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M20 34L32 34" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M26 28L26 40" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/></svg>',
  warning:  '<svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M26 5L49 46H3L26 5Z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M26 21V32" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="26" cy="39" r="2" fill="currentColor"/></svg>',
};

function _emptyBlock(type, title, sub) {
  return `<div class="empty-state-block">
    <div class="esb-icon">${_ES_SVG[type] || _ES_SVG.search}</div>
    <p class="esb-title">${title}</p>
    ${sub ? `<p class="esb-sub">${sub}</p>` : ''}
  </div>`;
}
function _emptyTd(colspan, type, title, sub) {
  return `<tr><td colspan="${colspan}" class="empty-state-td">${_emptyBlock(type, title, sub)}</td></tr>`;
}



// ══════════════════════════════════════
//  Boot
// ══════════════════════════════════════
if (typeof window.PELADA_DATA !== 'undefined') {
  DATA = window.PELADA_DATA;
  document.addEventListener('DOMContentLoaded', init);
} else {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('main.container').innerHTML =
      _emptyBlock("warning", "Erro ao carregar dados", "O arquivo data.js não foi encontrado");
  });
}

function init() {
  setupTabs();
  buildRankingSidebar();
  setupMetricaFilter();
  setupLimiteFilter();
  setupBusca();
  buildPartidasSidebar();
  setupBuscaPartida();
  setupSidebarToggles();
  setupRankingTypeToggle();
  setupHeaderSort();
  setupMobileSheets();
  setupDestaques();
  setupMesFilter();

  // Aplica hash da URL ANTES do primeiro render
  applyHash();

  renderRanking();
  renderJogadores();
  renderPartidas();
  renderSobre();
  renderRecordes();
  renderComparar();

  document.getElementById('footer-data').textContent = formatDataBR(DATA.meta.atualizado_em);
  const _ultimaPartida = formatDataBR(DATA.meta.ultima_partida);
  document.getElementById('footer-ultima-partida').textContent  = _ultimaPartida;
  document.getElementById('header-ultima-partida').textContent  = _ultimaPartida;

  // Escuta mudanças de hash (botão voltar do browser, link externo)
  window.addEventListener('hashchange', onHashChange);
}

// ══════════════════════════════════════
//  Hash Router — URLs compartilháveis
// ══════════════════════════════════════
// Formatos suportados:
//   #/rankings                         → aba Rankings, defaults
//   #/rankings/2025                    → aba Rankings, ano 2025
//   #/rankings/2025/gols              → aba Rankings, ano 2025, métrica gols
//   #/rankings/2025/gols/goleiros     → aba Rankings, ano 2025, métrica gols, tipo goleiros
//   #/jogador/Rafael+Rondinelli       → aba Jogadores, abre perfil
//   #/jogador/Rafael+Rondinelli/2025  → aba Jogadores, perfil filtrado por ano
//   #/partidas                         → aba Partidas
//   #/partidas/2025                    → aba Partidas, ano 2025
//   #/partidas/2025/03                → aba Partidas, ano 2025, mês 03
//   #/sobre                            → aba Sobre

let _hashUpdating = false; // flag para evitar loop hashchange ↔ pushHash

function buildHash() {
  const activeTab = document.querySelector('.tab-btn.active');
  const tab = activeTab ? activeTab.dataset.tab : 'rankings';

  if (tab === 'rankings') {
    const { ano, metrica, tipo } = STATE.ranking;
    let h = '#/rankings';
    if (ano !== 'geral') {
      h += '/' + ano;
      if (metrica !== 'pontos') h += '/' + metrica;
      else if (tipo !== 'linha') h += '/pontos';
      if (tipo !== 'linha') h += '/' + tipo;
    } else if (metrica !== 'pontos' || tipo !== 'linha') {
      h += '/geral';
      if (metrica !== 'pontos') h += '/' + metrica;
      else if (tipo !== 'linha') h += '/pontos';
      if (tipo !== 'linha') h += '/' + tipo;
    }
    return h;
  }

  if (tab === 'jogadores') {
    const sel = STATE.jogadores.selecionado;
    if (sel) {
      let h = '#/jogador/' + encodeURIComponent(sel);
      // Se há ano filtrado, pegar do DOM
      const activeYearBtn = document.querySelector('.perfil-year-filter .perfil-year-btn.active');
      if (activeYearBtn && activeYearBtn.dataset.ano !== 'geral') {
        h += '/' + activeYearBtn.dataset.ano;
      }
      return h;
    }
    return '#/jogadores';
  }

  if (tab === 'partidas') {
    const { ano, mes } = STATE.partidas;
    let h = '#/partidas';
    if (ano !== 'todos') {
      h += '/' + ano;
      if (mes !== 'todos') h += '/' + mes;
    }
    return h;
  }

  return '#/sobre';
}

function pushHash() {
  const h = buildHash();
  if (location.hash !== h) {
    _hashUpdating = true;
    history.replaceState(null, '', h);
    _hashUpdating = false;
  }
}

function applyHash() {
  const hash = location.hash;
  if (!hash || hash.length < 2) return;

  const parts = hash.slice(2).split('/'); // remove '#/'
  const route = parts[0];

  if (route === 'rankings') {
    activateTab('rankings');
    if (parts[1]) {
      STATE.ranking.ano = parts[1];
      syncRankingSidebar();
    }
    if (parts[2]) {
      STATE.ranking.metrica = parts[2];
      STATE.ranking.ordem = parts[2] === 'aproveitamento_pior' ? 'asc' : 'desc';
      syncMetricaPills();
    }
    if (parts[3]) {
      STATE.ranking.tipo = parts[3];
      // Sync tipo toggle
      document.querySelectorAll('.ranking-type-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tipo === parts[3]);
      });
      document.getElementById('panel-linha').style.display    = parts[3] === 'linha'    ? '' : 'none';
      document.getElementById('panel-goleiros').style.display = parts[3] === 'goleiros' ? '' : 'none';
      const pc = document.getElementById('panel-corrida');
      if (pc) pc.style.display = parts[3] === 'corrida' ? '' : 'none';
    }
    return;
  }

  if (route === 'jogador' && parts[1]) {
    activateTab('jogadores');
    const nome = decodeURIComponent(parts[1]);
    const anoFiltro = parts[2] || 'geral';
    // Defer para depois do render inicial
    setTimeout(() => {
      STATE.jogadores.selecionado = nome;
      document.getElementById('jogadores-layout').classList.add('player-selected');
      renderJogadores();
      renderDetalheJogador(nome, anoFiltro);
    }, 0);
    return;
  }

  if (route === 'jogadores') {
    activateTab('jogadores');
    return;
  }

  if (route === 'partidas') {
    activateTab('partidas');
    if (parts[1]) {
      STATE.partidas.ano = parts[1];
      STATE.partidas.mes = parts[2] || 'todos';
      syncPartidasSidebar();
    }
    return;
  }

  if (route === 'sobre') {
    activateTab('sobre');
    return;
  }
}

function onHashChange() {
  if (_hashUpdating) return;
  applyHash();
  renderRanking();
  renderJogadores();
  renderPartidas();
  if (isMobile()) updateMobileBar();
}

function activateTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab));
  syncDestaquesVisibility();
}

// ══════════════════════════════════════
//  Destaques da temporada
// ══════════════════════════════════════
function computeStatsByFilter(ano, mes) {
  // Filtra partidas pelo ano e mês
  let partidas = DATA.partidas;
  if (ano && ano !== 'geral') partidas = partidas.filter(p => String(p.ano) === String(ano));
  if (mes && mes !== 'todos') partidas = partidas.filter(p => p.data.slice(5, 7) === mes);

  const totalPartidas = partidas.length;
  let totalGols = 0, totalAssists = 0;
  const playerStats = {};

  partidas.forEach(p => {
    Object.values(p.times).forEach(time => {
      time.forEach(j => {
        totalGols += j.gols || 0;
        totalAssists += j.assists || 0;
        if (!playerStats[j.nome]) {
          playerStats[j.nome] = { nome: j.nome, jogos: 0, pontos: 0, gols: 0, assists: 0, vitorias: 0, empates: 0, derrotas: 0, goleiro: false, arbitro: false };
        }
        const s = playerStats[j.nome];
        s.jogos++;
        s.gols += j.gols || 0;
        s.assists += j.assists || 0;
        if (j.resultado === 'V') { s.pontos += 3; s.vitorias++; }
        else if (j.resultado === 'E') { s.pontos += 1; s.empates++; }
        else { s.derrotas++; }
      });
    });
  });

  // Marcar goleiros e árbitros
  Object.values(DATA.jogadores).forEach(j => {
    if (j.goleiro  && playerStats[j.nome]) playerStats[j.nome].goleiro = true;
    if (j.arbitro  && playerStats[j.nome]) playerStats[j.nome].arbitro = true;
  });

  // Separar linha e goleiros (excluindo árbitros)
  const linha = Object.values(playerStats).filter(p => !p.goleiro && !p.arbitro);

  // Calcular aproveitamento
  linha.forEach(p => {
    p.aproveitamento = p.jogos > 0 ? (p.pontos / (p.jogos * 3)) * 100 : 0;
    p.g_a = p.gols + p.assists;
  });

  // Rankings
  const artilheiro = linha.slice().sort((a, b) => b.gols - a.gols)[0];
  const maisJogos = linha.slice().sort((a, b) => b.jogos - a.jogos)[0];
  const maisAssists = linha.slice().sort((a, b) => b.assists - a.assists)[0];

  // Mínimo de jogos para aproveitamento: >= 75% das partidas da temporada (mín 3)
  let minJogosAprov;
  if (mes && mes !== 'todos') {
    minJogosAprov = 3;
  } else {
    minJogosAprov = Math.max(3, Math.round(totalPartidas * 0.75));
  }

  const melhorAprov = linha.filter(p => p.jogos >= minJogosAprov)
    .sort((a, b) => b.aproveitamento - a.aproveitamento)[0];
  const maisGA = linha.slice().sort((a, b) => b.g_a - a.g_a)[0];
  const maiorPontuacao = linha.slice().sort((a, b) => b.pontos - a.pontos)[0];

  return {
    totalPartidas,
    totalGols,
    totalAssists,
    totalJogadores: linha.length,
    golsPorJogo: totalPartidas > 0 ? (totalGols / totalPartidas) : 0,
    assistsPorJogo: totalPartidas > 0 ? (totalAssists / totalPartidas) : 0,
    artilheiro,
    maisJogos,
    maisAssists,
    melhorAprov,
    maisGA,
    maiorPontuacao,
  };
}

function setupDestaques() {
  const section = document.getElementById('destaques-section');
  if (!section) return;

  // Ano mais recente como default
  const anos = DATA.meta.anos_disponiveis.slice().sort((a, b) => b - a);
  STATE.destaques.ano = String(anos[0]);

  // Renderizar pills de ano
  const pillsWrap = document.getElementById('destaques-ano-pills');
  pillsWrap.innerHTML = anos.map(a =>
    `<button class="dest-ano-btn ${String(a) === STATE.destaques.ano ? 'active' : ''}" data-ano="${a}">${a}</button>`
  ).join('');

  pillsWrap.addEventListener('click', e => {
    const btn = e.target.closest('.dest-ano-btn');
    if (!btn) return;
    STATE.destaques.ano = btn.dataset.ano;
    pillsWrap.querySelectorAll('.dest-ano-btn').forEach(b => b.classList.toggle('active', b === btn));
    document.getElementById('destaques-ano-label').textContent = btn.dataset.ano;
    renderDestaques();
  });

  section.style.display = '';
  renderDestaques();
}

function renderDestaques() {
  const ano = STATE.destaques.ano;
  const stats = computeStatsByFilter(ano, 'todos');

  document.getElementById('destaques-ano-label').textContent = ano;

  // Cards de stats gerais
  const grid = document.getElementById('destaques-grid');
  grid.innerHTML = `
    <div class="dest-card">
      <span class="dest-card-icon">🏟️</span>
      <span class="dest-card-value">${stats.totalPartidas}</span>
      <span class="dest-card-label">Partidas</span>
    </div>
    <div class="dest-card">
      <span class="dest-card-icon">⚽</span>
      <span class="dest-card-value">${stats.totalGols}</span>
      <span class="dest-card-sub">${stats.golsPorJogo.toFixed(1).replace('.', ',')} por jogo</span>
      <span class="dest-card-label">Gols</span>
    </div>
    <div class="dest-card">
      <span class="dest-card-icon">👟</span>
      <span class="dest-card-value">${stats.totalAssists}</span>
      <span class="dest-card-sub">${stats.assistsPorJogo.toFixed(1).replace('.', ',')} por jogo</span>
      <span class="dest-card-label">Assistências</span>
    </div>
    <div class="dest-card">
      <span class="dest-card-icon">👥</span>
      <span class="dest-card-value">${stats.totalJogadores}</span>
      <span class="dest-card-label">Jogadores</span>
    </div>
  `;

  // Destaques individuais
  const indiv = document.getElementById('destaques-individuais');
  const items = [
    { icon: '⚽', label: 'Artilheiro', data: stats.artilheiro, fmt: p => `${p.gols} gols` },
    { icon: '🏆', label: 'Maior pontuação', data: stats.maiorPontuacao, fmt: p => `${p.pontos} pts` },
    { icon: '🏟️', label: 'Mais jogos', data: stats.maisJogos, fmt: p => `${p.jogos} jogos` },
    { icon: '👟', label: 'Mais assistências', data: stats.maisAssists, fmt: p => `${p.assists} assists` },
    { icon: '🎯', label: 'Mais participações', data: stats.maisGA, fmt: p => `${p.g_a} G+A` },
    { icon: '📈', label: 'Melhor aproveitamento', data: stats.melhorAprov, fmt: p => `${p.aproveitamento.toFixed(1).replace('.', ',')}%` },
  ].filter(it => it.data);

  indiv.innerHTML = `<div class="dest-indiv-grid">${items.map(it =>
    `<div class="dest-indiv-item clickable" data-jogador="${escapeAttr(it.data.nome)}">
      <span class="dest-indiv-icon">${it.icon}</span>
      <div class="dest-indiv-info">
        <span class="dest-indiv-label">${it.label}</span>
        <span class="dest-indiv-name">${escapeHtml(it.data.nome.replace(' GK', '').replace(' (Goleiro)', ''))}</span>
        <span class="dest-indiv-stat">${it.fmt(it.data)}</span>
      </div>
    </div>`
  ).join('')}</div>`;

  // Click handler para abrir jogador
  indiv.onclick = e => {
    const el = e.target.closest('[data-jogador]');
    if (el) abrirJogador(el.dataset.jogador);
  };
}

// ══════════════════════════════════════
//  Filtro por mês no ranking
// ══════════════════════════════════════
function setupMesFilter() {
  const bar = document.getElementById('mes-filter-bar');
  const pills = document.getElementById('mes-filter-pills');
  if (!bar || !pills) return;

  pills.addEventListener('click', e => {
    const btn = e.target.closest('.mes-pill');
    if (!btn) return;
    STATE.ranking.mes = btn.dataset.mes;
    pills.querySelectorAll('.mes-pill').forEach(b => b.classList.toggle('active', b === btn));
    renderRanking();
  });
}

function updateMesFilter() {
  const bar = document.getElementById('mes-filter-bar');
  const pills = document.getElementById('mes-filter-pills');
  if (!bar || !pills) return;

  const ano = STATE.ranking.ano;
  if (ano === 'geral') {
    bar.style.display = 'none';
    STATE.ranking.mes = 'todos';
    return;
  }

  // Encontrar meses disponíveis para este ano
  const meses = new Set();
  DATA.partidas.forEach(p => {
    if (String(p.ano) === ano) meses.add(p.data.slice(5, 7));
  });
  const sorted = [...meses].sort();

  if (sorted.length <= 1) {
    bar.style.display = 'none';
    STATE.ranking.mes = 'todos';
    return;
  }

  bar.style.display = '';
  const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  pills.innerHTML =
    `<button class="mes-pill ${STATE.ranking.mes === 'todos' ? 'active' : ''}" data-mes="todos">Todos</button>` +
    sorted.map(m =>
      `<button class="mes-pill ${STATE.ranking.mes === m ? 'active' : ''}" data-mes="${m}">${MESES_ABREV[parseInt(m, 10) - 1]}</button>`
    ).join('');
}

// ══════════════════════════════════════
//  Tabs
// ══════════════════════════════════════
function syncDestaquesVisibility() {
  const section = document.getElementById('destaques-section');
  if (!section) return;
  const activeTab = document.querySelector('.tab-btn.active');
  const tab = activeTab ? activeTab.dataset.tab : 'rankings';
  const show = (tab === 'rankings' || tab === 'recordes');
  section.style.display = show ? '' : 'none';
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      syncDestaquesVisibility();
      pushHash();
      if (isMobile()) updateMobileBar();
    });
  });
}

// ══════════════════════════════════════
//  Sidebar — toggles colapso
// ══════════════════════════════════════
function setupSidebarToggles() {
  const isMobile = window.innerWidth <= 640;
  ['ranking', 'partidas'].forEach(id => {
    const btn     = document.getElementById(`${id}-sidebar-toggle`);
    const sidebar = document.getElementById(`${id}-sidebar`);
    if (!btn || !sidebar) return;

    // No mobile, começa fechada (vira acordeão vertical)
    if (isMobile) sidebar.classList.add('collapsed');

    btn.addEventListener('click', () => {
      const collapsed = sidebar.classList.toggle('collapsed');
      if (!isMobile) {
        btn.textContent = collapsed ? '›' : '‹';
        btn.title = collapsed ? 'Expandir' : 'Recolher';
      }
    });

    // No mobile, clicar no cabeçalho inteiro também abre/fecha
    if (isMobile) {
      const header = sidebar.querySelector('.sidebar-header');
      if (header) header.style.cursor = 'pointer';
      if (header) header.addEventListener('click', e => {
        if (e.target === btn) return; // evita duplo disparo
        sidebar.classList.toggle('collapsed');
      });
    }
  });
}

// ══════════════════════════════════════
//  Toggle Jogadores / Goleiros
// ══════════════════════════════════════
function setupRankingTypeToggle() {
  document.querySelectorAll('.ranking-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ranking-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tipo = btn.dataset.tipo;
      STATE.ranking.tipo = tipo;
      document.getElementById('panel-linha').style.display    = tipo === 'linha'    ? '' : 'none';
      document.getElementById('panel-goleiros').style.display = tipo === 'goleiros' ? '' : 'none';
      const panelCorrida = document.getElementById('panel-corrida');
      if (panelCorrida) {
        panelCorrida.style.display = tipo === 'corrida' ? '' : 'none';
        if (tipo === 'corrida' && !panelCorrida.dataset.built) {
          const container = document.getElementById('corrida-chart-container');
          const corridaState = { top: 10, ano: null };
          container.innerHTML = buildCorridaChartHTML(corridaState);
          container.addEventListener('click', e => {
            const btnAnno = e.target.closest('.corrida-ano-btn');
            const btnTop  = e.target.closest('.corrida-top-btn');
            if (btnAnno) {
              container.querySelectorAll('.corrida-ano-btn').forEach(b => b.classList.remove('active'));
              btnAnno.classList.add('active');
              corridaState.ano = btnAnno.dataset.ano;
              container.querySelector('.corrida-svg-container').innerHTML =
                buildCorridaChartSVG(corridaState.top, corridaState.ano);
            }
            if (btnTop) {
              container.querySelectorAll('.corrida-top-btn').forEach(b => b.classList.remove('active'));
              btnTop.classList.add('active');
              corridaState.top = parseInt(btnTop.dataset.top, 10);
              container.querySelector('.corrida-svg-container').innerHTML =
                buildCorridaChartSVG(corridaState.top, corridaState.ano);
            }
          });
          panelCorrida.dataset.built = '1';
        }
      }
    });
  });
}

// ══════════════════════════════════════
//  Sidebar — Rankings
// ══════════════════════════════════════
function buildRankingSidebar() {
  const nav = document.getElementById('ranking-sidebar-nav');
  if (!nav) return;
  const anos = ['geral', ...DATA.meta.anos_disponiveis.slice().reverse().map(String)];

  const partidasPorAno = {};
  DATA.partidas.forEach(p => {
    const a = String(p.ano);
    partidasPorAno[a] = (partidasPorAno[a] || 0) + 1;
  });

  nav.innerHTML = anos.map(a => {
    const label = a === 'geral' ? 'Geral' : a;
    const count = partidasPorAno[a];
    const countTxt = count !== undefined ? ` <span class="sidebar-year-count">· ${count}j</span>` : '';
    const isActive = a === STATE.ranking.ano;
    return `<button class="sidebar-year-btn ${isActive ? 'active' : ''}" data-ano="${a}">${label}${countTxt}</button>`;
  }).join('');

  nav.addEventListener('click', e => {
    const yearBtn = e.target.closest('.sidebar-year-btn');
    if (yearBtn) {
      STATE.ranking.ano = yearBtn.dataset.ano;
      STATE.ranking.mes = 'todos';
      syncRankingSidebar();
      renderRanking();
    }
  });
}

function syncRankingSidebar() {
  const nav = document.getElementById('ranking-sidebar-nav');
  if (!nav) return;
  nav.querySelectorAll('.sidebar-year-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.ano === STATE.ranking.ano);
  });
}

function syncMetricaPills() {
  const wrap = document.getElementById('filter-metrica');
  if (!wrap) return;
  wrap.querySelectorAll('.pill').forEach(p => {
    p.classList.toggle('active', p.dataset.metrica === STATE.ranking.metrica);
  });
}

function syncLimitePills() {
  document.querySelectorAll('[data-limite]').forEach(p => {
    if (p.classList.contains('sidebar-sub-btn')) return;
    p.classList.toggle('active', parseInt(p.dataset.limite) === STATE.ranking.limite);
  });
}

function setupMetricaFilter() {
  const wrap = document.getElementById('filter-metrica');
  wrap.addEventListener('click', e => {
    const b = e.target.closest('button[data-metrica]');
    if (!b) return;
    STATE.ranking.metrica = b.dataset.metrica;
    STATE.ranking.ordem   = 'desc';
    wrap.querySelectorAll('.pill').forEach(p => p.classList.toggle('active', p === b));
    syncRankingSidebar();
    renderRanking();
  });
}

function setupLimiteFilter() {
  const pills = document.querySelectorAll('.pill[data-limite]');
  const wrap = pills[0]?.parentElement;
  if (!wrap) return;
  wrap.addEventListener('click', e => {
    const b = e.target.closest('button[data-limite]');
    if (!b || b.classList.contains('sidebar-sub-btn')) return;
    STATE.ranking.limite = parseInt(b.dataset.limite, 10);
    wrap.querySelectorAll('.pill').forEach(p => p.classList.toggle('active', p === b));
    syncRankingSidebar();
    renderRanking();
  });
}

// ══════════════════════════════════════
//  Render Ranking
// ══════════════════════════════════════
function formDots(partidas, n = 5) {
  return (partidas || []).slice(0, n).map(p => {
    const cls = p.resultado === 'V' ? 'dot-v' : p.resultado === 'E' ? 'dot-e' : 'dot-d';
    return `<span class="form-dot ${cls}" title="${formatDataBR(p.data)}">${p.resultado}</span>`;
  }).join('');
}

function renderRanking() {
  const ano     = STATE.ranking.ano;
  const mes     = STATE.ranking.mes;
  const metrica = STATE.ranking.metrica;
  const limite  = STATE.ranking.limite;
  const anoCorrente = String(new Date().getFullYear());
  const usarMedalhas = (ano !== anoCorrente);
  const usandoMes = (ano !== 'geral' && mes && mes !== 'todos');

  updateMesFilter();

  let totalPartidasEarly;
  if (ano === 'geral') {
    totalPartidasEarly = null;
  } else if (usandoMes) {
    totalPartidasEarly = DATA.partidas.filter(p => String(p.ano) === ano && p.data.slice(5, 7) === mes).length;
  } else {
    totalPartidasEarly = DATA.partidas.filter(p => String(p.ano) === ano).length;
  }

  const linha = [], goleiros = [];

  if (usandoMes) {
    // Computar stats mensais on-the-fly a partir das partidas
    const monthStats = computeStatsByFilter(ano, mes);
    // Precisamos de stats por jogador — recomputar individualmente
    const playerMap = {};
    DATA.partidas
      .filter(p => String(p.ano) === ano && p.data.slice(5, 7) === mes)
      .forEach(p => {
        Object.values(p.times).forEach(time => {
          time.forEach(j => {
            if (!playerMap[j.nome]) {
              playerMap[j.nome] = { nome: j.nome, jogos: 0, vitorias: 0, empates: 0, derrotas: 0, pontos: 0, gols: 0, assists: 0 };
            }
            const s = playerMap[j.nome];
            s.jogos++;
            s.gols += j.gols || 0;
            s.assists += j.assists || 0;
            if (j.resultado === 'V') { s.pontos += 3; s.vitorias++; }
            else if (j.resultado === 'E') { s.pontos += 1; s.empates++; }
            else { s.derrotas++; }
          });
        });
      });
    Object.values(playerMap).forEach(s => {
      const jData = DATA.jogadores[s.nome];
      const isGoleiro = jData ? jData.goleiro : false;
      const isArbitro = jData ? jData.arbitro : false;
      if (isArbitro) return;
      const entry = {
        nome: s.nome, goleiro: isGoleiro,
        jogos: s.jogos, vitorias: s.vitorias, empates: s.empates, derrotas: s.derrotas,
        gols: s.gols, assists: s.assists, g_a: s.gols + s.assists,
        g_a_jogo: s.jogos > 0 ? (s.gols + s.assists) / s.jogos : 0,
        pontos: s.pontos,
        aproveitamento: s.jogos > 0 ? (s.pontos / (s.jogos * 3)) * 100 : 0,
        presenca: totalPartidasEarly ? Math.round(s.jogos / totalPartidasEarly * 100) : null,
        partidas: jData ? (jData.partidas || []) : [],
      };
      if (isGoleiro) goleiros.push(entry); else linha.push(entry);
    });
  } else {
    Object.values(DATA.jogadores).forEach(j => {
      const s = ano === 'geral' ? j.geral : j.por_ano[ano];
      if (!s || s.jogos === 0) return;
      const entry = {
        nome: j.nome, goleiro: j.goleiro,
        jogos: s.jogos, vitorias: s.vitorias, empates: s.empates, derrotas: s.derrotas,
        gols: s.gols, assists: s.assists, g_a: s.g_a,
        g_a_jogo: s.jogos > 0 ? s.g_a / s.jogos : 0,
        pontos: s.pontos, aproveitamento: s.aproveitamento,
        presenca: totalPartidasEarly ? Math.round(s.jogos / totalPartidasEarly * 100) : null,
        partidas: j.partidas || [],
      };
      if (j.arbitro) return;
      if (j.goleiro) goleiros.push(entry); else linha.push(entry);
    });
  }

  const minJogos = (metrica === 'aproveitamento' || metrica === 'aproveitamento_pior')
    ? (usandoMes ? 3 : 15)
    : 0;
  const sortKey  = metrica === 'aproveitamento_pior' ? 'aproveitamento' : metrica;
  const ordem    = metrica === 'aproveitamento_pior' ? 'asc' : (STATE.ranking.ordem || 'desc');
  let sorted = linha.filter(p => p.jogos >= minJogos);
  sorted.sort((a, b) => {
    const va = a[sortKey] ?? 0, vb = b[sortKey] ?? 0;
    if (ordem === 'asc') return va !== vb ? va - vb : a.jogos - b.jogos;
    return vb !== va ? vb - va : b.jogos - a.jogos;
  });
  const view = limite > 0 ? sorted.slice(0, limite) : sorted;

  const metricaLabels = {
    pontos: '🏆 Pontos', gols: '⚽ Gols', assists: '👟 Assistências',
    g_a: '🎯 G+A', g_a_jogo: '🎯 G+A/J', aproveitamento: '📈 Aproveitamento',
    aproveitamento_pior: '📉 Pior Aproveitamento', jogos: '🏟️ Jogos',
    vitorias: '✅ Vitórias', empates: '🤝 Empates', derrotas: '❌ Derrotas',
  };
  const mesTxt = usandoMes ? ` · ${MESES_PT[parseInt(mes, 10) - 1]}` : '';
  const anoTxt = ano === 'geral' ? 'Geral' : ano;
  document.getElementById('ranking-title').textContent =
    `${metricaLabels[metrica] || 'Top'} — ${anoTxt}${mesTxt}`;
  const totalPartidas = totalPartidasEarly;

  const metaTxt = `${sorted.length} jogador${sorted.length === 1 ? '' : 'es'} de linha` +
    (minJogos > 0 ? ` (≥ ${minJogos} jogos)` : '') +
    (totalPartidas !== null ? ` · ${totalPartidas} partidas na temporada` : '') +
    ` · Última partida: ${formatDataBR(DATA.meta.ultima_partida)}`;
  document.getElementById('ranking-meta').textContent = metaTxt;

  // Mostrar/ocultar coluna de presença
  const thPresenca = document.querySelector('.th-presenca');
  if (thPresenca) thPresenca.style.display = totalPartidas !== null ? '' : 'none';

  const tbody = document.querySelector('#ranking-table tbody');
  tbody.innerHTML = view.length === 0
    ? _emptyTd(14, "search", "Nenhum dado para este filtro", "Tente outro período ou métrica")
    : view.map((p, i) => {
        const rankTd = (usarMedalhas && i < 3)
          ? `<td class="num rank-medal">${['🥇','🥈','🥉'][i]}</td>`
          : `<td class="num rank-cell">${i + 1}</td>`;
        const hl = (col) => metrica === col ? 'metric-highlight' : '';
        const dots = formDots(p.partidas);
        const presencaTd = totalPartidas !== null
          ? `<td class="num">${Math.round(p.jogos / totalPartidas * 100)}%</td>`
          : '<td class="num" style="display:none"></td>';
        return `<tr class="clickable" data-jogador="${escapeAttr(p.nome)}">
          ${rankTd}
          <td class="player-cell">${escapeHtml(p.nome)}</td>
          <td class="num bold ${hl('pontos')}">${p.pontos}</td>
          <td class="num ${hl('jogos')}">${p.jogos}</td>
          <td class="num">${p.vitorias}</td>
          <td class="num">${p.empates}</td>
          <td class="num">${p.derrotas}</td>
          <td class="num ${hl('gols')}">${p.gols}</td>
          <td class="num ${hl('assists')}">${p.assists}</td>
          <td class="num ${hl('g_a')}">${p.g_a}</td>
          <td class="num ${hl('g_a_jogo')}">${p.g_a_jogo.toFixed(2).replace('.', ',')}</td>
          <td class="num ${hl('aproveitamento') || hl('aproveitamento_pior')}">${p.aproveitamento.toFixed(1).replace('.', ',')}%</td>
          ${totalPartidas !== null
            ? `<td class="num ${metrica === 'presenca' ? 'metric-highlight' : ''}">${p.presenca}%</td>`
            : '<td class="num" style="display:none"></td>'}
          <td class="form-dots-cell"><div class="form-dots">${dots}</div></td>
        </tr>`;
      }).join('');

  tbody.onclick = e => {
    const tr = e.target.closest('tr[data-jogador]');
    if (tr) abrirJogador(tr.dataset.jogador);
  };

  // Goleiros
  const golSorted = goleiros.slice().sort((a, b) => b.pontos - a.pontos);
  const tbg = document.querySelector('#goleiros-table tbody');
  tbg.innerHTML = golSorted.length === 0
    ? _emptyTd(9, "search", "Nenhum goleiro neste período", "Tente selecionar outro ano")
    : golSorted.map((g, i) => `
        <tr class="clickable" data-jogador="${escapeAttr(g.nome)}">
          <td class="num ${(usarMedalhas && i < 3) ? 'rank-medal' : 'rank-cell'}">${(usarMedalhas && i < 3) ? ['🥇','🥈','🥉'][i] : i+1}</td>
          <td class="player-cell">${escapeHtml(g.nome.replace(' GK', '').replace(' (Goleiro)', ''))}</td>
          <td class="num">${g.jogos}</td>
          <td class="num">${g.vitorias}</td>
          <td class="num">${g.empates}</td>
          <td class="num">${g.derrotas}</td>
          <td class="num bold">${g.pontos}</td>
          <td class="num">${g.aproveitamento.toFixed(1).replace('.', ',')}%</td>
          <td class="form-dots-cell"><div class="form-dots">${formDots(g.partidas)}</div></td>
        </tr>`).join('');
  tbg.onclick = e => {
    const tr = e.target.closest('tr[data-jogador]');
    if (tr) abrirJogador(tr.dataset.jogador);
  };

  // Indicadores visuais no cabeçalho
  updateSortHeaders();
  // Atualiza status da barra mobile
  if (isMobile()) updateMobileBar();
  // Atualiza URL hash
  pushHash();
}

function updateSortHeaders() {
  const metrica = STATE.ranking.metrica;
  const ordem   = STATE.ranking.ordem;
  document.querySelectorAll('#ranking-table thead th[data-sort]').forEach(th => {
    th.classList.remove('sort-active', 'sort-asc');
    if (th.dataset.sort === metrica ||
        (metrica === 'aproveitamento_pior' && th.dataset.sort === 'aproveitamento')) {
      th.classList.add('sort-active');
      if (ordem === 'asc' || metrica === 'aproveitamento_pior') th.classList.add('sort-asc');
    }
  });
}

function setupHeaderSort() {
  const thead = document.querySelector('#ranking-table thead');
  if (!thead) return;
  thead.addEventListener('click', e => {
    const th = e.target.closest('th[data-sort]');
    if (!th) return;
    const col = th.dataset.sort;
    if (STATE.ranking.metrica === col) {
      // Mesmo col: toggle asc/desc
      STATE.ranking.ordem = STATE.ranking.ordem === 'desc' ? 'asc' : 'desc';
    } else {
      STATE.ranking.metrica = col;
      STATE.ranking.ordem   = 'desc';
      // Sync pills: ativa o pill correspondente (se existir)
      document.querySelectorAll('#filter-metrica .pill').forEach(p => {
        p.classList.toggle('active', p.dataset.metrica === col);
      });
    }
    renderRanking();
  });
}

// ══════════════════════════════════════
//  Mobile — Bottom Bar + Sheets
// ══════════════════════════════════════

const METRICA_LABELS = {
  pontos:            '🏆 Pontos',
  aproveitamento:    '📈 Aproveit.',
  aproveitamento_pior: '📉 Pior Aprov.',
  jogos:             '🏟️ Jogos',
  gols:              '⚽ Gols',
  assists:           '👟 Assists',
  g_a:               '🎯 G+A',
  g_a_jogo:          '🎯 G+A/J',
};

function isMobile() { return window.innerWidth <= 768; }

function closeMobileSheets() {
  document.getElementById('mobile-overlay').classList.remove('open');
  document.getElementById('sheet-temporada').classList.remove('open');
  document.getElementById('sheet-filtros').classList.remove('open');
  const sp = document.getElementById('sheet-partidas-temporada');
  if (sp) sp.classList.remove('open');
}

function openMobileSheet(id) {
  if (id === 'sheet-filtros')              renderSheetFiltros();
  if (id === 'sheet-temporada')            renderSheetTemporada();
  if (id === 'sheet-partidas-temporada')   renderSheetPartidasTemporada();
  document.getElementById('mobile-overlay').classList.add('open');
  document.getElementById(id).classList.add('open');
}

function updateMobileBar() {
  const el = document.getElementById('mobile-bar-status');
  const btnFilt = document.getElementById('mb-filtros');
  if (!el) return;

  const activeTab = document.querySelector('.tab-panel.active');
  const isPartidas = activeTab && activeTab.id === 'tab-partidas';

  if (isPartidas) {
    // Contexto: Partidas
    const anoLabel = STATE.partidas.ano === 'todos' ? 'Todos os anos' : STATE.partidas.ano;
    const mesLabel = STATE.partidas.mes === 'todos' ? '' : ` · ${MESES_PT[parseInt(STATE.partidas.mes, 10) - 1]}`;
    el.textContent = `${anoLabel}${mesLabel}`;
    // Esconder botão Filtros na aba Partidas (não tem filtros de métrica)
    if (btnFilt) btnFilt.style.display = 'none';
  } else {
    // Contexto: Rankings
    const anoLabel    = STATE.ranking.ano === 'geral' ? 'Geral' : STATE.ranking.ano;
    const limiteLabel = STATE.ranking.limite === 0 ? 'Todos' : `Top ${STATE.ranking.limite}`;
    const metLabel    = METRICA_LABELS[STATE.ranking.metrica] || STATE.ranking.metrica;
    el.textContent = `${metLabel} · ${limiteLabel} · ${anoLabel}`;
    if (btnFilt) btnFilt.style.display = '';
  }
}

function renderSheetTemporada() {
  const body = document.getElementById('sheet-temporada-body');
  const anos = (DATA.meta && DATA.meta.anos_disponiveis ? [...DATA.meta.anos_disponiveis].map(String).sort().reverse() : []);
  const lista = ['geral', ...anos];
  body.innerHTML = `<div class="sheet-year-list">${
    lista.map(a => `
      <button class="sheet-year-btn${STATE.ranking.ano === a ? ' active' : ''}" data-ano="${a}">
        ${a === 'geral' ? '🌐 Geral (todos os anos)' : `📅 ${a}`}
      </button>`).join('')
  }</div>`;
  body.querySelectorAll('.sheet-year-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.ranking.ano   = btn.dataset.ano;
      STATE.ranking.mes   = 'todos';
      STATE.ranking.ordem = 'desc';
      syncRankingSidebar();
      renderRanking();
      closeMobileSheets();
      updateMobileBar();
    });
  });
}

function renderSheetFiltros() {
  const body  = document.getElementById('sheet-filtros-body');
  const tipo  = STATE.ranking.tipo;
  const tipos = [
    { k: 'linha',    label: '⚽ Jogadores' },
    { k: 'goleiros', label: '🧤 Goleiros'  },
    { k: 'corrida',  label: '🏁 Corrida'   },
  ];
  const grupos = [
    { label: 'Desempenho', items: [
      { k: 'pontos',             label: '🏆 Pontos'     },
      { k: 'aproveitamento',     label: '📈 Aproveit.'  },
      { k: 'aproveitamento_pior',label: '📉 Pior Aprov.'},
      { k: 'jogos',              label: '🏟️ Jogos'      },
    ]},
    { label: 'Ataque', items: [
      { k: 'gols',     label: '⚽ Gols'   },
      { k: 'assists',  label: '👟 Assists' },
      { k: 'g_a',      label: '🎯 G+A'   },
      { k: 'g_a_jogo', label: '🎯 G+A/J' },
    ]},
  ];
  const limites = [
    { v: 10, label: 'Top 10' },
    { v: 20, label: 'Top 20' },
    { v: 0,  label: 'Todos'  },
  ];

  body.innerHTML = `
    <div class="sheet-section">
      <div class="sheet-section-label">Tipo de ranking</div>
      <div class="sheet-tipo-row">
        ${tipos.map(t => `
          <button class="sheet-tipo-btn${tipo === t.k ? ' active' : ''}" data-tipo="${t.k}">${t.label}</button>
        `).join('')}
      </div>
    </div>
    ${grupos.map(g => `
      <div class="sheet-section">
        <div class="sheet-section-label">${g.label}</div>
        <div class="sheet-pill-row">
          ${g.items.map(it => `
            <button class="sheet-pill${STATE.ranking.metrica === it.k ? ' active' : ''}" data-metrica="${it.k}">${it.label}</button>
          `).join('')}
        </div>
      </div>
    `).join('')}
    <div class="sheet-section">
      <div class="sheet-section-label">Mostrar</div>
      <div class="sheet-pill-row">
        ${limites.map(l => `
          <button class="sheet-pill${STATE.ranking.limite === l.v ? ' active' : ''}" data-limite="${l.v}">${l.label}</button>
        `).join('')}
      </div>
    </div>`;

  // Tipo
  body.querySelectorAll('.sheet-tipo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.tipo;
      STATE.ranking.tipo = t;
      // Sync desktop tabs
      document.querySelectorAll('.ranking-type-btn').forEach(b => b.classList.toggle('active', b.dataset.tipo === t));
      document.getElementById('panel-linha').style.display    = t === 'linha'    ? '' : 'none';
      document.getElementById('panel-goleiros').style.display = t === 'goleiros' ? '' : 'none';
      const pc = document.getElementById('panel-corrida');
      if (pc) {
        pc.style.display = t === 'corrida' ? '' : 'none';
        if (t === 'corrida' && !pc.dataset.built) {
          // dispara o click no desktop btn para construir o corrida chart
          document.querySelector('.ranking-type-btn[data-tipo="corrida"]')?.click();
          return;
        }
      }
      renderRanking();
      closeMobileSheets();
      updateMobileBar();
    });
  });

  // Métrica
  body.querySelectorAll('.sheet-pill[data-metrica]').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.ranking.metrica = btn.dataset.metrica;
      STATE.ranking.ordem   = 'desc';
      syncMetricaPills();
      syncRankingSidebar();
      renderRanking();
      closeMobileSheets();
      updateMobileBar();
    });
  });

  // Limite
  body.querySelectorAll('.sheet-pill[data-limite]').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.ranking.limite = parseInt(btn.dataset.limite, 10);
      syncLimitePills();
      renderRanking();
      closeMobileSheets();
      updateMobileBar();
    });
  });
}


// ── Sheet: Partidas — Temporada (ano + mês) ──
function renderSheetPartidasTemporada() {
  const body = document.getElementById('sheet-partidas-temporada-body');
  if (!body) return;

  const anos = (DATA.meta && DATA.meta.anos_disponiveis ? [...DATA.meta.anos_disponiveis].map(String).sort().reverse() : []);

  // Meses disponíveis para o ano selecionado
  const mesesPorAno = {};
  DATA.partidas.forEach(p => {
    const a = String(p.ano);
    const m = p.data.slice(5, 7);
    if (!mesesPorAno[a]) mesesPorAno[a] = new Set();
    mesesPorAno[a].add(m);
  });

  const anoAtivo = STATE.partidas.ano;
  const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  // Meses para o ano selecionado
  let mesesHtml = '';
  if (anoAtivo !== 'todos' && mesesPorAno[anoAtivo]) {
    const meses = [...mesesPorAno[anoAtivo]].sort();
    mesesHtml = `
      <div class="sheet-section">
        <div class="sheet-section-label">Mês</div>
        <div class="sheet-pill-row">
          <button class="sheet-pill${STATE.partidas.mes === 'todos' ? ' active' : ''}" data-mes="todos">Todos</button>
          ${meses.map(m => `
            <button class="sheet-pill${STATE.partidas.mes === m ? ' active' : ''}" data-mes="${m}">${MESES_ABREV[parseInt(m, 10) - 1]}</button>
          `).join('')}
        </div>
      </div>`;
  }

  body.innerHTML = `
    <div class="sheet-section">
      <div class="sheet-section-label">Ano</div>
      <div class="sheet-year-list">
        <button class="sheet-year-btn${anoAtivo === 'todos' ? ' active' : ''}" data-ano="todos">
          🌐 Todos os anos
        </button>
        ${anos.map(a => `
          <button class="sheet-year-btn${anoAtivo === a ? ' active' : ''}" data-ano="${a}">
            📅 ${a}
          </button>
        `).join('')}
      </div>
    </div>
    ${mesesHtml}`;

  // Event: Ano
  body.querySelectorAll('.sheet-year-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.partidas.ano = btn.dataset.ano;
      STATE.partidas.mes = 'todos';
      syncPartidasSidebar();
      renderPartidas();
      updateMobileBar();
      // Re-render o sheet para mostrar meses do novo ano
      renderSheetPartidasTemporada();
    });
  });

  // Event: Mês
  body.querySelectorAll('.sheet-pill[data-mes]').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.partidas.mes = btn.dataset.mes;
      syncPartidasSidebar();
      renderPartidas();
      closeMobileSheets();
      updateMobileBar();
    });
  });
}

function setupMobileTableScroll() {
  // No mobile, o browser confunde scroll horizontal da tabela com scroll vertical da página.
  // Usamos delta incremental entre eventos consecutivos para evitar o problema de trava.
  document.querySelectorAll('.table-scroll-wrap').forEach(wrap => {
    let lastX = 0, lastY = 0;
    let initX = 0, initY = 0;   // posição ao iniciar o toque
    let direcao = null;          // null=indefinida, 'h'=horizontal, 'v'=vertical

    wrap.addEventListener('touchstart', e => {
      initX  = lastX = e.touches[0].clientX;
      initY  = lastY = e.touches[0].clientY;
      direcao = null;
    }, { passive: true });

    wrap.addEventListener('touchmove', e => {
      const curX = e.touches[0].clientX;
      const curY = e.touches[0].clientY;

      // Determina direção uma única vez, com ao menos 6px de deslocamento total
      if (direcao === null) {
        const totalDx = Math.abs(curX - initX);
        const totalDy = Math.abs(curY - initY);
        if (totalDx > 6 || totalDy > 6) {
          direcao = totalDx > totalDy ? 'h' : 'v';
        }
      }

      if (direcao === 'h') {
        e.preventDefault();
        wrap.scrollLeft += lastX - curX;
      }
      // Swipe vertical: browser cuida naturalmente

      lastX = curX;
      lastY = curY;
    }, { passive: false });
  });
}

function setupMobileSheets() {
  const bar     = document.getElementById('mobile-bar');
  const btnTemp = document.getElementById('mb-temporada');
  const btnFilt = document.getElementById('mb-filtros');
  const overlay = document.getElementById('mobile-overlay');
  if (!bar || !btnTemp || !btnFilt || !overlay) return;

  // Mostrar barra nas abas Rankings E Partidas
  function syncBarVisibility() {
    const activeTab  = document.querySelector('.tab-panel.active');
    const showBar = activeTab && (activeTab.id === 'tab-rankings' || activeTab.id === 'tab-partidas');
    bar.classList.toggle('hidden', !showBar);
    updateMobileBar();
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => setTimeout(syncBarVisibility, 50));
  });
  syncBarVisibility();

  // Botões da barra — decidem qual sheet abrir conforme aba ativa
  btnTemp.addEventListener('click', () => {
    const activeTab = document.querySelector('.tab-panel.active');
    if (activeTab && activeTab.id === 'tab-partidas') {
      openMobileSheet('sheet-partidas-temporada');
    } else {
      openMobileSheet('sheet-temporada');
    }
  });
  btnFilt.addEventListener('click', () => openMobileSheet('sheet-filtros'));

  overlay.addEventListener('click', closeMobileSheets);

  updateMobileBar();
}

// ══════════════════════════════════════
//  Jogadores
// ══════════════════════════════════════
function setupBusca() {
  const inp = document.getElementById('busca-input');
  inp.addEventListener('input', () => {
    STATE.jogadores.busca = inp.value.trim().toLowerCase();
    renderJogadores();
  });
}

function renderJogadores() {
  const busca = STATE.jogadores.busca;
  let lista = Object.values(DATA.jogadores)
    .filter(j => !busca || j.nome.toLowerCase().includes(busca));
  lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const tbody = document.querySelector('#jogadores-table tbody');
  tbody.innerHTML = lista.length === 0
    ? _emptyTd(5, "search", "Nenhum jogador encontrado", "Tente outro termo de busca")
    : lista.map(j => `
        <tr class="clickable ${STATE.jogadores.selecionado === j.nome ? 'selected' : ''}"
            data-jogador="${escapeAttr(j.nome)}">
          <td class="player-cell">${escapeHtml(j.nome)}</td>
          <td class="num">${j.geral.jogos}</td>
          <td class="num bold">${j.geral.pontos}</td>
          <td class="num">${j.geral.gols}</td>
          <td class="num">${j.geral.assists}</td>
        </tr>`).join('');
  tbody.onclick = e => {
    const tr = e.target.closest('tr[data-jogador]');
    if (tr) abrirJogador(tr.dataset.jogador);
  };
}

function abrirJogador(nome) {
  document.querySelector('.tab-btn[data-tab="jogadores"]').click();
  STATE.jogadores.selecionado = nome;
  document.getElementById('jogadores-layout').classList.add('player-selected');
  renderJogadores();
  renderDetalheJogador(nome);
  document.getElementById('jogador-detalhe').scrollIntoView({ behavior: 'smooth', block: 'start' });
  pushHash();
}

function voltarParaLista() {
  STATE.jogadores.selecionado = null;
  document.getElementById('jogadores-layout').classList.remove('player-selected');
  renderJogadores();
  document.getElementById('jogador-detalhe').innerHTML =
    _emptyBlock("person", "Selecione um jogador", "Clique em um nome na lista para ver o histórico completo");
  pushHash();
}

function renderDetalheJogador(nome, anoFiltro) {
  anoFiltro = anoFiltro || 'geral';
  const j = DATA.jogadores[nome];
  const wrap = document.getElementById('jogador-detalhe');
  if (!j) { wrap.innerHTML = _emptyBlock("search", "Jogador não encontrado", "Tente pesquisar por outro nome"); return; }

  const role = j.goleiro ? 'Goleiro' : 'Jogador de linha';

  // Stats for selected period
  const s = (anoFiltro === 'geral' || !j.por_ano[anoFiltro]) ? j.geral : j.por_ano[anoFiltro];

  // Year pills
  const anosOrdenados = Object.keys(j.por_ano).sort((a, b) => Number(b) - Number(a));
  const pillsHTML = ['geral', ...anosOrdenados].map(a =>
    `<button class="perfil-year-btn ${a === anoFiltro ? 'active' : ''}" data-ano="${a}">${a === 'geral' ? 'Geral' : a}</button>`
  ).join('');

  // Tabela por temporada (always all years)
  const tabelaAno = anosOrdenados.map(a => {
    const ts = j.por_ano[a];
    return `<tr>
      <td>${a}</td>
      <td class="num">${ts.jogos}</td>
      <td class="num">${ts.vitorias}</td>
      <td class="num">${ts.empates}</td>
      <td class="num">${ts.derrotas}</td>
      ${!j.goleiro ? `<td class="num">${ts.gols}</td><td class="num">${ts.assists}</td><td class="num">${ts.gols + ts.assists}</td><td class="num">${ts.jogos > 0 ? ((ts.gols + ts.assists) / ts.jogos).toFixed(2).replace('.', ',') : '—'}</td>` : ''}
      <td class="num bold">${ts.pontos}</td>
      <td class="num">${ts.aproveitamento.toFixed(1).replace('.', ',')}%</td>
    </tr>`;
  }).join('');

  // Historico de partidas (filtered by year)
  const todasPartidas = j.partidas;
  const partidasFiltradas = anoFiltro === 'geral'
    ? todasPartidas
    : todasPartidas.filter(p => String(p.ano) === String(anoFiltro));
  const partidasExibidas = partidasFiltradas.slice(0, 200);
  const partidas = partidasExibidas.map(p => {
    const timeCls = p.time === 'Preto' ? 'badge-preto' : 'badge-branco';
    const timeIcon = p.time === 'Preto' ? '⚫' : '⚪';
    return `<tr>
      <td>${formatDataBR(p.data)}</td>
      <td><span class="badge-time ${timeCls}">${timeIcon} ${escapeHtml(p.time)}</span></td>
      <td class="num">${p.placar_p ?? '—'}–${p.placar_b ?? '—'}</td>
      <td class="row-result-${p.resultado}">${p.resultado || ''}</td>
      <td class="num">${p.gols ? `⚽ ${p.gols}` : ''}</td>
      <td class="num">${p.assists ? `👟 ${p.assists}` : ''}</td>
    </tr>`;
  }).join('');

  const golosColHead = !j.goleiro ? `<th class="num">⚽ G</th><th class="num">👟 A</th><th class="num">🎯 G+A</th><th class="num">🎯 G+A/J</th>` : '';

  wrap.innerHTML = `
    <div class="detalhe-header">
      <button class="btn-voltar" onclick="voltarParaLista()">← Voltar</button>
    </div>

    <h2>${escapeHtml(j.nome.replace(' (Goleiro)', ''))}</h2>
    <span class="role">${role}</span>

    <div class="perfil-year-filter">
      ${pillsHTML}
    </div>

    <div class="kpi-grid-v2">
      <div class="kpi-v2">
        <span class="kpi-icon-v2">🏟️</span>
        <span class="kpi-value-v2">${s.jogos}</span>
        <span class="kpi-label-v2">Jogos</span>
      </div>
      <div class="kpi-v2 kpi-accent">
        <span class="kpi-icon-v2">🏆</span>
        <span class="kpi-value-v2">${s.pontos}</span>
        <span class="kpi-label-v2">Pontos</span>
      </div>
      <div class="kpi-v2">
        <span class="kpi-icon-v2">✅</span>
        <span class="kpi-value-v2">${s.vitorias}</span>
        <span class="kpi-label-v2">Vitórias</span>
      </div>
      <div class="kpi-v2">
        <span class="kpi-icon-v2">🤝</span>
        <span class="kpi-value-v2">${s.empates}</span>
        <span class="kpi-label-v2">Empates</span>
      </div>
      <div class="kpi-v2">
        <span class="kpi-icon-v2">❌</span>
        <span class="kpi-value-v2">${s.derrotas}</span>
        <span class="kpi-label-v2">Derrotas</span>
      </div>
      ${!j.goleiro ? `
      <div class="kpi-v2">
        <span class="kpi-icon-v2">⚽</span>
        <span class="kpi-value-v2">${s.gols}</span>
        <span class="kpi-label-v2">Gols</span>
      </div>
      <div class="kpi-v2">
        <span class="kpi-icon-v2">👟</span>
        <span class="kpi-value-v2">${s.assists}</span>
        <span class="kpi-label-v2">Assists</span>
      </div>` : ''}
      <div class="kpi-v2 kpi-clickable" id="kpi-aproveitamento" title="Clique para ver evolução do aproveitamento">
        <span class="kpi-icon-v2">📈</span>
        <span class="kpi-value-v2">${s.aproveitamento.toFixed(1).replace('.', ',')}%</span>
        <span class="kpi-label-v2">Aprov. <span class="kpi-hint">▾</span></span>
      </div>
    </div>

    <div id="aprov-chart-wrap" class="aprov-chart-wrap" style="display:none"></div>

    <div class="detalhe-section">
      <h3>Por temporada</h3>
      <table class="data-table">
        <thead><tr>
          <th>Ano</th>
          <th class="num">🏟️ J</th>
          <th class="num">✅ V</th>
          <th class="num">🤝 E</th>
          <th class="num">❌ D</th>
          ${golosColHead}
          <th class="num">🏆 Pts</th>
          <th class="num">📈 %</th>
        </tr></thead>
        <tbody>${tabelaAno}</tbody>
      </table>
    </div>

    <div class="detalhe-section">
      <h3>Histórico de partidas (${partidasFiltradas.length})${partidasFiltradas.length > 200 ? ' — mostrando 200 mais recentes' : ''}</h3>
      <table class="data-table">
        <thead><tr>
          <th>Data</th>
          <th>Time</th>
          <th class="num">Placar (P–B)</th>
          <th>Res.</th>
          <th class="num">Gols</th>
          <th class="num">Assists</th>
        </tr></thead>
        <tbody>${partidas}</tbody>
      </table>
    </div>
  `;

  // Year filter pills — re-render with selected year
  wrap.querySelector('.perfil-year-filter').addEventListener('click', e => {
    const btn = e.target.closest('.perfil-year-btn');
    if (!btn) return;
    renderDetalheJogador(nome, btn.dataset.ano);
    wrap.scrollTop = 0;
    pushHash();
  });

  // Toggle grafico de aproveitamento
  const kpiAprov = document.getElementById('kpi-aproveitamento');
  const chartWrap = document.getElementById('aprov-chart-wrap');
  if (kpiAprov && chartWrap) {
    kpiAprov.addEventListener('click', () => {
      const open = chartWrap.style.display !== 'none';
      if (open) {
        chartWrap.style.display = 'none';
        kpiAprov.classList.remove('kpi-clickable--open');
      } else {
        if (!chartWrap.dataset.built) {
          chartWrap.innerHTML = buildAprovChartHTML(j.partidas);
          chartWrap.querySelector('.aprov-year-filter').addEventListener('click', e => {
            const btn = e.target.closest('.aprov-year-btn');
            if (!btn) return;
            chartWrap.querySelectorAll('.aprov-year-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const ano = btn.dataset.ano;
            const filtradas = ano === 'geral'
              ? j.partidas
              : j.partidas.filter(p => String(p.ano) === ano);
            chartWrap.querySelector('.aprov-svg-container').innerHTML = buildAprovChartSVG(filtradas);
          });
          chartWrap.dataset.built = '1';
        }
        chartWrap.style.display = '';
        kpiAprov.classList.add('kpi-clickable--open');
      }
    });
  }
}

// ══════════════════════════════════════
//  Gráfico — Aproveitamento cumulativo
// ══════════════════════════════════════
function buildAprovChartHTML(allPartidas) {
  const anos = [...new Set(allPartidas.map(p => p.ano))].sort((a, b) => b - a);
  const pills = ['geral', ...anos.map(String)].map(a =>
    `<button class="aprov-year-btn ${a === 'geral' ? 'active' : ''}" data-ano="${a}">${a === 'geral' ? 'Geral' : a}</button>`
  ).join('');
  return `
    <div class="aprov-chart-inner">
      <div class="aprov-chart-header">
        <span class="aprov-chart-title">Evolução do Aproveitamento</span>
        <div class="aprov-year-filter">${pills}</div>
      </div>
      <div class="aprov-svg-container">${buildAprovChartSVG(allPartidas)}</div>
    </div>`;
}

function buildAprovChartSVG(partidas) {
  // Cronológico (partidas vêm newest-first)
  const crono = [...partidas].reverse();
  if (crono.length < 2) return '<p class="aprov-chart-empty">Partidas insuficientes para gráfico.</p>';

  // Calcula aproveitamento cumulativo
  let pts = 0;
  const vals = crono.map((p, i) => {
    pts += p.pontos;
    return { n: i + 1, data: p.data, aprov: pts / ((i + 1) * 3) * 100 };
  });

  // Dimensões
  const W = 560, H = 200;
  const PAD = { top: 18, right: 24, bottom: 34, left: 40 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;
  const n = vals.length;

  const xScale = i => PAD.left + (i / (n - 1)) * iW;
  const yScale = v => PAD.top + iH - (v / 100) * iH;

  const pts_line = vals.map((v, i) => `${xScale(i).toFixed(1)},${yScale(v.aprov).toFixed(1)}`).join(' ');
  const area_pts =
    `${xScale(0).toFixed(1)},${(PAD.top + iH).toFixed(1)} ` +
    vals.map((v, i) => `${xScale(i).toFixed(1)},${yScale(v.aprov).toFixed(1)}`).join(' ') +
    ` ${xScale(n-1).toFixed(1)},${(PAD.top + iH).toFixed(1)}`;

  const y50  = yScale(50);
  const yTop = PAD.top;
  const yBot = PAD.top + iH;

  // Último ponto
  const last      = vals[n - 1];
  const lx        = xScale(n - 1).toFixed(1);
  const ly        = yScale(last.aprov).toFixed(1);
  const lastColor = last.aprov >= 50 ? '#22a06b' : '#e34935';

  // Grades horizontais — todas tracejadas, finas
  const yLabels = [0, 25, 50, 75, 100].map(v => {
    const y = yScale(v).toFixed(1);
    const is50 = v === 50;
    return `<line x1="${PAD.left}" y1="${y}" x2="${PAD.left + iW}" y2="${y}"
        stroke="${is50 ? '#bbb' : '#e4e4e0'}" stroke-width="${is50 ? 0.8 : 0.6}" stroke-dasharray="3,3"/>
      <text x="${PAD.left - 5}" y="${y}" text-anchor="end" dominant-baseline="middle"
        font-size="8.5" fill="#aaa">${v}%</text>`;
  }).join('');

  // Labels eixo X
  const step = n <= 20 ? 5 : n <= 50 ? 10 : n <= 100 ? 20 : 30;
  const xLabels = vals
    .filter((_, i) => i === 0 || (i + 1) % step === 0 || i === n - 1)
    .map(v => {
      const x = xScale(v.n - 1).toFixed(1);
      return `<text x="${x}" y="${yBot + 13}" text-anchor="middle" font-size="8.5" fill="#aaa">${v.n}</text>`;
    }).join('');

  // Dots com tooltip
  const dotStep = Math.max(1, Math.floor(n / 40));
  const dots = vals
    .filter((_, i) => i % dotStep === 0 || i === n - 1)
    .map(v => {
      const x   = xScale(v.n - 1).toFixed(1);
      const y   = yScale(v.aprov).toFixed(1);
      const col = v.aprov >= 50 ? '#22a06b' : '#e34935';
      return `<circle cx="${x}" cy="${y}" r="2.5" fill="${col}" opacity="0.75">
        <title>Jogo ${v.n} (${formatDataBR(v.data)}): ${v.aprov.toFixed(1).replace('.', ',')}%</title>
      </circle>`;
    }).join('');

  return `
      <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="aprov-svg">
        <defs>
          <!-- Clip: região acima de 50% (verde) -->
          <clipPath id="clipAbove">
            <rect x="${PAD.left}" y="${yTop}" width="${iW}" height="${(y50 - yTop).toFixed(1)}"/>
          </clipPath>
          <!-- Clip: região abaixo de 50% (vermelha) -->
          <clipPath id="clipBelow">
            <rect x="${PAD.left}" y="${y50.toFixed(1)}" width="${iW}" height="${(yBot - y50).toFixed(1)}"/>
          </clipPath>
          <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#22a06b" stop-opacity="0.14"/>
            <stop offset="100%" stop-color="#22a06b" stop-opacity="0.01"/>
          </linearGradient>
          <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#e34935" stop-opacity="0.01"/>
            <stop offset="100%" stop-color="#e34935" stop-opacity="0.12"/>
          </linearGradient>
        </defs>

        ${yLabels}
        ${xLabels}
        <text x="${W / 2}" y="${H - 2}" text-anchor="middle" font-size="8.5" fill="#bbb">Partidas jogadas</text>

        <!-- Áreas coloridas por região -->
        <polygon points="${area_pts}" fill="url(#gradGreen)" clip-path="url(#clipAbove)"/>
        <polygon points="${area_pts}" fill="url(#gradRed)"   clip-path="url(#clipBelow)"/>

        <!-- Linha bicolor via clipPath -->
        <polyline points="${pts_line}" fill="none" stroke="#22a06b" stroke-width="2"
          stroke-linejoin="round" clip-path="url(#clipAbove)"/>
        <polyline points="${pts_line}" fill="none" stroke="#e34935" stroke-width="2"
          stroke-linejoin="round" clip-path="url(#clipBelow)"/>
        ${dots}
        <!-- Ultimo ponto -->
        <circle cx="${lx}" cy="${ly}" r="4.5" fill="${lastColor}" stroke="white" stroke-width="2"/>
        <text x="${lx}" y="${parseFloat(ly) < yTop+18 ? parseFloat(ly)+16 : parseFloat(ly)-8}"
          text-anchor="middle" font-size="9" font-weight="700" fill="${lastColor}">${last.aprov.toFixed(1).replace('.', ',')}%</text>
      </svg>
    `;
}

const CORRIDA_PALETTE = [
  '#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f',
  '#edc948','#b07aa1','#ff9da7','#9c755f','#6b8e7b',
  '#86bcb6','#a0cbe8','#ffbe7d','#8cd17d','#b6992d',
  '#f1ce63','#499894','#d37295','#c47c5a','#79706e',
];

// Formato de nome: "R. Rondinelli", "A. Correa", "Israel"
function corridaNomeShort(nome, _todos) {
  const clean = nome.replace(' (Goleiro)', '').trim();
  const parts = clean.split(' ');
  if (parts.length === 1) return parts[0];
  const initial = parts[0][0].toUpperCase() + '.';
  const last    = parts[parts.length - 1];
  return `${initial} ${last}`;
}

function buildCorridaChartHTML(state) {
  const anos = [...new Set(DATA.partidas.map(p => String(p.ano)))].sort().reverse();
  state.ano = state.ano || anos[0];

  const yearPills = anos.map(a =>
    `<button class="aprov-year-btn corrida-ano-btn ${a === state.ano ? 'active' : ''}" data-ano="${a}">${a}</button>`
  ).join('');
  const topPills = [5, 10, 20].map(n =>
    `<button class="aprov-year-btn corrida-top-btn ${n === state.top ? 'active' : ''}" data-top="${n}">Top ${n}</button>`
  ).join('');

  return `
    <div class="aprov-chart-wrap" style="margin:8px 0 16px;">
      <div class="aprov-chart-inner">
        <div class="aprov-chart-header" style="flex-wrap:wrap; gap:8px;">
          <span class="aprov-chart-title">Corrida do Ranking — Pontos</span>
          <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
            <div class="aprov-year-filter">${yearPills}</div>
            <div class="aprov-year-filter" style="border-left:1px solid var(--border); padding-left:10px;">${topPills}</div>
          </div>
        </div>
        <div class="corrida-svg-container">${buildCorridaChartSVG(state.top, state.ano)}</div>
      </div>
    </div>`;
}

function buildCorridaChartSVG(topN, ano) {
  const MESES_ABREV = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const fmtData = iso => {
    const d = iso.slice(8, 10).replace(/^0/, '');
    const m = parseInt(iso.slice(5, 7), 10) - 1;
    return `${d}/${MESES_ABREV[m]}`;
  };

  // Dados filtrados por ano
  const partidasAno = DATA.partidas.filter(p => String(p.ano) === String(ano));
  const todasDatas  = [...new Set(partidasAno.map(p => p.data))].sort();
  const M = todasDatas.length;

  const jogadoresAno = Object.values(DATA.jogadores)
    .filter(j => !j.goleiro && j.por_ano && j.por_ano[ano] && j.por_ano[ano].jogos > 0)
    .sort((a, b) => (b.por_ano[ano]?.pontos || 0) - (a.por_ano[ano]?.pontos || 0))
    .slice(0, topN);

  if (M < 2 || jogadoresAno.length === 0)
    return '<p class="aprov-chart-empty">Dados insuficientes para este filtro.</p>';

  const todosNomes = jogadoresAno.map(j => j.nome);

  const playerLines = jogadoresAno.map((j, idx) => {
    const ptsByData = {};
    (j.partidas || [])
      .filter(p => String(p.ano) === String(ano))
      .forEach(p => { ptsByData[p.data] = (ptsByData[p.data] || 0) + p.pontos; });
    let cum = 0;
    const points = todasDatas.map(d => { cum += (ptsByData[d] || 0); return cum; });
    return {
      nome: j.nome,
      nomeShort: corridaNomeShort(j.nome, todosNomes),
      points,
      color: CORRIDA_PALETTE[idx % CORRIDA_PALETTE.length],
      idx,
    };
  });

  // — Dimensões maiores
  const W = 760, H = 340;
  const PAD = { top: 20, right: 126, bottom: 44, left: 46 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  const maxPts  = Math.max(...playerLines.map(l => l.points[M - 1]));
  const gridStep = maxPts <= 60 ? 10 : maxPts <= 120 ? 20 : maxPts <= 250 ? 50 : 100;
  const yMax    = Math.ceil((maxPts + gridStep * 0.5) / gridStep) * gridStep;

  const xScale = i => PAD.left + (M === 1 ? iW / 2 : (i / (M - 1)) * iW);
  const yScale = v => PAD.top + iH - (v / yMax) * iH;

  // Grade Y — tracejada, fina
  const gridLines = [];
  for (let v = 0; v <= yMax; v += gridStep) {
    const y = yScale(v).toFixed(1);
    gridLines.push(
      `<line x1="${PAD.left}" y1="${y}" x2="${PAD.left + iW}" y2="${y}"
        stroke="#e8e8e4" stroke-width="0.6" stroke-dasharray="3,3"/>` +
      `<text x="${PAD.left - 6}" y="${y}" text-anchor="end" dominant-baseline="middle"
        font-size="10" fill="#aaa">${v}</text>`
    );
  }

  // Linha sólida do eixo X
  const yAxis = (PAD.top + iH).toFixed(1);
  const xAxisLine = `<line x1="${PAD.left}" y1="${yAxis}" x2="${PAD.left + iW}" y2="${yAxis}"
    stroke="#ccc" stroke-width="1"/>`;

  // Labels eixo X
  const TARGET_LABELS = 7;
  let bestStep = 1, bestScore = Infinity;
  for (let s = 1; s <= M; s++) {
    const count = Math.floor((M - 1) / s) + 1;
    if (count < 2 || count > 12) continue;
    const rem   = (M - 1) % s;
    const score = Math.abs(count - TARGET_LABELS) * 10 + (rem === 0 ? 0 : 1);
    if (score < bestScore) { bestScore = score; bestStep = s; }
  }
  const xIdxSet = new Set();
  for (let i = 0; i <= M - 1; i += bestStep) xIdxSet.add(i);
  xIdxSet.add(M - 1);

  const xLabels = [...xIdxSet].sort((a, b) => a - b).map(i => {
    const x = xScale(i).toFixed(1);
    return (
      `<line x1="${x}" y1="${yAxis}" x2="${x}" y2="${(PAD.top + iH + 4).toFixed(1)}" stroke="#ccc" stroke-width="1"/>` +
      `<text x="${x}" y="${(PAD.top + iH + 16).toFixed(1)}" text-anchor="middle" font-size="10" fill="#aaa">${fmtData(todasDatas[i])}</text>`
    );
  }).join('');

  // Anti-sobreposição de labels finais
  const MIN_SP = 13;
  const labelData = playerLines
    .map(pl => ({ nome: pl.nomeShort, color: pl.color, y: yScale(pl.points[M - 1]), idx: pl.idx }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < labelData.length; i++) {
    if (labelData[i].y - labelData[i - 1].y < MIN_SP)
      labelData[i].y = labelData[i - 1].y + MIN_SP;
  }
  const labelByIdx = {};
  labelData.forEach(l => { labelByIdx[l.idx] = l; });

  // Grupos por jogador
  const xLbl = (PAD.left + iW + 7).toFixed(1);
  const playerGroups = playerLines.map(pl => {
    const pts = pl.points.map((v, i) =>
      `${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`
    ).join(' ');
    const fx  = xScale(M - 1).toFixed(1);
    const fy  = yScale(pl.points[M - 1]).toFixed(1);
    const lbl = labelByIdx[pl.idx];
    return `<g class="c-line">
      <polyline class="c-hit" points="${pts}" fill="none" stroke="transparent" stroke-width="14"/>
      <polyline class="c-vis" points="${pts}" fill="none" stroke="${pl.color}" stroke-width="2"
        stroke-linejoin="round" stroke-linecap="round">
        <title>${escapeHtml(pl.nome)}: ${pl.points[M - 1]} pts</title>
      </polyline>
      <circle cx="${fx}" cy="${fy}" r="3.5" fill="${pl.color}" stroke="white" stroke-width="1.5"/>
      <text x="${xLbl}" y="${lbl.y.toFixed(1)}" dominant-baseline="middle"
        font-size="10" font-weight="600" fill="${pl.color}">${escapeHtml(pl.nomeShort)}</text>
    </g>`;
  }).join('\n    ');

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="aprov-svg">
    <rect x="0" y="0" width="${W}" height="${H}" fill="white"/>
    ${gridLines.join('\n    ')}
    ${xAxisLine}
    ${xLabels}
    ${playerGroups}
  </svg>`;
}


// ══════════════════════════════════════
//  Sidebar — Partidas
// ══════════════════════════════════════
function buildPartidasSidebar() {
  const nav = document.getElementById('partidas-sidebar-nav');
  if (!nav) return;

  const anos = [...DATA.meta.anos_disponiveis.slice().reverse().map(String)];

  // Meses disponíveis e contagem de partidas por ano
  const mesesPorAno = {};
  const contagemPorAno = {};
  DATA.partidas.forEach(p => {
    const a = String(p.ano);
    const m = p.data.slice(5, 7);
    if (!mesesPorAno[a]) mesesPorAno[a] = new Set();
    mesesPorAno[a].add(m);
    contagemPorAno[a] = (contagemPorAno[a] || 0) + 1;
  });

  const todosItem = `
    <div class="sidebar-year-item">
      <button class="sidebar-year-btn ${STATE.partidas.ano === 'todos' ? 'active' : ''}" data-ano="todos">
        <span class="chevron">—</span>
        <span>Todos</span>
      </button>
    </div>`;

  const anosItems = anos.map(a => {
    const isActive = STATE.partidas.ano === a;
    const meses = mesesPorAno[a] ? [...mesesPorAno[a]].sort() : [];
    const mesesBtns = [
      `<button class="sidebar-sub-btn ${isActive && STATE.partidas.mes === 'todos' ? 'active' : ''}"
        data-ano="${a}" data-mes="todos">Todos os meses</button>`,
      ...meses.map(m => {
        const label = MESES_PT[parseInt(m, 10) - 1];
        return `<button class="sidebar-sub-btn ${isActive && STATE.partidas.mes === m ? 'active' : ''}"
          data-ano="${a}" data-mes="${m}">${label}</button>`;
      })
    ].join('');

    return `
      <div class="sidebar-year-item">
        <button class="sidebar-year-btn ${isActive ? 'active' : ''}" data-ano="${a}">
          <span class="chevron">${isActive ? '▾' : '▸'}</span>
          <span>${a}</span>
          ${contagemPorAno[a] ? `<span class="sidebar-year-count">${contagemPorAno[a]}j</span>` : ''}
        </button>
        <div class="sidebar-year-sub ${isActive ? 'open' : ''}">
          ${mesesBtns}
        </div>
      </div>`;
  }).join('');

  nav.innerHTML = todosItem + anosItems;

  nav.addEventListener('click', e => {
    const subBtn  = e.target.closest('.sidebar-sub-btn');
    const yearBtn = e.target.closest('.sidebar-year-btn');

    if (subBtn) {
      STATE.partidas.ano = subBtn.dataset.ano;
      STATE.partidas.mes = subBtn.dataset.mes || 'todos';
      syncPartidasSidebar();
      renderPartidas();
      return;
    }

    if (yearBtn) {
      const ano = yearBtn.dataset.ano;
      if (ano === 'todos') {
        STATE.partidas.ano = 'todos';
        STATE.partidas.mes = 'todos';
      } else {
        STATE.partidas.ano = ano;
        STATE.partidas.mes = 'todos';
        const item = yearBtn.closest('.sidebar-year-item');
        const sub  = item.querySelector('.sidebar-year-sub');
        if (sub) {
          nav.querySelectorAll('.sidebar-year-sub').forEach(s => { if (s !== sub) s.classList.remove('open'); });
          nav.querySelectorAll('.sidebar-year-btn .chevron').forEach(c => { c.textContent = '▸'; });
          sub.classList.toggle('open');
          yearBtn.querySelector('.chevron').textContent = sub.classList.contains('open') ? '▾' : '▸';
        }
      }
      syncPartidasSidebar();
      renderPartidas();
    }
  });
}

function syncPartidasSidebar() {
  const nav = document.getElementById('partidas-sidebar-nav');
  if (!nav) return;
  nav.querySelectorAll('.sidebar-year-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.ano === STATE.partidas.ano);
  });
  nav.querySelectorAll('.sidebar-sub-btn').forEach(btn => {
    let active = false;
    if (btn.dataset.ano !== STATE.partidas.ano) { btn.classList.remove('active'); return; }
    if (btn.dataset.mes) active = btn.dataset.mes === STATE.partidas.mes;
    btn.classList.toggle('active', active);
  });
}

function setupBuscaPartida() {
  const inp = document.getElementById('busca-partida');
  if (!inp) return;
  inp.addEventListener('input', () => {
    STATE.partidas.busca = inp.value.trim().toLowerCase();
    renderPartidas();
  });
}

// ══════════════════════════════════════
//  Partidas
// ══════════════════════════════════════
function renderPartidas() {
  const { ano, mes, busca } = STATE.partidas;
  const wrap = document.getElementById('partidas-content');
  if (!wrap) return;

  let lista = DATA.partidas.slice();

  if (ano !== 'todos') lista = lista.filter(p => String(p.ano) === ano);
  if (mes !== 'todos') lista = lista.filter(p => p.data.slice(5, 7) === mes);

  if (busca) {
    lista = lista.filter(p => {
      const dataFmt = formatDataBR(p.data).toLowerCase();
      if (dataFmt.includes(busca)) return true;
      return Object.values(p.times).some(time =>
        time.some(j => j.nome.toLowerCase().includes(busca))
      );
    });
  }

  if (lista.length === 0) {
    wrap.innerHTML = _emptyBlock("calendar", "Nenhuma partida encontrada", "Tente outro período ou termo de busca");
    return;
  }

  // Agrupar por ano-mês
  const grupos = {};
  lista.forEach(p => {
    const key = p.data.slice(0, 7);
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(p);
  });

  const keys = Object.keys(grupos).sort().reverse();
  wrap.innerHTML = keys.map(key => {
    const [y, m] = key.split('-');
    const mesLabel = `${MESES_PT[parseInt(m, 10) - 1]} ${y}`;
    const partidas = grupos[key];
    return `
      <div class="mes-grupo">
        <div class="mes-header">
          <button class="mes-toggle" data-mes-key="${key}">
            <span class="mes-chevron">▾</span>
            <span class="mes-label">${mesLabel}</span>
          </button>
          <span class="mes-count">${partidas.length} partida${partidas.length > 1 ? 's' : ''}</span>
        </div>
        <div class="partidas-list-mes" data-mes-body="${key}">
          ${partidas.map(p => renderPartidaCard(p)).join('')}
        </div>
      </div>`;
  }).join('');

  wrap.onclick = e => {
    const toggleBtn = e.target.closest('.mes-toggle');
    if (toggleBtn) {
      const key = toggleBtn.dataset.mesKey;
      const body = wrap.querySelector(`.partidas-list-mes[data-mes-body="${key}"]`);
      if (body) {
        const collapsed = body.classList.toggle('collapsed');
        const chevron = toggleBtn.querySelector('.mes-chevron');
        if (chevron) chevron.textContent = collapsed ? '▸' : '▾';
      }
      return;
    }
    const li = e.target.closest('li[data-jogador]');
    if (li) abrirJogador(li.dataset.jogador);
  };

  pushHash();
}

// ══════════════════════════════════════
//  Mapa de posições — ordenação nos cards
// ══════════════════════════════════════
const POS_ORDEM = { 'GK': 0, 'ZAG': 1, 'LAT': 2, 'MEI': 3, 'ATA': 4, 'EXT': 5 };

const POSICOES = {
  // GK
  'Weto GK': 'GK', 'Santos GK': 'GK', 'Eryk GK': 'GK', 'Joao GK': 'GK',
  'Adriano GK': 'GK', 'Caio Coimbra GK': 'GK', 'Thiago GK': 'GK',
  'Kadu GK': 'GK', 'Axel GK': 'GK', 'Jeff GK': 'GK', 'Michel GK': 'GK', 'Neneca GK': 'GK',
  // ZAG
  'C9': 'ZAG', 'Menta': 'ZAG', 'Pato': 'ZAG', 'Vico': 'ZAG',
  'Pepe': 'ZAG', 'Bruno Barboza': 'ZAG', 'Curvello': 'ZAG', 'Pet': 'ZAG', 'Gaucho': 'ZAG',
  // LAT
  'Andre Lo Fiego': 'LAT', 'Rafa Rondinelli': 'LAT', 'Johnny Saraiva': 'LAT',
  'Pu': 'LAT', 'Sertã': 'LAT', 'Victor Leubeck': 'LAT', 'Saulo Belo': 'LAT',
  'Paulo Avelino': 'LAT', 'Taz': 'LAT', 'Serginho': 'LAT',
  // MEI
  'Zinho': 'MEI', 'Charif': 'MEI', 'Thiaguinho': 'MEI', 'Marquinhos': 'MEI',
  'Bill': 'MEI', 'Caio Youle': 'MEI', 'Joaquim Mariani': 'MEI', 'Jonny Salgado': 'MEI',
  'Ferneda (Brone)': 'MEI', 'Rato': 'MEI', 'Musa': 'MEI', 'Digo Miranda': 'MEI',
  'Luca': 'MEI', 'Boesel': 'MEI', 'Artur Cunha': 'MEI', 'Vh': 'MEI',
  'Nico': 'MEI', 'Jp Lemos': 'MEI',
  // ATA
  'Renatao': 'ATA', 'Bertazzi': 'ATA', 'Fabregas': 'ATA', 'Tavora': 'ATA',
};

function renderPartidaCard(p) {
  const times = Object.keys(p.times);

  // \u2500\u2500 Extrair \u00E1rbitro do bucket "Juiz" \u2500\u2500
  const juizPlayers = p.times['Juiz'] || [];
  const arbitroNome = juizPlayers.length
    ? juizPlayers[0].nome.replace(' (Juiz)', '').replace(' JUIZ', '')
    : '';

  // \u2500\u2500 Separar GKs do bucket vazio e distribu\u00ED-los nos times \u2500\u2500
  const emptyBucket = (p.times[''] || []).slice();
  const teamKeys = times.filter(t => t !== '' && t !== 'Juiz');
  const realTeams = teamKeys.filter(t => t === 'Preto' || t === 'Branco');

  // Build enriched copies of team arrays with GKs injected
  const enriched = {};
  teamKeys.forEach(t => { enriched[t] = p.times[t].slice(); });

  const gksFromEmpty = [];
  const nonGksFromEmpty = [];
  emptyBucket.forEach(pl => {
    const isGK = pl.nome.includes(' GK') || pl.nome.includes('(Goleiro)');
    if (isGK) gksFromEmpty.push(pl);
    else nonGksFromEmpty.push(pl);
  });

  // Distribute GKs into real teams (one per team when possible)
  if (realTeams.length >= 2 && gksFromEmpty.length > 0) {
    gksFromEmpty.forEach((gk, i) => {
      const target = realTeams[i % realTeams.length];
      enriched[target].push(gk);
    });
  } else if (realTeams.length === 1 && gksFromEmpty.length > 0) {
    gksFromEmpty.forEach(gk => enriched[realTeams[0]].push(gk));
  }
  // If no real teams exist (old matches), GKs stay with nonGksFromEmpty
  if (realTeams.length === 0) {
    gksFromEmpty.forEach(gk => nonGksFromEmpty.push(gk));
  }

  // \u2500\u2500 Ordered team keys (Preto first, then Branco, then others; skip "", "Juiz") \u2500\u2500
  const ordem = ['Preto', 'Branco', ...teamKeys.filter(t => t !== 'Preto' && t !== 'Branco')];
  const timesOrd = ordem.filter(t => teamKeys.includes(t));

  // \u2500\u2500 Header: data + \u00E1rbitro \u2500\u2500
  const headerHtml = arbitroNome
    ? `<div class="partida-header-v2">
        <span class="partida-data-v2">${formatDataBR(p.data)}</span>
        <span class="partida-arbitro-v2">${escapeHtml(arbitroNome)}</span>
      </div>`
    : `<div class="partida-data-v2">${formatDataBR(p.data)}</div>`;

  const placarHtml = `<div class="placar-v2">
        <div class="placar-team">
          <span class="placar-label"><span class="badge-circle preto"></span><span class="placar-nome">Preto</span></span>
          <span class="placar-score">${p.placar_p ?? '\u2014'}</span>
        </div>
        <span class="placar-sep">\u00D7</span>
        <div class="placar-team placar-team-right">
          <span class="placar-score">${p.placar_b ?? '\u2014'}</span>
          <span class="placar-label"><span class="placar-nome">Branco</span><span class="badge-circle branco"></span></span>
        </div>
      </div>`;

  function renderPlayerLi(j) {
    const tags = [];
    if (j.gols)    tags.push(`<span class="stat-icon">\u26BD${j.gols > 1 ? ' '+j.gols : ''}</span>`);
    if (j.assists) tags.push(`<span class="stat-icon">\uD83D\uDC5F${j.assists > 1 ? ' '+j.assists : ''}</span>`);
    const tagStr = tags.length ? `<span class="stat-tags">${tags.join('')}</span>` : '';
    const displayName = j.nome.replace(' (Goleiro)', '');
    const isGK = j.nome.includes(' GK') || j.nome.includes('(Goleiro)');
    const gkTag = isGK ? '<span class="gk-tag">GK</span>' : '';
    return `<li data-jogador="${escapeAttr(j.nome)}" class="clickable">
              <span class="jog-nome">${escapeHtml(displayName)}${gkTag}</span>${tagStr}
            </li>`;
  }

  const escalacaoHtml = `<div class="escalacao-v2">${
    timesOrd.map(t => {
      const jogadores = enriched[t]
        .slice()
        .sort((a, b) => {
          const posA = POS_ORDEM[POSICOES[a.nome] ?? 'EXT'] ?? 5;
          const posB = POS_ORDEM[POSICOES[b.nome] ?? 'EXT'] ?? 5;
          if (posA !== posB) return posA - posB;
          return (b.gols + b.assists) - (a.gols + a.assists) || a.nome.localeCompare(b.nome, 'pt-BR');
        })
        .map(renderPlayerLi).join('');
      return `<div class="time-col">
        <h4 class="time-col-header">${t === 'Preto' ? '\u26AB' : '\u26AA'} ${escapeHtml(t)}</h4>
        <ul>${jogadores}</ul>
      </div>`;
    }).join('')
  }${
    // Old matches with no team data: show all players in a single column
    nonGksFromEmpty.length > 0 && timesOrd.length === 0
      ? `<div class="time-col time-col-full">
          <h4 class="time-col-header">Jogadores</h4>
          <ul>${nonGksFromEmpty
            .sort((a, b) => (b.gols + b.assists) - (a.gols + a.assists) || a.nome.localeCompare(b.nome, 'pt-BR'))
            .map(renderPlayerLi).join('')}</ul>
         </div>`
      : ''
  }</div>`;

  return `<article class="partida-card-v2">
    ${headerHtml}
    ${placarHtml}
    ${escalacaoHtml}
  </article>`;
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
//  Sobre
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// ══════════════════════════════════════
//  Recordes e curiosidades
// ══════════════════════════════════════
// ══════════════════════════════════════
//  Head-to-Head
// ══════════════════════════════════════
function computeH2H(nome1, nome2, anoFiltro) {
  const j1 = DATA.jogadores[nome1];
  const j2 = DATA.jogadores[nome2];
  const map1 = new Map(j1.partidas.map(p => [p.data, p]));
  const map2 = new Map(j2.partidas.map(p => [p.data, p]));
  let comuns = [...map1.keys()].filter(d => map2.has(d));

  // Filtro de ano
  if (anoFiltro && anoFiltro !== 'geral') {
    comuns = comuns.filter(d => d.startsWith(anoFiltro + '-'));
  }

  const r = { total: comuns.length, mesmo_time: 0, opostos: 0,
              j1: {v:0,e:0,d:0,pts:0,gols:0,assists:0},
              j2: {v:0,e:0,d:0,pts:0,gols:0,assists:0},
              juntos: {v:0,e:0,d:0,pts:0,gols1:0,gols2:0,assists1:0,assists2:0} };

  for (const dt of comuns) {
    const p1 = map1.get(dt), p2 = map2.get(dt);
    r.j1.gols    += p1.gols;    r.j2.gols    += p2.gols;
    r.j1.assists += p1.assists; r.j2.assists += p2.assists;
    const t1 = p1.time || '';
    const t2 = p2.time || '';
    // Se um dos dois não tem time conhecido → conta como mesmo_time (indeterminado)
    if (!t1 || !t2 || t1 === t2) {
      r.mesmo_time++;
      // Como dupla: contribuição individual de cada um nessas partidas
      r.juntos.gols1    += p1.gols;    r.juntos.gols2    += p2.gols;
      r.juntos.assists1 += p1.assists; r.juntos.assists2 += p2.assists;
      // Mesmo time → resultado compartilhado. Prefere o registrado; senão deduz pelo placar.
      const resD = p1.resultado || p2.resultado || deduceResultado(p1) || deduceResultado(p2);
      r.juntos.v += resD==='V'?1:0; r.juntos.e += resD==='E'?1:0;
      r.juntos.d += resD==='D'?1:0; r.juntos.pts += (resD==='V'?3:resD==='E'?1:0);
    } else {
      r.opostos++;
      let res1 = p1.resultado || deduceResultado(p1);
      let res2 = p2.resultado || deduceResultado(p2);
      // Se um lado vazio, infere pelo oposto
      if (!res1 && res2) res1 = res2==='V'?'D':res2==='D'?'V':'E';
      if (!res2 && res1) res2 = res1==='V'?'D':res1==='D'?'V':'E';
      // Se ambos conhecidos mas inconsistentes (ex: ambos 'D'), confia no placar
      const opp = {'V':'D','D':'V','E':'E'};
      if (res1 && res2 && opp[res1] !== res2) {
        const ded1 = deduceResultado(p1);
        const ded2 = deduceResultado(p2);
        if (ded1) { res1 = ded1; res2 = opp[ded1]; }
        else if (ded2) { res2 = ded2; res1 = opp[ded2]; }
      }
      r.j1.v += res1==='V'?1:0; r.j1.e += res1==='E'?1:0;
      r.j1.d += res1==='D'?1:0; r.j1.pts += (res1==='V'?3:res1==='E'?1:0);
      r.j2.v += res2==='V'?1:0; r.j2.e += res2==='E'?1:0;
      r.j2.d += res2==='D'?1:0; r.j2.pts += (res2==='V'?3:res2==='E'?1:0);
    }
  }
  return r;
}

function deduceResultado(p) {
  // Tenta deduzir resultado pelo placar e time quando resultado está ausente
  if (p.placar_p == null || p.placar_b == null) return '';
  const isPP = (p.time === 'Preto' || p.time === 'Azul');
  const golosPro  = isPP ? p.placar_p : p.placar_b;
  const golosContra = isPP ? p.placar_b : p.placar_p;
  if (golosPro > golosContra) return 'V';
  if (golosPro < golosContra) return 'D';
  return 'E';
}

function renderH2H(nome1, nome2, anoFiltro) {
  const el = document.getElementById('h2h-result');
  if (!el) return;
  if (!nome1 || !nome2 || nome1 === nome2) { el.innerHTML = ''; return; }
  anoFiltro = anoFiltro || 'geral';

  const ano = anoFiltro === 'geral' ? null : anoFiltro;
  const g1  = (ano && DATA.jogadores[nome1].por_ano[ano]) ? DATA.jogadores[nome1].por_ano[ano] : DATA.jogadores[nome1].geral;
  const g2  = (ano && DATA.jogadores[nome2].por_ano[ano]) ? DATA.jogadores[nome2].por_ano[ano] : DATA.jogadores[nome2].geral;
  const h2h = computeH2H(nome1, nome2, anoFiltro);

  function pct(v1, v2) {
    const t = v1 + v2;
    if (t === 0) return [50, 50];
    return [Math.round(v1 / t * 100), Math.round(v2 / t * 100)];
  }

  function brow(lbl, v1, v2, sfx, higher) {
    if (higher === undefined) higher = true;
    const [p1, p2] = pct(+v1, +v2);
    const j1w = higher ? +v1 > +v2 : +v1 < +v2;
    const j2w = higher ? +v2 > +v1 : +v2 < +v1;
    const c1 = j1w ? ' win' : ''; const c2 = j2w ? ' win' : '';
    const d1 = sfx ? v1 + sfx : v1; const d2 = sfx ? v2 + sfx : v2;
    return `<div class="h2h-brow">
      <span class="h2h-bval left${c1}">${d1}</span>
      <div class="h2h-bhalf left"><div class="h2h-bfill${c1}" style="width:${p1}%"></div></div>
      <span class="h2h-blbl">${lbl}</span>
      <div class="h2h-bhalf right"><div class="h2h-bfill${c2}" style="width:${p2}%"></div></div>
      <span class="h2h-bval right${c2}">${d2}</span>
    </div>`;
  }

  const noJogos = h2h.total === 0;

  el.innerHTML = `
    <div class="h2h-panel">
      <div class="h2h-header">
        <span class="h2h-pname left">${nome1}</span>
        <span class="h2h-vsbadge">⚔️ vs</span>
        <span class="h2h-pname right">${nome2}</span>
      </div>
      <p class="h2h-sec-lbl">Estatísticas gerais</p>
      ${brow('jogos',    g1.jogos,          g2.jogos)}
      ${brow('pontos',   g1.pontos,         g2.pontos)}
      ${brow('aprov. %', g1.aproveitamento, g2.aproveitamento, '%')}
      ${brow('gols',     g1.gols,           g2.gols)}
      ${brow('assists',  g1.assists,        g2.assists)}
      ${brow('g+a',      g1.g_a,            g2.g_a)}
      <hr class="h2h-divider">
      ${noJogos
        ? '<p class="h2h-empty">Esses jogadores nunca jogaram juntos.</p>'
        : `<div class="h2h-together">
            <span>Jogaram em <strong>${h2h.total}</strong> partidas juntos</span>
            <span>Mesmo time: <strong>${h2h.mesmo_time}</strong></span>
            <span>Frente a frente: <strong>${h2h.opostos}</strong></span>
           </div>
           ${h2h.opostos > 0 ? `
           <p class="h2h-sec-lbl" style="margin-top:14px">Frente a frente — ${h2h.opostos} partidas</p>
           ${brow('vitórias', h2h.j1.v,   h2h.j2.v)}
           ${brow('empates',  h2h.j1.e,   h2h.j2.e)}
           ${brow('pontos',   h2h.j1.pts, h2h.j2.pts)}
           ${brow('gols',     h2h.j1.gols,h2h.j2.gols)}
           ` : ''}
           ${h2h.mesmo_time > 0 ? `
           <p class="h2h-sec-lbl" style="margin-top:18px">Como dupla — ${h2h.mesmo_time} partidas no mesmo time</p>
           <div class="h2h-duo-cards">
             <div class="h2h-duo-card v"><span class="h2h-duo-num">${h2h.juntos.v}</span><span class="h2h-duo-lbl">vitórias</span></div>
             <div class="h2h-duo-card e"><span class="h2h-duo-num">${h2h.juntos.e}</span><span class="h2h-duo-lbl">empates</span></div>
             <div class="h2h-duo-card d"><span class="h2h-duo-num">${h2h.juntos.d}</span><span class="h2h-duo-lbl">derrotas</span></div>
             <div class="h2h-duo-card a"><span class="h2h-duo-num">${(() => { const cls = h2h.juntos.v + h2h.juntos.e + h2h.juntos.d; return cls > 0 ? Math.round(h2h.juntos.pts / (cls*3) * 100) : 0; })()}%</span><span class="h2h-duo-lbl">aproveit.</span></div>
           </div>
           <p class="h2h-sec-lbl" style="margin-top:12px">Contribuição individual</p>
           ${brow('gols',    h2h.juntos.gols1,    h2h.juntos.gols2)}
           ${brow('assists', h2h.juntos.assists1, h2h.juntos.assists2)}
           ` : ''}`}
    </div>`;
}

function renderRecordes() {
  const wrap = document.getElementById('recordes-content');
  if (!wrap || !DATA) return;

  const partidas   = DATA.partidas;
  const totalP     = DATA.meta.total_partidas;
  const linhaJogs  = Object.values(DATA.jogadores).filter(j => !j.goleiro);
  const linhaMin   = linhaJogs.filter(j => j.geral.jogos >= 5);

  // ── Recordes de partida ──────────────────────────────────────────
  const maiorGoleada = partidas.reduce((mx, p) =>
    Math.abs(p.placar_p - p.placar_b) > Math.abs(mx.placar_p - mx.placar_b) ? p : mx);
  const maisGolsP = partidas.reduce((mx, p) =>
    (p.placar_p + p.placar_b) > (mx.placar_p + mx.placar_b) ? p : mx);

  // ── Recordes de jogador ──────────────────────────────────────────
  const artilheiro = linhaMin.reduce((mx, j) => j.geral.gols > mx.geral.gols ? j : mx);
  const maisJogos  = linhaJogs.reduce((mx, j) => j.geral.jogos > mx.geral.jogos ? j : mx);

  // Mais G+A numa partida
  let maisGA = { nome: '', ga: 0, gols: 0, assists: 0, data: '' };
  for (const j of linhaMin) {
    for (const p of j.partidas) {
      const ga = p.gols + p.assists;
      if (ga > maisGA.ga) maisGA = { nome: j.nome, ga, gols: p.gols, assists: p.assists, data: p.data };
    }
  }

  // Mais gols numa partida (jogador)
  let maisGolsJ = { nome: '', gols: 0, data: '' };
  for (const j of linhaMin) {
    for (const p of j.partidas) {
      if (p.gols > maisGolsJ.gols) maisGolsJ = { nome: j.nome, gols: p.gols, data: p.data };
    }
  }

  // Sequência de resultados
  function maxStreak(jog, res) {
    const pts = [...jog.partidas].sort((a, b) => a.data.localeCompare(b.data));
    let mx = 0, cur = 0;
    for (const p of pts) { res.includes(p.resultado) ? (cur++, mx = Math.max(mx, cur)) : (cur = 0); }
    return mx;
  }
  const linhaStreak = linhaJogs.filter(j => j.geral.jogos >= 30);
  const svMap   = linhaStreak.map(j => ({ nome: j.nome, s: maxStreak(j, ['V']) })).sort((a,b) => b.s-a.s);
  const invMap  = linhaStreak.map(j => ({ nome: j.nome, s: maxStreak(j, ['V','E']) })).sort((a,b) => b.s-a.s);

  // Mais regular (% presença)
  const regular = linhaMin
    .filter(j => j.geral.jogos >= 20)
    .map(j => ({ nome: j.nome, jogos: j.geral.jogos, pct: +(j.geral.jogos / totalP * 100).toFixed(1) }))
    .sort((a, b) => b.pct - a.pct)[0];

  // ── Helpers ──────────────────────────────────────────────────────
  function fmt(d) { const [y,m,dd]=d.split('-'); return `${dd}/${m}/${y}`; }
  function tied(arr) {
    const best = arr[0].s;
    const names = arr.filter(x => x.s === best).map(x => x.nome);
    return { names: names.slice(0,2).join(' e '), s: best, extra: names.length > 2 ? ` +${names.length-2}` : '' };
  }

  function recCard(emoji, titulo, holder, valor, ctx, clickNome) {
    const cls = clickNome ? ' rec-card--link" data-jogador="' + clickNome + '"' : '"';
    return `<div class="rec-card${cls}>
      <div class="rec-icon">${emoji}</div>
      <div class="rec-body">
        <div class="rec-titulo">${titulo}</div>
        <div class="rec-holder">${holder}</div>
        <div class="rec-valor">${valor}</div>
        ${ctx ? `<div class="rec-ctx">${ctx}</div>` : ''}
      </div>
    </div>`;
  }

  const sv  = tied(svMap);
  const inv = tied(invMap);

  wrap.innerHTML = `
    <div class="rec-wrap">
      <h3 class="rec-section-title">🏟️ Recordes de Partida</h3>
      <div class="rec-grid">
        ${recCard('🔥','Mais Gols numa Partida',
          `Preto ${maisGolsP.placar_p} × ${maisGolsP.placar_b} Branco`,
          `${maisGolsP.placar_p + maisGolsP.placar_b} gols no total`,
          fmt(maisGolsP.data))}
        ${recCard('💥','Maior Goleada',
          `Preto ${maiorGoleada.placar_p} × ${maiorGoleada.placar_b} Branco`,
          `${Math.abs(maiorGoleada.placar_p - maiorGoleada.placar_b)} gols de diferença`,
          fmt(maiorGoleada.data))}
      </div>

      <h3 class="rec-section-title">👤 Recordes de Jogador</h3>
      <div class="rec-grid">
        ${recCard('⚽','Artilheiro Histórico',
          artilheiro.nome, `${artilheiro.geral.gols} gols`,
          `em ${artilheiro.geral.jogos} partidas`, artilheiro.nome)}
        ${recCard('⚡','Mais Gols numa Partida',
          maisGolsJ.nome, `${maisGolsJ.gols} gols`,
          fmt(maisGolsJ.data), maisGolsJ.nome)}
        ${recCard('🎯','Mais G+A numa Partida',
          maisGA.nome, `${maisGA.gols}G + ${maisGA.assists}A`,
          fmt(maisGA.data), maisGA.nome)}
        ${recCard('🏟️','Mais Jogos',
          maisJogos.nome, `${maisJogos.geral.jogos} partidas`,
          `desde ${DATA.meta.primeira_partida.slice(0,4)}`, maisJogos.nome)}
        ${regular ? recCard('📅','Mais Regular',
          regular.nome, `${regular.pct}% de presença`,
          `${regular.jogos} de ${totalP} partidas`, regular.nome) : ''}
        ${recCard('🏆','Maior Sequência de Vitórias',
          sv.names + sv.extra, `${sv.s} vitórias seguidas`, '')}
        ${recCard('🛡️','Maior Sequência Invicto',
          inv.names + inv.extra, `${inv.s} jogos sem derrota`, '')}
      </div>
    </div>`;


  // Clique nos cards de jogador → navega para o perfil
  wrap.querySelectorAll('.rec-card--link').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      const nome = card.dataset.jogador;
      document.querySelector('[data-tab="jogadores"]').click();
      setTimeout(() => abrirJogador(nome), 60);
    });
  });
}


// ══════════════════════════════════════
//  Aba Comparar (H2H)
// ══════════════════════════════════════
function renderComparar() {
  const wrap = document.getElementById('comparar-content');
  if (!wrap || !DATA) return;

  const linhaJogs = Object.values(DATA.jogadores)
    .filter(j => !j.goleiro && j.geral.jogos >= 5)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const h2hOpts = linhaJogs.map(j =>
    `<option value="${j.nome}">${j.nome} (${j.geral.jogos}j)</option>`).join('');

  const anos = DATA.meta.anos_disponiveis.slice().reverse();
  const anoPills = ['geral', ...anos.map(String)].map((a, i) =>
    `<button class="pill${i===0?' active':''}" data-ano="${a}">${a === 'geral' ? 'Geral' : a}</button>`
  ).join('');

  wrap.innerHTML = `
    <div class="h2h-section">
      <div class="h2h-selectors">
        <select id="h2h-j1" class="h2h-select">
          <option value="">Escolha o jogador 1\u2026</option>${h2hOpts}
        </select>
        <div class="h2h-vs">VS</div>
        <select id="h2h-j2" class="h2h-select">
          <option value="">Escolha o jogador 2\u2026</option>${h2hOpts}
        </select>
      </div>
      <div class="h2h-ano-bar">
        <span class="mes-filter-label">\uD83D\uDCC5 Per\u00EDodo:</span>
        <div class="pill-group h2h-ano-pills">${anoPills}</div>
      </div>
      <div id="h2h-result"></div>
    </div>`;

  let anoAtivo = 'geral';

  const sel1 = document.getElementById('h2h-j1');
  const sel2 = document.getElementById('h2h-j2');
  const triggerRender = () => renderH2H(sel1.value, sel2.value, anoAtivo);

  sel1.addEventListener('change', triggerRender);
  sel2.addEventListener('change', triggerRender);

  wrap.querySelectorAll('.h2h-ano-pills .pill').forEach(btn => {
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.h2h-ano-pills .pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      anoAtivo = btn.dataset.ano;
      triggerRender();
    });
  });
}

function renderSobre() {
  const m = DATA.meta;
  document.getElementById('sobre-meta').innerHTML = `
    \u00DAltima partida: <strong>${formatDataBR(m.ultima_partida)}</strong>.<br>
    Total de partidas: <strong>${m.total_partidas}</strong>.<br>
    Total de jogadores: <strong>${m.total_jogadores}</strong>.<br>
    Anos dispon\u00EDveis: <strong>${m.anos_disponiveis.join(', ')}</strong>.<br>
    P\u00E1gina gerada em <strong>${formatDataBR(m.atualizado_em)}</strong>.
  `;
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
//  Util
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function formatDataBR(iso) {
  if (!iso) return '\u2014';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function escapeAttr(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;',
    "'":'&#39;' }[c]));
}
