const fs = require('fs');
const path = require('path');

function removeConsoleLogs(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      removeConsoleLogs(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Remove console.log, console.error, console.warn, console.info, console.debug
      content = content.replace(/console\.(log|error|warn|info|debug)\([^)]*\);?\s*/g, '');
      
      // Remove empty lines that might be left
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
      
      fs.writeFileSync(filePath, content);
      console.log(`Processed: ${filePath}`);
    }
  });
}

// Start from src directory
removeConsoleLogs('./src');
console.log('Console logs removed from all TypeScript/TSX files in src directory'); 