import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, orderBy, limit, startAfter, deleteDoc, doc, updateDoc, getCountFromServer, writeBatch } from 'firebase/firestore';

// ─── Types ───────────────────────────────────────────────────────────────────────
export type Client = {
    id: string;
    name: string;
    code: string;
    nameLower?: string;
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
    clientNameLower?: string;
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

// ─── Database Migrations ────────────────────────────────────────────────────────
export async function migrateLegacyData(): Promise<void> {
    try {
        const migratedFlag = localStorage.getItem('nexus_legacy_migrated');
        if (migratedFlag === 'true') return;

        console.log('Iniciando migração de dados legados no Firestore...');

        // 1. Migrar Clientes (adicionar nameLower se faltar)
        const clientsRef = collection(db, 'clients');
        const clientsSnap = await getDocs(clientsRef);
        let clientBatch = writeBatch(db);
        let clientUpdates = 0;
        let batchCounter = 0;

        for (const docSnap of clientsSnap.docs) {
            const data = docSnap.data();
            if (!data.nameLower && data.name) {
                clientBatch.update(docSnap.ref, { nameLower: data.name.trim().toLowerCase() });
                clientUpdates++;
                batchCounter++;

                if (batchCounter >= 450) {
                    await clientBatch.commit();
                    clientBatch = writeBatch(db);
                    batchCounter = 0;
                }
            }
        }
        if (batchCounter > 0) {
            await clientBatch.commit();
        }

        // 2. Migrar Casos (adicionar clientNameLower se faltar)
        const casesRef = collection(db, 'cases');
        const casesSnap = await getDocs(casesRef);
        let caseBatch = writeBatch(db);
        let caseUpdates = 0;
        batchCounter = 0;

        for (const docSnap of casesSnap.docs) {
            const data = docSnap.data();
            if (!data.clientNameLower && data.clientName) {
                caseBatch.update(docSnap.ref, { clientNameLower: data.clientName.trim().toLowerCase() });
                caseUpdates++;
                batchCounter++;

                if (batchCounter >= 450) {
                    await caseBatch.commit();
                    caseBatch = writeBatch(db);
                    batchCounter = 0;
                }
            }
        }
        if (batchCounter > 0) {
            await caseBatch.commit();
        }

        console.log(`Migração concluída: ${clientUpdates} clientes e ${caseUpdates} casos atualizados.`);
        localStorage.setItem('nexus_legacy_migrated', 'true');
    } catch (e) {
        console.error('Erro durante migração legada:', e);
    }
}

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

export async function searchClients(term: string): Promise<Client[]> {
    if (!term.trim()) return [];
    try {
        const lower = term.trim().toLowerCase();
        const clientsRef = collection(db, 'clients');
        const q = query(
            clientsRef,
            where('nameLower', '>=', lower),
            where('nameLower', '<=', lower + '\uf8ff'),
            limit(10)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client));
    } catch (error) {
        console.error('Erro ao buscar clientes por prefixo:', error);
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
    
    // 1. Tenta buscar por nameLower (otimizado com índice)
    const clientSnapLower = await getDocs(query(clientsRef, where('nameLower', '==', nameLower)));
    if (!clientSnapLower.empty) {
        clientDoc = clientSnapLower.docs[0];
    } else {
        // 2. Tenta buscar por name exato (caso a migração não tenha rodado)
        const clientSnapExact = await getDocs(query(clientsRef, where('name', '==', nameTrimmed)));
        if (!clientSnapExact.empty) {
            clientDoc = clientSnapExact.docs[0];
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
        clientNameLower: nameLower,
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

        if (term) {
            const lower = term.trim().toLowerCase();
            const isCodeSearch = /\d/.test(lower);
            
            let q;
            if (isCodeSearch) {
                // Busca por prefixo de fullCode
                q = query(
                    casesRef,
                    where('fullCode', '>=', lower),
                    where('fullCode', '<=', lower + '\uf8ff'),
                    orderBy('fullCode'),
                    limit(PAGE_SIZE)
                );
            } else {
                // Busca por prefixo de clientNameLower
                q = query(
                    casesRef,
                    where('clientNameLower', '>=', lower),
                    where('clientNameLower', '<=', lower + '\uf8ff'),
                    orderBy('clientNameLower'),
                    limit(PAGE_SIZE)
                );
            }
            
            const snapshot = await getDocs(q);
            const contracts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Contract));
            return { contracts, lastDoc: null, hasMore: false };
        }

        // Sem termo de busca: usar paginação baseada em cursor
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
