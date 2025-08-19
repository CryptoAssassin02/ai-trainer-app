const fetch = require('node-fetch');

async function testJWT() {
  const token = 'eyJhbGciOiJIUzI1NiIsImtpZCI6ImdkTTNydUE4OXpUNzdVSEcwaFVjNiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU1MTI2NDc5LCJpYXQiOjE3NTUxMjI4NzksImlzcyI6Imh0dHBzOi8vbmNmc3J0Y3Z4cXJiY2FkaHpuem8uc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6IjM4NzA5NTRmLWY2ZDMtNDQ4ZC04MTdjLWI1MmE5YjdmNjU2ZiIsImVtYWlsIjoiZTJlLXByb2ZpbGUtMTc1NTEyMjg3NjQzMEB0ZXN0LmxvY2FsIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6e30sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTUxMjI4Nzl9XSwic2Vzc2lvbl9pZCI6IjNlZTQ0YzQyLTllNzAtNDBjYy1hNDNlLWFhZTBjYmYxZjU3YyIsImlzX2Fub255bW91cyI6ZmFsc2V9.Gc-NhZr673fxDzy4cv3NphdBk9UFhCeGG_F0SLps3qQ';
  
  try {
    const response = await fetch('http://localhost:8000/v1/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Test User' })
    });
    
    const result = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testJWT();
