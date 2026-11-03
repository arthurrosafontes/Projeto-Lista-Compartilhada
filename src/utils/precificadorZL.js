const fs = require('fs');
const path = require('path');

const TABELA_PATH = path.join(
  __dirname,
  '..',
  '..',
  'skills',
  'precificacao-zona-leste-sp',
  'references',
  'tabela_precos_sp_zl.json'
);

let cacheTabela = null;

/**
 * Normaliza texto removendo acentos, caracteres especiais e espaços duplicados
 */
function normalizarTexto(texto = '') {
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Carrega e indexa a tabela de preços da Zona Leste de SP (Mooca, Belém e Tatuapé)
 */
function carregarTabelaPrecos() {
  if (cacheTabela) return cacheTabela;

  try {
    const rawData = fs.readFileSync(TABELA_PATH, 'utf-8');
    const parsed = JSON.parse(rawData);

    const itensIndexados = (parsed.itens || []).map((item) => {
      const nomeNorm = normalizarTexto(item.nome);
      const termosNorm = (item.termos || []).map((t) => normalizarTexto(t));
      return {
        ...item,
        nomeNorm,
        termosNorm,
      };
    });

    cacheTabela = {
      metadata: parsed.metadata || {
        regiao: 'Zona Leste - São Paulo (SP)',
        bairros: ['Mooca', 'Belém', 'Tatuapé'],
        precoFallbackPadrao: 8.9,
      },
      itens: itensIndexados,
    };
  } catch (error) {
    console.error('[PrecificadorZL] Erro ao carregar tabela JSON, usando fallback:', error.message);
    cacheTabela = {
      metadata: {
        regiao: 'Zona Leste - São Paulo (SP)',
        bairros: ['Mooca', 'Belém', 'Tatuapé'],
        precoFallbackPadrao: 8.9,
      },
      itens: [],
    };
  }

  return cacheTabela;
}

/**
 * Calcula o preço unitário e o subtotal aproximado para um alimento na região Mooca/Belém/Tatuapé
 * @param {string} nomeAlimento Nome digitado pelo usuário
 * @param {number} quantidade Quantidade do item
 */
function obterPrecoAproximado(nomeAlimento = '', quantidade = 1) {
  const tabela = carregarTabelaPrecos();
  const qtd = Math.max(0.01, Number(quantidade) || 1);
  const buscaNorm = normalizarTexto(nomeAlimento);
  const precoFallback = Number(tabela.metadata?.precoFallbackPadrao) || 8.9;

  if (!buscaNorm) {
    return {
      precoUnitario: precoFallback,
      precoTotalAproximado: Number((precoFallback * qtd).toFixed(2)),
      categoriaSugerida: 'Geral',
      unidadeSugerida: 'un',
      produtoReferencia: 'Item Geral (Média Regional)',
      encontradoNaTabela: false,
    };
  }

  let melhorItem = null;
  let maiorPontuacao = 0;

  const tokensBusca = buscaNorm.split(' ').filter((t) => t.length > 1);

  for (const item of tabela.itens) {
    // 1. Match Exato com o nome ou algum sinônimo/termo
    if (item.nomeNorm === buscaNorm || item.termosNorm.includes(buscaNorm)) {
      melhorItem = item;
      maiorPontuacao = 1000;
      break;
    }

    let pontuacaoAtual = 0;

    // 2. Match por inclusão de frase (ex: "leite integral italac" contém "leite integral")
    for (const termo of item.termosNorm) {
      if (buscaNorm.includes(termo)) {
        // Prioriza termos mais longos e específicos (ex: "arroz 5kg" > "arroz")
        const bonusEspecificidade = termo.length * 4;
        if (100 + bonusEspecificidade > pontuacaoAtual) {
          pontuacaoAtual = 100 + bonusEspecificidade;
        }
      } else if (termo.includes(buscaNorm) && buscaNorm.length >= 3) {
        const score = 70 + buscaNorm.length * 2;
        if (score > pontuacaoAtual) {
          pontuacaoAtual = score;
        }
      }
    }

    // 3. Match por interseção de palavras-chave (tokens)
    if (tokensBusca.length > 0) {
      const todosTokensItem = new Set(
        [item.nomeNorm, ...item.termosNorm].join(' ').split(' ')
      );
      let tokensCoincidentes = 0;
      for (const token of tokensBusca) {
        if (todosTokensItem.has(token)) {
          tokensCoincidentes += 1;
        }
      }
      if (tokensCoincidentes > 0) {
        const scoreTokens = tokensCoincidentes * 30;
        if (scoreTokens > pontuacaoAtual) {
          pontuacaoAtual = scoreTokens;
        }
      }
    }

    if (pontuacaoAtual > maiorPontuacao) {
      maiorPontuacao = pontuacaoAtual;
      melhorItem = item;
    }
  }

  if (melhorItem && maiorPontuacao >= 30) {
    const precoUnitario = Number(melhorItem.precoMedio);
    return {
      precoUnitario,
      precoTotalAproximado: Number((precoUnitario * qtd).toFixed(2)),
      categoriaSugerida: melhorItem.categoria || 'Geral',
      unidadeSugerida: melhorItem.unidade || 'un',
      produtoReferencia: melhorItem.nome,
      encontradoNaTabela: true,
    };
  }

  return {
    precoUnitario: precoFallback,
    precoTotalAproximado: Number((precoFallback * qtd).toFixed(2)),
    categoriaSugerida: 'Geral',
    unidadeSugerida: 'un',
    produtoReferencia: 'Estimativa Padrão (Mooca/Belém/Tatuapé)',
    encontradoNaTabela: false,
  };
}

/**
 * Formata um valor numérico para o padrão monetário brasileiro (ex: "28,90")
 */
function formatarMoedaBR(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

module.exports = {
  normalizarTexto,
  carregarTabelaPrecos,
  obterPrecoAproximado,
  formatarMoedaBR,
};
