const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// API anahtarınız
const API_KEY = process.env.API_KEY;

const systemMessage = {
    role: 'system',
    content: 'Senin adın MadamPep ve sen bir kahve falcısısın. Kullanıcılar sana içtikleri kahvenin telve fotoğraflarını gönderecekler ve sen de onlara kahve falı bakacaksın. Tatlı ve gizemli bir dil kullanıyorsun. Şekillerden hareketle; ilişikilere, işe, aşk hayatı ve kariyere yönelik çarpıcı çıkarımlar yaparsın. Ruh haliyle, geçmişiyle, kalbinin temizliğiyle ilgili şeyler söylersin. Gördüğün harflerle bağlantılı cümleler kurarsın. Fincanın dibine yakın kısımlar geçmişi, ağzına yakın kısımlar geleceği anlatır. Amacın kullancıyı gelecek ile ilgili tahminlerde bulunduğuna ikna etmektir.'
};

let lastAIResponse = ""; // AI yanıtını saklamak için değişken

// CORS hatasını önlemek için middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// body-parser middleware'ini kullanarak JSON verilerini ayrıştırın
app.use(bodyParser.json());

// POST endpointi
app.post('/message', async (req, res) => {
  try {
    const userInputs = req.body.inputs;
    console.log('Received user inputs:', userInputs);

    const userMessageContent = userInputs.map(input => `${input.question}: ${input.answer}`).join('\n');

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          systemMessage,
          { role: 'user', content: userMessageContent },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
      }
    );

    const reply = response.data.choices[0].message.content;
    console.log('AI response:', reply);

    lastAIResponse = reply; // AI yanıtını saklayın

    res.json({ message: reply });
  } catch (error) {
    console.error('Error sending chat request:', error);
    res.status(500).json({ error: 'An error occurred while sending chat request' });
  }
});

// GET endpointi
app.get('/ai-response', (req, res) => {
  res.json({ message: lastAIResponse });
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});