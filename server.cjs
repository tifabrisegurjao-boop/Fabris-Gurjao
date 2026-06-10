const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 5000;

// Path to the python classifier project (sibling to Nexus)
const CLASSIFIER_DIR = path.resolve(__dirname, '..', 'agente_classificador');
const ENV_PATH = path.join(CLASSIFIER_DIR, '.env');
const SETTINGS_PATH = path.join(CLASSIFIER_DIR, '.gui_settings.json');

// Global reference to the background watcher process
let watcherProcess = null;
let watcherConfig = null;

// Helper: load settings (directories, dry_run)
function loadSettings() {
    let settings = {
        input_dir: path.join(CLASSIFIER_DIR, 'entrada'),
        output_dir: path.join(CLASSIFIER_DIR, 'saida'),
        dry_run: true
    };
    if (fs.existsSync(SETTINGS_PATH)) {
        try {
            const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
            if (data.input_dir) settings.input_dir = data.input_dir;
            if (data.output_dir) settings.output_dir = data.output_dir;
            if (data.hasOwnProperty('dry_run')) settings.dry_run = data.dry_run;
        } catch (e) {
            console.error('Error reading .gui_settings.json:', e.message);
        }
    }
    return settings;
}

// Helper: load API keys from .env
function loadEnvKeys() {
    let keys = { geminiKey: '', anthropicKey: '' };
    if (fs.existsSync(ENV_PATH)) {
        try {
            const content = fs.readFileSync(ENV_PATH, 'utf8');
            const lines = content.split('\n');
            lines.forEach(line => {
                const parts = line.trim().split('=');
                if (parts.length >= 2) {
                    const keyName = parts[0].trim();
                    const keyValue = parts.slice(1).join('=').trim();
                    if (keyName === 'GEMINI_API_KEY' && keyValue !== 'sua_chave_do_gemini_aqui') {
                        keys.geminiKey = keyValue;
                    } else if (keyName === 'ANTHROPIC_API_KEY' && keyValue !== 'sua_chave_do_claude_aqui') {
                        keys.anthropicKey = keyValue;
                    }
                }
            });
        } catch (e) {
            console.error('Error reading .env file:', e.message);
        }
    }
    return keys;
}

// Helper: save API keys to .env and settings to .gui_settings.json
function saveSettingsAndKeys(settings, keys) {
    try {
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
    } catch (e) {
        console.error('Error writing .gui_settings.json:', e.message);
    }

    try {
        let envContent = '# Chaves de API para os modelos de IA\n';
        const gKey = keys.geminiKey.trim() || 'sua_chave_do_gemini_aqui';
        const aKey = keys.anthropicKey.trim() || 'sua_chave_do_claude_aqui';
        envContent += `GEMINI_API_KEY=${gKey}\n`;
        envContent += `ANTHROPIC_API_KEY=${aKey}\n`;
        fs.writeFileSync(ENV_PATH, envContent, 'utf8');
    } catch (e) {
        console.error('Error writing .env:', e.message);
    }
}

