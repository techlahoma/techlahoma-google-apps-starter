/** Display annotations only. The original text remains the copy/export source. */
export function annotateTerminalLines(text: string): string {
  return text
    .split('\n')
    .map(line => {
      if (/^(?:✅|❌|⚠️|📉|🧪|📦)/u.test(line)) return line;
      if (
        /^\s*(?:error\b|failed\b|failure\b|runtime error\b|output limit exceeded\b)/i.test(
          line,
        )
      )
        return `❌ ${line}`;
      if (/^\s*warning\b/i.test(line)) return `⚠️ ${line}`;
      if (/^\s*(?:pass:|success\b|completed\b|.* completed\.)/i.test(line))
        return `✅ ${line}`;
      if (/^(?:step\s+\d+|Pass \d+:)/.test(line)) return `📉 ${line}`;
      if (/^(?:sample\s+\d+:|--- inference)/.test(line)) return `🧪 ${line}`;
      if (/^(?:num docs:|vocab size:|num params:)/.test(line))
        return `📦 ${line}`;
      return line;
    })
    .join('\n');
}
