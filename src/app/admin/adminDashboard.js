/*
 * Projeto: GoAtende
 * Copyright (c) 2026 Raimundo Alves Santa Brigida
 *
 * Licensed under the PolyForm Noncommercial License 1.0.0.
 *
 * You may use, study, modify and redistribute this software.
 *
 * Commercial use, resale, sublicensing or inclusion in commercial
 * products or services is prohibited.
 *
 * Full license:
 * https://polyformproject.org/licenses/noncommercial/1.0.0/
 */
/**
 * @file src/app/admin/adminDashboard.js
 * @description Lógica e Gráficos da Dashboard Administrativa do GoAtende
 */

'use strict';

window.AdminDashboard = (function () {
  let dateFilter = 30; // dias

  function inicializar() {
    const selectFilter = document.getElementById('dashDateFilter');
    const btnExport = document.getElementById('btnExportImage');

    if (selectFilter) {
      selectFilter.addEventListener('change', (e) => {
        dateFilter = parseInt(e.target.value, 10) || 30;
        renderizarGraficos();
      });
    }

    if (btnExport) {
      btnExport.addEventListener('click', exportarParaImagem);
    }
  }

  async function renderizarTudo() {
    await renderizarCardsResumo();
    await renderizarGraficos();
  }

  async function renderizarCardsResumo() {
    const container = document.getElementById('dashSummaryCards');
    if (!container) return;

    const dados = await window.GoArmazenamento.obterDados();
    const sitesAtivos = dados.siteProfiles.filter(p => p.active).length;
    const totalMsgs = dados.messages.length;
    const totalCats = dados.categories.length;
    const totalPlaceholders = dados.placeholders.length;

    container.innerHTML = `
      <div class="dash-summary-card">
        <div class="dash-summary-icon" style="color: #4CAF50; background: rgba(76, 175, 80, 0.1);">
          <svg viewBox="0 0 24 24" class="icon-md" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/></svg>
        </div>
        <div class="dash-summary-info">
          <h3>${sitesAtivos}</h3>
          <p>Sites Habilitados</p>
        </div>
      </div>
      <div class="dash-summary-card">
        <div class="dash-summary-icon" style="color: #2196F3; background: rgba(33, 150, 243, 0.1);">
          <svg viewBox="0 0 24 24" class="icon-md" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" fill="currentColor"/></svg>
        </div>
        <div class="dash-summary-info">
          <h3>${totalMsgs}</h3>
          <p>Modelos Salvos</p>
        </div>
      </div>
      <div class="dash-summary-card">
        <div class="dash-summary-icon" style="color: #FF9800; background: rgba(255, 152, 0, 0.1);">
          <svg viewBox="0 0 24 24" class="icon-md" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l-5.5 9h11zm0 3.84L13.93 9h-3.87zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5S15.01 22 17.5 22s4.5-2.01 4.5-4.5S19.99 13 17.5 13zm0 7c-1.38 0-2.5-1.12-2.5-2.5S16.12 15 17.5 15s2.5 1.12 2.5 2.5S18.88 20 17.5 20zM3 21.5h8v-8H3v8zm2-6h4v4H5v-4z" fill="currentColor"/></svg>
        </div>
        <div class="dash-summary-info">
          <h3>${totalCats}</h3>
          <p>Categorias</p>
        </div>
      </div>
      <div class="dash-summary-card">
        <div class="dash-summary-icon" style="color: #9C27B0; background: rgba(156, 39, 176, 0.1);">
          <svg viewBox="0 0 24 24" class="icon-md" xmlns="http://www.w3.org/2000/svg"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" fill="currentColor"/></svg>
        </div>
        <div class="dash-summary-info">
          <h3>${totalPlaceholders}</h3>
          <p>Placeholders Globais</p>
        </div>
      </div>
    `;
  }

  async function renderizarGraficos() {
    const historico = await window.GoArmazenamento.obterHistoricoFiltrado(dateFilter);
    const dados = await window.GoArmazenamento.obterDados();
    
    renderizarGraficoSites(historico, dados);
    renderizarGraficoMensagens(historico, dados);
    renderizarGraficoHorarios(historico);
  }

  function renderizarGraficoSites(historico, dados) {
    const container = document.getElementById('dashSitesChart');
    if (!container) return;

    if (historico.length === 0) {
      container.innerHTML = '<div class="dash-empty">Nenhum dado no período</div>';
      return;
    }

    const contagem = {};
    historico.forEach(item => {
      const dom = item.dominio || 'Desconhecido';
      contagem[dom] = (contagem[dom] || 0) + 1;
    });

    const array = Object.keys(contagem).map(k => ({ dominio: k, total: contagem[k] }))
      .sort((a, b) => b.total - a.total).slice(0, 10);

    const colors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#FFC107', '#3F51B5', '#E91E63', '#009688'];
    const totalSoma = array.reduce((sum, item) => sum + item.total, 0);

    let svg = '<svg viewBox="-1.1 -1.1 2.2 2.2" style="transform: rotate(-90deg); width: 234px; height: 234px; overflow: visible; flex-shrink: 0;">';
    let cumulativePercent = 0;
    let legendHtml = '<div style="display:flex; flex-direction:column; gap:8px; justify-content:space-evenly; flex:1; font-size:14px; margin-left: 24px;">';

    array.forEach((item, index) => {
      const color = colors[index % colors.length];
      const percent = item.total / totalSoma;
      const startX = Math.cos(2 * Math.PI * cumulativePercent);
      const startY = Math.sin(2 * Math.PI * cumulativePercent);
      cumulativePercent += percent;
      const endX = Math.cos(2 * Math.PI * cumulativePercent);
      const endY = Math.sin(2 * Math.PI * cumulativePercent);
      const largeArcFlag = percent > 0.5 ? 1 : 0;

      if (percent === 1) {
        svg += `<circle cx="0" cy="0" r="1" fill="${color}" stroke="#fff" stroke-width="0.05" />`;
      } else {
        const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
        svg += `<path d="${pathData}" fill="${color}" stroke="#fff" stroke-width="0.02" />`;
      }

      let perfil = dados.siteProfiles.find(p => p.domain === item.dominio);
      const label = perfil?.label || item.dominio;
      
      legendHtml += `
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="width:12px; height:12px; border-radius:3px; background:${color}; flex-shrink:0;"></div>
          <div style="flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${window.GoSanitize.escapeHtml(label)}</div>
          <strong>${item.total}</strong>
        </div>`;
    });

    svg += '</svg>';
    legendHtml += '</div>';

    container.innerHTML = `
      <div style="display:flex; align-items:center; flex:1; justify-content: center; padding: 10px 0;">
        ${svg}
        ${legendHtml}
      </div>
    `;
  }

  function renderizarGraficoMensagens(historico, dados) {
    const container = document.getElementById('dashMessagesChart');
    if (!container) return;

    if (historico.length === 0) {
      container.innerHTML = '<div class="dash-empty">Nenhum dado no período</div>';
      return;
    }

    const contagem = {};
    historico.forEach(item => {
      const id = item.idMensagem;
      if (id) contagem[id] = (contagem[id] || 0) + 1;
    });

    const array = Object.keys(contagem).map(k => ({ id: k, total: contagem[k] }))
      .sort((a, b) => b.total - a.total).slice(0, 10);

    const max = array.length > 0 ? array[0].total : 1;

    let html = '<div class="dash-bar-list" style="flex:1; justify-content: space-evenly; gap: 8px;">';
    array.forEach(item => {
      const perc = (item.total / max) * 100;
      let msg = dados.messages.find(m => m.id === item.id);
      const label = msg ? msg.title : 'Mensagem Excluída';
      
      let iconSvg = '';
      if (msg && msg.icon) {
        const iconData = window.AdminIcons.find(i => i.id === msg.icon);
        if (iconData) iconSvg = iconData.svg;
      }
      if (!iconSvg) {
        iconSvg = '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" fill="currentColor"/>';
      }

      html += `
        <div class="dash-bar-item">
          <div class="dash-bar-label" style="font-size: 11.5px;">
            <span style="display:flex; align-items:center; gap:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              <svg viewBox="0 0 24 24" class="icon-xs" style="color:var(--c-text-2); flex-shrink:0; width:12px; height:12px;">${iconSvg}</svg>
              ${window.GoSanitize.escapeHtml(label)}
            </span> 
            <strong style="font-size: 11.5px;">${item.total}</strong>
          </div>
          <div class="dash-bar-track" style="height: 4px;">
            <div class="dash-bar-fill" style="width: ${perc}%; background-color: #4CAF50;"></div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  function renderizarGraficoHorarios(historico) {
    const container = document.getElementById('dashHourlyChart');
    if (!container) return;

    if (historico.length === 0) {
      container.innerHTML = '<div class="dash-empty">Nenhum dado no período</div>';
      return;
    }

    const horas = new Array(24).fill(0);
    historico.forEach(item => {
      const date = new Date(item.usadoEm);
      const hr = date.getHours();
      if (hr >= 0 && hr <= 23) horas[hr]++;
    });

    let firstActive = -1;
    let lastActive = -1;
    for (let i = 0; i < 24; i++) {
      if (horas[i] > 0) {
        if (firstActive === -1) firstActive = i;
        lastActive = i;
      }
    }

    if (firstActive === -1) {
      container.innerHTML = '<div class="dash-empty">Nenhum dado no período</div>';
      return;
    }

    let startHour = firstActive;
    let endHour = lastActive;
    let span = endHour - startHour + 1;

    if (span < 6) {
      let missing = 6 - span;
      let expandLeft = Math.floor(missing / 2);
      let expandRight = missing - expandLeft;
      
      startHour -= expandLeft;
      endHour += expandRight;

      if (startHour < 0) {
        endHour += Math.abs(startHour);
        startHour = 0;
      }
      if (endHour > 23) {
        startHour -= (endHour - 23);
        endHour = 23;
      }
      if (startHour < 0) startHour = 0;
    }

    const subsetHoras = [];
    for (let i = startHour; i <= endHour; i++) {
      subsetHoras.push({ hr: i, total: horas[i] });
    }

    const max = Math.max(...subsetHoras.map(h => h.total), 1);

    let html = '<div class="dash-chart-hourly-container">';
    html += '<div class="dash-chart-hourly">';
    
    subsetHoras.forEach(item => {
      const perc = (item.total / max) * 100;
      const label = item.hr.toString().padStart(2, '0') + 'h';
      
      html += `
        <div class="dash-hourly-col" title="${label}: ${item.total} mensagens">
          <div class="dash-hourly-bar-wrap">
            <div class="dash-hourly-bar" style="height: ${perc}%;"></div>
          </div>
          <div class="dash-hourly-label">${label}</div>
        </div>
      `;
    });
    
    html += '</div></div>';
    container.innerHTML = html;
  }

  function exportarParaImagem() {
    if (typeof html2canvas === 'undefined') {
      window.AdminUI.toast('Biblioteca html2canvas não encontrada.', 'error');
      return;
    }

    const element = document.getElementById('dashboardContentToExport');
    if (!element) return;
    
    const btn = document.getElementById('btnExportImage');
    const oldText = btn.innerHTML;
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor" /></svg> Salvando...';
    btn.disabled = true;

    // Remove temporariamente regras de rolagem se houver
    const oldOverflow = element.style.overflow;
    element.style.overflow = 'visible';

    // Cria um background estático pro canvas pra ficar bonito no modo dark
    const bgColor = document.body.dataset.theme === 'dark' ? '#13131F' : '#F0F2F5';

    html2canvas(element, {
      backgroundColor: bgColor,
      scale: 2, // Maior resolução
      logging: false,
      useCORS: true
    }).then(canvas => {
      element.style.overflow = oldOverflow;
      btn.innerHTML = oldText;
      btn.disabled = false;

      const imgData = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = imgData;
      a.download = `goatende_dashboard_${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      window.AdminUI.toast('Dashboard exportada com sucesso!', 'success');
    }).catch(err => {
      console.error(err);
      element.style.overflow = oldOverflow;
      btn.innerHTML = oldText;
      btn.disabled = false;
      window.AdminUI.toast('Erro ao exportar imagem.', 'error');
    });
  }

  return {
    inicializar,
    renderizarTudo
  };
})();

