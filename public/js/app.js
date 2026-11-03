/**
 * Controlador Principal Frontend Vanilla ES6+ — Lista de Compras Compartilhada Inteligente
 * Design System Monocromático (Branco, Preto, Cinza Claro e Chumbo)
 * Regras Estritas:
 * - Inicialização 100% vazia (`[]`) para novos usuários (sem listas falsas ou pré-prontas)
 * - Isolamento total de sessão: Logout limpa localStorage/sessionStorage e invalida token no backend
 * - Acesso a listas de terceiros exclusivamente via Link de Convite Único (?convite=HASH)
 * - Verificação automática de `new URLSearchParams(window.location.search).get('convite')` na Home
 *   disparando POST para `/api/listas/entrar`, limpando a URL e recarregando as listas na tela
 * - Atribuição obrigatória de autor em cada item: "Nome do Alimento - [Nome de quem adicionou]"
 * - Precificação Automática Zona Leste SP (Mooca, Belém e Tatuapé)
 */
(function () {
  const state = {
    currentUser: null,
    lists: [],
    currentList: null,
    items: [],
    editingItemId: null,
    groupByAisles: false,
    radarExpanded: false,
    pendingInviteCode: null,
  };

  const SUGESTOES_RAPIDAS_ZL = [
    { nome: 'Pão Francês', qtd: 1 },
    { nome: 'Leite Integral', qtd: 2 },
    { nome: 'Ovos', qtd: 1 },
    { nome: 'Arroz 5kg', qtd: 1 },
    { nome: 'Café 500g', qtd: 1 },
    { nome: 'Banana', qtd: 1 },
    { nome: 'Feijão Carioca', qtd: 1 },
    { nome: 'Mussarela', qtd: 1 },
  ];

  const ICONES_CORREDORES = {
    Hortifruti: '🥬 Hortifruti & Feira',
    Açougue: '🥩 Açougue & Aves',
    Peixaria: '🐟 Peixaria',
    Laticínios: '🥛 Laticínios & Queijos',
    'Frios e Laticínios': '🧀 Frios & Embutidos',
    Padaria: '🥖 Padaria & Matinais',
    Mercearia: '🍝 Mercearia & Grãos',
    'Mercearia / Hortifruti': '🥚 Ovos & Mercearia',
    Bebidas: '🥤 Bebidas & Sucos',
    Limpeza: '🧼 Limpeza da Casa',
    Higiene: '🧴 Higiene Pessoal',
    Geral: '🛒 Outros Itens',
  };

  // Referências de DOM
  const screenAuth = document.getElementById('screen-auth');
  const screenHome = document.getElementById('screen-home');
  const screenList = document.getElementById('screen-list');

  const formAuth = document.getElementById('form-auth');
  const inputAuthNome = document.getElementById('auth-nome');
  const inputAuthSenha = document.getElementById('auth-senha');
  const btnRegister = document.getElementById('btn-register');
  const authErrorBox = document.getElementById('auth-error-box');
  const authInviteBanner = document.getElementById('auth-invite-banner');

  const homeUserGreeting = document.getElementById('home-user-greeting');
  const homeListsCount = document.getElementById('home-lists-count');
  const homeFeedbackBanner = document.getElementById('home-feedback-banner');
  const btnLogout = document.getElementById('btn-logout');
  const formCreateList = document.getElementById('form-create-list');
  const inputListName = document.getElementById('input-list-name');
  const formJoinInvite = document.getElementById('form-join-invite');
  const inputInviteLink = document.getElementById('input-invite-link');
  const listsContainer = document.getElementById('lists-container');

  const btnBackHome = document.getElementById('btn-back-home');
  const btnShareInsideList = document.getElementById('btn-share-inside-list');
  const btnToggleAisles = document.getElementById('btn-toggle-aisles');
  const currentListTitle = document.getElementById('current-list-title');

  const cartCheckedSubtotal = document.getElementById('cart-checked-subtotal');
  const cartProgressBar = document.getElementById('cart-progress-bar');
  const btnToggleRadar = document.getElementById('btn-toggle-radar');
  const radarZlPanel = document.getElementById('radar-zl-panel');
  const contributorsBreakdown = document.getElementById('contributors-breakdown');
  const tierAtacarejoPrice = document.getElementById('tier-atacarejo-price');
  const tierVarejoPrice = document.getElementById('tier-varejo-price');
  const tierPremiumPrice = document.getElementById('tier-premium-price');
  const radarSavingsTip = document.getElementById('radar-savings-tip');

  const formAddItem = document.getElementById('form-add-item');
  const inputNomeAlimento = document.getElementById('input-nome-alimento');
  const inputQtdAlimento = document.getElementById('input-qtd-alimento');
  const btnVoiceInput = document.getElementById('btn-voice-input');
  const livePricePreview = document.getElementById('live-price-preview');
  const quickChipsContainer = document.getElementById('quick-chips-container');

  const itemsCounterBadge = document.getElementById('items-counter-badge');
  const itemsContainer = document.getElementById('items-container');
  const footerTotalText = document.getElementById('footer-total-text');
  const btnSalvarLista = document.getElementById('btn-salvar-lista');
  const listFeedbackBanner = document.getElementById('list-feedback-banner');

  // ============================================================
  // DETECÇÃO E PROCESSAMENTO DE LINK DE CONVITE (?convite=HASH)
  // ============================================================
  function extrairCodigoConvite(input = '') {
    const texto = String(input || '').trim();
    if (!texto) return '';

    const matchQuery = texto.match(/[?&]convite=([a-zA-Z0-9_-]+)/i);
    if (matchQuery && matchQuery[1]) return matchQuery[1].toLowerCase();

    const matchPath = texto.match(/\/convite\/([a-zA-Z0-9_-]+)/i);
    if (matchPath && matchPath[1]) return matchPath[1].toLowerCase();

    return texto.toLowerCase();
  }

  function obterConviteDaURL() {
    try {
      const conviteParam = new URLSearchParams(window.location.search).get('convite');
      if (conviteParam) {
        return extrairCodigoConvite(conviteParam);
      }
    } catch (e) {
      // ignora
    }
    return '';
  }

  function capturarConviteInicialDaURL() {
    const convite = obterConviteDaURL();
    if (convite) {
      state.pendingInviteCode = convite;
      if (authInviteBanner) {
        authInviteBanner.classList.remove('hidden');
      }
    }
  }

  function limparParametroConviteDaURL() {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('convite')) {
        url.searchParams.delete('convite');
        const novaUrl =
          url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '');
        window.history.replaceState({}, document.title, novaUrl);
      }
    } catch (e) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  function construirLinkDeConvite(codigoConvite) {
    const base = window.location.origin + window.location.pathname;
    return `${base}?convite=${encodeURIComponent(codigoConvite)}`;
  }

  async function copiarLinkParaAreaDeTransferencia(codigoConvite) {
    const urlConvite = construirLinkDeConvite(codigoConvite);

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(urlConvite);
      } else {
        const tempInput = document.createElement('input');
        tempInput.value = urlConvite;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }
      return { copiado: true, urlConvite };
    } catch (e) {
      return { copiado: false, urlConvite };
    }
  }

  // ============================================================
  // NAVEGAÇÃO ENTRE AS 3 TELAS SEPARADAS
  // ============================================================
  window.mostrarTelaAuth = function (mensagemErro = '') {
    state.currentUser = null;
    state.lists = [];
    state.currentList = null;
    state.items = [];
    if (listsContainer) listsContainer.innerHTML = '';
    if (itemsContainer) itemsContainer.innerHTML = '';

    screenAuth.classList.remove('hidden');
    screenHome.classList.add('hidden');
    screenList.classList.add('hidden');

    // Se houver convite na URL, mantém o aviso visível na tela de login
    const conviteNaUrl = obterConviteDaURL() || state.pendingInviteCode;
    if (conviteNaUrl && authInviteBanner) {
      state.pendingInviteCode = conviteNaUrl;
      authInviteBanner.classList.remove('hidden');
    }

    if (mensagemErro) {
      authErrorBox.textContent = mensagemErro;
      authErrorBox.classList.remove('hidden');
    } else {
      authErrorBox.classList.add('hidden');
    }
  };

  /**
   * Tela Inicial (Home):
   * - Verifica se o usuário está autenticado.
   * - Verifica se existe `?convite=hash` na URL (via `new URLSearchParams(window.location.search).get('convite')`)
   *   ou um convite capturado antes do login.
   * - Se existir código de convite e o usuário estiver logado, dispara POST automático para `/api/listas/entrar`,
   *   limpa a URL (remove `?convite=...` da barra de endereços) e recarrega as listas do usuário na Home.
   */
  async function mostrarTelaHome() {
    const token = window.AuthService.getToken();
    state.currentUser = window.AuthService.getCurrentUser();
    if (!token || !state.currentUser) {
      window.mostrarTelaAuth();
      return;
    }

    homeUserGreeting.textContent = `Bem-vindo(a), ${state.currentUser.nome}`;
    screenAuth.classList.add('hidden');
    screenList.classList.add('hidden');
    screenHome.classList.remove('hidden');

    // Verificação automática de convite na URL ao carregar a Tela Inicial (Home)
    const conviteDaUrl = new URLSearchParams(window.location.search).get('convite');
    const codigoConvite = extrairCodigoConvite(conviteDaUrl || state.pendingInviteCode || '');

    if (codigoConvite) {
      state.pendingInviteCode = null;
      if (authInviteBanner) authInviteBanner.classList.add('hidden');
      await processarConviteAutomaticoNaHome(codigoConvite);
      return;
    }

    await carregarListasCompartilhadas();
  }

  async function processarConviteAutomaticoNaHome(codigo) {
    try {
      const res = await window.AuthService.fetchWithAuth('/api/listas/entrar', {
        method: 'POST',
        body: JSON.stringify({
          convite: codigo,
          codigoConvite: codigo,
        }),
      });
      const payload = await res.json();

      // Limpa o parâmetro ?convite=hash da barra de endereços
      limparParametroConviteDaURL();

      if (!res.ok || !payload.success) {
        mostrarFeedbackHome(
          payload.error || 'Link de convite não encontrado ou inválido.'
        );
        await carregarListasCompartilhadas();
        return;
      }

      if (inputInviteLink) inputInviteLink.value = '';
      await carregarListasCompartilhadas();
      mostrarFeedbackHome(
        `✓ Você entrou na lista compartilhada "${payload.data.nome}" via Link de Convite!`
      );
    } catch (error) {
      limparParametroConviteDaURL();
      mostrarFeedbackHome(error.message || 'Erro ao processar o link de convite.');
      await carregarListasCompartilhadas();
    }
  }

  async function abrirListaDeCompras(listaId, nomeLista = '') {
    screenAuth.classList.add('hidden');
    screenHome.classList.add('hidden');
    screenList.classList.remove('hidden');

    if (nomeLista) {
      currentListTitle.textContent = nomeLista;
    }

    renderizarChipsSugestoes();
    await carregarItensDaLista(listaId);
  }

  function mostrarFeedbackHome(texto) {
    if (!homeFeedbackBanner) return;
    homeFeedbackBanner.textContent = texto;
    homeFeedbackBanner.classList.remove('hidden');
    setTimeout(() => {
      homeFeedbackBanner.classList.add('hidden');
    }, 4200);
  }

  // ============================================================
  // TELA 1: AUTENTICAÇÃO (LOGIN & CADASTRO) E LOGOUT SEGURO
  // ============================================================
  async function processarAutenticacao(endpoint) {
    authErrorBox.classList.add('hidden');
    const nome = inputAuthNome.value.trim();
    const senha = inputAuthSenha.value;

    // Preserva convite da URL antes do login limpar a sessão anterior
    const convitePendente = obterConviteDaURL() || state.pendingInviteCode;

    try {
      const user = await window.AuthService.loginOuRegistrar(nome, senha, endpoint);
      state.currentUser = user;
      state.lists = [];
      state.currentList = null;
      state.items = [];
      if (convitePendente) {
        state.pendingInviteCode = convitePendente;
      }
      inputAuthSenha.value = '';
      await mostrarTelaHome();
    } catch (error) {
      authErrorBox.textContent = error.message || 'Erro ao autenticar.';
      authErrorBox.classList.remove('hidden');
    }
  }

  formAuth.addEventListener('submit', async (e) => {
    e.preventDefault();
    await processarAutenticacao('/api/auth/login');
  });

  btnRegister.addEventListener('click', async () => {
    await processarAutenticacao('/api/auth/register');
  });

  btnLogout.addEventListener('click', async () => {
    await window.AuthService.logout();
    state.currentUser = null;
    state.lists = [];
    state.currentList = null;
    state.items = [];
    state.pendingInviteCode = null;
    if (listsContainer) listsContainer.innerHTML = '';
    if (itemsContainer) itemsContainer.innerHTML = '';
    window.mostrarTelaAuth();
  });

  // ============================================================
  // TELA 2: HOME (GESTÃO DE LISTAS, CONVITES E "SAIR DA LISTA")
  // ============================================================
  async function carregarListasCompartilhadas() {
    state.lists = [];
    try {
      const res = await window.AuthService.fetchWithAuth('/api/lists');
      const payload = await res.json();
      if (res.ok && payload.success && Array.isArray(payload.data)) {
        state.lists = payload.data;
      }
    } catch (error) {
      state.lists = [];
    }
    renderizarListasHome();
  }

  function renderizarListasHome() {
    listsContainer.innerHTML = '';
    const count = state.lists.length;
    if (homeListsCount) {
      homeListsCount.textContent = `${count} ${count === 1 ? 'lista' : 'listas'}`;
    }

    // Estado 100% Vazio Amigável com botão "Criar Nova Lista"
    if (!count) {
      const emptyCard = document.createElement('div');
      emptyCard.className =
        'bg-white border border-zinc-200 rounded-3xl p-8 text-center shadow-sm flex flex-col items-center justify-center space-y-4';
      emptyCard.innerHTML = `
        <div class="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-lg">
          📋
        </div>
        <div class="space-y-1">
          <p class="font-extrabold text-zinc-950 text-base">
            Sua área de listas está vazia
          </p>
          <p class="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
            Você ainda não participa de nenhuma lista de compras. Crie sua primeira lista ou acesse através de um Link de Convite compartilhado com você.
          </p>
        </div>
        <button
          type="button"
          id="btn-empty-create-list"
          class="touch-target px-6 py-3 bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-sm rounded-2xl shadow-sm transition-all cursor-pointer"
        >
          + Criar Nova Lista
        </button>
      `;

      emptyCard
        .querySelector('#btn-empty-create-list')
        .addEventListener('click', () => {
          inputListName.focus();
          inputListName.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

      listsContainer.appendChild(emptyCard);
      return;
    }

    state.lists.forEach((lista) => {
      const listaId = String(lista.id || lista._id);
      const qtd = Number(lista.quantidadePendentes) || 0;
      const valorFormatado = window.formatarMoedaBR(lista.valorTotalAproximado || 0);
      const codigoConvite = lista.codigoConvite || '';

      const card = document.createElement('div');
      card.className =
        'bg-white border border-zinc-200 hover:border-zinc-400 rounded-3xl p-4 shadow-sm transition-all flex flex-col gap-3';

      card.innerHTML = `
        <div class="flex items-start justify-between gap-3 cursor-pointer" data-action="open-list">
          <div class="min-w-0 flex-1">
            <h4 class="text-base font-extrabold text-zinc-950 truncate">
              ${escaparHTML(lista.nome)}
            </h4>
            <p class="text-xs text-zinc-500 truncate mt-0.5">
              ${escaparHTML(lista.descricao || 'Preços médios: Mooca, Belém e Tatuapé')}
            </p>
            <div class="flex items-center gap-2 mt-2.5 flex-wrap">
              <span class="text-xs font-bold text-zinc-800 bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 rounded-full">
                ${qtd} ${qtd === 1 ? 'item pendente' : 'itens pendentes'}
              </span>
              <span class="text-xs font-bold text-zinc-950 bg-zinc-100 border border-zinc-300 px-2.5 py-0.5 rounded-full">
                Aprox. R$ ${valorFormatado}
              </span>
            </div>
          </div>

          <button
            type="button"
            class="touch-target px-3.5 py-2 bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs rounded-2xl shadow-sm shrink-0 cursor-pointer"
          >
            Abrir →
          </button>
        </div>

        <div class="pt-2.5 border-t border-zinc-100 flex items-center justify-between gap-2">
          <button
            type="button"
            data-action="share-list"
            class="touch-target px-3.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>🔗 Compartilhar Lista</span>
          </button>

          <button
            type="button"
            data-action="leave-list"
            class="touch-target px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 border border-transparent hover:border-zinc-300 transition-all cursor-pointer"
          >
            Sair da Lista
          </button>
        </div>
      `;

      card.querySelector('[data-action="open-list"]').addEventListener('click', () => {
        abrirListaDeCompras(listaId, lista.nome);
      });

      card
        .querySelector('[data-action="share-list"]')
        .addEventListener('click', async (e) => {
          e.stopPropagation();
          await compartilharListaComLinkUnico(listaId, lista.nome, codigoConvite);
        });

      card
        .querySelector('[data-action="leave-list"]')
        .addEventListener('click', async (e) => {
          e.stopPropagation();
          await sairDaListaCompartilhada(listaId, lista.nome);
        });

      listsContainer.appendChild(card);
    });
  }

  async function compartilharListaComLinkUnico(listaId, nomeLista, codigoExistente) {
    let codigo = codigoExistente;

    if (!codigo) {
      try {
        const res = await window.AuthService.fetchWithAuth(
          `/api/lists/${listaId}/convite`
        );
        const payload = await res.json();
        if (payload.success && payload.data?.codigoConvite) {
          codigo = payload.data.codigoConvite;
        }
      } catch (e) {
        mostrarFeedbackHome('Não foi possível obter o código de convite desta lista.');
        return;
      }
    }

    const { copiado, urlConvite } = await copiarLinkParaAreaDeTransferencia(codigo);

    const msg = copiado
      ? `✓ Link de Convite Único da lista "${nomeLista}" copiado! Envie para quem deseja convidar: ${urlConvite}`
      : `Link de Convite da lista "${nomeLista}": ${urlConvite}`;

    if (!screenHome.classList.contains('hidden')) {
      mostrarFeedbackHome(msg);
    } else {
      mostrarBannerFeedback(msg);
    }
  }

  async function ingressarViaCodigoConvite(rawInput) {
    const codigo = extrairCodigoConvite(rawInput);
    if (!codigo) {
      mostrarFeedbackHome('Informe um Link ou Código de Convite válido.');
      return;
    }

    await processarConviteAutomaticoNaHome(codigo);
  }

  if (formJoinInvite) {
    formJoinInvite.addEventListener('submit', async (e) => {
      e.preventDefault();
      const valor = inputInviteLink.value.trim();
      if (!valor) return;
      await ingressarViaCodigoConvite(valor);
    });
  }

  async function sairDaListaCompartilhada(listaId, nomeLista) {
    try {
      const res = await window.AuthService.fetchWithAuth(
        `/api/lists/${listaId}/sair`,
        {
          method: 'POST',
        }
      );
      const payload = await res.json();
      if (payload.success) {
        state.lists = state.lists.filter(
          (l) => String(l.id || l._id) !== String(listaId)
        );
        renderizarListasHome();
        mostrarFeedbackHome(`Você saiu da lista "${nomeLista}".`);
      }
    } catch (error) {
      mostrarFeedbackHome('Erro ao sair da lista compartilhada.');
    }
  }

  formCreateList.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = inputListName.value.trim();
    if (!nome) return;

    try {
      const res = await window.AuthService.fetchWithAuth('/api/lists', {
        method: 'POST',
        body: JSON.stringify({ nome }),
      });
      const payload = await res.json();
      if (payload.success && payload.data) {
        inputListName.value = '';
        await abrirListaDeCompras(
          payload.data.id || payload.data._id,
          payload.data.nome
        );
      }
    } catch (error) {
      mostrarFeedbackHome(error.message || 'Erro ao criar nova lista.');
    }
  });

  // ============================================================
  // TELA 3: DENTRO DA LISTA DE COMPRAS + ATRIBUIÇÃO DE AUTOR
  // ============================================================
  btnBackHome.addEventListener('click', async () => {
    state.editingItemId = null;
    await mostrarTelaHome();
  });

  if (btnShareInsideList) {
    btnShareInsideList.addEventListener('click', async () => {
      if (!state.currentList) return;
      await compartilharListaComLinkUnico(
        state.currentList.id || state.currentList._id,
        state.currentList.nome,
        state.currentList.codigoConvite
      );
    });
  }

  // Alternar Modo Setores / Corredores Inteligentes (Monocromático)
  btnToggleAisles.addEventListener('click', () => {
    state.groupByAisles = !state.groupByAisles;
    if (state.groupByAisles) {
      btnToggleAisles.className =
        'touch-target px-3 py-1.5 rounded-2xl text-xs font-bold border border-zinc-950 bg-zinc-950 text-white shadow-sm transition-all cursor-pointer';
    } else {
      btnToggleAisles.className =
        'touch-target px-3 py-1.5 rounded-2xl text-xs font-bold border border-zinc-300 bg-zinc-100 text-zinc-800 transition-all cursor-pointer';
    }
    renderizarItensDaLista();
  });

  // Alternar Painel de Resumo por Participante & Comparador Zona Leste
  btnToggleRadar.addEventListener('click', () => {
    state.radarExpanded = !state.radarExpanded;
    if (state.radarExpanded) {
      radarZlPanel.classList.remove('hidden');
      btnToggleRadar.textContent = 'Ocultar resumo ▲';
    } else {
      radarZlPanel.classList.add('hidden');
      btnToggleRadar.textContent = '📊 Resumo & Redes ZL';
    }
  });

  function renderizarChipsSugestoes() {
    if (!quickChipsContainer) return;
    quickChipsContainer.innerHTML = '';

    SUGESTOES_RAPIDAS_ZL.forEach((sug) => {
      const est = window.estimarPrecoLocalZL(sug.nome, 1);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className =
        'px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-900 hover:text-white border border-zinc-300 text-xs font-semibold text-zinc-800 whitespace-nowrap transition-all cursor-pointer shrink-0';
      chip.textContent = `+ ${sug.nome} (R$ ${window.formatarMoedaBR(est.precoUnitario)})`;

      chip.addEventListener('click', async () => {
        await adicionarAlimentoDireto(sug.nome, 1);
      });

      quickChipsContainer.appendChild(chip);
    });
  }

  // Ditado por Voz ("Mãos Livres no Carrinho")
  if (btnVoiceInput) {
    btnVoiceInput.addEventListener('click', () => {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        mostrarBannerFeedback(
          'Reconhecimento de voz não suportado neste navegador. Digite o alimento no campo.'
        );
        inputNomeAlimento.focus();
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      btnVoiceInput.classList.add('mic-listening');
      livePricePreview.textContent = '🎙️ Ouvindo... diga o nome do alimento';

      recognition.onresult = (event) => {
        const transcricao = event.results[0][0].transcript || '';
        inputNomeAlimento.value = transcricao.replace(/\.$/, '').trim();
        atualizarPreviewPrecoInput();
      };

      recognition.onerror = () => {
        btnVoiceInput.classList.remove('mic-listening');
      };

      recognition.onend = () => {
        btnVoiceInput.classList.remove('mic-listening');
      };

      recognition.start();
    });
  }

  function atualizarPreviewPrecoInput() {
    const nome = inputNomeAlimento.value.trim();
    const qtd = Math.max(1, Number(inputQtdAlimento.value) || 1);

    if (!nome) {
      livePricePreview.textContent = 'Preço médio ZL calculado automaticamente';
      return;
    }

    const est = window.estimarPrecoLocalZL(nome, qtd);
    livePricePreview.textContent = `Aproximadamente: R$ ${window.formatarMoedaBR(
      est.precoTotalAproximado
    )} (${est.produtoReferencia})`;
  }

  inputNomeAlimento.addEventListener('input', atualizarPreviewPrecoInput);
  inputQtdAlimento.addEventListener('input', atualizarPreviewPrecoInput);

  async function carregarItensDaLista(listaId) {
    try {
      const res = await window.AuthService.fetchWithAuth(`/api/lists/${listaId}`);
      const payload = await res.json();

      if (res.status === 403 || res.status === 404 || !payload.success) {
        await mostrarTelaHome();
        mostrarFeedbackHome(
          payload.error || 'Você não tem permissão para acessar esta lista.'
        );
        return;
      }

      state.currentList = payload.data.lista;
      state.items = payload.data.items || [];
      currentListTitle.textContent = state.currentList.nome;
      renderizarItensDaLista();
    } catch (error) {
      await mostrarTelaHome();
    }
  }

  function calcularESincronizarRodapeERadar() {
    const totalLista = state.items.reduce(
      (acc, item) => acc + (Number(item.precoTotalAproximado) || 0),
      0
    );

    const itensMarcados = state.items.filter((i) => i.marcadoParaCompra);
    const totalNoCarrinho = itensMarcados.reduce(
      (acc, item) => acc + (Number(item.precoTotalAproximado) || 0),
      0
    );

    // Rodapé Fixo Obrigatório
    footerTotalText.textContent = `Valor aproximado da lista: R$ ${window.formatarMoedaBR(
      totalLista
    )}`;

    if (cartCheckedSubtotal) {
      cartCheckedSubtotal.textContent = `R$ ${window.formatarMoedaBR(totalNoCarrinho)}`;
    }
    if (cartProgressBar) {
      const pct =
        totalLista > 0
          ? Math.min(100, Math.round((totalNoCarrinho / totalLista) * 100))
          : 0;
      cartProgressBar.style.width = `${pct}%`;
    }

    // Resumo de pedidos por participante
    if (contributorsBreakdown) {
      contributorsBreakdown.innerHTML = '';
      const mapaAutores = {};
      state.items.forEach((item) => {
        const autor = item.criadoPorNome || 'Participante';
        if (!mapaAutores[autor]) {
          mapaAutores[autor] = { qtd: 0, subtotal: 0 };
        }
        mapaAutores[autor].qtd += 1;
        mapaAutores[autor].subtotal += Number(item.precoTotalAproximado) || 0;
      });

      const nomesAutores = Object.keys(mapaAutores);
      if (nomesAutores.length === 0) {
        contributorsBreakdown.innerHTML = `<span class="text-zinc-400">Nenhum pedido ativo.</span>`;
      } else {
        nomesAutores.forEach((autor) => {
          const info = mapaAutores[autor];
          const badge = document.createElement('span');
          badge.className =
            'px-2.5 py-1 rounded-lg bg-zinc-100 border border-zinc-300 text-zinc-900 font-semibold text-[11px]';
          badge.textContent = `${autor}: ${info.qtd} ${
            info.qtd === 1 ? 'item' : 'itens'
          } (R$ ${window.formatarMoedaBR(info.subtotal)})`;
          contributorsBreakdown.appendChild(badge);
        });
      }
    }

    // Comparador de Mercados da Zona Leste
    const precoAtacarejo = Number((totalLista * 0.88).toFixed(2));
    const precoVarejo = Number(totalLista.toFixed(2));
    const precoPremium = Number((totalLista * 1.14).toFixed(2));
    const economiaAtacarejo = Math.max(
      0,
      Number((precoVarejo - precoAtacarejo).toFixed(2))
    );

    if (tierAtacarejoPrice) {
      tierAtacarejoPrice.textContent = `R$ ${window.formatarMoedaBR(precoAtacarejo)}`;
    }
    if (tierVarejoPrice) {
      tierVarejoPrice.textContent = `R$ ${window.formatarMoedaBR(precoVarejo)}`;
    }
    if (tierPremiumPrice) {
      tierPremiumPrice.textContent = `R$ ${window.formatarMoedaBR(precoPremium)}`;
    }
    if (radarSavingsTip) {
      radarSavingsTip.textContent =
        totalLista > 0
          ? `Economia estimada de R$ ${window.formatarMoedaBR(
              economiaAtacarejo
            )} nos atacarejos da Zona Leste.`
          : 'Adicione alimentos para comparar os preços entre as redes da região.';
    }

    itemsCounterBadge.textContent = `${state.items.length} ${
      state.items.length === 1 ? 'item' : 'itens'
    }${itensMarcados.length > 0 ? ` • ${itensMarcados.length} comprado(s)` : ''}`;
  }

  function mostrarBannerFeedback(texto) {
    listFeedbackBanner.textContent = texto;
    listFeedbackBanner.classList.remove('hidden');
    setTimeout(() => {
      listFeedbackBanner.classList.add('hidden');
    }, 3600);
  }

  function criarCardElementoItem(item) {
    const itemId = String(item.id || item._id);
    const isChecked = Boolean(item.marcadoParaCompra);
    const isEditing = state.editingItemId === itemId;
    const precoFormatado = window.formatarMoedaBR(item.precoTotalAproximado);
    const autorNome =
      item.criadoPorNome ||
      (state.currentUser && state.currentUser.nome) ||
      'Participante';

    const card = document.createElement('div');
    card.className = `border border-zinc-200 rounded-2xl p-3.5 bg-white flex flex-col gap-2 shadow-sm transition-all ${
      isChecked ? 'item-marcado' : ''
    }`;

    if (isEditing) {
      card.innerHTML = `
        <div class="flex items-center gap-2">
          <input
            type="text"
            id="edit-input-${itemId}"
            value="${escaparAtributo(item.nome)}"
            class="flex-1 min-h-[44px] px-3.5 py-1.5 border border-zinc-950 rounded-xl bg-white text-zinc-950 font-semibold focus:outline-none"
          />
          <button
            type="button"
            data-action="save-edit"
            class="touch-target px-3.5 bg-zinc-950 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Salvar
          </button>
          <button
            type="button"
            data-action="cancel-edit"
            class="touch-target px-3 bg-zinc-200 text-zinc-800 font-bold text-xs rounded-xl cursor-pointer"
          >
            ✕
          </button>
        </div>
      `;

      const btnSaveEdit = card.querySelector('[data-action="save-edit"]');
      const btnCancelEdit = card.querySelector('[data-action="cancel-edit"]');
      const inputEdit = card.querySelector(`#edit-input-${itemId}`);

      btnSaveEdit.addEventListener('click', () => {
        const novoNome = inputEdit.value.trim();
        if (novoNome) {
          atualizarItemNaLista(itemId, { nome: novoNome });
        }
        state.editingItemId = null;
      });

      btnCancelEdit.addEventListener('click', () => {
        state.editingItemId = null;
        renderizarItensDaLista();
      });

      return card;
    }

    // Formato obrigatório: "Nome do Alimento - [Nome de quem adicionou]"
    const tituloComAutor = `${item.nome} - ${autorNome}`;

    card.innerHTML = `
      <div class="flex items-center justify-between gap-2.5">
        <!-- Checkbox Monocromático -->
        <label class="touch-target cursor-pointer shrink-0" title="Marcar item como comprado">
          <input
            type="checkbox"
            class="checkbox-mercado"
            ${isChecked ? 'checked' : ''}
          />
        </label>

        <!-- "Nome do Alimento - [Nome de quem adicionou]" + "Aproximadamente: R$ X,XX" -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="nome-alimento font-bold text-base text-zinc-950 break-words">
              ${escaparHTML(tituloComAutor)}
            </span>
            <span class="text-xs font-bold text-zinc-900 bg-zinc-100 px-2.5 py-0.5 rounded-full border border-zinc-300">
              Aproximadamente: R$ ${precoFormatado}
            </span>
          </div>
          <div class="flex items-center gap-2 mt-1">
            <button
              type="button"
              data-action="edit-name"
              class="text-xs font-semibold text-zinc-700 underline hover:text-zinc-950 cursor-pointer"
            >
              Editar
            </button>
            <span class="text-[11px] font-medium text-zinc-400">
              • Unit.: R$ ${window.formatarMoedaBR(item.precoUnitario)}
            </span>
          </div>
        </div>

        <!-- Controles Rápidos de Quantidade (- / +) e Excluir -->
        <div class="flex items-center gap-1 shrink-0">
          <button
            type="button"
            data-action="decrease-qty"
            aria-label="Diminuir quantidade"
            class="touch-target border border-zinc-300 bg-zinc-100 active:bg-zinc-200 text-zinc-900 font-bold text-lg rounded-xl cursor-pointer"
          >
            -
          </button>

          <span class="min-w-[28px] text-center font-extrabold text-sm text-zinc-950">
            ${item.quantidade}
          </span>

          <button
            type="button"
            data-action="increase-qty"
            aria-label="Aumentar quantidade"
            class="touch-target bg-zinc-950 active:bg-zinc-800 text-white font-bold text-lg rounded-xl shadow-sm cursor-pointer"
          >
            +
          </button>

          <button
            type="button"
            data-action="delete-item"
            aria-label="Remover alimento da lista"
            title="Excluir item"
            class="touch-target bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950 border border-zinc-300 font-bold text-xs rounded-xl px-2.5 ml-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>
    `;

    const checkbox = card.querySelector('.checkbox-mercado');
    checkbox.addEventListener('change', (e) => {
      atualizarItemNaLista(itemId, { marcadoParaCompra: e.target.checked });
    });

    card.querySelector('[data-action="edit-name"]').addEventListener('click', () => {
      state.editingItemId = itemId;
      renderizarItensDaLista();
    });

    card.querySelector('[data-action="decrease-qty"]').addEventListener('click', () => {
      const atual = Number(item.quantidade) || 1;
      if (atual <= 1) {
        excluirItemDaLista(itemId);
      } else {
        atualizarItemNaLista(itemId, { quantidade: atual - 1 });
      }
    });

    card.querySelector('[data-action="increase-qty"]').addEventListener('click', () => {
      const atual = Number(item.quantidade) || 1;
      atualizarItemNaLista(itemId, { quantidade: atual + 1 });
    });

    card.querySelector('[data-action="delete-item"]').addEventListener('click', () => {
      excluirItemDaLista(itemId);
    });

    return card;
  }

  function renderizarItensDaLista() {
    itemsContainer.innerHTML = '';
    calcularESincronizarRodapeERadar();

    if (!state.items.length) {
      itemsContainer.innerHTML = `
        <div class="bg-white border border-zinc-200 rounded-3xl p-7 text-center shadow-sm">
          <p class="font-bold text-base text-zinc-900">Nenhum alimento pendente nesta lista</p>
          <p class="text-xs text-zinc-500 mt-1">
            Adicione itens no campo acima ou compartilhe o Link de Convite para que outras pessoas colaborem.
          </p>
        </div>
      `;
      return;
    }

    if (!state.groupByAisles) {
      state.items.forEach((item) => {
        itemsContainer.appendChild(criarCardElementoItem(item));
      });
      return;
    }

    const grupos = {};
    state.items.forEach((item) => {
      const cat = item.categoria || 'Geral';
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(item);
    });

    Object.keys(grupos).forEach((categoria) => {
      const headerCorredor = document.createElement('div');
      headerCorredor.className =
        'pt-2 pb-1 px-1 flex items-center justify-between text-xs font-extrabold text-zinc-700 uppercase tracking-wider';
      headerCorredor.innerHTML = `
        <span>${ICONES_CORREDORES[categoria] || '🛒 ' + escaparHTML(categoria)}</span>
        <span class="text-[11px] font-semibold text-zinc-400">${grupos[categoria].length}</span>
      `;
      itemsContainer.appendChild(headerCorredor);

      grupos[categoria].forEach((item) => {
        itemsContainer.appendChild(criarCardElementoItem(item));
      });
    });
  }

  async function adicionarAlimentoDireto(nome, quantidade) {
    if (!nome || !state.currentList) return;
    const listaId = state.currentList.id || state.currentList._id;
    const autorNome =
      (state.currentUser && state.currentUser.nome) || 'Participante';

    try {
      const res = await window.AuthService.fetchWithAuth(
        `/api/lists/${listaId}/items`,
        {
          method: 'POST',
          body: JSON.stringify({
            nome,
            quantidade,
            listaId,
            criadoPorNome: autorNome,
          }),
        }
      );
      const payload = await res.json();
      if (res.ok && payload.success && payload.data) {
        state.items.unshift({
          ...payload.data,
          criadoPorNome: payload.data.criadoPorNome || autorNome,
        });
        renderizarItensDaLista();
      } else {
        mostrarBannerFeedback(payload.error || 'Erro ao adicionar item.');
      }
    } catch (error) {
      mostrarBannerFeedback(error.message || 'Erro ao adicionar alimento.');
    }
  }

  formAddItem.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = inputNomeAlimento.value.trim();
    const quantidade = Math.max(1, Number(inputQtdAlimento.value) || 1);
    if (!nome) return;

    await adicionarAlimentoDireto(nome, quantidade);
    inputNomeAlimento.value = '';
    inputQtdAlimento.value = '1';
    atualizarPreviewPrecoInput();
  });

  async function atualizarItemNaLista(itemId, changes) {
    const idx = state.items.findIndex(
      (i) => String(i.id || i._id) === String(itemId)
    );
    if (idx === -1) return;

    const itemAtual = state.items[idx];
    if (changes.nome) {
      itemAtual.nome = changes.nome;
      const est = window.estimarPrecoLocalZL(changes.nome, itemAtual.quantidade);
      itemAtual.precoUnitario = est.precoUnitario;
      itemAtual.categoria = est.categoriaSugerida || itemAtual.categoria;
    }
    if (changes.quantidade !== undefined) {
      itemAtual.quantidade = Math.max(1, Number(changes.quantidade) || 1);
    }
    if (typeof changes.marcadoParaCompra === 'boolean') {
      itemAtual.marcadoParaCompra = changes.marcadoParaCompra;
    }
    itemAtual.precoTotalAproximado = Number(
      (Number(itemAtual.precoUnitario) * Number(itemAtual.quantidade)).toFixed(2)
    );
    renderizarItensDaLista();

    try {
      const res = await window.AuthService.fetchWithAuth(`/api/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      });
      const payload = await res.json();
      if (payload.success && payload.data) {
        state.items[idx] = payload.data;
        renderizarItensDaLista();
      }
    } catch (error) {
      mostrarBannerFeedback('Erro ao sincronizar alteração do item.');
    }
  }

  async function excluirItemDaLista(itemId) {
    state.items = state.items.filter(
      (i) => String(i.id || i._id) !== String(itemId)
    );
    renderizarItensDaLista();

    try {
      await window.AuthService.fetchWithAuth(`/api/items/${itemId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      mostrarBannerFeedback('Erro ao remover item.');
    }
  }

  // Botão Principal no Sticky Footer: "Salvar Lista Atualizada"
  btnSalvarLista.addEventListener('click', async () => {
    if (!state.currentList) return;
    const listaId = state.currentList.id || state.currentList._id;
    const itensMarcados = state.items.filter((i) => i.marcadoParaCompra);
    const itemIds = itensMarcados.map((i) => String(i.id || i._id));

    if (itemIds.length === 0) {
      mostrarBannerFeedback(
        'Lista sincronizada! Marque o checkbox dos itens comprados para removê-los da lista.'
      );
      await carregarItensDaLista(listaId);
      return;
    }

    try {
      const res = await window.AuthService.fetchWithAuth(
        `/api/lists/${listaId}/salvar`,
        {
          method: 'POST',
          body: JSON.stringify({ listaId, itemIds }),
        }
      );
      const payload = await res.json();
      if (payload.success && payload.data) {
        state.items = payload.data.items || [];
        renderizarItensDaLista();
        mostrarBannerFeedback(
          `✓ ${itemIds.length} ${
            itemIds.length === 1
              ? 'item comprado foi removido'
              : 'itens comprados foram removidos'
          } e a lista foi atualizada!`
        );
      }
    } catch (error) {
      mostrarBannerFeedback('Erro ao salvar lista atualizada.');
    }
  });

  function escaparHTML(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escaparAtributo(str = '') {
    return escaparHTML(str);
  }

  document.addEventListener('DOMContentLoaded', () => {
    capturarConviteInicialDaURL();
    const token = window.AuthService.getToken();
    const user = window.AuthService.getCurrentUser();
    if (token && user) {
      mostrarTelaHome();
    } else {
      window.mostrarTelaAuth();
    }
  });
})();
