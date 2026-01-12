// Decode JWT to understand its structure
const jwt = 'eyJhbGciOiJIUzI1NiIsImtpZCI6ImdkTTNydUE4OXpUNzdVSEcwaFVjNiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU1MTI2NDc5LCJpYXQiOjE3NTUxMjI4NzksImlzcyI6Imh0dHBzOi8vbmNmc3J0Y3Z4cXJiY2FkaHpuem8uc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6IjM4NzA5NTRmLWY2ZDMtNDQ4ZC04MTdjLWI1MmE5YjdmNjU2ZiIsImVtYWlsIjoiZTJlLXByb2ZpbGUtMTc1NTEyMjg3NjQzMEB0ZXN0LmxvY2FsIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6e30sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTUxMjI4Nzl9XSwic2Vzc2lvbl9pZCI6IjNlZTQ0YzQyLTllNzAtNDBjYy1hNDNlLWFhZTBjYmYxZjU3YyIsImlzX2Fub255bW91cyI6ZmFsc2V9.Gc-NhZr673fxDzy4cv3NphdBk9UFhCeGG_F0SLps3qQ';

// Split the JWT into its parts
const parts = jwt.split('.');

// Decode header
const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
console.log('Header:', JSON.stringify(header, null, 2));

// Decode payload
const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
console.log('\nPayload:', JSON.stringify(payload, null, 2));

// Check expiration
const exp = new Date(payload.exp * 1000);
const now = new Date();
console.log('\nToken expires at:', exp.toISOString());
console.log('Current time:', now.toISOString());
console.log('Token expired?', exp < now);

// Check issuer
console.log('\nIssuer:', payload.iss);
console.log('Subject (User ID):', payload.sub);
console.log('Email:', payload.email);
