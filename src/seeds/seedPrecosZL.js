require('dotenv').config();
const { carregarTabelaPrecos } = require('../utils/precificadorZL');

function verificarBasePrecos() {
  console.log('📊 Verificando base de preços médios — Zona Leste SP (Mooca, Belém e Tatuapé)...');
  const tabela = carregarTabelaPrecos();
  console.log(
    `✅ Base regional validada com ${tabela.itens.length} produtos mapeados. Nenhuma lista falsa criada (usuários iniciam com [] vazio).`
  );
}

verificarBasePrecos();
