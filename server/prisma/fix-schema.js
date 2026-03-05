const fs = require('fs');
const path = require('path');

const schemaPath = path.resolve(__dirname, 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// Filter out any mess from previous attempts
content = content.replace(/\/\/ PHASE \nmodel AuthUser \{[\s\S]*?\}[\s\S]*?ADMIN SAAS CONTROL PANEL/, '// ==========================================\n// PHASE 4: ADMIN SAAS CONTROL PANEL');

// Add @@schema("public") to all models that don't have it
content = content.replace(/model (\w+) \{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}/g, (match, name, body) => {
    if (name === 'AuthUser') return match;
    if (body.includes('@@schema')) return match;
    return `model ${name} {\n  @@schema("public")${body}\n}`;
});

// Add @@schema("public") to all enums
content = content.replace(/enum (\w+) \{([\s\S]*?)\}/g, (match, name, body) => {
    if (body.includes('@@schema')) return match;
    return `enum ${name} {\n  @@schema("public")${body}\n}`;
});

// Add AuthUser properly at the end
if (!content.includes('model AuthUser')) {
    content += `
model AuthUser {
  id    String @id @default(uuid())
  email String @unique

  @@map("users")
  @@schema("auth")
}
`;
}

fs.writeFileSync(schemaPath, content);
console.log('Schema updated successfully');
