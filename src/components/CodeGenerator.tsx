import React, { useState, useEffect } from 'react';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import MatrixRain from './MatrixRain';
import { searchClients, generateContractCode, LAWYERS, Client } from '../lib/logic';
import { createLegalFolders } from '../lib/folderUtils';
import { useToast } from './Toast';

interface CodeGeneratorProps {
    onBack: () => void;
}

export default function CodeGenerator({ onBack }: CodeGeneratorProps) {
    const { showToast } = useToast();
    const [clients, setClients] = useState<Client[]>([]);
    const [clientName, setClientName] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [createFolder, setCreateFolder] = useState(false);
    const [matter, setMatter] = useState('');

    useEffect(() => {
        const trimmed = clientName.trim();
        if (trimmed.length < 2) {
            setClients([]);
            return;
        }
        const delayDebounce = setTimeout(() => {
            searchClients(trimmed).then(setClients);
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [clientName]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);

        const formData = new FormData(e.currentTarget);
        const nameTrimmed = clientName.trim();
        const lawyerId = formData.get('lawyerId') as string;

        const matchedClient = clients.find(c => c.name.trim().toLowerCase() === nameTrimmed.toLowerCase());
        const finalClientName = matchedClient ? matchedClient.name : nameTrimmed;

        try {
            let baseDirHandle = null;

            // 1. Validar e obter o diretório primeiro se "Criar pastas" estiver ativo
            if (createFolder) {
                if (!matter.trim()) {
                    showToast('Por favor, informe a Matéria para criar a pasta.', 'warning');
                    setLoading(false);
                    return;
                }

                if ('showDirectoryPicker' in window) {
                    try {
                        // @ts-ignore
                        baseDirHandle = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'desktop' });
                    } catch (pickerErr: any) {
                        if (pickerErr.name === 'AbortError') {
                            showToast('Operação cancelada pelo usuário. O contrato não foi gerado.', 'warning');
                            setLoading(false);
                            return;
                        }
                        throw pickerErr;
                    }
                }
            }

            // 2. Gerar o código no Firestore
            const res = await generateContractCode(finalClientName, lawyerId, matter);
            if (res && res.fullCode) {
                setResult(res.fullCode);

                // 3. Criar as pastas
                if (createFolder) {
                    const selectedLawyer = LAWYERS.find(l => l.id === lawyerId);
                    const responsibleName = selectedLawyer ? selectedLawyer.name : 'ADVOGADO';

                    const folderRes = await createLegalFolders(
                        finalClientName,
                        res.clientCode,
                        res.caseSequence,
                        matter,
                        responsibleName,
                        res.contractNumber,
                        baseDirHandle
                    );

                    if (folderRes.success) {
                        showToast('Pastas criadas com sucesso!', 'success');
                    }
                }
            }
        } catch (error) {
            showToast('Erro ao gerar código. Verifique a conexão.', 'error');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (result) {
            navigator.clipboard.writeText(result);
            setCopied(true);
            showToast('Código copiado!', 'success');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4 bg-black overflow-hidden font-mono">
            <MatrixRain />

            <div className="z-10 w-full max-w-lg">
                <button
                    onClick={onBack}
                    className="flex items-center text-cyan-500/60 hover:text-cyan-400 mb-6 transition-colors text-sm uppercase tracking-widest"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                </button>

                <div className="bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)]">
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-center tracking-tighter text-white mb-2 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                            SISTEMA NEXUS
                        </h1>
                        <p className="text-cyan-500/60 text-xs tracking-[0.3em] uppercase">Gerador de Contratos</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold ml-1">Cliente</label>
                            <input
                                name="clientName"
                                value={clientName}
                                onChange={e => setClientName(e.target.value)}
                                list="clients-list"
                                className="w-full bg-slate-950/50 border border-cyan-500/30 rounded-lg p-3 text-cyan-100 placeholder:text-cyan-500/20 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                                placeholder="Digite o nome do cliente..."
                                required
                                autoComplete="off"
                            />
                            <datalist id="clients-list">
                                {clients.map(c => (
                                    <option key={c.id} value={c.name} />
                                ))}
                            </datalist>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold ml-1">Advogado</label>
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {LAWYERS.map(lawyer => (
                                    <label key={lawyer.id} className={`cursor-pointer group ${lawyer.name === 'Externo' ? 'col-span-2' : ''}`}>
                                        <input type="radio" name="lawyerId" value={lawyer.id} className="peer sr-only" required />
                                        <div className="p-3 rounded border border-cyan-500/20 bg-slate-950/30 hover:bg-cyan-500/10 peer-checked:bg-cyan-500 peer-checked:text-black transition-all text-center flex items-center justify-center h-full">
                                            <div className="text-xs font-bold">{lawyer.name}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Optional Folder Creation Section */}
                        <div className="pt-4 border-t border-cyan-500/20">
                            <label className="flex items-center space-x-3 cursor-pointer group mb-4">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${createFolder ? 'bg-cyan-500 border-cyan-500' : 'border-cyan-500/50 bg-transparent'}`}>
                                    {createFolder && <Check className="w-3 h-3 text-black" />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={createFolder}
                                    onChange={(e) => setCreateFolder(e.target.checked)}
                                />
                                <span className={`text-xs uppercase tracking-widest font-bold transition-colors ${createFolder ? 'text-cyan-400' : 'text-slate-500'}`}>
                                    Criar pastas automaticamente
                                </span>
                            </label>

                            {createFolder && (
                                <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                                    <label className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold ml-1 mb-2 block">Matéria</label>
                                    <input
                                        type="text"
                                        value={matter}
                                        onChange={(e) => setMatter(e.target.value)}
                                        list="matters"
                                        className="w-full bg-slate-950/50 border border-cyan-500/30 rounded-lg p-3 text-cyan-100 placeholder:text-cyan-500/20 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                                        placeholder="Ex: CIVIL"
                                        required={createFolder}
                                    />
                                    <datalist id="matters">
                                        <option value="CIVIL" />
                                        <option value="TRABALHISTA" />
                                        <option value="CRIMINAL" />
                                    </datalist>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full relative overflow-hidden px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-900 to-blue-900 border border-cyan-500/30 text-cyan-100 font-bold tracking-wider transition-all duration-300 hover:from-cyan-800 hover:to-blue-800 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50 mt-4"
                        >
                            {loading ? 'PROCESSANDO...' : (createFolder ? 'GERAR CÓDIGO E PASTAS' : 'GERAR CÓDIGO')}
                        </button>
                    </form>

                    {result && (
                        <div className="mt-8 p-6 rounded-lg border border-cyan-400/50 bg-cyan-900/10 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 group cursor-pointer" onClick={copyToClipboard}>
                            <div className={`absolute top-2 right-2 transition-all ${copied ? 'opacity-100' : 'opacity-0'}`}>
                                <Check className="w-4 h-4 text-cyan-400" />
                            </div>
                            <div className={`absolute top-2 right-2 transition-all ${!copied ? 'opacity-100' : 'opacity-0'}`}>
                                <Copy className="w-4 h-4 text-cyan-500/40" />
                            </div>

                            <p className="text-center text-cyan-400 text-[10px] uppercase tracking-widest mb-2">Código Gerado</p>
                            <div className="text-2xl font-mono font-bold text-center text-white tracking-wider select-all">
                                {result}
                            </div>
                            {createFolder && (
                                <p className="text-center text-cyan-500/50 text-[10px] mt-2">
                                    Solicitação de pastas enviada ao sistema.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
