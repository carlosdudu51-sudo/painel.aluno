// Importa os dados iniciais (extraídos da planilha) para o banco do painel.
// Use: npm run seed
const fs = require('fs');
const path = require('path');
const db = require('./db');

const seedPath = path.join(__dirname, 'seed_data.json');

function main() {
  if (!fs.existsSync(seedPath)) {
    console.log('Nenhum seed_data.json encontrado — nada para importar.');
    return;
  }
  const alunosSeed = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  const data = db.read();

  if (data.alunos.length > 0) {
    console.log('O banco já possui alunos cadastrados. Importação cancelada para não duplicar dados.');
    console.log('Se quiser reimportar do zero, apague o arquivo data/db.json e rode novamente.');
    return;
  }

  alunosSeed.forEach(a => {
    data.alunos.push({
      id: data.proximoId,
      ...a,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    });
    data.proximoId += 1;
  });

  db.write(data);
  console.log(`${alunosSeed.length} alunos importados com sucesso para data/db.json`);
}

main();
