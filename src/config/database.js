const mongoose = require('mongoose');

let mongoConnected = false;

mongoose.connection.on('connected', () => {
  mongoConnected = true;
  console.log('🍃 [MongoDB] Conectado com sucesso ao banco de dados.');
});

mongoose.connection.on('error', (err) => {
  mongoConnected = false;
  console.warn('⚠️ [MongoDB] Erro na conexão:', err.message);
});

mongoose.connection.on('disconnected', () => {
  mongoConnected = false;
  console.warn('⚠️ [MongoDB] Conexão encerrada.');
});

async function connectDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lista_compras_zl_sp';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3500,
    });
    mongoConnected = true;
    return true;
  } catch (error) {
    mongoConnected = false;
    console.warn(
      `⚠️ [MongoDB] Não foi possível conectar em "${uri}" (${error.message}).`
    );
    console.warn(
      '💡 [Modo Resiliente] Ativando armazenamento em memória sincronizado para garantir funcionamento imediato.'
    );
    return false;
  }
}

function isMongoConnected() {
  return mongoConnected && mongoose.connection.readyState === 1;
}

module.exports = {
  connectDatabase,
  isMongoConnected,
};
