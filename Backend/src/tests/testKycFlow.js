const io     = require('socket.io-client');
const axios  = require('axios');
const fs     = require('fs');
const path   = require('path');
const FormData = require('form-data');

(async () => {
  // 1) Valid JWT: generate via your login endpoint first
  const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MDJhOWE1ZjUxODJiYjg2NDg4YjNjOSIsInRva2VuVmVyc2lvbiI6MSwiaWF0IjoxNzQ1MDU5ODQyLCJleHAiOjE3NDUzMTkwNDJ9._Jq77hRSKmg4Ma1uJgjdU5s1Ef5MnkG5Fj74chal4uQ';

  // 2) Socket.IO client
  const userId = '6802a9a5f5182bb86488b3c9';
  const socket = io('http://localhost:3000', { query: { userId } });

  socket.on('connect', () => console.log('[Socket] Connected:', socket.id));
  socket.on('kycUpdate', msg => console.log('[Socket] kycUpdate:', msg));
  socket.on('notification', msg => console.log('[Socket] notification:', msg));
  socket.on('error', err => console.log('[Socket] error:', err));

  // 3) pick latest uploaded files dynamically
  function latest(prefix) {
    const dir = path.resolve(__dirname, '../Uploads/kyc');
    const items = fs.readdirSync(dir)
      .filter(f => f.startsWith(prefix))
      .map(f => ({
        file: f,
        mtime: fs.statSync(path.join(dir, f)).mtimeMs
      }))
      .sort((a,b) => b.mtime - a.mtime);
    if (!items.length) throw new Error(`No files for ${prefix}`);
    return path.join(dir, items[0].file);
  }

  // 4) build form-data
  const form = new FormData();
  form.append('idFront', fs.createReadStream(latest('idFront-')));
  form.append('idBack',  fs.createReadStream(latest('idBack-')));
  form.append('selfie',  fs.createReadStream(latest('selfie-')));

  // 5) POST to /submit
  try {
    const res = await axios.post(
      'http://localhost:3001/api/v1/kyc/submit',
      form,
      { headers: { 
          ...form.getHeaders(),
          Authorization: `Bearer ${JWT}`
        } 
      }
    );
    console.log('Submit response:', res.data);
  } catch (e) {
    console.error('Submit error:', e.response?.data || e.message);
  }

  // 6) keep alive for updates
  setTimeout(() => {
    console.log('Done.');
    socket.disconnect();
    process.exit(0);
  }, 60000);
})();