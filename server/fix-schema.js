const fs = require('fs');
let c = fs.readFileSync('prisma/schema.prisma', 'utf8');

// remove all existing @@schema
c = c.replace(/@@schema\("public"\)/g, '');
c = c.replace(/@@schema\('public'\)/g, '');

// match the block: `model Name { ... }` or `enum Name { ... }`
// The regex: matching any model or enum, capturing everything until the closing brace
// then replacing it with the same text, but inserting `  @@schema("public")` right before the closing brace.
c = c.replace(/(model\s+[a-zA-Z]+\s*\{[^}]*?)(\})/g, '$1  @@schema("public")\n$2');
c = c.replace(/(enum\s+[a-zA-Z]+\s*\{[^}]*?)(\})/g, '$1  @@schema("public")\n$2');

fs.writeFileSync('prisma/schema.prisma', c);
console.log('Fixed schema successfully.');
