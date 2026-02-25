// Script to generate the bookmarklet URL from source
const fs = require('fs');

// Read the source file
const source = fs.readFileSync('./bookmarklet-source.js', 'utf8');

// Very minimal minification - just remove comments and trim
const minified = source
  .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
  .replace(/([^:])\/\/[^\n]*/g, '$1') // Remove single-line comments (but not :// in URLs)
  .replace(/\n\s*/g, '') // Remove newlines and indentation
  .replace(/\s+/g, ' ') // Replace multiple spaces with single
  .trim();

// Encode for URL
const encoded = 'javascript:' + encodeURIComponent(minified);

console.log('\n=== BOOKMARKLET URL ===\n');
console.log(encoded);
console.log('\n=== Copy the above and use it in the href attribute ===\n');

// Also save to file
fs.writeFileSync('./bookmarklet-href.txt', encoded);
console.log('Saved to bookmarklet-href.txt\n');
