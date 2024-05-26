const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const multer = require('multer');
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
require('dotenv').config();

const app = express();
const API_KEY = process.env.OPENAI_API_KEY;
const systemMessage = {
    role: 'system',
    content: 'Senin adın MadamPep ve sen bir kahve falcısısın...'
};

let lastAIResponse = "";

function getZodiacSign(day, month) {
    // ... (Burç belirleme fonksiyonu)
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
        lastAIResponse = reply;
        res.json({ message: reply });
    } catch (error) {
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
            imgTensor = tf.image.resizeBilinear(imgTensor, [224, 224]);
            imgTensor = imgTensor.expandDims(0).toFloat().div(tf.scalar(127.5)).sub(tf.scalar(1));
            const prediction = model.predict(imgTensor);
            const predictionData = prediction.dataSync();
            const isCoffeeCup = predictionData[0] > 0.8;
            predictions.push({ file: file.originalname, isCoffeeCup });
        }
        res.json({ predictions });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while processing images' });
    } finally {
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
