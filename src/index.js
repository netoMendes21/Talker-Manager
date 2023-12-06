const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json());

const HTTP_OK_STATUS = 200;
const PORT = process.env.PORT || '3001';

const talkerJson = 'talker.json';

const geradorToken = () => {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  
  for (let i = 0; i < 16; i += 1) {
    token += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return token;
};

function validarToken(req, res, next) {
  const { authorization } = req.headers;
  if (!authorization) return res.status(401).json({ message: 'Token não encontrado' });
  if (authorization.length !== 16) return res.status(401).json({ message: 'Token inválido' });
  next();
}

function validarNome(name) {
  if (!name) {
    return { message: 'O campo "name" é obrigatório' };
  }
  if (name.length < 3) {
    return { message: 'O "name" deve ter pelo menos 3 caracteres' };
  }
  return {};
}

function validarAge(age) {
  if (!age) {
    return { message: 'O campo "age" é obrigatório' };
  }
  if (age < 18 || !Number.isInteger(age) || typeof age !== 'number') {
    return { message: 'O campo "age" deve ser um número inteiro igual ou maior que 18' };
  }
  return {};
}

function validarRate(rate) {
  if (typeof rate === 'undefined') {
    return { message: 'O campo "rate" é obrigatório' };
  }
  if (rate < 1 || rate > 5 || !Number.isInteger(rate)) {
    return { message: 'O campo "rate" deve ser um número inteiro entre 1 e 5' };
  }
  return {};
}

function validarTalk(talk) {
  if (!talk) {
    return { message: 'O campo "talk" é obrigatório' };
  }
  if (!talk.watchedAt) {
    return { message: 'O campo "watchedAt" é obrigatório' };
  }
  if (!talk.watchedAt.match(/\d{2}\/\d{2}\/\d{4}/)) {
    return { message: 'O campo "watchedAt" deve ter o formato "dd/mm/aaaa"' };
  }
  if (validarRate(talk.rate)) return validarRate(talk.rate);
}

function validarTalker(talker) {
  const nome = validarNome(talker.name);
  const idade = validarAge(talker.age);
  const talk = validarTalk(talker.talk);
  
  if (nome.message) return nome;
  if (idade.message) return idade;
  if (talk.message && talk) return talk;
  return {};
}

app.post('/talker', validarToken, async (req, res) => {
  const { name, age, talk } = req.body;
  const talkers = await fs.readFile(path.join(__dirname, talkerJson), 'utf-8');
  const talkersJson = JSON.parse(talkers);
  const talker = { name, age, talk, id: talkersJson.length + 1 };
  const validacao = validarTalker(talker);
  if (validacao.message) return res.status(400).json({ message: validacao.message });
  talkersJson.push(talker);
  await fs.writeFile(path.join(__dirname, talkerJson), JSON.stringify(talkersJson));
  return res.status(201).json(talker);
});

app.get('/talker/search', validarToken, async (req, res) => {
  const { q } = req.query;
  const talkers = await fs.readFile(path.join(__dirname, talkerJson), 'utf-8');
  const talkersJson = JSON.parse(talkers);
  const talkersFilter = talkersJson.filter((talker) => talker.name.includes(q));
  if (typeof q === 'undefined') return res.status(200).json(talkersJson);
  if (!talkersFilter) return res.status(404).json({ message: 'Pessoa palestrante não encontrada' });
  return res.status(200).json(talkersFilter);
});

// não remova esse endpoint, e para o avaliador funcionar
app.get('/', (_request, response) => {
  response.status(HTTP_OK_STATUS).send();
});

app.get('/talker', async (_req, res) => {
  const talkers = await fs.readFile(path.join(__dirname, talkerJson), 'utf-8');
  const talkersJson = JSON.parse(talkers);
  if (!talkersJson) return res.status(200).json([]);
  return res.status(200).json(talkersJson);
});

app.get('/talker/:id', async (req, res) => {
  const { id } = req.params;
  const talkerId = await fs.readFile(path.join(__dirname, talkerJson), 'utf-8');
  const talkerIdJson = JSON.parse(talkerId);
  const talker = talkerIdJson.find((talkerFind) => talkerFind.id === Number(id));
  if (!talker) return res.status(404).json({ message: 'Pessoa palestrante não encontrada' });
  return res.status(200).json(talker);
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    return res.status(400).json({ message: 'O campo "email" é obrigatório' }); 
  }
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'O "email" deve ter o formato "email@email.com"' }); 
  }
  if (!password) {
    return res.status(400)
      .json({ message: 'O campo "password" é obrigatório' }); 
  }
  if (password.length < 6) {
    return res.status(400)
      .json({ message: 'O "password" deve ter pelo menos 6 caracteres' }); 
  }
  const token = geradorToken();
  return res.status(200).json({ token });
});

app.put('/talker/:id', validarToken, async (req, res) => {
  const { id } = req.params;
  const talkerId = await fs.readFile(path.join(__dirname, talkerJson), 'utf-8');
  const talkerIdJson = JSON.parse(talkerId);
  const { name, age, talk } = req.body;
  const validacao = { name, age, talk, id: Number(id) };
  const validacaoTalker = validarTalker(validacao);
  if (validacaoTalker.message) return res.status(400).json({ message: validacaoTalker.message });
  const talker = talkerIdJson.findIndex((talkerFind) => talkerFind.id === Number(id));
  if (talker === -1) return res.status(404).json({ message: 'Pessoa palestrante não encontrada' });
  talkerIdJson[talker] = { name, age, talk, id: Number(id) };
  await fs.writeFile(path.join(__dirname, talkerJson), JSON.stringify(talkerIdJson, null, 2));
  return res.status(200).json(talkerIdJson[talker]);
});

app.delete('/talker/:id', validarToken, async (req, res) => {
  const { id } = req.params;
  const talkerId = await fs.readFile(path.join(__dirname, talkerJson), 'utf-8');
  const talkerIdJson = JSON.parse(talkerId);
  const talker = talkerIdJson.findIndex((talkerFind) => talkerFind.id === Number(id));
  if (talker === -1) return res.status(404).json({ message: 'Pessoa palestrante não encontrada' });
  talkerIdJson.splice(talker, 1);
  await fs.writeFile(path.join(__dirname, talkerJson), JSON.stringify(talkerIdJson, null, 2));
  return res.status(204).json({ message: 'Pessoa palestrante deletada com sucesso' });
});

app.listen(PORT, () => {
  console.log('Online');
});
