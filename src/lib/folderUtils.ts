
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const SUBFOLDERS = [
    "01_RELAÇÃO_JURÍDICA/01_CONTRATO_PROPOSTA",
    "01_RELAÇÃO_JURÍDICA/02_PROCURAÇÃO_SUBSTABELECIMENTO",
    "01_RELAÇÃO_JURÍDICA/03_DOCUMENTOS_IDENTIFICAÇÃO",
    "02_FINANCEIRO",
    "03_CASO"
];

const sanitize = (str: string) => {
    if (!str) return '';
    return str.trim().replace(/[<>:"/\\|?*]/g, '_').substring(0, 60);
};

export async function createLegalFolders(
    clientName: string,
    clientCode: string,
    caseSequence: number,
    matter: string,
    responsibleName: string,
    contractNumber: string,
    existingBaseDirHandle?: any
) {
    const cleanClientName = sanitize(clientName) || "CLIENTE_SEM_NOME";
    const cleanMatter = sanitize(matter) || "GERAL";
    const cleanCaseId = caseSequence.toString().padStart(3, '0');

    // Folder Naming Logic
    // Parent: [ClientName]_[NexusClientCode]
    const clientFolderName = `${cleanClientName}_${clientCode}`;

    // Case: [AutoSequence]_[Matter]_[Responsible]_[NexusProcessNumber]
    const caseFolderName = `${cleanCaseId}_${cleanMatter}_${responsibleName}_${contractNumber}`;

    try {
        // @ts-ignore
        if ('showDirectoryPicker' in window || existingBaseDirHandle) {
            // @ts-ignore
            const baseDirHandle = existingBaseDirHandle || await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'desktop' });

            // Create Client Folder
            const clientDirHandle = await baseDirHandle.getDirectoryHandle(clientFolderName, { create: true });

            // Create Case Folder
            const caseDirHandle = await clientDirHandle.getDirectoryHandle(caseFolderName, { create: true });

            // Create Subfolders
            for (const subPath of SUBFOLDERS) {
                const parts = subPath.split('/');
                let currentDir = caseDirHandle;
                for (const part of parts) {
                    currentDir = await currentDir.getDirectoryHandle(part, { create: true });
                }
            }
            return { success: true, message: `Sucesso!\nCliente: ${clientFolderName}\nCaso #${cleanCaseId}: ${caseFolderName}` };
        } else {
            // Fallback ZIP
            const zip = new JSZip();
            const root = zip.folder(clientFolderName);
            const caseNode = root?.folder(caseFolderName);
            SUBFOLDERS.forEach(path => caseNode?.folder(path));
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${clientFolderName}.zip`);
            return { success: true, message: "Download do ZIP iniciado." };
        }
    } catch (err: any) {
        console.error(err);
        throw new Error(err.message || 'Falha na criação de pastas');
    }
}
