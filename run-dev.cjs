const { spawn } = require('child_process');

console.log('\x1b[35m=== Starting Nexus + RAG Organizer local service stack ===\x1b[0m');

// Start Vite dev server (runs on port 5173 by default)
const vite = spawn('npx.cmd', ['vite'], {
    stdio: 'inherit',
    shell: true
});

// Start Node server.cjs (runs on port 5000)
const server = spawn('node', ['server.cjs'], {
    stdio: 'inherit'
});

// Capture Ctrl+C/SIGINT and kill both child processes cleanly
process.on('SIGINT', () => {
    console.log('\n\x1b[31mStopping local service stack...\x1b[0m');
    vite.kill();
    server.kill();
    process.exit();
});
