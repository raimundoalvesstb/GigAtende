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
 * @file src/app/content/injetor.js
 * @description GoAtende Content Script Principal.
 * Responsável por:
 *  - Rastrear o campo de digitação ativo (abordagem por foco – focus-driven)
 *  - Exibir o botão flutuante GA perto do campo focado
 *  - Permitir arrastar o botão e salvar a posição por domínio
 *  - Abrir o overlay de seleção/inserção de mensagens
 *  - Suportar múltiplos campos por plataforma
 *  - Inserir mensagens com Saudação e/ou Assinatura
 *  - Prover formulário rápido de Nova Mensagem com emoji picker e ícones
 */
'use strict';

(function () {
  /* Evita inicialização duplicada em caso de reload do script */
  if (window.__goAtendLoaded) return;
  window.__goAtendLoaded = true;

  /* ── Estado Global ──────────────────────────────────────────────────────── */
  let isSelecting    = false;   // Modo de seleção de campo ativo
  let hoveredEl      = null;    // Elemento destacado durante seleção
  let activeField    = null;    // Campo de digitação atualmente com foco
  let floatBtn       = null;    // Referência ao botão GA flutuante
  let miniMenu       = null;    // Mini menu de ações
  let overlay        = null;    // Overlay principal (inserção ou nova msg)
  let selectBanner   = null;    // Banner do modo de seleção
  let currentDomain  = null;    // Domínio ou caminho mapeado ativo (definido no init)
  let siteProfile    = null;    // Perfil do site carregado do storage
  let globalBrandLogo = null;   // Logo personalizado
  let globalBrandName = null;   // Nome da marca personalizado

  /* Estado do drag (arrastar botão) */
  let isDragging     = false;
  let dragMoved      = false;   // Distingue clique de drag
  let dragOffset     = { x: 0, y: 0 };
  let savedBtnPos    = null;    // Posição salva no storage

  /* Referência ao emoji picker e icon picker ativos */
  let iconPickerEl   = null;
  let emojiTarget    = null;    // Campo onde o emoji será inserido

  /* Seleção salva de iframes editáveis (TinyMCE, CKEditor, etc.) */
  let savedIframeSelection = null;

  /* ── Biblioteca de Ícones SVG Temáticos (30+) ──────────────────────────── */
  /* Ícones organizados por escopo: RMA (prioritário), pós-venda, pré-venda, geral */
  const ICONS = [
  // --- RMA (10) ---
  { id: 'rma-repair', svg: '<path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.5 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>' },
  { id: 'rma-return', svg: '<path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>' },
  { id: 'rma-analysis', svg: '<path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>' },
  { id: 'rma-warranty-ok', svg: '<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>' },
  { id: 'rma-warranty-issue', svg: '<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 15c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm1-4h-2V7h2v5z"/>' },
  { id: 'rma-photos', svg: '<path d="M9.4 10.5l4.77 8.26C13.47 18.91 12.75 19 12 19c-3.87 0-7-3.13-7-7 0-1.68.59-3.22 1.58-4.42L11.75 4h-.05L9.4 10.5zM12 5c2.6 0 4.86 1.43 6.13 3.55H9.6L12 5zm7.3 3.63c.45 1.02.7 2.15.7 3.37 0 2.6-1.43 4.86-3.55 6.13l-3.92-6.79 4.07-2.71z"/>' },
  { id: 'rma-report', svg: '<path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>' },
  { id: 'rma-cog', svg: '<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.73 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .43-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>' },
  { id: 'rma-defect', svg: '<path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>' },
  { id: 'rma-authorized', svg: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>' },
  // --- Pos-venda (10) ---
  { id: 'pos-assignment', svg: '<path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>' },
  { id: 'pos-star', svg: '<path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>' },
  { id: 'pos-chat', svg: '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>' },
  { id: 'pos-support', svg: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm7.36 10.64h-3.41c-.2-1.78-1.57-3.21-3.31-3.41V5.82c3.48.51 6.21 3.34 6.72 6.82zM12 14.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zm-1.36-5.27c-1.74.2-3.11 1.63-3.31 3.41H3.92c.51-3.48 3.24-6.31 6.72-6.82v3.41zM3.92 13.36h3.41c.2 1.78 1.57 3.21 3.31 3.41v3.41c-3.48-.51-6.21-3.34-6.72-6.82zm8.72 6.82v-3.41c1.74-.2 3.11-1.63 3.31-3.41h3.41c-.51 3.48-3.24 6.31-6.72 6.82z"/>' },
  { id: 'pos-help', svg: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>' },
  { id: 'pos-headset', svg: '<path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"/>' },
  { id: 'pos-refresh', svg: '<path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>' },
  { id: 'pos-find-replace', svg: '<path d="M11 6c1.38 0 2.63.56 3.54 1.46L12 10h6V4l-2.05 2.05C14.68 4.78 12.93 4 11 4c-3.53 0-6.43 2.61-6.92 6h2.02C6.56 7.76 8.58 6 11 6zm5.64 9.1c.66-1.38 1.22-2.91 1.22-4.1h-2c0 1.01-.48 2.38-1.07 3.51L12.5 13H17v1.1zM13 20c-1.38 0-2.63-.56-3.54-1.46L12 16H6v6l2.05-2.05C9.32 21.22 11.07 22 13 22c3.53 0 6.43-2.61 6.92-6h-2.02c-.46 2.24-2.48 4-4.9 4zM7.36 10.9c-.66 1.38-1.22 2.91-1.22 4.1h2c0-1.01.48-2.38 1.07-3.51L11.5 13H7v-2.1z"/>' },
  { id: 'pos-lightbulb', svg: '<path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.23 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.77-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/>' },
  { id: 'pos-gift', svg: '<path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1h-4v-2h4zM9 4c.55 0 1 .45 1 1v2H6c0-.55.45-1 1-1h2zM4 19v-9h16v9H4z"/>' },
  // --- Logistica (5) ---
  { id: 'log-truck', svg: '<path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>' },
  { id: 'log-box', svg: '<path d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18-.21 0-.41-.06-.57-.18l-7.9-4.44A.991.991 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9zM12 4.15L6.04 7.5 12 10.85l5.96-3.35L12 4.15zM5 15.91l6 3.38v-6.71L5 9.19v6.72zm14 0v-6.72l-6 3.39v6.71l6-3.38z"/>' },
  { id: 'log-pin', svg: '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>' },
  { id: 'log-clock', svg: '<path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>' },
  { id: 'log-barcode', svg: '<path d="M3 5h4v2H5v4H3V5zm20 0h-4v2h2v4h2V5zM3 19h4v-2H5v-4H3v6zm20 0h-4v-2h2v-4h2v6zm-7-9h2v4h-2v-4zm-8 0h2v4H8v-4zm4 0h2v4h-2v-4z"/>' },
  // --- Gerais (25) ---
  { id: 'gen-creditcard', svg: '<path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>' },
  { id: 'gen-money', svg: '<path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>' },
  { id: 'gen-receipt', svg: '<path d="M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z"/>' },
  { id: 'gen-user', svg: '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>' },
  { id: 'gen-users', svg: '<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>' },
  { id: 'gen-lock', svg: '<path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>' },
  { id: 'gen-key', svg: '<path d="M21 10h-8.35C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H13l2 2 2-2 2 2 2-2v-4zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>' },
  { id: 'gen-info', svg: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>' },
  { id: 'gen-alert', svg: '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>' },
  { id: 'gen-check', svg: '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>' },
  { id: 'gen-close', svg: '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>' },
  { id: 'gen-mail', svg: '<path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>' },
  { id: 'gen-phone', svg: '<path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>' },
  { id: 'gen-globe', svg: '<path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.9 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c1.03-1.8 2.76-3.15 4.82-3.71C9.17 5.62 8.65 6.78 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.34.16-2h4.68c.09.66.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/>' },
  { id: 'gen-monitor', svg: '<path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z"/>' },
  { id: 'gen-smartphone', svg: '<path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>' },
  { id: 'gen-download', svg: '<path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>' },
  { id: 'gen-upload', svg: '<path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>' },
  { id: 'gen-link', svg: '<path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>' },
  { id: 'gen-paperclip', svg: '<path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>' },
  { id: 'gen-print', svg: '<path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>' },
  { id: 'gen-bookmark', svg: '<path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>' },
  { id: 'gen-tag', svg: '<path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/>' },
  { id: 'gen-calendar', svg: '<path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>' },
  { id: 'gen-home', svg: '<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>' }
];


  /* ── Inicialização ─────────────────────────────────────────────────────── */
  let lastHref = location.href;

  async function evaluateSiteProfile() {
    try {
      const dados = await window.GoArmazenamento.obterDados();
      if (dados.settings) {
        globalBrandLogo = dados.settings.brandLogo || null;
        globalBrandName = dados.settings.brandName || null;
      }
      
      const host = location.host;
      let pathname = location.pathname;
      if (pathname === '/') {
        pathname = '';
      } else if (pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
      }
      const fullPath = host + pathname;

      let perfis = dados.siteProfiles || [];
      let melhorMatch = null;
      let maxLen = 0;

      for (const perfil of perfis) {
        const d = perfil.domain;
        if (fullPath === d || fullPath.startsWith(d + '/')) {
          if (d.length > maxLen) {
            melhorMatch = d;
            maxLen = d.length;
          }
        }
      }

      currentDomain = melhorMatch || host;
      siteProfile = perfis.find(p => p.domain === currentDomain) || null;

      if (siteProfile?.active) {
        /* Recupera posição salva do botão */
        savedBtnPos = siteProfile.buttonPosition || null;

        /* Ativa rastreamento de foco em qualquer campo de digitação */
        activateFocusTracking();

        /* Monitora o documento ativamente para detectar foco em iframes de editores ricos */
        setupGlobalIframeTracker();

        /* Cria o botão GA (oculto até que um campo ganhe foco) */
        createFloatingButton();
      } else {
        deactivateFocusTracking();
        if (typeof removeFloatingButton === 'function') removeFloatingButton();
        if (typeof closeOverlay === 'function') closeOverlay();
        activeField = null;
      }
    } catch (e) {
      console.warn('[GoAtende] Erro ao avaliar URL:', e);
    }
  }

  /**
   * Ponto de entrada do script injetado.
   * Carrega as configurações do armazenamento e ativa o monitoramento se permitido.
   * @async
   */
  async function init() {
    try {
      await evaluateSiteProfile();
      
      setInterval(() => {
        if (lastHref !== location.href) {
          lastHref = location.href;
          evaluateSiteProfile();
          try { chrome.runtime.sendMessage({ tipo: 'ATUALIZAR_ICONE' }); } catch(e) {}
        }
      }, 1000);
    } catch (e) {
      console.warn('[GoAtende] Erro na inicialização:', e);
    }
  }

  /* ── Rastreamento de Foco (abordagem focus-driven) ─────────────────────── */
  /**
   * Escuta eventos de foco em qualquer campo editável da página.
   * Esta é a abordagem principal para suportar múltiplos campos e
   * URLs dinâmicas (SPAs) com o mesmo domínio.
   */
  function activateFocusTracking() {
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
  }

  function deactivateFocusTracking() {
    document.removeEventListener('focusin', onFocusIn, true);
    document.removeEventListener('focusout', onFocusOut, true);
  }

  /* ── Rastreamento Robusto de Iframes ──────────────────────────────────── */
  /**
   * Rastrea iframes ativamente utilizando blur no window e polling super leve (document.activeElement).
   * Resolve o problema do Zimbra/Nexcore que utilizam document.write e destroem event listeners injetados.
   */
  let globalIframeInterval = null;

  function setupGlobalIframeTracker() {
    if (globalIframeInterval) return;

    const checkActiveIframe = () => {
      if (!siteProfile?.active) return;
      
      const el = document.activeElement;
      if (el && el.tagName === 'IFRAME' && el !== activeField) {
        if (detectEditorType(el) === 'iframe') {
          activeField = el;
          if (floatBtn) showFloatingButton(el);
        }
      }
    };

    /* Blur dispara na window principal quando o usuário clica dentro de um iframe same-origin */
    window.addEventListener('blur', () => setTimeout(checkActiveIframe, 50));
    
    /* Fallback contínuo, cobrindo casos cross-origin, navegação via Tab, ou inicialização tardia */
    globalIframeInterval = setInterval(checkActiveIframe, 1000);
  }

  /**
   * Chamado quando qualquer elemento ganha foco
   * @param {FocusEvent} e
   */
  function onFocusIn(e) {
    const el = e.target;

    /* Ignora foco em elementos da própria extensão */
    if (isGoElement(el)) return;
    if (!isInputElement(el)) return;

    /* Atualiza campo ativo */
    activeField = el;

    /* Posiciona e exibe o botão GA */
    if (floatBtn) {
      showFloatingButton(el);
    }
  }

  /**
   * Chamado quando qualquer elemento perde foco
   * @param {FocusEvent} e
   */
  function onFocusOut(e) {
    /* Não esconde imediatamente – aguarda para ver se o foco foi para
       o próprio botão ou overlay (permitindo clique no botão) */
    setTimeout(() => {
      const focused = document.activeElement;
      if (!focused || isGoElement(focused) || !isInputElement(focused)) {
        /* Se nenhum campo de digitação tem foco e o overlay está fechado, mantém o botão */
        if (!overlay && !miniMenu && floatBtn) {
          /* Mantém visível – usuário pode querer clicar no botão */
        }
      }
    }, 150);
  }

  /** 
   * Verifica se o elemento pertence à UI da extensão 
   * @param {HTMLElement} el
   * @returns {boolean}
   */
  function isGoElement(el) {
    if (!el) return false;
    return (
      el.id?.startsWith('go-') ||
      el.closest?.('#go-overlay') ||
      el.closest?.('#go-mini-menu') ||
      el.closest?.('#go-float-btn') ||
      el.closest?.('#go-select-banner') ||
      el.closest?.('#go-emoji-picker') ||
      el.closest?.('#go-icon-picker-panel')
    );
  }

  /* ── Listener de Mensagens do Background/Popup ─────────────────────────── */
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    try {
      const msgType = msg.type || msg.tipo;
      switch (msgType) {

        /* Ativa o modo de seleção visual de informações (Placeholders) */
        case 'ATIVAR_SELECAO_INFO':
        case 'ENTER_SELECTION_MODE':
        case 'ENTRAR_MODO_SELECAO':
          enterSelectionMode();
          sendResponse({ ok: true });
          break;

        /* Cancela o modo de seleção */
        case 'CANCELAR_SELECAO_CAMPO':
        case 'EXIT_SELECTION_MODE':
        case 'SAIR_MODO_SELECAO':
          exitSelectionMode();
          sendResponse({ ok: true });
          break;

        /* Atualiza estado quando o usuário ativa/desativa o site no popup */
        case 'SITE_STATUS_CHANGED':
        case 'STATUS_SITE_ALTERADO':
          siteProfile = { ...siteProfile, active: msg.active };
          if (!msg.active) {
            removeFloatingButton();
            closeOverlay();
            deactivateFocusTracking();
            activeField = null;
          } else {
            window.GoArmazenamento.obterPerfilSite(currentDomain).then(p => {
              siteProfile = p;
              savedBtnPos = p?.buttonPosition || null;
              
              activateFocusTracking();
              setupGlobalIframeTracker();
              createFloatingButton();
              
              /* Tenta detectar se o usuário já tem o foco em algum campo no exato momento da ativação */
              setTimeout(() => {
                const el = document.activeElement;
                if (el) {
                  if (el.tagName === 'IFRAME' && detectEditorType(el) === 'iframe') {
                    activeField = el;
                    if (floatBtn) showFloatingButton(el);
                  } else if (isInputElement(el)) {
                    /* Simula um evento de foco para inicializar o botão num campo normal */
                    onFocusIn({ target: el });
                  }
                }
              }, 100);
            });
          }
          sendResponse({ ok: true });
          break;

        default:
          sendResponse({ ok: false });
      }
    } catch (e) {
      sendResponse({ ok: false, error: e.message });
    }
    return true; // Indica resposta assíncrona
  });

  // Escuta as alterações no armazenamento para atualizar as mensagens rápidas instantaneamente
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes['goAtende_data']) {
      if (typeof renderFlashMessages === 'function') {
        renderFlashMessages();
      }
    }
  });

  /* ── Modo de Seleção de Campo (visual) ─────────────────────────────────── */
  /**
   * Ativa o modo onde o usuário clica no campo de digitação desejado
   */
  function enterSelectionMode() {
    if (isSelecting) return;
    isSelecting = true;
    document.body.classList.add('go-selecting');



    document.addEventListener('mouseover', onHover, true);
    document.addEventListener('mouseout',  onMouseOut, true);
    document.addEventListener('click',     onFieldClick, true);
    document.addEventListener('keydown',   onSelectionKeyDown, true);
  }

  function exitSelectionMode() {
    if (!isSelecting) return;
    isSelecting = false;
    document.body.classList.remove('go-selecting');
    if (hoveredEl) { hoveredEl.classList.remove('go-highlight'); hoveredEl = null; }

    document.removeEventListener('mouseover', onHover, true);
    document.removeEventListener('mouseout',  onMouseOut, true);
    document.removeEventListener('click',     onFieldClick, true);
    document.removeEventListener('keydown',   onSelectionKeyDown, true);
  }

  function onHover(e) {
    const el = e.target;
    if (!el || isGoElement(el)) return;
    if (hoveredEl) hoveredEl.classList.remove('go-highlight');
    // Agora destaca qualquer elemento, não apenas inputs
    el.classList.add('go-highlight');
    hoveredEl = el;
  }

  function onMouseOut(e) {
    if (e.target?.classList) e.target.classList.remove('go-highlight');
  }

  /** Clique em campo durante o modo de seleção – abre modal inline para escolher o placeholder */
  async function onFieldClick(e) {
    const el = e.target;
    if (!el || isGoElement(el)) return;

    e.preventDefault();
    e.stopPropagation();

    // Congela a seleção
    document.removeEventListener('mouseover', onHover, true);
    document.removeEventListener('mouseout',  onMouseOut, true);
    document.removeEventListener('click',     onFieldClick, true);

    const selector = generateSelector(el);
    openPlaceholderSelectorModal(el, selector, e.clientX, e.clientY);
  }

  /**
   * Cria o modal inline flutuante perto do elemento clicado para o usuário
   * escolher qual placeholder corresponde àquele seletor.
   */
  async function openPlaceholderSelectorModal(element, selector, x, y) {
    const sitePlaceholders = siteProfile?.placeholders || [];
    const defaultPlaceholders = [
      { id: 'cliente', name: 'Nome do cliente', fixed: true },
      { id: 'venda_pedido', name: 'Venda/pedido', fixed: true },
      { id: 'produto', name: 'Produto', fixed: true }
    ];
    const placeholders = [...defaultPlaceholders, ...sitePlaceholders];
    
    const modal = document.createElement('div');
    modal.id = 'go-info-selector-modal';
    
    // Posiciona perto do clique, garantindo que não saia da tela
    modal.style.left = clamp(x, 10, window.innerWidth - 300) + 'px';
    modal.style.top = clamp(y + 10, 10, window.innerHeight - 300) + 'px';

    let map = siteProfile?.placeholdersMap || {};

    // html
    let listHtml = placeholders.map(p => {
      const isMapped = Object.entries(map).some(([key, sel]) => key === p.id && sel === selector);
      return `
        <button class="go-info-selector-btn ${isMapped ? 'mapped' : ''}" data-ph="${p.id}">
          <span>${window.GoSanitize.escapeHtml(p.name)}</span>
          ${isMapped ? '<span>✓</span>' : ''}
        </button>
      `;
    }).join('');

    modal.innerHTML = `
      <h3>O que esta área representa?</h3>
      <div class="go-info-selector-list" id="go-placeholder-list">
        ${listHtml}
      </div>
      
      <div id="go-new-placeholder-container" style="display:none; margin-top: 10px; border-top: 1px solid var(--c-border); padding-top: 10px;">
        <input type="text" id="go-new-placeholder-name" placeholder="Nome do novo placeholder..." style="width:100%; padding: 6px; border: 1px solid var(--c-border); border-radius: 4px; font-size: 13px; margin-bottom: 6px; box-sizing: border-box; background: var(--c-surface); color: var(--c-text);">
        <div style="display:flex; gap: 8px;">
          <button id="go-btn-save-new" style="flex:1; padding:6px; background:#1976d2; color:#fff; border:none; border-radius:4px; font-size:12px; cursor:pointer;">Salvar</button>
          <button id="go-btn-cancel-new" style="flex:1; padding:6px; background:transparent; color:var(--c-text-2); border:1px solid var(--c-border); border-radius:4px; font-size:12px; cursor:pointer;">Cancelar</button>
        </div>
      </div>
      
      <div class="go-info-selector-footer" style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
        <button class="go-btn-cancel" id="go-info-cancel">Fechar</button>
        <button id="go-btn-add-new" style="background:none; border:none; color:#1976d2; font-size:12px; font-weight:600; cursor:pointer; padding:0;">+ Novo Placeholder</button>
      </div>
    `;

    document.body.appendChild(modal);

    const btnCancel = modal.querySelector('#go-info-cancel');
    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        modal.remove();
        exitSelectionMode();
      });
    }

    const btnAddNew = modal.querySelector('#go-btn-add-new');
    const containerNew = modal.querySelector('#go-new-placeholder-container');
    const inputNew = modal.querySelector('#go-new-placeholder-name');
    const btnSaveNew = modal.querySelector('#go-btn-save-new');
    const btnCancelNew = modal.querySelector('#go-btn-cancel-new');
    
    if (btnAddNew) {
      btnAddNew.addEventListener('click', () => {
        containerNew.style.display = 'block';
        btnAddNew.style.display = 'none';
        inputNew.focus();
      });
    }
    
    if (btnCancelNew) {
      btnCancelNew.addEventListener('click', () => {
        containerNew.style.display = 'none';
        btnAddNew.style.display = 'block';
        inputNew.value = '';
      });
    }
    
    if (btnSaveNew) {
      btnSaveNew.addEventListener('click', async () => {
        const name = inputNew.value.trim();
        if (!name) return;
        
        let id = name.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
          
        if (!id) id = 'placeholder_' + Date.now();
        
        let currentPlaceholders = siteProfile?.placeholders || [];
        if (currentPlaceholders.some(p => p.id === id)) {
           // Se já existe com o mesmo ID, apenas avisa ou concatena
           id = id + '_' + Math.floor(Math.random() * 1000);
        }
        
        currentPlaceholders.push({ id, name });
        
        let newMap = { ...(siteProfile?.placeholdersMap || {}) };
        newMap[id] = selector;
        
        siteProfile = await window.GoArmazenamento.atualizarPerfilSite(currentDomain, {
          placeholders: currentPlaceholders,
          placeholdersMap: newMap
        });
        
        // Remove the modal and re-render or just exit
        modal.remove();
        exitSelectionMode();
      });
    }

    const btns = modal.querySelectorAll('.go-info-selector-btn');
    btns.forEach(b => {
      b.addEventListener('click', async () => {
        const pId = b.dataset.ph;
        
        let newMap = { ...(siteProfile?.placeholdersMap || {}) };
        
        if (newMap[pId]) {
          let selArray = newMap[pId].split(',').map(s => s.trim());
          if (selArray.includes(selector)) {
            // Se já tiver mapeado este exato seletor, desmapeia
            selArray = selArray.filter(s => s !== selector);
            if (selArray.length === 0) {
              delete newMap[pId];
            } else {
              newMap[pId] = selArray.join(', ');
            }
          } else {
            // Adiciona um novo local para o mesmo placeholder
            newMap[pId] += ', ' + selector;
          }
        } else {
          newMap[pId] = selector;
        }

        siteProfile = await window.GoArmazenamento.atualizarPerfilSite(currentDomain, {
          placeholdersMap: newMap
        });

        modal.remove();
        exitSelectionMode();
        showPageToast('Mapeamento atualizado!', 3000);

        // Notifica o popup para atualizar a UI
        chrome.runtime.sendMessage({ tipo: 'FIELD_SELECTED_POPUP', type: 'FIELD_SELECTED_POPUP', profile: siteProfile });
      });
    });
  }

  function onSelectionKeyDown(e) {
    if (e.key === 'Escape') {
      exitSelectionMode();
      chrome.runtime.sendMessage({ tipo: 'CANCELAR_SELECAO_CAMPO', type: 'CANCEL_FIELD_SELECTION' });
    }
  }

  /* ── Detecção de Campos de Digitação ───────────────────────────────────── */
  /** 
   * Verifica se o elemento é um campo de digitação suportado 
   * @param {HTMLElement} el
   * @returns {boolean}
   */
  function isInputElement(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    const tag = el.tagName.toUpperCase();
    if (tag === 'TEXTAREA') return true;
    if (tag === 'INPUT' && ['text','search','email','url'].includes(el.type?.toLowerCase())) return true;
    if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') return true;
    if (el.getAttribute('role') === 'textbox') return true;
    /* Suporte a divs com atributo de escrita (alguns editores ricos) */
    if (el.getAttribute('data-lexical-editor') || el.getAttribute('data-slate-editor')) return true;
    /* Suporte a iframes (ex: TinyMCE Classic) */
    if (tag === 'IFRAME') {
      try {
        const doc = el.contentDocument || el.contentWindow?.document;
        if (doc && (doc.designMode === 'on' || doc.body?.isContentEditable || el.classList.contains('tox-edit-area__iframe') || doc.body?.id === 'tinymce')) {
          return true;
        }
      } catch (e) {}
      if (el.classList.contains('tox-edit-area__iframe')) return true;
    }
    return false;
  }

  function detectEditorType(el) {
    const tag = el.tagName.toUpperCase();
    if (tag === 'TEXTAREA') return 'textarea';
    if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') return 'contenteditable';
    if (tag === 'IFRAME' || el.closest('iframe')) return 'iframe';
    return 'input';
  }

  /* ── Gerador de Seletor CSS ────────────────────────────────────────────── */
  /**
   * Gera o seletor CSS mais específico e estável para um elemento.
   * Usado para salvar as preferências de localização dos campos no perfil do site.
   * @param {HTMLElement} el
   * @returns {string} O seletor CSS resultante.
   */
  function generateSelector(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return null;

    const isDynamicId = (id) => {
      if (!id) return true;
      if (id.length < 5) return true;
      if (/^[a-zA-Z]\d+$/.test(id)) return true;
      if (/\d{4,}/.test(id)) return true;
      return false;
    };

    if (el.id && !el.id.startsWith('go-') && !isDynamicId(el.id)) {
      return '#' + CSS.escape(el.id);
    }

    const stableAttrs = ['data-testid', 'data-id', 'data-qa', 'name', 'aria-label', 'jsname'];

    // Helper to get a good local selector for a single node
    const getNodeSelector = (node) => {
      let sel = node.tagName.toLowerCase();
      // Try stable attributes first
      for (const attr of stableAttrs) {
        if (node.hasAttribute(attr)) {
          return `${sel}[${attr}="${CSS.escape(node.getAttribute(attr))}"]`;
        }
      }
      // Try classes
      if (node.className && typeof node.className === 'string') {
        const classes = node.className.split(/\s+/)
          .filter(c => c && !c.startsWith('go-') && !/^\d/.test(c) && c.length > 2)
          .map(c => '.' + CSS.escape(c));
        if (classes.length > 0) {
          sel += classes.slice(0, 3).join('');
        }
      }
      return sel;
    };

    let path = [];
    let current = el;
    
    // Build path up to body
    while (current && current.tagName !== 'BODY' && current.tagName !== 'HTML') {
      let nodeSel = getNodeSelector(current);
      
      // Se não for único só com classes/attrs, adiciona nth-of-type para desambiguar localmente
      let isUniqueLocal = false;
      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children).filter(c => c.tagName === current.tagName);
        if (siblings.length === 1) {
          isUniqueLocal = true;
        }
      }
      
      if (!isUniqueLocal) {
        let idx = 1;
        let sib = current.previousElementSibling;
        while (sib) {
          if (sib.tagName === current.tagName) idx++;
          sib = sib.previousElementSibling;
        }
        nodeSel += `:nth-of-type(${idx})`;
      }

      path.unshift(nodeSel);
      
      // Verifica se o caminho construído até agora já é globalmente único
      const fullPath = path.join(' > ');
      try {
        if (document.querySelectorAll(fullPath).length === 1) {
          return fullPath;
        }
      } catch (e) {}

      current = current.parentElement;
    }

    return path.join(' > ');
  }

  /* ── Botão Flutuante GA ────────────────────────────────────────────────── */
  /**
   * Cria o widget flutuante GA (compound) e injeta-o no DOM invisivelmente até ser necessário.
   */
  function createFloatingButton() {
    if (floatBtn) return;

    floatBtn = document.createElement('div');
    floatBtn.id = 'go-float-widget';
    floatBtn.innerHTML = `
      <!-- Base do widget: logo + drag handle -->
      <div id="go-float-base">
        <button id="go-float-logo-btn" title="${globalBrandName ? globalBrandName + ' - GoAtende' : 'GoAtende'} – Selecionar Mensagem" aria-label="${globalBrandName ? globalBrandName + ' - GoAtende' : 'GoAtende'} – Selecionar Mensagem">
          ${globalBrandLogo 
            ? `<img src="${globalBrandLogo}" style="width:100%; height:100%; object-fit:contain; border-radius:50%;" />`
            : `<svg viewBox="0 0 12800 12800" xmlns="http://www.w3.org/2000/svg">
            <g id="Camada_x0020_1">
              <path fill="#1565C0" d="M6399 1c3535,0 6400,2865 6400,6400 0,3535 -2865,6400 -6400,6400 -3535,0 -6400,-2865 -6400,-6400 0,-3535 2865,-6400 6400,-6400z"/>
              <path fill="#FEFEFE" stroke="#FEFEFE" stroke-width="3" stroke-miterlimit="22.9256" d="M6747 10611c-20,-278 372,-304 398,-43 12,121 -73,218 -175,230 -118,13 -215,-79 -223,-186zm-4261 -5573c-29,10 -67,15 -98,25 -207,64 -383,191 -507,369 -132,188 -234,452 -270,736 -41,316 25,607 158,832 118,198 338,371 560,445 73,24 145,12 182,-33 32,-38 193,-469 220,-537 219,-539 421,-1081 644,-1618 33,-78 23,-146 -31,-190 -69,-57 -356,-36 -466,-37 32,-251 182,-649 292,-872 131,-268 333,-589 512,-789 69,-77 136,-155 210,-226l152 -138c26,-25 50,-43 78,-67 13,-11 27,-22 38,-32 61,-52 71,7 172,-10 99,-16 194,-101 281,-153 390,-234 793,-393 1262,-466 816,-126 1623,51 2318,473 61,37 115,79 176,114 104,60 155,29 239,17 32,37 77,65 112,97 20,18 38,34 58,49 13,10 15,15 28,26l85 77c107,99 264,283 352,402 60,82 120,162 177,255 111,181 202,350 293,566 75,176 173,475 202,666 -98,0 -195,0 -293,0 -102,0 -177,6 -218,75 -50,84 -12,148 19,226 29,73 58,143 87,216 113,283 235,566 345,851 110,285 231,566 345,851 46,116 53,99 43,243 -6,91 -18,184 -32,273 -89,564 -301,1034 -627,1466 -207,275 -492,525 -777,712 -245,160 -523,295 -809,380 -78,23 -152,43 -233,61 -63,14 -192,45 -252,45 -31,-60 -38,-113 -83,-181 -115,-174 -319,-277 -544,-253 -277,29 -495,256 -527,538 -37,327 175,578 409,652 247,78 511,-14 658,-217 15,-20 37,-63 53,-81 38,-20 905,-37 1791,-720l171 -140c138,-113 252,-239 371,-372 209,-233 458,-635 569,-910 86,-212 152,-395 210,-634 53,-219 99,-524 96,-758 49,-44 112,-79 160,-124 13,-12 24,-20 38,-32 35,-31 73,-79 100,-115 292,-386 253,-969 74,-1384 -57,-131 -124,-257 -220,-358l-109 -101c-16,-12 -28,-22 -43,-32 -83,-58 -186,-112 -289,-140 -137,-38 -65,36 -147,-291 -108,-433 -288,-840 -522,-1209 -81,-128 -205,-308 -305,-412 -65,-68 -130,-151 -208,-229 -113,-112 -247,-236 -380,-336 -40,-30 -26,-59 -40,-105 -25,-80 -72,-132 -124,-167 -219,-151 -469,-289 -745,-403 -1253,-516 -2617,-344 -3657,304 -117,73 -250,131 -281,289 -20,100 9,44 -127,159l-116 99c-98,76 -292,289 -389,402 -249,292 -456,629 -606,987 -120,287 -205,561 -266,894z"/>
              <path fill="#FEFEFE" d="M5264 8044c0,0 -14,26 -33,61 -121,212 -297,221 -591,221 -269,0 -539,0 -808,0 -132,0 -255,11 -330,-74 -75,-86 -9,-222 27,-310 238,-585 245,-645 481,-1231 79,-197 136,-383 368,-451 104,-30 267,-19 382,-19l1212 0c198,-1 438,-88 577,-235 83,-88 114,-116 180,-230 21,-35 59,-106 46,-159 -15,-65 -74,-59 -144,-59l-2020 0c-133,0 -254,-3 -383,20 -408,74 -732,351 -899,730 -83,188 -160,391 -236,586l-362 939c-37,95 -85,200 -115,297 -78,256 -72,466 76,646 121,147 309,232 580,231 269,0 539,0 808,0 267,0 537,5 803,0 289,-5 548,-104 732,-282l93 -112c60,-84 100,-158 146,-265 122,-285 155,-364 261,-654 19,-52 23,-116 -5,-165 -31,-52 -84,-49 -152,-49 -252,1 -567,-7 -808,0 -122,4 -130,98 -182,225 -20,50 -39,96 -59,147 -64,162 -50,194 146,194 68,0 142,-1 210,-1z"/>
              <path fill="#FEFEFE" d="M8536 6360l57 118c44,105 352,809 356,835l-823 0 410 -953zm1209 1069l-562 -1185c-71,-152 -141,-296 -213,-447 -40,-84 -76,-143 -145,-185 -121,-74 -425,-76 -549,-4 -77,44 -115,99 -152,177 -213,450 -423,906 -640,1354 -58,121 -101,209 -141,290l2401 0z"/>
              <path fill="#FEFEFE" d="M6857 8055c60,-13 682,-5 798,-5l2030 0c332,0 356,-6 388,36 32,41 -17,188 -48,269 -58,127 -341,101 -1140,101l-2007 0c-69,0 -119,8 -171,-29 -101,-73 1,-338 149,-371zm-40 -577c-238,24 -363,116 -477,240 -102,111 -180,341 -247,506 -70,174 -172,364 -64,566 113,212 297,217 493,216l2117 0c233,0 899,6 1130,0 198,-6 353,-101 473,-236 97,-109 -18,-327 46,-486 76,-187 173,-369 67,-586 -102,-209 -105,-224 -301,-223l-2891 0c-108,0 -243,-7 -346,4z"/>
              <path fill="#AACD35" d="M4374 8045l111 0c221,-1 174,-9 284,-280 21,-51 74,-162 58,-219 -27,-97 -152,-69 -282,-69 -334,-1 -248,-32 -415,382 -15,38 -36,82 -16,129 35,81 148,58 259,58z"/>
              <path fill="#FEFEFE" d="M6747 10611c8,107 105,200 223,186 102,-12 187,-109 175,-230 -26,-261 -418,-235 -398,43z"/>
            </g>
          </svg>`
          }
        </button>
        <div id="go-float-drag-handle" title="Arraste para mover" aria-label="Arraste para mover">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10 9h4V6h3l-5-5-5 5h3v3zm-1 1H6V7l-5 5 5 5v-3h3v-4zm14 2l-5-5v3h-3v4h3v3l5-5zm-9 3h-4v3H7l5 5 5-5h-3v-3z" fill="white"/></svg>
        </div>
      </div>

      <!-- Container de Mensagens Rápidas (Flash Messages) -->
      <div id="go-float-flash-container">
        <div id="go-float-flash-divider"></div>
        <div id="go-float-flash-grid"></div>
      </div>
    `;

    document.body.appendChild(floatBtn);

    /* Se há posição salva, usa ela; senão usa canto inferior direito fixo */
    if (savedBtnPos) {
      floatBtn.style.left = clamp(savedBtnPos.x, 0, window.innerWidth - 90) + 'px';
      floatBtn.style.top  = clamp(savedBtnPos.y, 0, window.innerHeight - 60) + 'px';
      floatBtn.style.right = 'auto';
      floatBtn.style.bottom = 'auto';
    } else {
      floatBtn.style.left = 'auto';
      floatBtn.style.top = 'auto';
      floatBtn.style.right = '20px';
      floatBtn.style.bottom = '20px';
    }
    floatBtn.style.display = 'flex';

    /* Evita que o clique no botão (logotipo ou menu) roube o foco do campo ativo na página */
    floatBtn.addEventListener('mousedown', e => {
      e.preventDefault();
    });

    /* Configura drag e clique no logo */
    setupButtonDrag();

    /* Observer: remove botão se a página for desmontada pelo frontend/SPA */
    const observer = new MutationObserver(() => {
      if (!document.body.contains(floatBtn)) {
        floatBtn = null;
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true });

    /* Renderiza botões de mensagens rápidas assincronamente */
    renderFlashMessages();
  }

  async function renderFlashMessages() {
    const flashContainer = document.getElementById('go-float-flash-container');
    const flashGrid = document.getElementById('go-float-flash-grid');
    if (!flashContainer || !flashGrid) return;

    try {
      const data = await window.GoArmazenamento.obterDados();
      const messages = data.messages || [];
      // Filtra as favoritas e não limita a quantidade
      const favoritos = messages.filter(m => m.favorite);

      if (favoritos.length === 0) {
        flashContainer.style.setProperty('display', 'none', 'important');
        return;
      }

      flashContainer.style.setProperty('display', 'flex', 'important');
      flashGrid.innerHTML = '';

      favoritos.forEach(msg => {
        const iconDef = msg.icon ? (window.AdminIcons || []).find(i => i.id === msg.icon) : null;
        // Ícone padrão caso não ache o SVG específico (fallback: ícone de balão de mensagem)
        const iconSvg = iconDef ? iconDef.svg : '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" fill="currentColor"/>';

        const btn = document.createElement('button');
        btn.className = 'go-flash-btn';
        btn.title = msg.title; // Exibe o título no tooltip (texto ALT)
        btn.setAttribute('aria-label', msg.title);
        btn.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">${iconSvg}</svg>`;

        // Previne a perda de foco do activeField ao clicar nos botões rápidos
        btn.addEventListener('mousedown', e => e.preventDefault());
        
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          // Aqui não passamos saudação/assinatura por ser a flash message
          const finalContent = msg.contentText || stripHtml(msg.contentHtml || '');
          await insertMessageIntoField(activeField, finalContent);
          await window.GoArmazenamento.adicionarHistorico(msg.id, currentDomain);
          showPageToast('Mensagem rápida inserida!', 2000);
        });

        flashGrid.appendChild(btn);
      });
    } catch (e) {
      console.error('GoAtende: Erro ao carregar flash messages', e);
    }
  }

  function showFloatingButton(field) {
    if (!floatBtn) return;
    floatBtn.style.display = 'flex';
  }

  function removeFloatingButton() {
    if (floatBtn) { floatBtn.remove(); floatBtn = null; }
  }

  /* ── Drag do Botão GA ──────────────────────────────────────────────────── */
  /** Configura os event listeners para arrastar o widget flutuante e abrir menu */
  function setupButtonDrag() {
    if (!floatBtn) return;
    
    const dragHandle = document.getElementById('go-float-drag-handle');
    const logoBtn = document.getElementById('go-float-logo-btn');
    
    if (dragHandle) dragHandle.addEventListener('mousedown', onDragStart);
    if (logoBtn) logoBtn.addEventListener('click', (e) => {
      if (e) e.stopPropagation();
      openInsertOverlay();
    });
  }

  function onDragStart(e) {
    if (e.button !== 0) return; // Apenas botão esquerdo do mouse
    isDragging = true;
    dragMoved  = false;

    const rect   = floatBtn.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;

    floatBtn.classList.add('go-dragging');

    document.addEventListener('mousemove', onDragMove, { passive: true });
    document.addEventListener('mouseup',   onDragEnd);
    e.preventDefault();
  }

  function onDragMove(e) {
    if (!isDragging) return;
    dragMoved = true;

    const x = clamp(e.clientX - dragOffset.x, 0, window.innerWidth  - 90);
    const y = clamp(e.clientY - dragOffset.y, 0, window.innerHeight - 60);

    floatBtn.style.left = x + 'px';
    floatBtn.style.top  = y + 'px';
  }

  async function onDragEnd(e) {
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup',   onDragEnd);

    floatBtn.classList.remove('go-dragging');

    if (dragMoved) {
      const x = parseFloat(floatBtn.style.left);
      const y = parseFloat(floatBtn.style.top);
      savedBtnPos = { x, y };
      await window.GoArmazenamento.salvarPosicaoBotao(currentDomain, savedBtnPos);
    }
    isDragging = false;
    dragMoved = false; // Garante que a flag de movimento seja resetada
  }

  /* ── Overlay de Inserção de Mensagem ───────────────────────────────────── */
  /**
   * Exibe o overlay principal contendo o seletor de mensagens para inserir no campo.
   * @async
   */
  async function openInsertOverlay() {
    closeOverlay();

    /* Salva a seleção do iframe NESTE exato momento, antes que a barra de pesquisa do overlay roube o foco */
    if (activeField && activeField.tagName === 'IFRAME') {
      try {
        const sel = activeField.contentWindow.getSelection();
        if (sel && sel.rangeCount > 0) {
          savedIframeSelection = {
            iframe: activeField,
            range: sel.getRangeAt(0).cloneRange()
          };
        }
      } catch (e) {}
    }

    const data       = await window.GoArmazenamento.obterDados();
    const categories = data.categories || [];
    const messages   = data.messages   || [];
    const domain     = location.host;

    /* Separar categorias especiais de saudação e assinatura */
    const greetingMsgs = messages.filter(m => (m.categoryIds || []).includes('cat-greeting'));
    const signatureMsgs= messages.filter(m => (m.categoryIds || []).includes('cat-signature'));

    /* Categorias disponíveis para filtro (sem saudação/assinatura) */
    const filterCats = categories.filter(c => c.active && c.id !== 'cat-greeting' && c.id !== 'cat-signature');

    overlay = document.createElement('div');
    overlay.id = 'go-overlay';

    /* Opções de saudação para o dropdown */
    const greetingOpts = greetingMsgs.map(m =>
      `<option value="${escHtml(m.id)}">${escHtml(m.title)}</option>`
    ).join('');
    
    const signatureOpts = signatureMsgs.map(m =>
      `<option value="${escHtml(m.id)}">${escHtml(m.title)}</option>`
    ).join('');

    overlay.innerHTML = `
      <div id="go-panel">
        <div id="go-panel-header">
          <div id="go-panel-title">
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" fill="white"/></svg>
            Selecionar Mensagem
          </div>
          <button id="go-panel-close" title="Fechar (Esc)" aria-label="Fechar overlay">
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="white"/></svg>
          </button>
        </div>

        <!-- Barra de Saudação e Assinatura -->
        <div id="go-greet-sig-bar">
          <div class="go-greet-sig-block">
            <input type="checkbox" id="go-chk-greeting" aria-label="Incluir saudação"/>
            <label for="go-chk-greeting">Saudação</label>
            <select class="go-greet-sig-select" id="go-sel-greeting" aria-label="Selecionar saudação">
              ${greetingMsgs.length ? greetingOpts : '<option value="">Nenhuma saudação cadastrada</option>'}
            </select>
          </div>
          <div class="go-greet-sig-block">
            <input type="checkbox" id="go-chk-signature" aria-label="Incluir assinatura"/>
            <label for="go-chk-signature">Assinatura</label>
            <select class="go-greet-sig-select" id="go-sel-signature" aria-label="Selecionar assinatura">
              ${signatureMsgs.length ? signatureOpts : '<option value="">Nenhuma assinatura cadastrada</option>'}
            </select>
          </div>
        </div>

        <!-- Barra de busca e filtro de categorias -->
        <div id="go-panel-toolbar">
          <input id="go-search" type="text" placeholder="Buscar mensagens…" aria-label="Buscar mensagens"/>
          <div id="go-cat-filter"></div>
        </div>

        <!-- Lista de mensagens em grid 2 colunas -->
        <div id="go-msg-list" role="list"></div>
      </div>`;

    document.body.appendChild(overlay);

    /* Fecha ao clicar no fundo escuro */
    overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });
    document.getElementById('go-panel-close').addEventListener('click', closeOverlay);

    /* Previne que interações com o overlay roubem o foco do campo ativo, 
       a menos que o usuário explicitamente clique no campo de busca */
    overlay.addEventListener('mousedown', e => {
      const tag = e.target.tagName.toLowerCase();
      // Permite o foco no campo de busca
      if (tag === 'input' && e.target.id === 'go-search') return;
      
      // Permite o fluxo normal para labels e checkboxes
      if (tag === 'label' || (tag === 'input' && e.target.type === 'checkbox')) return;

      // Se o usuário clicou em uma barra de rolagem, permite o fluxo (não previne)
      // para que ele possa arrastar o scrollbar normalmente.
      if (e.target.clientWidth > 0 && e.offsetX > e.target.clientWidth) return;
      if (e.target.clientHeight > 0 && e.offsetY > e.target.clientHeight) return;

      // Para o resto do overlay (botões, cards, selects, fundo escuro), previne a perda do foco!
      e.preventDefault();
    });

    /* Lógica dos checkboxes de Saudação / Assinatura */
    const chkGreeting  = document.getElementById('go-chk-greeting');
    const selGreeting  = document.getElementById('go-sel-greeting');
    const chkSignature = document.getElementById('go-chk-signature');
    const selSignature = document.getElementById('go-sel-signature');

    chkGreeting.addEventListener('change', () => {
      selGreeting.style.display = chkGreeting.checked ? 'block' : 'none';
    });
    chkSignature.addEventListener('change', () => {
      selSignature.style.display = chkSignature.checked ? 'block' : 'none';
    });

    /* Renderiza chips de filtro de categorias */
    const catFilter = document.getElementById('go-cat-filter');
    let activeFilter = '';

    const allChip = document.createElement('button');
    allChip.className = 'go-chip active';
    allChip.textContent = 'Todas';
    allChip.dataset.cat = '';
    catFilter.appendChild(allChip);

    filterCats.forEach(cat => {
      const chip = document.createElement('button');
      chip.className = 'go-chip';
      chip.textContent = cat.name;
      chip.dataset.cat = cat.id;
      catFilter.appendChild(chip);
    });

    catFilter.addEventListener('click', e => {
      const chip = e.target.closest('[data-cat]');
      if (!chip) return;
      activeFilter = chip.dataset.cat;
      catFilter.querySelectorAll('.go-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.cat === activeFilter);
      });
      renderMsgList();
    });

    /* Inicializa Busca Dinâmica */
    const searchEl = document.getElementById('go-search');
    searchEl.addEventListener('input', renderMsgList);
    // REMOVIDO: searchEl.focus() - O foco DEVE permanecer no campo ativo (activeField)
    // para não quebrar plataformas que exigem o cursor contínuo no campo.

    /* ── Renderização da lista de mensagens ── */
    function renderMsgList() {
      const q       = searchEl.value.toLowerCase();
      const msgList = document.getElementById('go-msg-list');
      msgList.innerHTML = '';

      /* Filtra excluindo saudações e assinaturas (mostradas no topo separadamente) */
      let filtered = messages.filter(m => {
        const cats = Array.isArray(m.categoryIds) ? m.categoryIds : (m.categoryIds ? [m.categoryIds] : []);
        return !cats.includes('cat-greeting') && !cats.includes('cat-signature');
      });
      if (activeFilter) {
        filtered = filtered.filter(m => {
          const cats = Array.isArray(m.categoryIds) ? m.categoryIds : (m.categoryIds ? [m.categoryIds] : []);
          return cats.includes(activeFilter);
        });
      }
      if (q) {
        filtered = filtered.filter(m => {
          const title = (m.title || '').toLowerCase();
          const content = (m.contentText || m.contentHtml || '').toLowerCase();
          const tags = Array.isArray(m.tags) ? m.tags : (m.tags ? [m.tags] : []);
          return title.includes(q) || content.includes(q) || tags.some(t => (t || '').toLowerCase().includes(q));
        });
      }

      // A ordem manual do array é absoluta, portanto não ordenamos por favoritos.
      if (filtered.length === 0) {
        msgList.innerHTML = `<div class="go-empty"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" fill="currentColor"/></svg><p>Nenhuma mensagem encontrada</p></div>`;
        return;
      }

      filtered.forEach(msg => {
        const cats = (msg.categoryIds || []).map(cid => categories.find(c => c.id === cid)).filter(Boolean);
        const badgesHtml = cats.map(c => `<span class="go-badge" style="background:${c.color}">${escHtml(c.name)}</span>`).join('');
        const preview    = msg.contentText || stripHtml(msg.contentHtml || '');

        /* Ícone do título (se houver) */
        const icon = msg.icon ? ICONS.find(i => i.id === msg.icon) : null;
        const iconHtml = icon
          ? `<svg class="go-msg-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${icon.svg}</svg>`
          : '';

        const card = document.createElement('div');
        card.className = 'go-msg-card';
        card.setAttribute('role', 'listitem');
        card.innerHTML = `
          <div class="go-msg-top">
            <span class="go-msg-title">${msg.favorite ? '⭐ ' : ''}${iconHtml}${escHtml(msg.title)}</span>
            <button class="go-insert-btn" data-msgid="${escHtml(msg.id)}" aria-label="Inserir mensagem: ${escHtml(msg.title)}">
              <svg viewBox="0 0 24 24" width="13" height="13"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="white"/></svg>
              Inserir
            </button>
          </div>
          ${badgesHtml ? `<div class="go-msg-badges">${badgesHtml}</div>` : ''}
          <div class="go-msg-preview">${escHtml(preview)}</div>`;

        // Botão de inserção no cartão
        card.querySelector('.go-insert-btn').addEventListener('click', async () => {
          /* Monta texto final com saudação e/ou assinatura */
          const finalContent = buildFinalContent(msg, messages, chkGreeting, selGreeting, chkSignature, selSignature);
          await insertMessageIntoField(activeField, finalContent);
          await window.GoArmazenamento.adicionarHistorico(msg.id, domain);
          closeOverlay();
          showPageToast('Mensagem inserida!', 2000);
        });

        msgList.appendChild(card);
      });
    }

    // Fechar pressionando Esc
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeOverlay();
    });

    renderMsgList();
  }

  /**
   * Constrói o texto e HTML finais da mensagem contendo a Saudação (topo) e Assinatura (rodapé),
   * se essas opções estiverem marcadas.
   * @returns {Object} Objeto com contentText e contentHtml prontos
   */
  function buildFinalContent(msg, allMessages, chkGreeting, selGreeting, chkSignature, selSignature) {
    const parts = [];

    /* Adiciona saudação (texto simples) */
    if (chkGreeting.checked && selGreeting.value) {
      const greetMsg = allMessages.find(m => m.id === selGreeting.value);
      if (greetMsg) parts.push(greetMsg.contentText || stripHtml(greetMsg.contentHtml || ''));
    }

    /* Mensagem principal */
    parts.push(msg.contentText || stripHtml(msg.contentHtml || ''));

    /* Adiciona assinatura */
    if (chkSignature.checked && selSignature.value) {
      const sigMsg = allMessages.find(m => m.id === selSignature.value);
      if (sigMsg) parts.push(sigMsg.contentText || stripHtml(sigMsg.contentHtml || ''));
    }

    return { 
      contentText: parts.join('\n'), 
      contentHtml: parts.map(p => `<p>${escHtml(p).replace(/\n/g, '<br>')}</p>`).join('') 
    };
  }

  /* ── Overlay de Nova Mensagem Rápida ───────────────────────────────────── */
  /**
   * Exibe o overlay de formulário para criar e salvar uma nova mensagem 
   * sem sair da página de atendimento atual.
   * @async
   */
  async function openNewMsgOverlay() {
    closeOverlay();
    
    const data = await window.GoArmazenamento.obterDados();
    const cats = data.categories || [];
    const recentEmojis = await window.GoArmazenamento.obterEmojisRecentes();

    overlay = document.createElement('div');
    overlay.id = 'go-overlay';

    const catOptions = cats.filter(c => c.active).map(c =>
      `<option value="${escHtml(c.id)}">${escHtml(c.name)}</option>`
    ).join('');

    /* Constrói o HTML dos ícones SVG disponíveis */
    const iconPickerHtml = ICONS.map(icon => `
      <div class="go-icon-item" data-icon-id="${icon.id}" role="button" tabindex="0">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${icon.svg}</svg>
      </div>`).join('');

    overlay.innerHTML = `
      <div id="go-panel" style="max-width:520px">
        <div id="go-panel-header">
          <div id="go-panel-title">
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="white"/></svg>
            Nova Mensagem Rápida
          </div>
          <button id="go-panel-close" title="Fechar" aria-label="Fechar">
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="white"/></svg>
          </button>
        </div>
        <div id="go-new-form">

          <!-- Campo de Título com seletor de ícone e emoji -->
          <div>
            <label class="go-form-label" for="go-new-title">Título *</label>
            <div id="go-title-row">
              <button type="button" id="go-icon-picker-btn" title="Selecionar ícone" aria-label="Selecionar ícone para o título" aria-expanded="false">
                <svg id="go-selected-icon-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="color:#757575">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
                </svg>
              </button>
              <input type="text" class="go-form-input" id="go-new-title" placeholder="Ex: Resposta de RMA" maxlength="120" style="flex:1"/>
              <button type="button" id="go-title-emoji-btn" title="Inserir emoji no título" aria-label="Inserir emoji no título">😀</button>
              <input type="hidden" id="go-new-icon" value=""/>
            </div>
            <!-- Painel do seletor de ícone (oculto por padrão) -->
            <div id="go-icon-picker-panel" style="display:none;margin-top:6px">
              <div style="font-size:10px;font-weight:700;color:#757575;text-transform:uppercase;margin-bottom:6px">Selecionar Ícone</div>
              <div class="go-icon-grid">${iconPickerHtml}</div>
              <div class="go-icon-label"></div>
            </div>
          </div>

          <!-- Categoria -->
          <div>
            <label class="go-form-label" for="go-new-cat">Categoria</label>
            <select class="go-form-input go-form-select" id="go-new-cat">
              <option value="">— Sem categoria —</option>
              ${catOptions}
            </select>
          </div>

          <!-- Conteúdo com toolbar (negrito, itálico, emoji) -->
          <div>
            <label class="go-form-label" for="go-new-content">Conteúdo *</label>
            <div class="go-new-toolbar">
              <button type="button" class="go-toolbar-btn" data-cmd="bold"      title="Negrito"><b>B</b></button>
              <button type="button" class="go-toolbar-btn" data-cmd="italic"    title="Itálico"><i>I</i></button>
              <button type="button" class="go-toolbar-btn" data-cmd="underline" title="Sublinhado"><u>U</u></button>
              <div class="go-toolbar-sep"></div>
              <button type="button" class="go-toolbar-btn" id="go-emoji-btn" title="Inserir emoji" aria-label="Inserir emoji">😀</button>
            </div>
            <textarea class="go-form-input go-form-textarea" id="go-new-content"
                      placeholder="Digite o conteúdo da mensagem…" rows="5"
                      aria-label="Conteúdo da mensagem"></textarea>
          </div>

          <!-- Botões de ação -->
          <div class="go-form-actions">
            <button class="go-btn-cancel" id="go-new-cancel">Cancelar</button>
            <button class="go-btn-save"   id="go-new-save">💾 Salvar Mensagem</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    
    // Conecta botões básicos de fechar
    overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });
    document.getElementById('go-panel-close').addEventListener('click', closeOverlay);
    document.getElementById('go-new-cancel').addEventListener('click', closeOverlay);

    const titleInput   = document.getElementById('go-new-title');
    const catSelect    = document.getElementById('go-new-cat');
    const contentInput = document.getElementById('go-new-content');
    const iconInput    = document.getElementById('go-new-icon');

    /* Pré-seleciona categoria com base no domínio */
    const domainCat = cats.find(c => c.siteScope && location.host.includes(c.siteScope));
    if (domainCat) catSelect.value = domainCat.id;

    titleInput.focus();

    /* ── Seletor de ícone ── */
    const iconPickerBtn   = document.getElementById('go-icon-picker-btn');
    const iconPickerPanel = document.getElementById('go-icon-picker-panel');

    iconPickerBtn.addEventListener('click', () => {
      const open = iconPickerPanel.style.display !== 'none';
      iconPickerPanel.style.display = open ? 'none' : 'block';
      iconPickerBtn.setAttribute('aria-expanded', String(!open));
    });

    iconPickerPanel.addEventListener('click', e => {
      const item = e.target.closest('.go-icon-item');
      if (!item) return;
      
      const iconId = item.dataset.iconId;

      /* Desmarca todos e marca o selecionado */
      iconPickerPanel.querySelectorAll('.go-icon-item').forEach(el => el.classList.remove('selected'));

      if (iconInput.value === iconId) {
        /* Clique no mesmo ícone = desselecionar */
        iconInput.value = '';
        document.getElementById('go-selected-icon-svg').innerHTML =
          '<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>';
      } else {
        item.classList.add('selected');
        iconInput.value = iconId;
        const icon = ICONS.find(i => i.id === iconId);
        document.getElementById('go-selected-icon-svg').innerHTML = icon?.svg || '';
        
        iconPickerPanel.style.display = 'none';
        iconPickerBtn.setAttribute('aria-expanded', 'false');
      }
    });

    /* ── Emoji Picker (conteúdo) ── */
    document.getElementById('go-emoji-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      const pickerExistente = document.getElementById('go-whatsapp-emoji-picker');
      if (pickerExistente && emojiTarget === contentInput) { window.GoEmojiPicker.fechar(); return; }
      window.GoEmojiPicker.fechar();
      emojiTarget = contentInput;
      const emojisRecentes = await window.GoArmazenamento.obterEmojisRecentes();
      window.GoEmojiPicker.abrir(e.currentTarget, emojisRecentes, async (emoji) => {
        insertEmojiIntoField(emojiTarget, emoji);
        await window.GoArmazenamento.adicionarEmojiRecente(emoji);
        window.GoEmojiPicker.fechar();
      });
    });

    /* ── Emoji Picker (título) ── */
    document.getElementById('go-title-emoji-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      const pickerExistente = document.getElementById('go-whatsapp-emoji-picker');
      if (pickerExistente && emojiTarget === titleInput) { window.GoEmojiPicker.fechar(); return; }
      window.GoEmojiPicker.fechar();
      emojiTarget = titleInput;
      const emojisRecentes = await window.GoArmazenamento.obterEmojisRecentes();
      window.GoEmojiPicker.abrir(e.currentTarget, emojisRecentes, async (emoji) => {
        insertEmojiIntoField(emojiTarget, emoji);
        await window.GoArmazenamento.adicionarEmojiRecente(emoji);
        window.GoEmojiPicker.fechar();
      });
    });

    /* ── Salvar Mensagem ── */
    document.getElementById('go-new-save').addEventListener('click', async () => {
      const title   = titleInput.value.trim();
      const content = contentInput.value.trim();
      
      if (!title)   { titleInput.focus(); showPageToast('Informe o título.', 2000); return; }
      if (!content) { contentInput.focus(); showPageToast('Informe o conteúdo.', 2000); return; }

      const msg = {
        id: window.GoArmazenamento.gerarId('msg'),
        title,
        icon: iconInput.value || null,
        contentHtml: '<p>' + escHtml(content).replace(/\n/g, '</p><p>') + '</p>',
        contentText: content,
        categoryIds: catSelect.value ? [catSelect.value] : [],
        tags: [],
        favorite: false,
        updatedAt: new Date().toISOString()
      };

      await window.GoArmazenamento.salvarMensagem(msg);
      closeOverlay();
      showPageToast('Mensagem salva com sucesso!', 2500);
    });

    // Fechar pressionando ESC
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeOverlay(); }
    });
  }



  /** 
   * Insere um emoji na posição do cursor em um textarea/input text.
   * @param {HTMLElement} field - O campo input/textarea focado.
   * @param {string} emoji - O caractere emoji em Unicode.
   */
  function insertEmojiIntoField(field, emoji) {
    if (field.tagName.toUpperCase() === 'TEXTAREA' || field.tagName.toUpperCase() === 'INPUT') {
      const start = field.selectionStart || 0;
      const end   = field.selectionEnd   || 0;
      
      const before = field.value.slice(0, start);
      const after  = field.value.slice(end);
      
      field.value  = before + emoji + after;
      const pos = start + emoji.length;
      
      try {
        field.setSelectionRange(pos, pos);
      } catch (e) {}
      field.focus();
      
      // Dispatch input event for frontend frameworks to react
      field.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (field.isContentEditable) {
      field.focus();
      document.execCommand('insertText', false, emoji);
    }
  }

  function closeOverlay() {
    if (overlay) { overlay.remove(); overlay = null; }
    if (window.GoEmojiPicker) window.GoEmojiPicker.fechar();
    if (iconPickerEl) { iconPickerEl.remove(); iconPickerEl = null; }
  }

  /* ── Inserção de Mensagem no Campo de Resposta do Cliente ──────────────── */
  
  /**
   * Extrai o texto do elemento na página correspondente ao seletor mapeado do placeholder
   * @param {string} pId - ID do placeholder
   * @returns {string|null}
   */
  function extrairValorPlaceholder(pId) {
    if (!siteProfile || !siteProfile.placeholdersMap) return null;
    const selector = siteProfile.placeholdersMap[pId];
    if (!selector) return null;
    
    try {
      const elements = document.querySelectorAll(selector);
      for (let el of elements) {
        let val = null;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          val = el.value.trim();
        } else {
          val = (el.innerText || el.textContent).trim();
        }
        if (val) return val;
      }
    } catch (e) {}
    
    return null;
  }

  async function processarVariaveisMensagem(texto, html) {
    let novoTexto = texto;
    let novoHtml = html;
    
    const sitePlaceholders = siteProfile?.placeholders || [];
    const defaultPlaceholders = [
      { id: 'cliente', name: 'Nome do cliente', fixed: true },
      { id: 'venda_pedido', name: 'Venda/pedido', fixed: true },
      { id: 'produto', name: 'Produto', fixed: true }
    ];
    const placeholders = [...defaultPlaceholders, ...sitePlaceholders];

    for (let p of placeholders) {
      // Usar regex case-insensitive para encontrar a tag
      const regexNormal = new RegExp(`\\[${p.id}\\]`, 'gi');
      const regexPrimeiroNome = new RegExp(`\\[primeiro_nome_${p.id}\\]`, 'gi');

      const possuiNormal = regexNormal.test(novoTexto) || regexNormal.test(novoHtml);
      const possuiPrimeiroNome = regexPrimeiroNome.test(novoTexto) || regexPrimeiroNome.test(novoHtml);

      if (possuiNormal || possuiPrimeiroNome) {
        let valor = extrairValorPlaceholder(p.id);

        if (valor) {
          if (p.id === 'cliente') {
            // Remove e-mails entre < >, remove aspas e extrai apenas a primeira palavra contendo letras (incluindo acentos)
            let limpo = valor.replace(/<[^>]*>/g, '').replace(/["']/g, '');
            let match = limpo.match(/[a-zA-Z\u00C0-\u00FF]+/);
            if (match) {
              let primeiroNome = match[0];
              valor = primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1).toLowerCase();
            }
          }
          if (possuiNormal) {
            novoTexto = novoTexto.replace(regexNormal, valor);
            novoHtml = novoHtml.replace(regexNormal, escHtml(valor));
          }
          
          if (possuiPrimeiroNome) {
             let primeiro = valor.split(' ')[0];
             primeiro = primeiro.charAt(0).toUpperCase() + primeiro.slice(1).toLowerCase();
             
             novoTexto = novoTexto.replace(regexPrimeiroNome, primeiro);
             novoHtml = novoHtml.replace(regexPrimeiroNome, escHtml(primeiro));
          }
        }
      }
    }

    return { texto: novoTexto, html: novoHtml };
  }

  /**
   * Injeta os textos/HTMl da mensagem no campo de digitação ativo da página.
   * Suporta Textareas padrões e Editores Ricos (ContentEditable/TinyMCE).
   * @async
   * @param {HTMLElement} field - O campo input selecionado.
   * @param {Object|string} content - O conteúdo selecionado {contentText, contentHtml}.
   */
  async function insertMessageIntoField(field, content) {
    /* 'content' pode ser objeto {contentText, contentHtml} ou uma string diretamente */
    let text = content?.contentText || content;
    let html = content?.contentHtml || ('<p>' + escHtml(text).replace(/\n/g, '<br>') + '</p>');

    const processado = await processarVariaveisMensagem(text, html);
    text = processado.texto;
    html = processado.html;

    if (!field) {
      showPageToast('Nenhum campo ativo. Clique no campo de digitação primeiro.', 3000);
      return;
    }

    const tag  = field.tagName.toUpperCase();
    const type = detectEditorType(field);

    let targetField = field;

    /* ── Tratamento especial para iframes de editores ricos (TinyMCE, etc.) ── */
    if (tag === 'IFRAME') {
      try {
        const iframeDoc = field.contentDocument || field.contentWindow?.document;
        if (iframeDoc && iframeDoc.body) {
          targetField = iframeDoc.body;

          /* Re-foca o iframe (parent → iframe → body) */
          field.focus();
          targetField.focus();

          /* Restaura a posição exata do cursor salva pelo monitoramento de iframes */
          const iframeWin = field.contentWindow;
          const sel = iframeWin.getSelection();

          if (savedIframeSelection && savedIframeSelection.iframe === field && sel) {
            try {
              sel.removeAllRanges();
              sel.addRange(savedIframeSelection.range);
            } catch (rangeErr) {}
            savedIframeSelection = null;
          } else if (!sel || sel.rangeCount === 0) {
            /* SE não houver seleção salva E a seleção atual estiver vazia, posiciona no final.
               Caso contrário, a seleção atual já está correta (ex: clique no Flash Message com preventDefault). */
            const fallbackRange = iframeDoc.createRange();
            fallbackRange.selectNodeContents(iframeDoc.body);
            fallbackRange.collapse(false);
            if (sel) {
              sel.removeAllRanges();
              sel.addRange(fallbackRange);
            }
          }
        }
      } catch (e) {
        showPageToast('Erro: Iframe bloqueado por política de mesma origem (CORS).', 3000);
        return;
      }
    }

    if (type === 'textarea' || targetField.tagName === 'TEXTAREA' || targetField.tagName === 'INPUT') {
      insertIntoTextarea(targetField, text);
    } else {
      insertIntoContentEditable(targetField, html, text);
    }
  }

  /**
   * Força a atualização do valor contornando interceptadores do React (React 15/16+)
   */
  function alterarValorNativo(field, newValue) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;

    if (field.tagName === 'INPUT' && nativeInputValueSetter) {
      nativeInputValueSetter.call(field, newValue);
    } else if (field.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
      nativeTextAreaValueSetter.call(field, newValue);
    } else {
      field.value = newValue;
    }
  }

  /**
   * Dispara uma sequência de eventos para enganar frameworks reativos (React, Vue, etc)
   * que dependem de teclado e eventos InputEvent.
   */
  function dispararEventosDeMudanca(field, textToInsert) {
    // 1. Emula Eventos de Teclado (Keydown)
    field.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Process', code: 'Process', keyCode: 229 }));
    
    // 2. Dispara InputEvent se suportado (útil para WhatsApp Web e novos frameworks)
    let inputEvt;
    if (typeof window.InputEvent === 'function') {
      inputEvt = new InputEvent('input', { 
        bubbles: true, 
        cancelable: true, 
        inputType: 'insertText',
        data: textToInsert || ''
      });
    } else {
      inputEvt = new Event('input', { bubbles: true, cancelable: true });
    }
    field.dispatchEvent(inputEvt);
    
    // 3. Dispara change
    field.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    
    // 4. Emula Eventos de Teclado (Keyup)
    field.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: 'Process', code: 'Process', keyCode: 229 }));
  }

  /**
   * Função utilitária de injeção em textarea bruto.
   */
  function insertIntoTextarea(field, text) {
    field.focus();
    const start = field.selectionStart || 0;
    const end   = field.selectionEnd   || 0;
    
    let textToInsert = text;
    
    /* Verifica se o campo possui um limite de caracteres para evitar travar a plataforma */
    const maxLenAttr = field.getAttribute('maxlength') || field.getAttribute('data-maxlength');
    if (maxLenAttr) {
      const maxLength = parseInt(maxLenAttr, 10);
      if (!isNaN(maxLength) && maxLength > 0) {
        const currentLength = field.value.length;
        const selectedLength = end - start;
        const availableSpace = maxLength - (currentLength - selectedLength);
        
        if (textToInsert.length > availableSpace) {
          textToInsert = textToInsert.slice(0, Math.max(0, availableSpace));
          showPageToast('Aviso: Mensagem reduzida devido ao limite de caracteres do campo.', 4000);
        }
      }
    }

    const prev  = field.value;
    const newValue = prev.slice(0, start) + textToInsert + prev.slice(end);
    
    // Contorna o React para garantir que o framework detecta a mudança
    alterarValorNativo(field, newValue);
    
    const newPos = start + textToInsert.length;
    try {
      field.setSelectionRange(newPos, newPos);
    } catch (e) {}

    /* Dispara eventos de mudança para enganar os frameworks Reativos da plataforma cliente */
    dispararEventosDeMudanca(field, textToInsert);
  }

  /**
   * Função utilitária de injeção HTML formatado.
   * Suporta campos contentEditable diretos e corpos de iframes (TinyMCE, CKEditor).
   */
  function insertIntoContentEditable(field, html, text) {
    const doc = field.ownerDocument || document;
    const win = doc.defaultView || window;
    const safeHtml = window.GoSanitize.sanitizeForInsertion(html);

    /* Garante foco no campo */
    field.focus();

    let sel = win.getSelection();

    /* Se não houver seleção válida, cria uma no final do conteúdo */
    if (!sel || sel.rangeCount === 0) {
      const newRange = doc.createRange();
      newRange.selectNodeContents(field);
      newRange.collapse(false);
      if (!sel) sel = win.getSelection();
      sel.removeAllRanges();
      sel.addRange(newRange);
    }

    /* 1. Tenta execCommand – mas verifica se realmente mudou o conteúdo.
       Em contextos de iframe chamados a partir do content script,
       execCommand pode retornar true sem inserir nada (falso positivo). */
    try {
      const htmlBefore = field.innerHTML;
      const result = doc.execCommand('insertHTML', false, safeHtml);
      if (result && field.innerHTML !== htmlBefore) {
        dispararEventosDeMudanca(field, text);
        return;
      }
    } catch (e) {}

    /* 2. Fallback principal: inserção direta via Range API (DOM nativo).
       Funciona independente de user-activation e contexto de frame. */
    sel = win.getSelection();
    if (sel && sel.rangeCount > 0) {
      try {
        const range = sel.getRangeAt(0);
        range.deleteContents();

        const tempDiv = doc.createElement('div');
        tempDiv.innerHTML = safeHtml;

        const frag = doc.createDocumentFragment();
        let lastNode = null;
        while (tempDiv.firstChild) {
          lastNode = frag.appendChild(tempDiv.firstChild);
        }

        range.insertNode(frag);

        if (lastNode) {
          range.setStartAfter(lastNode);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }

        dispararEventosDeMudanca(field, text);
        return;
      } catch (e) {
        console.warn('[GoAtende] Range API fallback falhou:', e);
      }
    }

    /* 3. Fallback: insertText (texto puro) */
    try {
      if (doc.execCommand('insertText', false, text)) {
        dispararEventosDeMudanca(field, text);
        return;
      }
    } catch (e) {}

    /* 4. Último recurso: append direto no innerHTML */
    field.innerHTML += safeHtml;
    dispararEventosDeMudanca(field, text);
  }

  /* ── Toast de Notificação Em-Página ────────────────────────────────────── */
  /**
   * Exibe uma barra de status temporária informando sucesso da operação sem 
   * interromper ou travar a aba do usuário (Substituto do alert nativo).
   * @param {string} msg 
   * @param {number} duration ms 
   */
  function showPageToast(msg, duration = 3000) {
    const existing = document.getElementById('go-toast');
    if (existing) existing.remove();
    
    const el = document.createElement('div');
    el.id = 'go-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.textContent = msg;
    
    document.body.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, duration);
  }

  /* ── Utilitários Gerais ────────────────────────────────────────────────── */

  /**
   * Escapa caracteres HTML perigosos de forma simples (Mitigação Anti-XSS).
   * @param {string} str 
   * @returns {string} String HTML sanitizada
   */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Transforma HTML sujo em puro texto simples (Sem formatação rich).
   * Usado para previews de cartão de mensagem.
   * @param {string} html 
   * @returns {string} 
   */
  function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  /** Limitador matemático clamp. (Mínimo, Máximo) */
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /* ── Início (Boot Lifecycle) ───────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

