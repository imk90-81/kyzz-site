import http from 'node:http';

const data = JSON.stringify({
  date: '2026-05-28',
  files: [{ source: 'test.md', targets: ['daily'] }],
  dryRun: true
});

const req = http.request({
  hostname: 'localhost',
  port: 3210,
  path: '/api/publish',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, res => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => console.log(body));
});

req.write(data);
req.end();