const { exec } = require('child_process');
const fs = require('fs');

exec('npx prisma db push', { cwd: 's:/SnookerSaaS/server' }, (error, stdout, stderr) => {
    fs.writeFileSync('prisma_debug.log', `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`);
    if (error) {
        fs.appendFileSync('prisma_debug.log', `\nERROR:\n${error.message}`);
    }
    console.log('Log captured.');
});