// Main server handler
const server = http.createServer((req, res) => {
    // Enable CORS manually
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    // Route: GET /api/settings
    if (pathname === '/api/settings' && req.method === 'GET') {
        const settings = loadSettings();
        const keys = loadEnvKeys();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            input_dir: settings.input_dir,
            output_dir: settings.output_dir,
            dry_run: settings.dry_run,
            geminiKey: keys.geminiKey ? '••••••••' + keys.geminiKey.slice(-4) : '',
            anthropicKey: keys.anthropicKey ? '••••••••' + keys.anthropicKey.slice(-4) : '',
            rawGeminiKey: keys.geminiKey,
            rawAnthropicKey: keys.anthropicKey
        }));
        return;
    }

    // Route: POST /api/settings
    if (pathname === '/api/settings' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { input_dir, output_dir, dry_run, geminiKey, anthropicKey } = JSON.parse(body);
                const currentKeys = loadEnvKeys();
                
                let finalGemini = geminiKey;
                if (geminiKey && geminiKey.includes('••••••••')) {
                    finalGemini = currentKeys.geminiKey;
                }
                let finalAnthropic = anthropicKey;
                if (anthropicKey && anthropicKey.includes('••••••••')) {
                    finalAnthropic = currentKeys.anthropicKey;
                }

                const settings = {
                    input_dir: input_dir || path.join(CLASSIFIER_DIR, 'entrada'),
                    output_dir: output_dir || path.join(CLASSIFIER_DIR, 'saida'),
                    dry_run: dry_run !== undefined ? dry_run : true
                };

                saveSettingsAndKeys(settings, { geminiKey: finalGemini, anthropicKey: finalAnthropic });
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, settings }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `Invalid JSON payload: ${err.message}` }));
            }
        });
        return;
    }

    // Route: POST /api/upload (JSON containing array of base64-encoded files)
    if (pathname === '/api/upload' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                if (!payload.files || !Array.isArray(payload.files)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Formato inválido. Esperado array "files".' }));
                    return;
                }

                const settings = loadSettings();
                const inputDir = path.resolve(settings.input_dir);

                if (!fs.existsSync(inputDir)) {
                    fs.mkdirSync(inputDir, { recursive: true });
                }

                payload.files.forEach(fileObj => {
                    const filePath = path.join(inputDir, fileObj.name);
                    const buffer = Buffer.from(fileObj.base64, 'base64');
                    fs.writeFileSync(filePath, buffer);
                    console.log(`Saved file from Base64 upload: ${filePath}`);
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, count: payload.files.length }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `Upload failed: ${err.message}` }));
            }
        });
        return;
    }

    // Route: GET /api/logs
    if (pathname === '/api/logs' && req.method === 'GET') {
        const settings = loadSettings();
        const logPath = path.join(path.resolve(settings.output_dir), 'organizacao_log.json');
        
        if (fs.existsSync(logPath)) {
            try {
                const data = fs.readFileSync(logPath, 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(data);
                return;
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Erro ao ler arquivo de logs.' }));
                return;
            }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
    }

    // Route: GET /api/watcher/status
    if (pathname === '/api/watcher/status' && req.method === 'GET') {
        const active = watcherProcess !== null && watcherProcess.exitCode === null;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ active, config: active ? watcherConfig : null }));
        return;
    }

    // Route: POST /api/watcher/start
    if (pathname === '/api/watcher/start' && req.method === 'POST') {
        if (watcherProcess !== null && watcherProcess.exitCode === null) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Watcher já está em execução.' }));
            return;
        }

        const settings = loadSettings();
        const pythonScript = path.join(CLASSIFIER_DIR, 'watcher.py');
        const args = [
            pythonScript,
            '--input-dir', settings.input_dir,
            '--output-dir', settings.output_dir
        ];
        if (settings.dry_run) {
            args.push('--dry-run');
        }

        console.log(`Starting watcher background service: python ${args.join(' ')}`);
        
        watcherProcess = spawn('python', args, {
            cwd: CLASSIFIER_DIR,
            detached: true,
            stdio: 'ignore'
        });
        
        watcherProcess.unref();
        watcherConfig = { input_dir: settings.input_dir, output_dir: settings.output_dir, dry_run: settings.dry_run };

        watcherProcess.on('exit', (code) => {
            console.log(`Watcher background process exited with code ${code}`);
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Watcher iniciado com sucesso.' }));
        return;
    }

    // Route: POST /api/watcher/stop
    if (pathname === '/api/watcher/stop' && req.method === 'POST') {
        if (watcherProcess === null || watcherProcess.exitCode !== null) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Watcher não está em execução.' }));
            return;
        }

        try {
            watcherProcess.kill();
            watcherProcess = null;
            watcherConfig = null;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Watcher parado com sucesso.' }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Falha ao parar o Watcher: ${e.message}` }));
        }
        return;
    }

    // Route: GET /api/run/stream (SSE stream)
    if (pathname === '/api/run/stream' && req.method === 'GET') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        });

        const settings = loadSettings();
        const pythonScript = path.join(CLASSIFIER_DIR, 'main.py');
        const args = [
            pythonScript,
            '--input-dir', settings.input_dir,
            '--output-dir', settings.output_dir
        ];
        if (settings.dry_run) {
            args.push('--dry-run');
        }

        const sendSSE = (event, data) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        sendSSE('log', `Iniciando Agente RAG: python main.py --input-dir "${settings.input_dir}" --output-dir "${settings.output_dir}"${settings.dry_run ? ' --dry-run' : ''}\n`);

        const pyProcess = spawn('python', args, {
            cwd: CLASSIFIER_DIR,
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });

        pyProcess.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    sendSSE('log', line);
                }
            });
        });

        pyProcess.stderr.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    const lower = line.toLowerCase();
                    if (lower.includes('error') || lower.includes('fail') || lower.includes('exception') || lower.includes('traceback') || lower.includes('warning')) {
                        sendSSE('log', `[ERRO] ${line}`);
                    } else {
                        sendSSE('log', line);
                    }
                }
            });
        });

        pyProcess.on('error', (err) => {
            sendSSE('log', `[ERRO] Falha ao iniciar script Python: ${err.message}`);
            sendSSE('end', { code: -1 });
            res.end();
        });

        pyProcess.on('close', (code) => {
            sendSSE('log', `\n=== Processamento Concluído com código de saída: ${code} ===\n`);
            sendSSE('end', { code });
            res.end();
        });

        req.on('close', () => {
            if (pyProcess.exitCode === null) {
                console.log('Client disconnected from SSE stream, killing agent run.');
                pyProcess.kill();
            }
        });
        return;
    }

    // 404 Route
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint não encontrado.' }));
});

server.listen(PORT, () => {
    console.log(`Zero-dependency local Bridge Server running on http://localhost:${PORT}`);
});
