const { OllamaNemotronAnalyzer } = require('./src/services/llm.js');

async function test() {
  const analyzer = new OllamaNemotronAnalyzer();
  const payload = {
    error_message: 'TypeError: Cannot read properties of null (reading \'id\')',
    stack_trace: 'at getUser (user.js:15:20)',
    commit_diff: '- const user = db.find();\n+ const user = null;',
    file_context: 'function getUser() {\n  const user = null;\n  console.log(user.id);\n}',
    recent_commits: 'abcdef1 - Fix bug'
  };

  try {
    const result = await analyzer.analyze(payload);
    console.log('LLM Result:', result);
  } catch(e) {
    console.log('LLM test caught expected error if not running:', e.message);
  }
}

test();
