const envVars = [
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'MONGODB_URI',
  'EMAIL_SERVER_HOST',
  'EMAIL_SERVER_PORT',
  'EMAIL_SERVER_USER',
  'EMAIL_SERVER_PASSWORD',
  'EMAIL_FROM',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GITHUB_ID',
  'GITHUB_SECRET'
];

console.log('Environment Variables Check:\n');
envVars.forEach(varName => {
  const value = process.env[varName];
  console.log(`${varName}: ${value ? '✓ Set' : '✗ Not Set'}`);
}); 