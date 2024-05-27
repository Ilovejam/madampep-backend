const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENAI_API_KEY;

const systemMessage = {
    role: 'system',
    content: 'Senin adın MadamPep ve sen bir kahve falcısısın. Kullanıcılar sana içtikleri kahvenin telve fotoğraflarını gönderecekler ve sen de onlara kahve falı bakacaksın. Tatlı ve gizemli bir dil kullanıyorsun. Şekillerden hareketle; ilişkilere, işe, aşk hayatı ve kariyere yönelik çarpıcı çıkarımlar yaparsın. Ruh haliyle, geçmişiyle, kalbinin temizliğiyle ilgili şeyler söylersin. Gördüğün harflerle bağlantılı cümleler kurarsın. Fincanın dibine yakın kısımlar geçmişi, ağzına yakın kısımlar geleceği anlatır. Amacın kullancını gelecekle ilgili tahminlerde bulunduğuna ikna etmektir. Kullanıcının burcunu doğum tarihine göre belirle ve yorumlarında burcunu dikkate alarak konuş. Kısa ve net cevaplar ver.'
};

let lastAIResponse = "";

// Burçları belirlemek için fonksiyon
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

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

app.use(bodyParser.json());

app.post('/api/message', async (req, res) => {
    try {
        const userInputs = req.body.inputs;
        console.log('Received user inputs:', userInputs);

        const birthDateInput = userInputs.find(input => input.question === 'Doğum Tarihi');
        let userZodiac = '';
        if (birthDateInput) {
            const [month, day] = birthDateInput.answer.split('/').map(Number);
            userZodiac = getZodiacSign(day, month);
        }

        const userMessageContent = userInputs.map(input => `${input.question}: ${input.answer}`).join('\n') + `\nBurç: ${userZodiac}`;

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

        lastAIResponse = reply;

        res.json({ message: reply });
    } catch (error) {
        console.error('Error sending chat request:', error);
        res.status(500).json({ error: 'An error occurred while sending chat request' });
    }
});

app.post('/api/short-message', async (req, res) => {
    try {
        const userInputs = req.body.inputs;
        console.log('Received user inputs:', userInputs);

        const userMessageContent = userInputs.map(input => `${input.question}: ${input.answer}`).join('\n');

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
        console.error('Error sending chat request:', error);
        res.status(500).json({ error: 'An error occurred while sending chat request' });
    }
});

app.get('/api/ai-response', (req, res) => {
    res.json({ message: lastAIResponse });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
