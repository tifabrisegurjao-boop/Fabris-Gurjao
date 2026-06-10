
import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Search, Trash2, FileText, Loader2, AlertTriangle, ChevronLeft, ChevronRight, Edit2, X } from 'lucide-react';
import { searchContracts, deleteContract, updateContract, getTotalContracts, Contract, LAWYERS, PAGE_SIZE } from '../lib/logic';
import { createLegalFolders } from '../lib/folderUtils';
import { useToast } from './Toast';
import { FolderPlus } from 'lucide-react';

// ─── Debounce Hook ───────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

// ─── Confirm Modal ───────────────────────────────────────────────────────────────
function ConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Confirmar Exclusão</h3>
                </div>
                <p className="text-slate-400 text-sm mb-6">
                    Tem certeza que deseja excluir este contrato? <br />
                    <span className="text-red-400 font-medium">Esta ação é irreversível.</span>
                </p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white transition-colors text-sm font-bold">
                        Excluir
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Edit Modal ──────────────────────────────────────────────────────────────────
function EditModal({ contract, onSave, onCancel }: { contract: Contract; onSave: (data: Partial<Contract>) => void; onCancel: () => void }) {
    const [clientCode, setClientCode] = useState(contract.clientCode || contract.fullCode.split('-')[0]);
    const [year, setYear] = useState(contract.year || contract.fullCode.split('-')[1].split('.')[0]);
    const [contractNumber, setContractNumber] = useState(contract.contractNumber || contract.fullCode.split('.')[1]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const fullCode = `${clientCode}-${year}.${contractNumber}`;
        onSave({ clientCode, year, contractNumber, fullCode });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Editar Números</h3>
                    <button onClick={onCancel} className="text-slate-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Cód. Cliente</label>
                            <input
                                type="text"
                                value={clientCode}
                                onChange={(e) => setClientCode(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Ano</label>
                            <input
                                type="text"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Nº Contrato</label>
                            <input
                                type="text"
                                value={contractNumber}
                                onChange={(e) => setContractNumber(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 mt-4">
                        <p className="text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-1">Visualização do Código</p>
                        <p className="text-xl font-mono font-bold text-white tracking-wider">
                            {clientCode}-{year}.{contractNumber}
                        </p>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium">
                            Cancelar
                        </button>
                        <button type="submit" className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors text-sm font-bold">
                            Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────────
interface ContractListProps {
    onBack: () => void;
}

export default function ContractList({ onBack }: ContractListProps) {
    const { showToast } = useToast();
    const [query, setQuery] = useState('');
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [editTarget, setEditTarget] = useState<Contract | null>(null);

    // Pagination state
    const [cursorStack, setCursorStack] = useState<any[]>([]); // stack of page cursors
    const [currentCursor, setCurrentCursor] = useState<any | null>(null);
    const [lastDocOfPage, setLastDocOfPage] = useState<any | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [totalCount, setTotalCount] = useState<number | null>(null);

    const debouncedQuery = useDebounce(query, 500);
    const isSearching = debouncedQuery.trim().length > 0;
    const currentPage = cursorStack.length + 1;

    const fetchPage = useCallback(async (term: string, cursor: any | null) => {
        setLoading(true);
        const page = await searchContracts(term, cursor);
        setContracts(page.contracts);
        setLastDocOfPage(page.lastDoc);
        setHasMore(page.hasMore);
        setLoading(false);
    }, []);

    // Initial load & search/page changes
    useEffect(() => {
        // Reset pagination on new search
        setCursorStack([]);
        setCurrentCursor(null);
        fetchPage(debouncedQuery, null);
    }, [debouncedQuery, fetchPage]);

    // Load total count once
    useEffect(() => {
        getTotalContracts().then(setTotalCount);
    }, []);

    const goNextPage = () => {
        if (!hasMore || !lastDocOfPage) return;
        setCursorStack(prev => [...prev, currentCursor]);
        setCurrentCursor(lastDocOfPage);
        fetchPage('', lastDocOfPage);
    };

    const goPrevPage = () => {
        if (cursorStack.length === 0) return;
        const newStack = [...cursorStack];
        const prevCursor = newStack.pop() ?? null;
        setCursorStack(newStack);
        setCurrentCursor(prevCursor);
        fetchPage('', prevCursor);
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;
        try {
            await deleteContract(deleteTargetId);
            setContracts(prev => prev.filter(c => c.id !== deleteTargetId));
            setTotalCount(prev => (prev !== null ? prev - 1 : null));
            showToast('Contrato excluído com sucesso.', 'success');
        } catch (e) {
            showToast('Erro ao excluir contrato.', 'error');
            console.error(e);
        } finally {
            setDeleteTargetId(null);
        }
    };

    const handleUpdate = async (data: Partial<Contract>) => {
        if (!editTarget) return;
        try {
            await updateContract(editTarget.id, data);
            setContracts(prev => prev.map(c => c.id === editTarget.id ? { ...c, ...data } : c));
            showToast('Contrato atualizado com sucesso.', 'success');
        } catch (e) {
            showToast('Erro ao atualizar contrato.', 'error');
            console.error(e);
        } finally {
            setEditTarget(null);
        }
    };

    const getLawyerName = (id: string) => {
        const lawyer = LAWYERS.find(l => l.id === id);
        return lawyer ? lawyer.name : 'Desconhecido';
    };

    const handleGenerateFolders = async (contract: Contract) => {
        try {
            const lawyer = LAWYERS.find(l => l.id === contract.lawyerId);
            const responsibleName = lawyer ? lawyer.name : 'ADVOGADO';
            
            // Extract IDs from fullCode if they are missing in the document (for legacy records)
            // fullCode format: clientCode-year.contractNumber
            const clientCode = contract.clientCode || contract.fullCode.split('-')[0];
            const contractNumber = contract.contractNumber || contract.fullCode.split('.')[1];
            const caseSequence = contract.caseSequence || 1; // Fallback to 1 if not saved

            const result = await createLegalFolders(
                contract.clientName,
                clientCode,
                caseSequence,
                contract.matter || 'GERAL',
                responsibleName,
                contractNumber
            );
            
            if (result.success) {
                showToast('Pastas criadas com sucesso!', 'success');
            }
        } catch (err: any) {
            console.error(err);
            showToast(`Erro ao criar pastas: ${err.message}`, 'error');
        }
    };

    return (
        <>
            {deleteTargetId && (
                <ConfirmModal
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTargetId(null)}
                />
            )}

            {editTarget && (
                <EditModal
                    contract={editTarget}
                    onSave={handleUpdate}
                    onCancel={() => setEditTarget(null)}
                />
            )}

            <div className="min-h-screen bg-[#0f172a] text-white p-4 md:p-8 flex flex-col items-center relative overflow-hidden font-sans">
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    <div className="absolute top-[-10%] right-[30%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]"></div>
                </div>

                <div className="z-10 w-full max-w-5xl">
                    <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                        <div className="flex items-center gap-4">
                            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <ArrowLeft className="w-6 h-6 text-slate-300" />
                            </button>
                            <div>
                                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-indigo-100">
                                    Histórico de Contratos
                                </h1>
                                <p className="text-slate-500 text-xs tracking-widest uppercase mt-1">
                                    {totalCount !== null
                                        ? `${totalCount} registro${totalCount !== 1 ? 's' : ''} no banco de dados`
                                        : 'Base de Dados Nexus'}
                                </p>
                            </div>
                        </div>
                    </header>

                    {/* Search */}
                    <div className="mb-8 relative group max-w-2xl mx-auto md:mx-0">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                        </div>
                        <input
                            type="text"
                            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono shadow-xl backdrop-blur-md"
                            placeholder="Pesquisar por cliente, código ou advogado..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-950/50 text-slate-400 uppercase text-xs tracking-wider">
                                        <th className="p-5 font-bold">Data</th>
                                        <th className="p-5 font-bold">Cliente</th>
                                        <th className="p-5 font-bold">Matéria</th>
                                        <th className="p-5 font-bold">Código Completo</th>
                                        <th className="p-5 font-bold text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 text-sm">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-slate-500">
                                                <div className="flex justify-center items-center gap-2">
                                                    <Loader2 className="animate-spin w-5 h-5" /> Carregando registros...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : contracts.length > 0 ? (
                                        contracts.map((contract) => (
                                            <tr key={contract.id} className="hover:bg-blue-500/5 transition-colors group">
                                                <td className="p-5 text-slate-400 whitespace-nowrap font-mono text-xs">
                                                    {new Date(contract.createdAt).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="p-5 font-medium text-white max-w-[200px] sm:max-w-xs md:max-w-sm">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 shrink-0">
                                                            <FileText className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="truncate" title={contract.clientName}>
                                                                {contract.clientName}
                                                            </span>
                                                            <span className="text-[10px] text-slate-500 font-medium">
                                                                {getLawyerName(contract.lawyerId)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-slate-400 font-medium italic">
                                                    {contract.matter || 'GERAL'}
                                                </td>
                                                <td className="p-5 font-mono text-blue-300 font-bold tracking-wide">
                                                    {contract.fullCode}
                                                </td>
                                                <td className="p-5 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            onClick={() => handleGenerateFolders(contract)}
                                                            title="Gerar Estrutura de Pastas"
                                                        >
                                                            <FolderPlus className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            onClick={() => setEditTarget(contract)}
                                                            title="Editar Números"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            onClick={() => setDeleteTargetId(contract.id)}
                                                            title="Excluir Registro"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-slate-500 italic">
                                                {debouncedQuery ? 'Nenhum contrato encontrado.' : 'Nenhum registro no banco de dados.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        {!isSearching && (hasMore || currentPage > 1) && (
                            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800 bg-slate-950/30">
                                <span className="text-slate-500 text-xs font-mono">
                                    Página {currentPage} · {PAGE_SIZE} por página
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={goPrevPage}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-slate-300 text-sm font-bold px-2">{currentPage}</span>
                                    <button
                                        onClick={goNextPage}
                                        disabled={!hasMore}
                                        className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
