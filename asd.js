const axios = require('axios');

const url = 'https://madampep-mvp-backend.vercel.app/message';

const data = {
    inputs: [
        { question: 'Adınız', answer: 'Zübeyir' },
        { question: 'Cinsiyet', answer: 'Erkek' },
        { question: 'Doğum Tarihi', answer: '5/17/2024' }
    ]
};

axios.post(url, data)
    .then(response => {
        console.log('Response:', response.data);
    })
    .catch(error => {
        console.error('Error:', error);
    });
