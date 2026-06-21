const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data', 'db.json');
const SEED_PATH = path.join(__dirname, 'seed_data.json');
const USANDO_POSTGRES = !!process.env.DATABASE_URL;

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

// ---------------------------------------------------------------------------
// MODO ARQUIVO (uso local / sem banco configurado)
// ---------------------------------------------------------------------------

function ensureDbArquivo() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const db = defaultDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    if (db.alunos.length > 0) {
      console.log(`Banco de arquivo criado e ${db.alunos.length} aluno(s) importado(s) do seed_data.json`);
    }
  }
}

function readArquivo() {
  ensureDbArquivo();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeArquivo(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// MODO POSTGRES (produção — banco gratuito como Neon/Supabase)
// ---------------------------------------------------------------------------

let pool = null;
let prontoPromise = null;

function getPool() {
  if (!pool) {
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function garantirTabela() {
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS painel_estado (
      id SMALLINT PRIMARY KEY DEFAULT 1,
      dados JSONB NOT NULL,
      CHECK (id = 1)
    );
  `);
  const { rows } = await p.query('SELECT dados FROM painel_estado WHERE id = 1');
  if (rows.length === 0) {
    const db = defaultDb();
    await p.query('INSERT INTO painel_estado (id, dados) VALUES (1, $1)', [JSON.stringify(db)]);
    if (db.alunos.length > 0) {
      console.log(`Banco Postgres criado e ${db.alunos.length} aluno(s) importado(s) do seed_data.json`);
    }
  }
}

function aguardarPronto() {
  if (!prontoPromise) prontoPromise = garantirTabela();
  return prontoPromise;
}

async function readPostgres() {
  await aguardarPronto();
  const { rows } = await getPool().query('SELECT dados FROM painel_estado WHERE id = 1');
  return rows[0].dados;
}

async function writePostgres(data) {
  await aguardarPronto();
  await getPool().query('UPDATE painel_estado SET dados = $1 WHERE id = 1', [JSON.stringify(data)]);
}

// ---------------------------------------------------------------------------
// Interface única usada pelo resto do app
// ---------------------------------------------------------------------------
// Observação: read()/write() são assíncronas (retornam Promise) mesmo no modo
// arquivo, para que o resto do código (server.js) funcione igual nos dois modos.

async function read() {
  return USANDO_POSTGRES ? readPostgres() : readArquivo();
}

async function write(data) {
  return USANDO_POSTGRES ? writePostgres(data) : writeArquivo(data);
}

module.exports = { read, write, USANDO_POSTGRES, DB_PATH };

