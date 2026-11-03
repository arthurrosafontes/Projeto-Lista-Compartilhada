const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const STORE_FILE_PATH = path.join(__dirname, '..', 'config', '.runtime_store.json');

/**
 * Estrutura inicial ESTRITAMENTE VAZIA.
 * Nenhuma lista falsa ou pré-pronta é criada.
 */
const memoryStore = {
  users: [],
  lists: [],
  items: [],
  revokedTokens: [],
};

function carregarStoreDoDisco() {
  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const raw = fs.readFileSync(STORE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      memoryStore.users = Array.isArray(parsed.users) ? parsed.users : [];
      memoryStore.lists = Array.isArray(parsed.lists) ? parsed.lists : [];
      memoryStore.items = Array.isArray(parsed.items) ? parsed.items : [];
      memoryStore.revokedTokens = Array.isArray(parsed.revokedTokens)
        ? parsed.revokedTokens
        : [];
    } else {
      salvarStoreNoDisco();
    }
  } catch (err) {
    console.warn('[MemoryStore] Iniciando store vazio em memória:', err.message);
  }
}

function salvarStoreNoDisco() {
  try {
    fs.writeFileSync(
      STORE_FILE_PATH,
      JSON.stringify(
        {
          users: memoryStore.users,
          lists: memoryStore.lists,
          items: memoryStore.items,
          revokedTokens: memoryStore.revokedTokens.slice(-500),
        },
        null,
        2
      ),
      'utf-8'
    );
  } catch (err) {
    // Caso o ambiente seja read-only, mantém apenas em RAM
  }
}

function gerarObjectIdHex() {
  return crypto.randomBytes(12).toString('hex');
}

function gerarHashConvite() {
  return crypto.randomBytes(6).toString('hex');
}

function revogarToken(token) {
  if (!token) return;
  if (!memoryStore.revokedTokens.includes(token)) {
    memoryStore.revokedTokens.push(token);
    salvarStoreNoDisco();
  }
}

function isTokenRevogado(token) {
  if (!token) return true;
  return memoryStore.revokedTokens.includes(token);
}

carregarStoreDoDisco();

module.exports = {
  memoryStore,
  carregarStoreDoDisco,
  salvarStoreNoDisco,
  gerarObjectIdHex,
  gerarHashConvite,
  revogarToken,
  isTokenRevogado,
  bcrypt,
};
