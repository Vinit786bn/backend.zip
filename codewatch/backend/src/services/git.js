const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');

class GitCorrelationEngine {
  constructor(repoUrlOrPath) {
    this.repoUrlOrPath = repoUrlOrPath;
    this.git = simpleGit(repoUrlOrPath);
  }

  parseStackTrace(stack) {
    const lines = stack.split('\n');
    for (const line of lines) {
      const match = line.match(/at\s+(?:[^\s]+\s+)?\+?\(?(.*?):(\d+):(\d+)\)?/);
      if (match) {
        if (!match[1].includes('node_modules') && !match[1].startsWith('node:')) {
          return { file: match[1], line: parseInt(match[2], 10), col: parseInt(match[3], 10) };
        }
      }
    }
    return null;
  }

  async correlate(event) {
    const parsed = this.parseStackTrace(event.stack_trace);
    if (!parsed) throw new Error('Could not parse stack trace');

    let relativeFile = parsed.file;
    if (path.isAbsolute(relativeFile)) {
      relativeFile = path.relative(this.repoUrlOrPath, relativeFile);
    }
    relativeFile = relativeFile.replace(/\\/g, '/');

    try {
      const blame = await this.git.raw(['blame', '-L', parsed.line + ',' + parsed.line, '--porcelain', relativeFile]);
      const commitHash = blame.split(' ')[0];

      const diff = await this.git.show([commitHash]);

      let fileContext = '';
      try {
        const fileContent = fs.readFileSync(path.join(this.repoUrlOrPath, relativeFile), 'utf8').split('\n');
        const start = Math.max(0, parsed.line - 31);
        const end = Math.min(fileContent.length, parsed.line + 30);
        fileContext = fileContent.slice(start, end).join('\n');
      } catch(e) {
        fileContext = 'Context unavailable';
      }

      const log = await this.git.log({ file: relativeFile, maxCount: 5 });
      const recentCommits = log.all.map(c => c.hash.substring(0,7) + ' - ' + c.message).join('\n');

      return {
        commit_diff: diff,
        file_context: fileContext,
        recent_commits: recentCommits,
        blamed_commit: commitHash,
        target_file: relativeFile
      };
    } catch (e) {
      console.error('Git correlation failed:', e.message);
      return null;
    }
  }
}

module.exports = GitCorrelationEngine;
