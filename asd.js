const axios = require('axios');

const url = 'http://localhost:3000/api/message';
const data = {
  deviceId: '03155fa2-420b-49a1-a89e-fc345541c91b',
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
    console.error('Error:', error.response ? error.response.data : error.message);
  });
