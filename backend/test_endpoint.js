const axios = require('axios');

async function test() {
  try {
    console.log('Testing GET transactions/27...');
    const res = await axios.get('http://localhost:4000/transactions/27');
    console.log('GET Success:', res.data.invoiceNumber);
    
    console.log('Testing POST transactions/27/pay (should fail with 401/Auth but at least hit it)...');
    try {
      await axios.post('http://localhost:4000/transactions/27/pay', { amount: 1000 });
    } catch (e) {
      console.log('POST Status (Expected logic/auth fail):', e.response?.status);
    }
  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

test();
