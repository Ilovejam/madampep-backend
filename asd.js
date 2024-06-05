const axios = require('axios');

const testMessageEndpoint = async () => {
  const url = 'https://madampep-backend.vercel.app/api/message';
  const data = {
    deviceId: 'unique-device-id', // Test için benzersiz bir cihaz kimliği kullanın
    inputs: [
      { question: 'Adınız', answer: 'Zübeyir' },
      { question: 'Cinsiyet', answer: 'Erkek' },
      { question: 'Doğum Tarihi', answer: '5/17/2024' }
    ]
  };

  try {
    const response = await axios.post(url, data);
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
};

testMessageEndpoint();
