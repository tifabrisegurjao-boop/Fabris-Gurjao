import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, FolderPlus } from 'lucide-react';
import { generateContractCode, LAWYERS, getClients, Client } from '../lib/logic';
import { createLegalFolders } from '../lib/folderUtils';
import { useToast } from './Toast';

interface FolderGeneratorProps {
    onBack: () => void;
}

export default function FolderGenerator({ onBack }: FolderGeneratorProps) {
    const { showToast } = useToast();
    const [clients, setClients] = useState<Client[]>([]);
    const [clientName, setClientName] = useState('');
    const [matter, setMatter] = useState('');
    const [lawyerId, setLawyerId] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getClients().then(setClients);
    }, []);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const nameTrimmed = clientName.trim();
        const matchedClient = clients.find(c => c.name.trim().toLowerCase() === nameTrimmed.toLowerCase());
        const finalClientName = matchedClient ? matchedClient.name : nameTrimmed;

        try {
            // 1. Obter o diretório primeiro para garantir que o usuário não cancelará depois do salvamento no Firestore
            let baseDirHandle = null;
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

            // 2. Gerar o código no Firestore
            const { clientCode, contractNumber, caseSequence } = await generateContractCode(finalClientName, lawyerId, matter);

            const selectedLawyer = LAWYERS.find(l => l.id === lawyerId);
            const responsibleName = selectedLawyer ? selectedLawyer.name : 'ADVOGADO';

            // 3. Criar as pastas utilizando o handle pré-obtido
            const result = await createLegalFolders(
                finalClientName,
                clientCode,
                caseSequence,
                matter,
                responsibleName,
                contractNumber,
                baseDirHandle
            );

            showToast(result.message, 'success');
            
            // Recarregar lista de clientes para incluir novos cadastros
            getClients().then(setClients);
        } catch (err: any) {
            console.error(err);
            showToast(`Erro: ${err.message || 'Falha desconhecida. Verifique a conexão.'}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-4 relative font-sans">
            {/* Background */}
            <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                <button onClick={onBack} className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Início
                </button>

                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 p-8 rounded-2xl shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="inline-flex p-3 bg-blue-500/10 rounded-xl mb-4 text-blue-400">
                            <FolderPlus className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold">GERADOR</h2>
                        <p className="text-xs text-slate-500 mt-2">Inteligência Nexus</p>
                    </div>

                    <form onSubmit={handleGenerate} className="space-y-5">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Cliente</label>
                            <input
                                type="text"
                                required
                                value={clientName}
                                onChange={e => setClientName(e.target.value)}
                                list="clients-list"
                                className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="Digite ou selecione o cliente..."
                                autoComplete="off"
                            />
                            <datalist id="clients-list">
                                {clients.map(c => (
                                    <option key={c.id} value={c.name} />
                                ))}
                            </datalist>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Matéria</label>
                            <input
                                type="text"
                                required
                                list="matters"
                                value={matter}
                                onChange={e => setMatter(e.target.value)}
                                className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="Ex: CIVIL"
                            />
                            <datalist id="matters">
                                <option value="CIVIL" />
                                <option value="TRABALHISTA" />
                                <option value="CRIMINAL" />
                            </datalist>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Advogado Responsável</label>
                            <select
                                required
                                value={lawyerId}
                                onChange={e => setLawyerId(e.target.value)}
                                className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                            >
                                <option value="" disabled>Selecione...</option>
                                {LAWYERS.map(lawyer => (
                                    <option key={lawyer.id} value={lawyer.id}>{lawyer.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="py-2">
                            <div className="bg-slate-900/50 border border-dashed border-slate-700 rounded-lg p-4 text-center">
                                <span className="text-xs text-slate-500 block mb-2">Estrutura Automática</span>
                                <div className="text-sm font-mono text-slate-300">
                                    📁 <span className="text-blue-400">CLIENTE_[Cod]</span>
                                    <br />
                                    &nbsp;&nbsp;└── 📁 <span className="text-pink-400 text-xs">[AutoNº]_MATERIA_ADV_[NEXUS]</span>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" /> Gerando &amp; Salvando...
                                </>
                            ) : (
                                'Registrar e Criar Pastas'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
