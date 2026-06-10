
import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, orderBy, limit, startAfter, deleteDoc, doc, updateDoc, getCountFromServer } from 'firebase/firestore';

// ─── Types ───────────────────────────────────────────────────────────────────────
export type Client = {
    id: string;
    name: string;
    code: string;
};

export type Contract = {
    id: string;
    fullCode: string;
    clientName: string;
    clientCode: string;
    contractNumber: string;
    caseSequence: number;
    year: string;
    lawyerId: string;
    matter: string;
    createdAt: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────────
export const LAWYERS = [
    { id: '01', name: 'Renata' },
    { id: '02', name: 'Felipe' },
    { id: '03', name: 'Gleison' },
    { id: '04', name: 'Océlio' },
    { id: '05', name: 'Hermes' },
    { id: '06', name: 'Larissa' },
    { id: '07', name: 'Danielle' },
    { id: '08', name: 'Bruno' },
    { id: '09', name: 'Externo' },
];

// ─── Clients ─────────────────────────────────────────────────────────────────────
export async function getClients(): Promise<Client[]> {
    try {
        const snapshot = await getDocs(query(collection(db, 'clients')));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client));
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        return [];
    }
}

// ─── Code Generation ─────────────────────────────────────────────────────────────
async function generateUniqueClientCode(): Promise<string> {
    const clientsRef = collection(db, 'clients');
    let code = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 100) {
        code = Math.floor(1000 + Math.random() * 9000).toString();
        const snap = await getDocs(query(clientsRef, where('code', '==', code)));
        if (snap.empty) {
            isUnique = true;
        }
        attempts++;
    }
    if (!isUnique) {
        code = Math.floor(10000 + Math.random() * 90000).toString();
    }
    return code;
}

export async function generateContractCode(clientName: string, lawyerId: string, matter: string = 'GERAL') {
    if (!clientName || !lawyerId) throw new Error('Dados incompletos');

    const nameTrimmed = clientName.trim();
    const nameLower = nameTrimmed.toLowerCase();
    const clientsRef = collection(db, 'clients');

    let clientDoc = null;
    
    // 1. Tenta buscar por nameLower (otimizado)
    const clientSnapLower = await getDocs(query(clientsRef, where('nameLower', '==', nameLower)));
    if (!clientSnapLower.empty) {
        clientDoc = clientSnapLower.docs[0];
    } else {
        // 2. Tenta buscar por name exato (caso de registros legados)
        const clientSnapExact = await getDocs(query(clientsRef, where('name', '==', nameTrimmed)));
        if (!clientSnapExact.empty) {
            clientDoc = clientSnapExact.docs[0];
        } else {
            // 3. Fallback: busca local em todos para evitar duplicidades caso a caixa do nome legado seja diferente
            const allClientsSnap = await getDocs(clientsRef);
            clientDoc = allClientsSnap.docs.find(d => {
                const name = d.data().name;
                return name && name.trim().toLowerCase() === nameLower;
            }) ?? null;
        }
    }

    let clientCode: string;
    let clientId: string;

    if (clientDoc) {
        clientId = clientDoc.id;
        const d = clientDoc.data();
        
        // Atualiza o nameLower no registro legado para futuras buscas rápidas
        if (!d.nameLower) {
            await updateDoc(doc(clientsRef, clientId), { nameLower });
        }

        if (d.code) {
            clientCode = d.code;
        } else {
            clientCode = await generateUniqueClientCode();
            await updateDoc(doc(clientsRef, clientId), { code: clientCode });
        }
    } else {
        clientCode = await generateUniqueClientCode();
        const newClient = await addDoc(clientsRef, {
            name: nameTrimmed,
            nameLower,
            code: clientCode,
            createdAt: new Date().toISOString(),
        });
        clientId = newClient.id;
    }

    const year = new Date().getFullYear().toString().slice(-2);
    let contractNumber = '';
    let fullCode = '';
    let isUnique = false;

    while (!isUnique) {
        contractNumber = Math.floor(1000 + Math.random() * 9000).toString();
        fullCode = `${clientCode}-${year}.${contractNumber}`;
        const snap = await getDocs(query(collection(db, 'cases'), where('fullCode', '==', fullCode)));
        if (snap.empty) isUnique = true;
    }

    // Otimização: usando getCountFromServer para sequência de casos do cliente
    const countSnap = await getCountFromServer(query(collection(db, 'cases'), where('clientId', '==', clientId)));
    const caseSequence = countSnap.data().count + 1;

    await addDoc(collection(db, 'cases'), {
        fullCode,
        clientCode,
        contractNumber,
        caseSequence,
        year,
        lawyerId: lawyerId.padStart(2, '0'),
        clientId,
        clientName: nameTrimmed,
        matter: matter.toUpperCase(),
        createdAt: new Date().toISOString(),
    });

    return { fullCode, clientCode, contractNumber, caseSequence };
}

// ─── Search & Pagination ─────────────────────────────────────────────────────────
export const PAGE_SIZE = 20;

export interface ContractsPage {
    contracts: Contract[];
    lastDoc: any | null; // Firestore DocumentSnapshot cursor
    hasMore: boolean;
}

export async function searchContracts(
    term: string = '',
    cursor: any | null = null
): Promise<ContractsPage> {
    try {
        const casesRef = collection(db, 'cases');

        // If there's a search term, fetch all and filter client-side
        // (Firestore doesn't support full-text search natively)
        if (term) {
            const q = query(casesRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const lower = term.toLowerCase();
            const filtered = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as Contract))
                .filter(c =>
                    c.clientName.toLowerCase().includes(lower) ||
                    c.fullCode?.toLowerCase().includes(lower)
                );
            return { contracts: filtered, lastDoc: null, hasMore: false };
        }

        // No search term: use cursor-based pagination
        const constraints: any[] = [orderBy('createdAt', 'desc'), limit(PAGE_SIZE + 1)];
        if (cursor) constraints.push(startAfter(cursor));

        const q = query(casesRef, ...constraints);
        const snapshot = await getDocs(q);
        const docs = snapshot.docs;

        const hasMore = docs.length > PAGE_SIZE;
        const pageDocs = hasMore ? docs.slice(0, PAGE_SIZE) : docs;

        return {
            contracts: pageDocs.map(d => ({ id: d.id, ...d.data() } as Contract)),
            lastDoc: pageDocs[pageDocs.length - 1] ?? null,
            hasMore,
        };
    } catch (error) {
        console.error('Erro na busca:', error);
        return { contracts: [], lastDoc: null, hasMore: false };
    }
}

export async function getTotalContracts(): Promise<number> {
    try {
        const snapshot = await getCountFromServer(collection(db, 'cases'));
        return snapshot.data().count;
    } catch {
        return 0;
    }
}

export async function deleteContract(id: string) {
    await deleteDoc(doc(db, 'cases', id));
}

export async function updateContract(id: string, data: Partial<Contract>) {
    await updateDoc(doc(db, 'cases', id), data);
}
