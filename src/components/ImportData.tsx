
import React, { useState } from 'react';
import { ArrowLeft, Upload, CheckCircle, AlertCircle, FileJson } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { useToast } from './Toast';

interface ImportPageProps {
    onBack: () => void;
}

export default function ImportData({ onBack }: ImportPageProps) {
    const { showToast } = useToast();
    const [jsonFile, setJsonFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [log, setLog] = useState<string[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setJsonFile(e.target.files[0]);
            setStatus('idle');
            setLog([]);
        }
    };

    const addLog = (msg: string) => {
        setLog(prev => [...prev, `[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`]);
    };

    const processImport = async () => {
        if (!jsonFile) return;

        setStatus('processing');
        addLog('Iniciando importação...');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                let itemsToImport: any[] = [];

                try {
                    itemsToImport = JSON.parse(content);
                } catch {
                    addLog('Erro ao parsear JSON. Verifique o formato do arquivo.');
                    setStatus('error');
                    return;
                }

                if (!Array.isArray(itemsToImport)) {
                    itemsToImport = Object.values(itemsToImport);
                }

                addLog(`${itemsToImport.length} itens encontrados no arquivo.`);

                let operationCount = 0;
                let clientsCount = 0;
                let contractsCount = 0;
                let batch = writeBatch(db);

                for (const item of itemsToImport) {
                    const collectionName = item._collection || 'cases';

                    if (collectionName === 'clients') {
                        const finalName = (item.name || item.nome || '').trim();
                        if (!finalName) continue;

                        const clientData: any = {
                            name: finalName,
                            nameLower: finalName.toLowerCase(),
                            code: item.code || '',
                            email: item.email || '',
                            phone: item.phone || item.telefone || '',
                            importedAt: new Date().toISOString(),
                        };

                        if (item.createdAt) {
                            clientData.createdAt = item.createdAt;
                        }

                        const docRef = item.id
                            ? doc(db, 'clients', item.id)
                            : doc(collection(db, 'clients'));
                        batch.set(docRef, clientData, { merge: true });
                        clientsCount++;

                    } else if (collectionName === 'contracts' || collectionName === 'cases') {
                        const caseData = {
                            ...item,
                            importedAt: new Date().toISOString(),
                            clientName: item.clientName || item.client || 'Desconhecido',
                            caseTitle: item.caseTitle || item.title || 'Caso Migrado',
                            status: item.status || 'Ativo',
                        };
                        delete caseData._collection;

                        const docRef = item.id
                            ? doc(db, 'cases', item.id)
                            : doc(collection(db, 'cases'));
                        batch.set(docRef, caseData, { merge: true });
                        contractsCount++;
                    }

                    operationCount++;

                    // Commit e reinicia batch a cada 450 ops (limite Firestore é 500)
                    if (operationCount % 450 === 0) {
                        await batch.commit();
                        addLog(`Lote de ${operationCount} registros confirmado...`);
                        batch = writeBatch(db);
                    }
                }

                // Commit do lote final
                await batch.commit();
                addLog(`✅ IMPORTAÇÃO CONCLUÍDA!`);
                addLog(`Resumo: ${clientsCount} Clientes, ${contractsCount} Contratos.`);
                setStatus('success');
                showToast(`Importação concluída! ${clientsCount} clientes e ${contractsCount} contratos.`, 'success');

            } catch (err: any) {
                console.error(err);
                addLog(`Erro: ${err.message}`);
                setStatus('error');
                showToast('Falha na importação. Veja o log para detalhes.', 'error');
            }
        };

        reader.readAsText(jsonFile);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in-up">
            <div className="flex items-center space-x-4 mb-8">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        Importar Dados
                    </h1>
                    <p className="text-slate-400">Migrar dados de JSON antigo para o novo sistema</p>
                </div>
            </div>

            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 space-y-6">

                <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors hover:border-indigo-500 hover:bg-slate-800/80">
                    <FileJson size={48} className="text-indigo-400 mb-4" />
                    <p className="text-lg text-slate-200 mb-2">Arraste seu JSON aqui ou clique para selecionar</p>
                    <p className="text-sm text-slate-500 mb-4">Exportado do Firebase Console</p>
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-indigo-600 file:text-white
                        file:cursor-pointer hover:file:bg-indigo-700"
                    />
                </div>

                {jsonFile && (
                    <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-lg">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                                JS
                            </div>
                            <div>
                                <p className="font-medium text-slate-200">{jsonFile.name}</p>
                                <p className="text-xs text-slate-500">{(jsonFile.size / 1024).toFixed(2)} KB</p>
                            </div>
                        </div>
                        {status === 'idle' && (
                            <button
                                onClick={processImport}
                                className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-lg shadow-green-900/20 flex items-center space-x-2"
                            >
                                <Upload size={18} />
                                <span>Iniciar Importação</span>
                            </button>
                        )}
                    </div>
                )}

                {/* Status Log */}
                {status !== 'idle' && (
                    <div className="bg-black/40 rounded-lg p-4 font-mono text-sm max-h-60 overflow-y-auto border border-slate-700">
                        {log.map((entry, i) => (
                            <div key={i} className="text-slate-300 mb-1 border-b border-slate-800/50 pb-1 last:border-0">
                                {entry}
                            </div>
                        ))}
                        {status === 'processing' && (
                            <div className="text-indigo-400 animate-pulse mt-2">Processando dados...</div>
                        )}
                        {status === 'success' && (
                            <div className="text-green-400 mt-2 font-bold flex items-center">
                                <CheckCircle size={16} className="mr-2" /> Importação Concluída com Sucesso!
                            </div>
                        )}
                        {status === 'error' && (
                            <div className="text-red-400 mt-2 font-bold flex items-center">
                                <AlertCircle size={16} className="mr-2" /> Falha na Importação.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
