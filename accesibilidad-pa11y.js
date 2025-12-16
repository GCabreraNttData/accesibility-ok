const pa11y = require('pa11y');
const fs = require('fs');
const path = require('path');
let chalk;

function getHtmlFiles(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      results = results.concat(getHtmlFiles(fullPath));
    } else if (file.endsWith('.html')) {
      results.push(fullPath);
    }
  });
  return results;
}

const arg = process.argv[2];
let filesToAnalyze = [];

if (!arg) {
  // Sin argumento: analizar todos los HTML de la carpeta actual
  filesToAnalyze = getHtmlFiles(process.cwd());
} else {
  const fullPath = path.resolve(arg);
  if (fs.existsSync(fullPath)) {
    if (fs.statSync(fullPath).isDirectory()) {
      filesToAnalyze = getHtmlFiles(fullPath);
    } else if (fullPath.endsWith('.html')) {
      filesToAnalyze = [fullPath];
    } else {
      console.error('El argumento debe ser una carpeta o un archivo .html');
      process.exit(1);
    }
  } else {
    console.error('La ruta especificada no existe.');
    process.exit(1);
  }
}

(async () => {
  chalk = (await import('chalk')).default;
  for (const file of filesToAnalyze) {
    const absolutePath = path.resolve(file);
    const normalizedPath = absolutePath.replace(/\\/g, '/');
    const fileUrl = `file:///${normalizedPath}`;
    console.log(`Analizando: ${fileUrl}`);
    
    const results = await pa11y(fileUrl, { standard: 'WCAG2AA' });
    if (results.issues.length > 0) {
      console.log(`Problemas encontrados en ${file}:`);
      results.issues.forEach(issue => {
        let typeColored = `[${issue.type}]`;
        if (issue.type === 'error') typeColored = chalk.red('[error]');
        else if (issue.type === 'warning') typeColored = chalk.yellow('[warning]');
        else if (issue.type === 'notice' || issue.type === 'recommendation' || issue.type === 'suggestion') typeColored = chalk.cyan(`[${issue.type}]`);
        // Ya no se muestra el selector
        let selectorInfo = '';
        // Intentar encontrar la línea en el archivo HTML
        let codeLine = '';
        let foundLine = -1;
        if (fs.existsSync(file)) {
          try {
            const htmlContent = fs.readFileSync(file, 'utf8');
            const lines = htmlContent.split(/\r?\n/);
            let searchText = '';
            // Prioridad: selector, luego contexto
            if (issue.selector) {
              searchText = issue.selector.replace(/\./g, '').replace(/#/g, '');
            }
            for (let i = 0; i < lines.length; i++) {
              if (searchText && lines[i].includes(searchText)) {
                foundLine = i + 1;
                codeLine = lines[i].trim();
                break;
              }
            }
            // Si no se encontró por selector, buscar por contexto
            if (foundLine === -1 && issue.context) {
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes(issue.context.trim())) {
                  foundLine = i + 1;
                  codeLine = lines[i].trim();
                  break;
                }
              }
            }
          } catch (e) {}
        }
        // Formato legible
        console.log(chalk.gray('----------------------------------------'));
        console.log(`  ${typeColored} ${chalk.bold(issue.message)}`);
        console.log(`    Código: ${chalk.cyan(issue.code)}`);
        if (issue.description) {
          console.log(`    Descripción: ${chalk.white(issue.description)}`);
        } else if (issue.help) {
          console.log(`    Descripción: ${chalk.white(issue.help)}`);
        }
        const projectRoot = process.cwd();
        const relPath = path.relative(projectRoot, file).replace(/\\/g, '/');
        if (foundLine > 0) {
          console.log(`    ${chalk.green('Línea: ' + foundLine)} ${chalk.blue(relPath)}`);
          if (codeLine) console.log(chalk.bgBlack(`    > ${codeLine}`));
        }
        if (issue.context) console.log(`    Contexto: ${chalk.white(issue.context)}`);
      });
    } else {
      console.log(chalk.green('[OK]'), `Sin problemas de accesibilidad en ${file}`);
    }
    console.log('-----------------------------------');
  }
})();
