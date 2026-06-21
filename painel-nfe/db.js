const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data', 'db.json');
// Fica FORA da pasta data/ de propósito: em serviços de hospedagem com disco
// persistente, só a pasta data/ é preservada entre deploys. Mantendo o seed
// no diretório do projeto, ele sempre estará disponível para popular o banco
// na primeira vez que o disco (vazio) for montado.
const SEED_PATH = path.join(__dirname, 'seed_data.json');

function carregarSeed() {
  if (!fs.existsSync(SEED_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));
  } catch (e) {
    console.warn('Não foi possível ler seed_data.json:', e.message);
    return [];
  }
}

function defaultDb() {
  const seed = carregarSeed();
  const agora = new Date().toISOString();
  return {
    senhas: {
      matriz: bcrypt.hashSync(process.env.SENHA_MATRIZ_INICIAL || 'matriz123', 10),
      cliente: bcrypt.hashSync(process.env.SENHA_CLIENTE_INICIAL || 'cliente123', 10)
    },
    alunos: seed.map((a, i) => ({ id: i + 1, ...a, criadoEm: agora, atualizadoEm: agora })),
    proximoId: seed.length + 1
  };
}

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const db = defaultDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    if (db.alunos.length > 0) {
      console.log(`Banco criado e ${db.alunos.length} aluno(s) importado(s) automaticamente do seed_data.json`);
    }
  }
}

function read() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function write(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { read, write, DB_PATH };
