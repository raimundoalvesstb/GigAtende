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
/* src/utilitarios/sanitizacao.js â€“ Sanitizador de ConteÃºdo do GoAtende
 * Exposto globalmente como window.GoSanitize.
 */
(function () {
  'use strict';

  const TAGS_PERMITIDAS = new Set([
    'P','BR','B','STRONG','I','EM','U','S','DEL',
    'UL','OL','LI','BLOCKQUOTE','H1','H2','H3','H4',
    'SPAN','DIV','A','HR'
  ]);

  const ATRIBUTOS_PERMITIDOS = new Set(['href','title','class','target']);

  function sanitizeHtml(html) {
    if (!html) return '';
    // Processa em uma div isolada (sandbox)
    const div = document.createElement('div');
    div.innerHTML = html;
    _sanitizarNo(div);
    return div.innerHTML;
  }

  function _sanitizarNo(noElemento) {
    const filhos = Array.from(noElemento.childNodes);
    filhos.forEach(filho => {
      if (filho.nodeType === Node.TEXT_NODE) return;
      if (filho.nodeType !== Node.ELEMENT_NODE) {
        filho.parentNode.removeChild(filho);
        return;
      }
      if (!TAGS_PERMITIDAS.has(filho.tagName.toUpperCase())) {
        // Substitui o elemento por seus filhos
        while (filho.firstChild) {
          filho.parentNode.insertBefore(filho.firstChild, filho);
        }
        filho.parentNode.removeChild(filho);
        return;
      }
      // Remove atributos nÃ£o permitidos
      const atributos = Array.from(filho.attributes);
      atributos.forEach(atributo => {
        if (!ATRIBUTOS_PERMITIDOS.has(atributo.name.toLowerCase())) {
          filho.removeAttribute(atributo.name);
        }
      });
      // Sanitiza href
      if (filho.tagName === 'A' && filho.href) {
        if (!filho.href.startsWith('http://') && !filho.href.startsWith('https://')) {
          filho.removeAttribute('href');
        }
        filho.setAttribute('rel', 'noopener noreferrer');
        filho.setAttribute('target', '_blank');
      }
      _sanitizarNo(filho);
    });
  }

  function htmlToText(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    // Converte <br> e block-level elements para quebras de linha
    div.querySelectorAll('br').forEach(br => {
      br.replaceWith('\n');
    });
    div.querySelectorAll('p, div, h1, h2, h3, h4, li, blockquote').forEach(el => {
      el.insertAdjacentText('beforebegin', '\n');
    });
    return (div.textContent || div.innerText || '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function flattenHtmlBlocks(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    
    const blockTags = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'LI', 'FIGURE', 'FIGCAPTION']);
    const listWrappers = new Set(['UL', 'OL']);
    
    function _flatten(node) {
      const filhos = Array.from(node.childNodes);
      filhos.forEach(filho => {
        if (filho.nodeType === Node.ELEMENT_NODE) {
          _flatten(filho);
          
          const tag = filho.tagName.toUpperCase();
          
          if (blockTags.has(tag) || listWrappers.has(tag)) {
            const frag = document.createDocumentFragment();
            
            if (listWrappers.has(tag)) {
              while (filho.firstChild) {
                frag.appendChild(filho.firstChild);
              }
            } else {
              const isJustBr = filho.childNodes.length === 1 && filho.firstChild.tagName === 'BR';
              const isTotallyEmpty = filho.childNodes.length === 0 || (filho.textContent.trim() === '' && !filho.querySelector('*'));
              
              if (isJustBr || isTotallyEmpty) {
                frag.appendChild(document.createElement('br'));
              } else {
                frag.appendChild(document.createElement('br'));
                if (tag === 'LI') {
                  frag.appendChild(document.createTextNode('• '));
                }
                while (filho.firstChild) {
                  frag.appendChild(filho.firstChild);
                }
              }
            }
            filho.parentNode.replaceChild(frag, filho);
          }
        }
      });
    }
    
    _flatten(div);
    
    let result = div.innerHTML;
    result = result.replace(/^(?:<br\s*\/?>|\s|&nbsp;)+/gi, '');
    result = result.replace(/(?:<br\s*\/?>|\s|&nbsp;)+$/gi, '');
    
    return result;
  }

  function sanitizeForInsertion(html) {
    // VersÃ£o mais rigorosa para inserir em campos de terceiros
    if (!html) return '';
    let limpo = sanitizeHtml(html);
    
    // Converte blocos HTML (p, div) em quebras de linha (br) para evitar espaços irrevogáveis
    // em plataformas de chat como Nexcore, WhatsApp, etc.
    limpo = flattenHtmlBlocks(limpo);
    
    // Remove qualquer padrão <script> remanescente
    return limpo.replace(/<script[\s\S]*?<\/script>/gi, '')
                .replace(/on\w+\s*=/gi, 'data-removed=')
                .replace(/javascript:/gi, '');
  }

  function escapeHtml(texto) {
    return texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  window.GoSanitize = {
    sanitizeHtml,
    htmlToText,
    sanitizeForInsertion,
    escapeHtml
  };
})();



