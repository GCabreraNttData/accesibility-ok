import fs from 'fs';

const data = JSON.parse(fs.readFileSync('accesibility-report.json', 'utf8'));

let md = `# Accessibility Report for ${data.file}\n\n`;

for (const v of data.violations) {
  md += `## [${v.impact.toUpperCase()}] ${v.help}\n`;
  md += `**Rule:** ${v.id}\n\n`;
  md += `**Description:** ${v.description}\n\n`;
  for (const node of v.nodes) {
    md += `- **File:** ${node.file}  \n`;
    md += `  **Line:** ${node.line ?? 'N/A'}  \n`;
    md += `  **Selector:** \`${node.target.join(' ')}\`  \n`;
    md += `  **HTML:** \`${node.html}\`\n`;
  }
  md += '\n';
}

fs.writeFileSync('accesibility-report.md', md);
console.log('Markdown report generated: accesibility-report.md');