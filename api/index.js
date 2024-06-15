const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors'); // CORS middleware eklenmesi
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config(); // .env dosyasını yükler

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENAI_API_KEY;

const uri = process.env.MONGODB_URI; // URI'yi .env dosyasından al

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const systemMessage = {
  role: 'system',
  content: 'Senin adın MadamPep ve sen bir kahve falcısısın. Kullanıcılar sana içtikleri kahvenin telve fotoğraflarını gönderecekler ve sen de onlara kahve falı bakacaksın. Tatlı, gizemli ve anlaşılması kolay bir dil kullanıyorsun. Şekillerden hareketle; ilişikilere, işe, aşk hayatı ve kariyere yönelik çarpıcı çıkarımlar yaparsın. Ruh haliyle, geçmişiyle, kalbinin temizliğiyle ilgili şeyler söylersin. Gördüğün harflerle bağlantılı cümleler kurarsın. Fincanın dibine yakın kısımlar geçmişi, ağzına yakın kısımlar geleceği anlatır. Amacın kullancıyı gelecek ile ilgili tahminlerde bulunduğuna ikna etmektir.  Her fal sonunda sohbeti devam ettirecek kullanıcının sana sorular sorabileceği şeyler söyle.'
};

function getZodiacSign(day, month) {
  if ((month == 1 && day <= 20) || (month == 12 && day >= 22)) return 'Oğlak';
  if ((month == 1 && day >= 21) || (month == 2 && day <= 18)) return 'Kova';
  if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) return 'Balık';
  if ((month == 3 && day >= 21) || (month == 4 && day <= 20)) return 'Koç';
  if ((month == 4 && day >= 21) || (month == 5 && day <= 20)) return 'Boğa';
  if ((month == 5 && day >= 21) || (month == 6 && day <= 21)) return 'İkizler';
  if ((month == 6 && day >= 22) || (month == 7 && day <= 22)) return 'Yengeç';
  if ((month == 7 && day >= 23) || (month == 8 && day <= 23)) return 'Aslan';
  if ((month == 8 && day >= 24) || (month == 9 && day <= 23)) return 'Başak';
  if ((month == 9 && day >= 24) || (month == 10 && day <= 23)) return 'Terazi';
  if ((month == 10 && day >= 24) || (month == 11 && day <= 22)) return 'Akrep';
  if ((month == 11 && day >= 23) || (month == 12 && day <= 21)) return 'Yay';
  return 'Bilinmiyor';
}

app.use(cors()); // CORS middleware'ini kullan
app.use(bodyParser.json());

let db;

async function connectToDatabase() {
  try {
    await client.connect();
    db = client.db('madamPep');
    console.log("Connected to MongoDB!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    db = null;
  }
}

app.use(async (req, res, next) => {
  if (!db) {
    await connectToDatabase();
  }
  next();
});

connectToDatabase();


app.post('/api/message', async (req, res) => {
    try {
      if (!db) throw new Error('No database connection');
      
      const { deviceId, inputs } = req.body;
      console.log(`Received user inputs from device ${deviceId}:`, inputs);
  
      const collection = db.collection('userData');
      await collection.updateOne(
        { deviceId: deviceId },
        { $set: { deviceId: deviceId, inputs: inputs } },
        { upsert: true }
      );
  
      const birthDateInput = inputs.find(input => input.question === 'Doğum Tarihi');
      let userZodiac = '';
      if (birthDateInput) {
        const [day, month] = birthDateInput.answer.split('.').map(Number);
        userZodiac = getZodiacSign(day, month);
      }
  
      const userMessageContent = inputs.map(input => `${input.question}: ${input.answer}`).join('\n') + `\nBurç: ${userZodiac}`;
  
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4-turbo',
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
  
      res.json({ message: reply });
    } catch (error) {
      console.error('Error sending chat request:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/short-message', async (req, res) => {
    try {
      if (!db) throw new Error('No database connection');
  
      const { deviceId, inputs } = req.body;
      console.log('Received user inputs:', inputs);
  
      const collection = db.collection('userData');
      const previousData = await collection.findOne({ deviceId: deviceId });
  
      const combinedInputs = [...(previousData?.inputs || []), ...inputs];
  
      const birthDateInput = combinedInputs.find(input => input.question === 'Doğum Tarihi');
      let userZodiac = '';
      if (birthDateInput) {
        const [day, month] = birthDateInput.answer.split('.').map(Number);
        userZodiac = getZodiacSign(day, month);
      }
  
      const userMessageContent = combinedInputs.map(input => `${input.question}: ${input.answer}`).join('\n') + `\nBurç: ${userZodiac}`;
  
      const messages = [
        { role: 'system', content: 'Senin adın MadamPep ve sen bir kahve falcısısın. Kullanıcıların önceki girdilerini ve fal çıktısını hatırlayarak, kısa ve net cevaplar ver. Cevaplarında tekrar merhaba deme.' },
        { role: 'user', content: userMessageContent },
        ...previousData?.falCiktisi ? [{ role: 'assistant', content: previousData.falCiktisi }] : [],
        { role: 'user', content: inputs.map(input => input.answer).join('\n') }
      ];
  
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4-turbo',
          messages: messages,
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
  
      res.json({ message: reply });
    } catch (error) {
      console.error('Error sending chat request:', error.message);
      res.status(500).json({ error: error.message });
    }
  });
  

app.get('/api/profile', async (req, res) => {
  try {
    if (!db) throw new Error('No database connection');
    
    const { deviceId } = req.query;
    console.log('Received deviceId:', deviceId);
    const collection = db.collection('userData');
    const userData = await collection.findOne({ deviceId: deviceId });
    console.log('UserData:', userData);

    if (!userData) {
      return res.status(404).json({ message: 'User data not found' });
    }

    const profileData = {
      name: userData.inputs.find(input => input.question === 'Adınız')?.answer || 'Bilinmiyor',
      birthDate: userData.inputs.find(input => input.question === 'Doğum Tarihi')?.answer || 'Bilinmiyor',
      id: userData.deviceId,
    };

    res.json(profileData);
  } catch (error) {
    console.error('Error fetching profile data:', error.message);
    res.status(500).json({ error: 'An error occurred while fetching profile data' });
  }
});

app.get('/api/ai-response', async (req, res) => {
  try {
    if (!db) throw new Error('No database connection');
    
    const { deviceId } = req.query;
    console.log('Received deviceId:', deviceId);
    const collection = db.collection('userData');
    const userData = await collection.findOne({ deviceId: deviceId });
    console.log('UserData:', userData);

    if (!userData) {
      return res.status(404).json({ message: 'User data not found' });
    }

    const birthDateInput = userData.inputs.find(input => input.question === 'Doğum Tarihi');
    let userZodiac = '';
    if (birthDateInput) {
      const [day, month] = birthDateInput.answer.split('.').map(Number);
      userZodiac = getZodiacSign(day, month);
    }

    const userMessageContent = userData.inputs.map(input => `${input.question}: ${input.answer}`).join('\n') + `\nBurç: ${userZodiac}`;
    console.log('UserMessageContent:', userMessageContent);

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo',
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

    res.json({ message: reply });
  } catch (error) {
    console.error('Error fetching AI response:', error.message);
    res.status(500).json({ error: 'An error occurred while fetching AI response' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
