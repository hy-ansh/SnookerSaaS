const fs = require('fs');
const path = require('path');

const schemaPath = path.resolve(__dirname, 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// Remove previewFeatures
content = content.replace(/previewFeatures = \["multiSchema"\]/g, '');

// Remove schemas = ["public", "auth"] (already done by replace_file_content but just in case)
content = content.replace(/schemas\s*=\s*\["public", "auth"\]/g, '');

// Remove @@schema("public") from everywhere
content = content.replace(/  @@schema\("public"\)\n/g, '');
content = content.replace(/  @@schema\("auth"\)\n/g, '');

// Remove AuthUser model
content = content.replace(/model AuthUser \{[\s\S]*?\n\}/g, '');

fs.writeFileSync(schemaPath, content);
console.log('Schema cleaned successfully');
