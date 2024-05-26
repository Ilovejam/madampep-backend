const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const multer = require('multer');
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENAI_API_KEY;
const systemMessage = {
    role: 'system',
    content: 'Senin adÄ±n MadamPep ve sen bir kahve falcÄ±sÄ±sÄ±n. KullanÄ±cÄ±lar sana iÃ§tikleri kahvenin telve fotoÄraflarÄ±nÄ± gÃ¶nderecekler ve sen de onlara kahve falÄ± bakacaksÄ±n. TatlÄ± ve gizemli bir dil kullanÄ±yorsun. Åekillerden hareketle; iliÅikilere, iÅe, aÅk hayatÄ± ve kariyere yÃ¶nelik Ã§arpÄ±cÄ± Ã§Ä±karÄ±mlar yaparsÄ±n. Ruh haliyle, geÃ§miÅiyle, kalbinin temizliÄiyle ilgili Åeyler sÃ¶ylersin. GÃ¶rdÃ¼ÄÃ¼n harflerle baÄlantÄ±lÄ± cÃ¼mleler kurarsÄ±n. FincanÄ±n dibine yakÄ±n kÄ±sÄ±mlar geÃ§miÅi, aÄzÄ±na yakÄ±n kÄ±sÄ±mlar geleceÄi anlatÄ±r. AmacÄ±n kullancÄ±yÄ± gelecek ile ilgili tahminlerde bulunduÄuna ikna etmektir. KullanÄ±cÄ±nÄ±n burcunu doÄum tarihine gÃ¶re belirle ve yorumlarÄ±nda burcunu dikkate alarak konuÅ.'
};

let lastAIResponse = "";

// BurÃ§larÄ± belirlemek iÃ§in fonksiyon
function getZodiacSign(day, month) {
    if ((month == 1 && day <= 20) || (month == 12 && day >= 22)) return 'OÄlak';
    if ((month == 1 && day >= 21) || (month == 2 && day <= 18)) return 'Kova';
    if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) return 'BalÄ±k';
    if ((month == 3 && day >= 21) || (month == 4 && day <= 20)) return 'KoÃ§';
    if ((month == 4 && day >= 21) || (month == 5 && day <= 20)) return 'BoÄa';
    if ((month == 5 && day >= 21) || (month == 6 && day <= 21)) return 'Ä°kizler';
    if ((month == 6 && day >= 22) || (month == 7 && day <= 22)) return 'YengeÃ§';
    if ((month == 7 && day >= 23) || (month == 8 && day <= 23)) return 'Aslan';
    if ((month == 8 && day >= 24) || (month == 9 && day <= 23)) return 'BaÅak';
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

const upload = multer({ dest: 'uploads/' });

let model;
async function loadModel() {
    model = await tf.loadLayersModel('file://tm-my-image-model/model.json');
}

loadModel().then(() => {
    console.log("Model loaded successfully");
});

app.post('/api/message', async (req, res) => {
    try {
        const userInputs = req.body.inputs;
        console.log('Received user inputs:', userInputs);

        const birthDateInput = userInputs.find(input => input.question === 'DoÄum Tarihi');
        let userZodiac = '';
        if (birthDateInput) {
            const [month, day] = birthDateInput.answer.split('/').map(Number);
            userZodiac = getZodiacSign(day, month);
        }

        const userMessageContent = userInputs.map(input => `${input.question}: ${input.answer}`).join('\n') + `\nBurÃ§: ${userZodiac}`;

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

app.post('/api/upload', upload.array('images', 3), async (req, res) => {
    try {
        const files = req.files;
        let predictions = [];

        for (let file of files) {
            const imgBuffer = fs.readFileSync(file.path);
            let imgTensor = tf.node.decodeImage(new Uint8Array(imgBuffer), 3);
            imgTensor = tf.image.resizeBilinear(imgTensor, [224, 224]); // Resmi yeniden boyutlandÄ±r

            imgTensor = imgTensor.expandDims(0).toFloat().div(tf.scalar(127.5)).sub(tf.scalar(1));

            const prediction = model.predict(imgTensor);
            const predictionData = prediction.dataSync();

            const isCoffeeCup = predictionData[0] > 0.8; // Adjust this threshold as necessary
            predictions.push({ file: file.originalname, isCoffeeCup });
        }

        res.json({ predictions });
    } catch (error) {
        console.error('Error during image processing:', error);
        res.status(500).json({ error: 'An error occurred while processing images' });
    } finally {
        // Clean up uploaded files
        req.files.forEach(file => fs.unlinkSync(file.path));
    }
});


app.get('/api/ai-response', (req, res) => {
    res.json({ message: lastAIResponse });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
