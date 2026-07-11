/**
 * @file src/app/admin/adminApp.js
 * @description Ponto de entrada (Entry Point) da página de Administração.
 * Controla a navegação entre os painéis, inicialização dos módulos, temas visuais (Dark/Light Mode)
 * e o fluxo de importação e exportação de backups (JSON).
 */

'use strict';

(async function () {
  /**
   * Mapeamento dos IDs de abas (tabs) para os IDs dos contêineres de painéis no DOM.
   * @constant {Object}
   */
  const PAINEIS = {
    dashboard: 'tabDashboard',
    messages: 'tabMessages',
    categories: 'tabCategories',
    sites: 'tabSites',
    settings: 'tabSettings',
    instructions: 'tabInstructions'
  };

  /**
   * Inicializa a aplicação carregando os dados do armazenamento e instanciando todos os submódulos.
   * Configura listeners de interface e sincronização em tempo real.
   * @async
   */
  async function inicializar() {
    await window.AdminEstado.carregarTudo();
    
    // Inicializa cada submódulo administrativo disponível globalmente
    if (window.AdminMensagens) window.AdminMensagens.inicializar();
    if (window.AdminCategorias) window.AdminCategorias.inicializar();
    if (window.AdminSites) window.AdminSites.inicializar();
    if (window.AdminDashboard) window.AdminDashboard.inicializar();
    
    configurarNavegacao();
    configurarConfiguracoes();
    configurarImportacaoExportacao();
    
    aplicarConfiguracoes();
    renderizarTudo();
    
    // Fecha qualquer janela modal se a tecla ESC for pressionada
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => {
          if (m.style.display !== 'none') m.style.display = 'none';
        });
      }
    });

    // Escuta alterações feitas no storage (ex: configurações feitas no injetor) e sincroniza a tela
    chrome.storage.onChanged.addListener(async () => {
      await window.AdminEstado.carregarTudo();
      renderizarTudo();
    });
  }

  /**
   * Invoca os métodos de renderização de interface em todos os submódulos para atualizar a tela.
   */
  function renderizarTudo() {
    if (window.AdminMensagens) {
      window.AdminMensagens.renderizarFiltrosCategorias();
      window.AdminMensagens.renderizarMensagens();
    }
    if (window.AdminCategorias) window.AdminCategorias.renderizarCategorias();
    if (window.AdminSites) window.AdminSites.renderizarSites();
    if (window.AdminDashboard) window.AdminDashboard.renderizarTudo();
    if (window.AdminUI) window.AdminUI.renderizarBadges();
  }

  /**
   * Configura a barra de navegação principal (Topnav) para alternar entre os painéis (Abas).
   */
  function configurarNavegacao() {
    const navItems = document.querySelectorAll('.topnav-navbtn');
    
    // Oculta todos os painéis inicialmente
    Object.values(PAINEIS).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    // Exibe o painel correspondente à aba ativa por padrão (ou Mensagens)
    const activeBtn = document.querySelector('.topnav-navbtn.active');
    const activeTab = activeBtn?.dataset?.tab || 'messages';
    const initialPanel = document.getElementById(PAINEIS[activeTab]);
    if (initialPanel) initialPanel.style.display = '';

    // Adiciona o evento de clique para alternar painéis
    navItems.forEach(btn => {
      btn.addEventListener('click', () => {
        navItems.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        Object.values(PAINEIS).forEach(id => {
          const el = document.getElementById(id);
          if (el) el.style.display = 'none';
        });
        
        const target = document.getElementById(PAINEIS[btn.dataset.tab]);
        if (target) {
          target.style.display = '';
          if (btn.dataset.tab === 'messages' && window.AdminMensagens) {
            window.AdminMensagens.renderizarFiltrosCategorias();
          }
        }
      });
    });
  }

  /**
   * Vincula os ouvintes de eventos para as opções da aba de Configurações do sistema.
   * Inclui temas visuais e o reset (redefinição) geral de fábrica.
   */
  function configurarConfiguracoes() {
    // Listeners para os 4 temas
    document.getElementById('btnThemeLight')?.addEventListener('click', () => aplicarTema('light'));
    document.getElementById('btnThemeDark')?.addEventListener('click',  () => aplicarTema('dark'));
    document.getElementById('btnThemeWarm')?.addEventListener('click',  () => aplicarTema('warm'));
    document.getElementById('btnThemeContrast')?.addEventListener('click', () => aplicarTema('contrast'));
    configurarMarca();
    
    // Configura o botão de 'Redefinir Dados de Fábrica'
    document.getElementById('btnResetData')?.addEventListener('click', () => {
      window.AdminUI.mostrarConfirmacao(
        'Redefinir todos os dados',
        'Esta ação apagará TODAS as mensagens, categorias e configurações. Continuar?',
        async () => {
          await window.GigaArmazenamento.definirDados(window.GigaArmazenamento.DADOS_PADRAO);
          await window.AdminEstado.carregarTudo();
          renderizarTudo();
          aplicarConfiguracoes();
          window.AdminUI.toast('Dados redefinidos para o padrão.', 'warn');
        }
      );
    });
  }

  /**
   * Lê as configurações em memória (AdminEstado) e aplica-as visualmente no DOM (tema e densidade).
   */
  function aplicarConfiguracoes() {
    aplicarTema(window.AdminEstado.settings.theme || 'light', false);
    aplicarMarcaVisualmente();
  }

  /**
   * Aplica um tema à interface, define o data-theme no body e persiste no storage.
   * @param {string} tema - 'light' | 'dark' | 'warm' | 'contrast'
   * @param {boolean} [salvar=true] - Define se a preferência deve ser persistida.
   */
  async function aplicarTema(tema, salvar = true) {
    /** Nomes legíveis dos temas para feedback no toast */
    const nomes = { light: 'Claro', dark: 'Escuro', warm: 'Quente', contrast: 'Alto Contraste' };
    const temasValidos = Object.keys(nomes);
    const temaFinal = temasValidos.includes(tema) ? tema : 'light';

    document.body.dataset.theme = temaFinal;
    window.AdminEstado.settings.theme = temaFinal;

    // Atualiza o estado visual dos 4 botões de tema
    temasValidos.forEach(t => {
      document.getElementById(`btnTheme${t.charAt(0).toUpperCase() + t.slice(1)}`)?.classList.toggle('selected', t === temaFinal);
    });

    if (salvar) {
      await window.GigaArmazenamento.salvarConfiguracoes({ theme: temaFinal });
      window.AdminUI.toast(`Tema ${nomes[temaFinal]} aplicado.`, 'success');
    }
  }

  /**
   * Configura os listeners para os inputs de personalização de marca.
   */
  function configurarMarca() {
    const inputName = document.getElementById('inputBrandName');
    const inputLogo = document.getElementById('inputBrandLogo');
    const btnClear = document.getElementById('btnBrandClear');

    if (inputName) {
      inputName.addEventListener('change', async (e) => {
        const brandName = e.target.value.trim();
        window.AdminEstado.settings.brandName = brandName;
        await window.GigaArmazenamento.salvarConfiguracoes({ brandName });
        aplicarMarcaVisualmente();
        window.AdminUI.toast('Nome da marca salvo.', 'success');
      });
    }

    const processFile = (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxSize = 256;

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            } else {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const base64 = canvas.toDataURL('image/png');
          window.AdminEstado.settings.brandLogo = base64;
          await window.GigaArmazenamento.salvarConfiguracoes({ brandLogo: base64 });
          aplicarMarcaVisualmente();
          window.AdminUI.toast('Logotipo atualizado.', 'success');
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    };

    if (inputLogo) {
      inputLogo.addEventListener('change', (e) => processFile(e.target.files[0]));
    }

    const dropZone = document.getElementById('brandDropZone');
    if (dropZone) {
      dropZone.addEventListener('click', () => {
        if (inputLogo) inputLogo.click();
      });
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });
      dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
      });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (btnClear) {
      btnClear.addEventListener('click', async () => {
        window.AdminEstado.settings.brandName = '';
        window.AdminEstado.settings.brandLogo = '';
        await window.GigaArmazenamento.salvarConfiguracoes({ brandName: '', brandLogo: '' });
        if (inputName) inputName.value = '';
        if (inputLogo) inputLogo.value = '';
        aplicarMarcaVisualmente();
        window.AdminUI.toast('Marca redefinida para o padrão.', 'success');
      });
    }
  }

  /**
   * Aplica visualmente as configurações de marca na página da Administração.
   */
  function aplicarMarcaVisualmente() {
    const { brandName, brandLogo } = window.AdminEstado.settings;
    
    const previewImg = document.getElementById('imgBrandPreview');
    const emptyIcon = document.getElementById('iconBrandEmpty');
    const inputName = document.getElementById('inputBrandName');
    
    if (inputName && brandName) inputName.value = brandName;
    
    if (previewImg && emptyIcon) {
      const btnClear = document.getElementById('btnBrandClear');
      if (brandLogo) {
        previewImg.src = brandLogo;
        previewImg.style.display = 'block';
        emptyIcon.style.display = 'none';
        if (btnClear) btnClear.style.display = 'inline-flex';
      } else {
        previewImg.style.display = 'none';
        emptyIcon.style.display = 'flex';
        if (btnClear) btnClear.style.display = 'none';
      }
    }
    
    const topnavLogo = document.querySelector('.topnav-logo-svg');
    const topnavName = document.querySelector('.topnav-brand-name');
    
    if (topnavLogo) {
      topnavLogo.src = brandLogo ? brandLogo : '../../../assets/icon128.png';
    }
    
    if (topnavName) {
      topnavName.textContent = brandName ? `${brandName} - GigAtende` : 'GigAtende';
    }
  }

  let importFileData = null; // Armazena o conteúdo do JSON lido antes de confirmar a importação.

  /**
   * Configura os fluxos de leitura e geração de arquivos JSON para backup do usuário.
   */
  function configurarImportacaoExportacao() {
    /**
     * Inicia o download de todo o banco de dados como arquivo JSON.
     */
    const handleExport = async () => {
      const json = await window.GigaArmazenamento.exportarDados();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      a.href = url;
      a.download = `gigatende-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      window.AdminUI.toast('Backup exportado!', 'success');
    };

    // Botões de exportação (podem existir em vários locais da interface)
    document.getElementById('btnExport')?.addEventListener('click', handleExport);
    document.getElementById('btnExportSettings')?.addEventListener('click', handleExport);

    /**
     * Acionado quando o usuário seleciona um arquivo no input type="file".
     * Lê o arquivo como texto e exibe a janela de confirmação de importação.
     */
    const handleImportFile = (file, inputEl) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        importFileData = e.target.result;
        document.getElementById('importFileName').textContent = file.name;
        document.getElementById('modalImport').style.display = 'flex';
        // Limpa o input para permitir selecionar o mesmo arquivo novamente
        if (inputEl) inputEl.value = '';
      };
      reader.readAsText(file);
    };

    const impFile1 = document.getElementById('importFile');
    const impFile2 = document.getElementById('importFileSettings');
    
    // Disparam o clique nos inputs hidden type="file"
    document.getElementById('btnImport')?.addEventListener('click', () => impFile1.click());
    document.getElementById('btnImportSettings')?.addEventListener('click', () => impFile2.click());
    
    impFile1?.addEventListener('change', e => handleImportFile(e.target.files[0], impFile1));
    impFile2?.addEventListener('change', e => handleImportFile(e.target.files[0], impFile2));

    /**
     * Fecha o modal de importação e zera o conteúdo de memória temporária.
     */
    const closeModalImport = () => {
      document.getElementById('modalImport').style.display = 'none';
      importFileData = null;
    };
    
    document.getElementById('btnCancelImport')?.addEventListener('click', closeModalImport);
    document.getElementById('btnCloseImportModal')?.addEventListener('click', closeModalImport);
    
    const modImp = document.getElementById('modalImport');
    if (modImp) modImp.addEventListener('click', e => { if (e.target === modImp) closeModalImport(); });

    // Botão de Confirmação da importação ("Executar Substituição/Mescla")
    document.getElementById('btnDoImport')?.addEventListener('click', async () => {
      if (!importFileData) return;
      const mode = document.querySelector('input[name="importMode"]:checked')?.value || 'replace';
      try {
        await window.GigaArmazenamento.importarDados(importFileData, mode);
        await window.AdminEstado.carregarTudo(); // Recarrega do banco para o estado global
        renderizarTudo();
        aplicarConfiguracoes(); // Restaura tema e densidade do backup importado
        closeModalImport();
        window.AdminUI.toast('Dados importados com sucesso!', 'success');
      } catch (e) {
        window.AdminUI.toast('Erro ao importar: ' + e.message, 'error');
      }
    });
  }

  // Ponto de entrada final
  await inicializar();
})();
