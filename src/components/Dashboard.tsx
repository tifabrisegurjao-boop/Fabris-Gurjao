

import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogOut, FolderOpen, FileCode2, Scale, Zap, Clock, Upload, FolderSync, ArrowLeft } from 'lucide-react';

interface DashboardProps {
    onNavigate: (page: 'folder' | 'code' | 'history' | 'import' | 'organizer') => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Erro ao sair:', error);
        }
    };

    return (
        <div className="min-h-screen bg-[#050511] text-white flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans">

            {/* Botão Voltar ao Portal */}
            <a
                href="../"
                className="absolute top-6 right-32 z-20 flex items-center gap-2 px-4 py-2 bg-slate-900/60 hover:bg-blue-500/20 border border-slate-800 hover:border-blue-500/30 rounded-xl text-slate-400 hover:text-blue-400 text-xs font-bold uppercase tracking-wider transition-all duration-300 backdrop-blur-md no-underline"
            >
                <ArrowLeft className="w-4 h-4" />
                <span>Portal</span>
            </a>

            {/* Botão Sair */}
            <button
                onClick={handleLogout}
                className="absolute top-6 right-6 z-20 flex items-center gap-2 px-4 py-2 bg-slate-900/60 hover:bg-red-500/20 border border-slate-800 hover:border-red-500/30 rounded-xl text-slate-400 hover:text-red-400 text-xs font-bold uppercase tracking-wider transition-all duration-300 backdrop-blur-md"
            >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
            </button>

            {/* Dynamic Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]"></div>
            </div>

            <div className="z-10 w-full max-w-5xl">
                <header className="flex flex-col items-center mb-16">
                    <div className="mb-6 relative">
                        <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full"></div>
                        <Scale className="w-20 h-20 text-white relative z-10 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                    </div>
                    <h1 className="text-6xl font-extrabold tracking-tight mb-4 bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">
                        LEGAL SUITE <span className="text-xl text-blue-500">v2.0</span>
                    </h1>
                    <div className="h-1 w-24 bg-gradient-to-r from-transparent via-blue-500 to-transparent mb-6"></div>
                    <p className="text-slate-400 text-sm font-light tracking-wide uppercase">
                        Sistema de Gestão Jurídica Inteligente
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Folder Generator Card */}
                    <button
                        onClick={() => onNavigate('folder')}
                        className="group relative h-[300px] bg-slate-900/40 border border-slate-800 hover:border-blue-500/50 rounded-3xl p-8 transition-all duration-500 hover:transform hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.2)] flex flex-col items-start justify-end overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="mb-auto p-4 bg-blue-500/10 rounded-2xl group-hover:bg-blue-500/20 transition-colors">
                            <FolderOpen className="w-10 h-10 text-blue-400 group-hover:text-blue-300 transition-colors" />
                        </div>

                        <div className="relative z-10">
                            <h2 className="text-3xl font-bold text-white mb-2 group-hover:text-blue-200 transition-colors">Gerador de Estrutura</h2>
                            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-4">
                                Crie árvores de pastas jurídicas complexas automaticamente usando IA e Banco de Dados.
                            </p>
                            <span className="inline-flex items-center text-xs font-bold text-blue-500 uppercase tracking-widest group-hover:text-blue-400">
                                Acessar Ferramenta <Zap className="w-3 h-3 ml-2" />
                            </span>
                        </div>
                    </button>

                    {/* RAG File Organizer Card */}
                    <button
                        onClick={() => onNavigate('organizer')}
                        className="group relative h-[300px] bg-slate-900/40 border border-slate-800 hover:border-purple-500/50 rounded-3xl p-8 transition-all duration-500 hover:transform hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(147,51,234,0.2)] flex flex-col items-start justify-end overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="mb-auto p-4 bg-purple-500/10 rounded-2xl group-hover:bg-purple-500/20 transition-colors">
                            <FolderSync className="w-10 h-10 text-purple-400 group-hover:text-purple-300 transition-colors" />
                        </div>

                        <div className="relative z-10">
                            <h2 className="text-3xl font-bold text-white mb-2 group-hover:text-purple-200 transition-colors">Organizador RAG</h2>
                            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-4">
                                Classifique e organize seus arquivos e documentos jurídicos na estrutura correta com IA.
                            </p>
                            <span className="inline-flex items-center text-xs font-bold text-purple-500 uppercase tracking-widest group-hover:text-purple-400">
                                Acessar Agente <Zap className="w-3 h-3 ml-2" />
                            </span>
                        </div>
                    </button>

                    {/* Code Generator Card */}
                    <button
                        onClick={() => onNavigate('code')}
                        className="group relative h-[300px] bg-slate-900/40 border border-slate-800 hover:border-green-500/50 rounded-3xl p-8 transition-all duration-500 hover:transform hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(34,197,94,0.2)] flex flex-col items-start justify-end overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-green-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="mb-auto p-4 bg-green-500/10 rounded-2xl group-hover:bg-green-500/20 transition-colors">
                            <FileCode2 className="w-10 h-10 text-green-400 group-hover:text-green-300 transition-colors" />
                        </div>

                        <div className="relative z-10">
                            <h2 className="text-3xl font-bold text-white mb-2 group-hover:text-green-200 transition-colors">SISTEMA NEXUS</h2>
                            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-4">
                                Geração de códigos de contrato únicos com validação em tempo real e interface Matrix.
                            </p>
                            <span className="inline-flex items-center text-xs font-bold text-green-500 uppercase tracking-widest group-hover:text-green-400">
                                Acessar Ferramenta <Zap className="w-3 h-3 ml-2" />
                            </span>
                        </div>
                    </button>
                </div>

                <div className="mt-12 flex justify-center space-x-4">
                    <button
                        onClick={() => onNavigate('history')}
                        className="px-6 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800 transition-all flex items-center gap-2 text-sm uppercase tracking-widest"
                    >
                        <Clock className="w-4 h-4" />
                        Histórico
                    </button>

                    <button
                        onClick={() => onNavigate('import')}
                        className="px-6 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-white hover:border-indigo-500 hover:bg-slate-800 transition-all flex items-center gap-2 text-sm uppercase tracking-widest"
                    >
                        <Upload className="w-4 h-4" />
                        Importar Dados
                    </button>
                </div>

                <footer className="mt-20 text-center text-slate-700 text-xs tracking-widest uppercase">
                    &copy; 2026 Legal Suite Enterprise
                </footer>
            </div>
        </div>
    );
}