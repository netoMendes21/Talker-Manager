const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json());

const HTTP_OK_STATUS = 200;
const PORT = process.env.PORT || '3001';

// não remova esse endpoint, e para o avaliador funcionar
app.get('/', (_request, response) => {
  response.status(HTTP_OK_STATUS).send();
});

app.get('/talker', async (_req, res) => {
  const talkers = await fs.readFile(path.join(__dirname, 'talker.json'), 'utf-8');
  const talkersJson = JSON.parse(talkers);
  if (!talkersJson) return res.status(200).json([]);
  return res.status(200).json(talkersJson);
});

app.get('/talker/:id', async (req, res) => {
  const { id } = req.params;
  const talkerId = await fs.readFile(path.join(__dirname, 'talker.json'), 'utf-8');
  const talkerIdJson = JSON.parse(talkerId);
  const talker = talkerIdJson.find((talker) => talker.id === Number(id));
  if(!talker) return res.status(404).json({ message: 'Pessoa palestrante não encontrada' });
  return res.status(200).json(talker);
})

app.listen(PORT, () => {
  console.log('Online');
});
