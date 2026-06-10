import React, { useState, useEffect, useRef } from 'react';
import {
    ArrowLeft,
    Settings,
    Terminal as TerminalIcon,
    History,
    Play,
    UploadCloud,
    FolderOpen,
    KeyRound,
    Eye,
    EyeOff,
    Check,
    Loader2,
    AlertCircle,
    FileText,
    Search,
    SlidersHorizontal,
    Cpu,
    X,
    FileCheck
} from 'lucide-react';
import { useToast } from './Toast';

interface LogEntry {
    timestamp: string;
    arquivo_original_nome: string;
    caminho_origem: string;
    caminho_destino_relativo: string;
    caminho_destino_absoluto: string;
    classificado: boolean;
    materia_codigo: string;
    confianca_percentual: number;
    justificativa_semantica: string;
    dry_run: boolean;
}

interface OrganizerPageProps {
    onBack: () => void;
}

export default function OrganizerPage({ onBack }: OrganizerPageProps) {
    const { showToast } = useToast();
    
    // Config and Key States
    const [inputDir, setInputDir] = useState('');
    const [outputDir, setOutputDir] = useState('');
    const [dryRun, setDryRun] = useState(true);
    const [geminiKey, setGeminiKey] = useState('');
    const [anthropicKey, setAnthropicKey] = useState('');
    const [showKeys, setShowKeys] = useState(false);
    
    // Status States
    const [watcherActive, setWatcherActive] = useState(false);
    const [running, setRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [history, setHistory] = useState<LogEntry[]>([]);
    
    // UI States
    const [activeTab, setActiveTab] = useState<'run' | 'history'>('run');
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    
    // Filters for history
    const [searchTerm, setSearchTerm] = useState('');
    const [filterConfidence, setFilterConfidence] = useState<'all' | 'high' | 'medium' | 'low'>('all');
    
    // Expandable logs
    const [expandedLogIndex, setExpandedLogIndex] = useState<number | null>(null);

    const terminalEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll terminal
    useEffect(() => {
        if (terminalEndRef.current) {
            terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    // Load configurations and history on mount
    useEffect(() => {
        fetchSettings();
        fetchLogs();
        checkWatcherStatus();
        
        // Poll watcher status every 10 seconds
        const interval = setInterval(checkWatcherStatus, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchSettings = async () => {
        try {
            setLoadingSettings(true);
            const res = await fetch('http://localhost:5000/api/settings');
            const data = await res.json();
            setInputDir(data.input_dir || '');
            setOutputDir(data.output_dir || '');
            setDryRun(data.dry_run !== undefined ? data.dry_run : true);
            // Pre-fill keys (masked or raw)
            setGeminiKey(data.rawGeminiKey || '');
            setAnthropicKey(data.rawAnthropicKey || '');
        } catch (err) {
            console.error('Error fetching settings:', err);
            showToast('Erro ao conectar com o backend local do Agente.', 'error');
        } finally {
            setLoadingSettings(false);
        }
    };

    const fetchLogs = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/logs');
            const data = await res.json();
            if (Array.isArray(data)) {
                // Sort by timestamp desc
                setHistory(data.reverse());
            }
        } catch (err) {
            console.error('Error fetching logs:', err);
        }
    };

    const checkWatcherStatus = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/watcher/status');
            const data = await res.json();
            setWatcherActive(data.active);
        } catch (err) {
            console.error('Error checking watcher status:', err);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSavingSettings(true);
            const res = await fetch('http://localhost:5000/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input_dir: inputDir,
                    output_dir: outputDir,
                    dry_run: dryRun,
                    geminiKey,
                    anthropicKey
                })
            });
            const data = await res.json();
            if (data.success) {
                showToast('Configurações do Agente salvas com sucesso!', 'success');
                fetchLogs(); // Reload logs if output dir changed
            } else {
                showToast('Erro ao salvar configurações.', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Falha na comunicação com o backend.', 'error');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleToggleWatcher = async () => {
        const endpoint = watcherActive ? 'stop' : 'start';
        try {
            const res = await fetch(`http://localhost:5000/api/watcher/${endpoint}`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                setWatcherActive(!watcherActive);
                showToast(
                    watcherActive 
                        ? 'Monitoramento de pasta desativado.' 
                        : 'Monitoramento contínuo ativado com sucesso!', 
                    watcherActive ? 'warning' : 'success'
                );
            } else {
                showToast(data.error || 'Erro ao alterar estado do Monitor.', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Erro ao conectar com o serviço do Watcher.', 'error');
        }
    };

    const handleRunAgent = () => {
        if (running) return;

        setRunning(true);
        setLogs(['[Nexus] Iniciando canal de stream de eventos...']);
        setActiveTab('run');

        const eventSource = new EventSource('http://localhost:5000/api/run/stream');

        eventSource.addEventListener('log', (event: any) => {
            const message = JSON.parse(event.data);
            setLogs(prev => [...prev, message]);
        });

        eventSource.addEventListener('error', (event: any) => {
            const message = JSON.parse(event.data);
            setLogs(prev => [...prev, `[ERRO] ${message}`]);
        });

        eventSource.addEventListener('end', (event: any) => {
            const data = JSON.parse(event.data);
            setLogs(prev => [...prev, `[Nexus] Processo encerrado. Código de saída: ${data.code}`]);
            setRunning(false);
            eventSource.close();
            fetchLogs(); // Refresh history timeline
            showToast('Processamento em lote concluído!', 'success');
        });

        eventSource.onerror = (err) => {
            console.error('SSE Error:', err);
            setLogs(prev => [...prev, '[Nexus] Conexão com o servidor perdida ou encerrada.']);
            setRunning(false);
            eventSource.close();
        };
    };

    // Drag and Drop File Handlers
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFiles = Array.from(e.dataTransfer.files);
            setFilesToUpload(prev => [...prev, ...droppedFiles]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFiles = Array.from(e.target.files);
            setFilesToUpload(prev => [...prev, ...selectedFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFilesToUpload(prev => prev.filter((_, i) => i !== index));
    };

    const handleUploadFiles = async () => {
        if (filesToUpload.length === 0) return;

        setUploading(true);

        try {
            // Helper function to read file as Base64
            const toBase64 = (file: File): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => {
                        const result = reader.result as string;
                        // Split off the dataURL prefix (e.g. "data:application/pdf;base64,")
                        const base64Data = result.split(',')[1];
                        resolve(base64Data);
                    };
                    reader.onerror = error => reject(error);
                });
            };

            // Read all files to base64
            const base64Files = await Promise.all(
                filesToUpload.map(async file => {
                    const base64 = await toBase64(file);
                    return {
                        name: file.name,
                        base64: base64
                    };
                })
            );

            // POST as JSON
            const res = await fetch('http://localhost:5000/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: base64Files })
            });

            const data = await res.json();
            if (data.success) {
                showToast(`${data.count} arquivo(s) enviados para a pasta de entrada!`, 'success');
                setFilesToUpload([]);
            } else {
                showToast(data.error || 'Falha ao enviar arquivos.', 'error');
            }
        } catch (err: any) {
            console.error(err);
            showToast(`Erro ao realizar upload: ${err.message || err}`, 'error');
        } finally {
            setUploading(false);
        }
    };

    // History filter logic
    const filteredHistory = history.filter(entry => {
        const matchesSearch = entry.arquivo_original_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entry.caminho_destino_relativo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entry.materia_codigo.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (filterConfidence === 'all') return matchesSearch;
        if (filterConfidence === 'high') return matchesSearch && entry.confianca_percentual >= 85;
        if (filterConfidence === 'medium') return matchesSearch && entry.confianca_percentual >= 75 && entry.confianca_percentual < 85;
        if (filterConfidence === 'low') return matchesSearch && entry.confianca_percentual < 75;
        
        return matchesSearch;
    });

    return (
        <div className="min-h-screen bg-[#050511] text-white flex flex-col font-sans p-6 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[130px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px]"></div>
            </div>

            <div className="max-w-7xl mx-auto w-full z-10 space-y-6 flex-1 flex flex-col">
                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-800/80">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={onBack}
                            className="p-2.5 hover:bg-slate-800/50 rounded-xl transition-all text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-500">
                                    Organizador RAG
                                </h1>
                                <span className="bg-purple-500/10 text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-500/20 uppercase tracking-wider">
                                    Agente Ativo
                                </span>
                            </div>
                            <p className="text-slate-400 text-sm mt-0.5">
                                Higienização e classificação inteligente de documentos jurídicos no sistema de arquivos.
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 md:mt-0 flex items-center space-x-3">
                        {/* Watcher Status Widget */}
                        <div className={`flex items-center space-x-3 px-4 py-2.5 rounded-2xl border transition-all ${
                            watcherActive 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
                                : 'bg-slate-900/30 border-slate-800 text-slate-400'
                        }`}>
                            <div className="relative flex h-2 w-2">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                    watcherActive ? 'bg-emerald-400' : 'bg-slate-500'
                                }`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                                    watcherActive ? 'bg-emerald-500' : 'bg-slate-600'
                                }`}></span>
                            </div>
                            <span className="text-xs font-mono uppercase tracking-wider">
                                {watcherActive ? 'Monitoramento Ativado' : 'Monitoramento Parado'}
                            </span>
                            <button
                                onClick={handleToggleWatcher}
                                className={`ml-2 px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                                    watcherActive 
                                        ? 'bg-emerald-500/20 hover:bg-red-500/20 border border-emerald-500/30 hover:border-red-500/30 text-emerald-300 hover:text-red-300' 
                                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-500/10'
                                }`}
                            >
                                {watcherActive ? 'Parar' : 'Ativar'}
                            </button>
                        </div>
                    </div>
                </header>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left Column: Settings and Controls (4 cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        <section className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                            <div className="flex items-center space-x-2 mb-6">
                                <Settings className="text-purple-400 w-5 h-5" />
                                <h2 className="text-lg font-bold">Ajustes do Agente</h2>
                            </div>

                            {loadingSettings ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-500 space-y-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                                    <span className="text-xs font-mono">Carregando configurações...</span>
                                </div>
                            ) : (
                                <form onSubmit={handleSaveSettings} className="space-y-4">
                                    {/* Input Directory */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
                                            <FolderOpen className="w-3.5 h-3.5 text-purple-400" /> Pasta de Entrada
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={inputDir}
                                            onChange={e => setInputDir(e.target.value)}
                                            placeholder="Ex: C:/Users/Docs/entrada"
                                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-colors font-mono"
                                        />
                                    </div>

                                    {/* Output Directory */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
                                            <FolderOpen className="w-3.5 h-3.5 text-purple-400" /> Pasta de Saída (Destino)
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={outputDir}
                                            onChange={e => setOutputDir(e.target.value)}
                                            placeholder="Ex: C:/Users/Docs/resultado"
                                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-colors font-mono"
                                        />
                                    </div>

                                    {/* Gemini API Key */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
                                            <KeyRound className="w-3.5 h-3.5 text-purple-400" /> Gemini API Key
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showKeys ? "text" : "password"}
                                                value={geminiKey}
                                                onChange={e => setGeminiKey(e.target.value)}
                                                placeholder="GEMINI_API_KEY"
                                                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-4 pr-10 py-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-colors font-mono"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowKeys(!showKeys)}
                                                className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300"
                                            >
                                                {showKeys ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Anthropic API Key */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
                                            <KeyRound className="w-3.5 h-3.5 text-purple-400" /> Claude API Key (Opcional)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showKeys ? "text" : "password"}
                                                value={anthropicKey}
                                                onChange={e => setAnthropicKey(e.target.value)}
                                                placeholder="ANTHROPIC_API_KEY (Fallback)"
                                                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-4 pr-10 py-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-colors font-mono"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowKeys(!showKeys)}
                                                className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300"
                                            >
                                                {showKeys ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Dry Run Toggle */}
                                    <div className="pt-2">
                                        <label className="flex items-center space-x-3 cursor-pointer group">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                                dryRun ? 'bg-purple-500 border-purple-500' : 'border-slate-700 bg-transparent group-hover:border-purple-500/50'
                                            }`}>
                                                {dryRun && <Check className="w-3.5 h-3.5 text-black stroke-[3px]" />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={dryRun}
                                                onChange={(e) => setDryRun(e.target.checked)}
                                            />
                                            <span className={`text-xs uppercase tracking-wider font-bold transition-colors ${
                                                dryRun ? 'text-purple-400' : 'text-slate-400'
                                            }`}>
                                                Modo Simulação (Dry Run)
                                            </span>
                                        </label>
                                        <p className="text-[10px] text-slate-500 mt-1 ml-8">
                                            No modo simulação, o agente analisa as peças e diz o destino planejado, mas não altera nenhum arquivo.
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={savingSettings}
                                        className="w-full bg-slate-800 hover:bg-purple-600 hover:text-white border border-slate-750 hover:border-purple-500 text-slate-300 font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-55"
                                    >
                                        {savingSettings ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                                            </>
                                        ) : (
                                            'Salvar Configurações'
                                        )}
                                    </button>
                                </form>
                            )}
                        </section>

                        {/* Drag and Drop Upload Card */}
                        <section className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
                            <div className="flex items-center space-x-2 mb-4">
                                <UploadCloud className="text-purple-400 w-5 h-5" />
                                <h2 className="text-lg font-bold">Enviar Peças Digitais</h2>
                            </div>

                            <div
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] ${
                                    dragActive 
                                        ? 'border-purple-500 bg-purple-500/5' 
                                        : 'border-slate-800 hover:border-purple-500/40 bg-slate-950/20 hover:bg-slate-950/40'
                                }`}
                            >
                                <UploadCloud className={`w-10 h-10 mb-3 transition-colors ${
                                    dragActive ? 'text-purple-400' : 'text-slate-600'
                                }`} />
                                <p className="text-xs font-semibold text-slate-300">
                                    {dragActive ? "Solte seus arquivos aqui..." : "Arraste documentos para organizar"}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-1">
                                    Suporta PDFs, Imagens, DOCX, ZIPs
                                </p>
                                <input
                                    type="file"
                                    multiple
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                            </div>

                            {/* File Queued List */}
                            {filesToUpload.length > 0 && (
                                <div className="mt-4 space-y-3">
                                    <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                        <span>Fila de Envio ({filesToUpload.length})</span>
                                        <button 
                                            onClick={() => setFilesToUpload([])}
                                            className="text-red-500 hover:text-red-400"
                                        >
                                            Limpar Tudo
                                        </button>
                                    </div>
                                    <div className="max-h-[120px] overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                                        {filesToUpload.map((file, i) => (
                                            <div key={i} className="flex items-center justify-between bg-slate-950/40 border border-slate-900 rounded-lg p-2 text-xs">
                                                <div className="flex items-center space-x-2 truncate pr-4">
                                                    <FileText size={14} className="text-purple-400/80 shrink-0" />
                                                    <span className="truncate text-slate-300 font-mono text-[11px]">{file.name}</span>
                                                </div>
                                                <button 
                                                    onClick={() => removeFile(i)}
                                                    className="text-slate-500 hover:text-red-400 p-0.5"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleUploadFiles}
                                        disabled={uploading}
                                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50"
                                    >
                                        {uploading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                                            </>
                                        ) : (
                                            'Salvar na Pasta de Entrada'
                                        )}
                                    </button>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Right Column: Interactive Console and History (8 cols) */}
                    <div className="lg:col-span-8 flex flex-col h-full space-y-6">
                        
                        {/* Tab Switcher */}
                        <div className="flex space-x-2 bg-slate-950/80 p-1.5 border border-slate-800/80 rounded-2xl self-start">
                            <button
                                onClick={() => setActiveTab('run')}
                                className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2 ${
                                    activeTab === 'run'
                                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/10'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <TerminalIcon size={14} />
                                <span>Execução do Agente</span>
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('history');
                                    fetchLogs();
                                }}
                                className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2 ${
                                    activeTab === 'history'
                                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/10'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <History size={14} />
                                <span>Timeline de Organizações</span>
                            </button>
                        </div>

                        {/* Active Panel View */}
                        {activeTab === 'run' ? (
                            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col flex-1 min-h-[500px]">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-2">
                                        <TerminalIcon className="text-purple-400 w-5 h-5" />
                                        <h2 className="text-lg font-bold">Terminal em Tempo Real</h2>
                                    </div>

                                    {/* Action button */}
                                    <button
                                        onClick={handleRunAgent}
                                        disabled={running || loadingSettings}
                                        className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-2 shadow-lg ${
                                            running
                                                ? 'bg-purple-600/30 border border-purple-500/30 text-purple-300 cursor-not-allowed'
                                                : 'bg-purple-600 hover:bg-purple-500 text-white hover:shadow-purple-500/20 active:scale-95'
                                        }`}
                                    >
                                        {running ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Organizando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Play size={14} className="fill-current" />
                                                <span>Iniciar Organização em Lote</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Console Area */}
                                <div className="flex-1 bg-black/80 rounded-2xl p-4 font-mono text-[11px] leading-relaxed border border-slate-800 overflow-y-auto max-h-[480px] min-h-[380px] custom-scrollbar flex flex-col text-slate-300">
                                    {logs.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 font-sans space-y-2 py-16">
                                            <Cpu className="w-12 h-12 text-slate-700 animate-pulse" />
                                            <p className="text-xs">Terminal pronto.</p>
                                            <p className="text-[10px]">Pressione "Iniciar Organização em Lote" para analisar os arquivos atuais.</p>
                                        </div>
                                    ) : (
                                        logs.map((log, i) => {
                                            let isError = log.includes('[ERROR]') || log.includes('Erro') || log.includes('Falha') || log.includes('[ERRO]');
                                            let isWarning = log.includes('Aviso:') || log.includes('[WARNING]');
                                            let isSuccess = log.includes('sucesso') || log.includes('✅') || log.includes('===');
                                            
                                            let textColor = 'text-slate-300';
                                            if (isError) textColor = 'text-red-400 font-bold';
                                            else if (isWarning) textColor = 'text-amber-400';
                                            else if (isSuccess) textColor = 'text-emerald-400';
                                            else if (log.startsWith('[Nexus]')) textColor = 'text-purple-400';

                                            return (
                                                <div key={i} className={`${textColor} border-b border-slate-900/40 pb-1 mb-1 last:border-0 last:mb-0`}>
                                                    {log}
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={terminalEndRef} />
                                </div>
                            </div>
                        ) : (
                            /* Audit Timeline Panel */
                            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col flex-1 min-h-[500px]">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center space-x-2">
                                        <History className="text-purple-400 w-5 h-5" />
                                        <h2 className="text-lg font-bold">Relatório de Organizações (Logs)</h2>
                                    </div>
                                    <button 
                                        onClick={fetchLogs}
                                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold uppercase tracking-wider self-start md:self-auto"
                                    >
                                        Recarregar Logs
                                    </button>
                                </div>

                                {/* Filters Bar */}
                                <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-slate-950/45 p-3 rounded-2xl border border-slate-800">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            placeholder="Buscar por arquivo, matéria..."
                                            className="w-full bg-slate-900/50 border border-slate-850 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-purple-500 transition-colors"
                                        />
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                        <SlidersHorizontal size={14} className="text-slate-500" />
                                        <select
                                            value={filterConfidence}
                                            onChange={e => setFilterConfidence(e.target.value as any)}
                                            className="bg-slate-900/50 border border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500 cursor-pointer"
                                        >
                                            <option value="all">Todas Confianças</option>
                                            <option value="high">Alta (≥ 85%)</option>
                                            <option value="medium">Média (75% - 84%)</option>
                                            <option value="low">Baixa (&lt; 75%)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Timeline Items */}
                                <div className="flex-1 overflow-y-auto max-h-[440px] space-y-3 pr-2 custom-scrollbar">
                                    {filteredHistory.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-slate-600 font-sans space-y-2">
                                            <AlertCircle className="w-10 h-10 text-slate-700" />
                                            <p className="text-xs">Nenhum log encontrado.</p>
                                            <p className="text-[10px]">Altere as buscas ou rode o organizador para registrar classificações.</p>
                                        </div>
                                    ) : (
                                        filteredHistory.map((item, index) => {
                                            const confidence = item.confianca_percentual;
                                            
                                            // Badge color
                                            let badgeBg = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                                            if (confidence < 75) {
                                                badgeBg = 'bg-red-500/10 border-red-500/20 text-red-400';
                                            } else if (confidence < 85) {
                                                badgeBg = 'bg-amber-500/10 border-amber-500/20 text-amber-450';
                                            }

                                            const isExpanded = expandedLogIndex === index;

                                            return (
                                                <div 
                                                    key={index} 
                                                    className="bg-slate-950/30 border border-slate-850 hover:border-slate-800 rounded-2xl p-4 transition-all duration-300 relative group"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="space-y-1 truncate">
                                                            <div className="flex items-center space-x-2 truncate">
                                                                <FileCheck size={16} className="text-purple-400 shrink-0" />
                                                                <span className="font-semibold text-slate-200 text-xs truncate max-w-sm" title={item.arquivo_original_nome}>
                                                                    {item.arquivo_original_nome}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 font-mono">
                                                                ➔ Destino: <span className="text-slate-400">{item.caminho_destino_relativo}</span>
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center space-x-2 shrink-0">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeBg}`}>
                                                                Confiança: {confidence}%
                                                            </span>
                                                            {item.dry_run && (
                                                                <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                                    Simulação
                                                                </span>
                                                            )}
                                                            <button
                                                                onClick={() => setExpandedLogIndex(isExpanded ? null : index)}
                                                                className="text-slate-500 hover:text-slate-300 text-xs px-2 py-1 bg-slate-900 border border-slate-850 rounded-lg"
                                                            >
                                                                {isExpanded ? 'Esconder' : 'Detalhes'}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Expanded detail content */}
                                                    {isExpanded && (
                                                        <div className="mt-4 pt-4 border-t border-slate-850 text-[11px] text-slate-300 space-y-3 animate-fade-in">
                                                            <div>
                                                                <span className="text-slate-500 font-bold block mb-1">JUSTIFICATIVA SEMÂNTICA DA IA</span>
                                                                <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-900 leading-relaxed font-light font-sans text-slate-300">
                                                                    {item.justificativa_semantica}
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4 text-[10px] font-mono">
                                                                <div>
                                                                    <span className="text-slate-500 block">MATÉRIA RECONHECIDA</span>
                                                                    <span className="text-purple-400 font-bold">{item.materia_codigo || 'NÃO CONFIGURADA'}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-slate-500 block">DATA DO PROCESSO</span>
                                                                    <span className="text-slate-400">
                                                                        {new Date(item.timestamp).toLocaleString('pt-BR')}
                                                                    </span>
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <span className="text-slate-500 block">CAMINHO FÍSICO FINAL</span>
                                                                    <span className="text-slate-400 truncate block" title={item.caminho_destino_absoluto}>
                                                                        {item.caminho_destino_absoluto}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Credits */}
                <footer className="pt-8 text-center text-slate-700 text-xs tracking-widest uppercase">
                    &copy; 2026 Nexus RAG Agent System
                </footer>
            </div>
        </div>
    );
}
