const GitCorrelationEngine = require('./src/services/git.js');

async function test() {
  const engine = new GitCorrelationEngine('c:/Users/Rushikesh/.gemini/antigravity/playground/shining-asteroid');
  
  const fakeEvent = {
    stack_trace: 'Error: Something went wrong\n    at main (c:/Users/Rushikesh/.gemini/antigravity/playground/shining-asteroid/server.js:10:15)'
  };

  const result = await engine.correlate(fakeEvent);
  console.log(result ? 'Success!' : 'Failed');
  if (result) {
    console.log('Blamed commit:', result.blamed_commit);
    console.log('Target file:', result.target_file);
    console.log('Context length:', result.file_context.length);
    console.log('Recent commits:\n', result.recent_commits);
  }
}

test();
