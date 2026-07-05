const http = require('http');
const { spawn } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const serverProc = spawn('node', ['src/server.js'], { stdio: 'inherit' });

setTimeout(async () => {
  try {
    const postData = JSON.stringify({ name: 'Test Project', github_repo_url: 'https://github.com/test/repo' });
    const req = http.request('http://127.0.0.1:3001/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk.toString(); });
      res.on('end', async () => {
        const project = JSON.parse(body);
        console.log('Created project:', project);

        const eventData = JSON.stringify({
          events: [{
            stack_trace: 'Error: Test',
            error_message: 'Test',
            severity: 'error'
          }]
        });

        const req2 = http.request('http://127.0.0.1:3001/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + project.api_key,
            'Content-Length': Buffer.byteLength(eventData)
          }
        }, (res2) => {
          let body2 = '';
          res2.on('data', chunk => { body2 += chunk.toString(); });
          res2.on('end', async () => {
            console.log('Event ingestion response:', body2);
            const eventsInDb = await prisma.event.findMany();
            console.log('Events in DB:', eventsInDb.length);
            serverProc.kill();
            process.exit(0);
          });
        });
        req2.write(eventData);
        req2.end();
      });
    });
    req.write(postData);
    req.end();
  } catch(e) {
    console.error(e);
    serverProc.kill();
  }
}, 2000);
