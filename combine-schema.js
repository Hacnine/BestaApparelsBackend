import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const outputFile = 'prisma/schema.prisma';
const baseSchema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}
`;

const modelFiles = [
  'prisma/models/user.prisma',
  'prisma/models/employee.prisma',
  'prisma/models/tna.prisma',
  'prisma/models/auditlog.prisma',
  'prisma/models/buyer.prisma',
  'prisma/models/department.prisma',

];

let combinedSchema = baseSchema.trim() + '\n\n';

try {
  modelFiles.forEach((file) => {
    const filePath = join(__dirname, file);
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const content = readFileSync(filePath, 'utf-8').trim();
    combinedSchema += `${content}\n\n`;
  });

  writeFileSync(outputFile, combinedSchema.trim() + '\n');
  console.log('Schema combined successfully into', outputFile);
} catch (error) {
  console.error('Error combining schema:', error.message);
  process.exit(1);
}

// node combine-schema.js
// npx prisma db push
// npx prisma generate
// npx prisma migrate dev --name init
// npx prisma studio
