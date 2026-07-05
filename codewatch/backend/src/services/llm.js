class LLMAnalyzer {
  async analyze(payload) {
    throw new Error('Not implemented');
  }
}

class OllamaNemotronAnalyzer extends LLMAnalyzer {
  constructor(host = 'http://localhost:11434', model = 'nemotron:latest') {
    super();
    this.host = host;
    this.model = model;
  }

  buildAnalysisPrompt(payload) {
    return `You are a senior software engineer doing root-cause analysis on a production error.

ERROR:
${payload.error_message}

STACK TRACE:
${payload.stack_trace}

THE COMMIT THAT LAST TOUCHED THIS CODE:
${payload.commit_diff || 'Unavailable'}

SURROUNDING CODE CONTEXT:
${payload.file_context || 'Unavailable'}

RECENT COMMIT HISTORY ON THIS FILE:
${payload.recent_commits || 'Unavailable'}

Respond ONLY with valid JSON, no markdown, no preamble:
{
  "root_cause": "2-3 sentence explanation of why this error is happening",
  "suggested_fix": "a unified diff patch that fixes the issue",
  "confidence": 0.0-1.0,
  "risk_notes": "any risk in applying this fix automatically"
}`;
  }

  async analyze(payload) {
    const prompt = this.buildAnalysisPrompt(payload);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(this.host + '/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          format: 'json'
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Ollama responded with status: ' + response.status);
      }
      
      const data = await response.json();
      const parsed = JSON.parse(data.response);
      return {
        rootCause: parsed.root_cause,
        suggestedFix: parsed.suggested_fix,
        confidence: parsed.confidence,
        riskNotes: parsed.risk_notes,
        modelUsed: this.model
      };
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        throw new Error('LLM analysis timeout: fallback to "analysis pending, retry"');
      }
      throw e;
    }
  }
}

module.exports = { LLMAnalyzer, OllamaNemotronAnalyzer };
