/*
 * SCRIPT COMPLETO E ATUALIZADO
 * Versão: 7.0.0 (O.S. Iniciais)
 * Data: 10/06/2025
 * Descrição: Adiciona uma lista pré-cadastrada de Ordens de Serviço ao carregamento
 * inicial de dados (seeding). O botão de limpeza agora inclui as O.S.
 */
import React, { useState, useEffect, createContext, useContext, memo, useMemo, useCallback } from 'react';
import { auth, db, appId } from './firebaseConfig';
import { onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, addDoc, getDocs, getDoc, setDoc, deleteDoc, onSnapshot, query, where, Timestamp, writeBatch, updateDoc, orderBy } from 'firebase/firestore';
import {
    LucidePlusCircle, LucideEdit, LucideTrash2, LucideCalendarDays, LucideClipboardList,
    LucideSettings, LucideLogOut, LucidePrinter, LucideUserCog, LucideCar,
    LucideClock4, LucideChevronLeft, LucideChevronRight, LucideMail, LucideKeyRound,
    LucideBellRing, LucideUsersRound, LucideSave, LucideClipboardPlus, LucideCalendarCog,
    LucideUsers, LucideX
} from 'lucide-react';

// --- CONTEXTO GLOBAL ---
const GlobalContext = createContext();

// --- CONSTANTES E HELPERS ---
const LOGO_URL = "https://gramoterra.com.br/assets/images/misc/Logo%20Gramoterra-02.png";

const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    let date;
    if (timestamp instanceof Timestamp) {
        date = timestamp.toDate();
    } else if (timestamp && typeof timestamp.seconds === 'number') {
        date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else if (typeof timestamp === 'string') {
        const parsedDate = new Date(timestamp);
        if (!isNaN(parsedDate)) {
            date = parsedDate;
        } else {
            return 'Data inválida';
        }
    } else {
        return 'Data inválida';
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
};

// --- PROVIDER GLOBAL ---
const GlobalProvider = ({ children }) => {
    // --- DADOS INICIAIS UNIFICADOS ---
    const FUNCIONARIOS_INICIAIS = [
      { nome: 'CARLOS DOS S. BORBA OLIVEIRA', categoria: 'PRODUÇÃO', cpf: '005.933.770-75', rg: '2070361497' },
      { nome: 'DOUGLAS DOS SANTOS MESSAGIO', categoria: 'PRODUÇÃO', cpf: '035.729.570-00', rg: '7119940180' },
      { nome: 'ROBERTO COLISSI ALVES', categoria: 'PRODUÇÃO', cpf: '904.859.630-20', rg: '1048180838' },
      { nome: 'EVERALDO COLOMBO DE BORBA', categoria: 'PRODUÇÃO', cpf: '931.224.380-20', rg: '1070599329' },
      { nome: 'ODAIR COSER JUNIOR', categoria: 'PRODUÇÃO', cpf: '015.871.500-00', rg: '1114407185' },
      { nome: 'MATHEUS DA ROSA RODRIGUES', categoria: 'PRODUÇÃO', cpf: '019.755.300-05', rg: '1086139253' },
      { nome: 'GUILHERME GIACOMETTI DE FRAGA', categoria: 'PRODUÇÃO', cpf: '028.973.390-12', rg: '6106718325' },
      { nome: 'PAULO CEZAR VIALIM ROCHA', categoria: 'PRODUÇÃO', cpf: '079.984.430-41', rg: '4825721' },
      { nome: 'LUIZ FERNANDO DO NASCIMENTO FELTRIN', categoria: 'PRODUÇÃO', cpf: '023.305.930-79', rg: '' },
      { nome: 'TIAGO MORAIS NUNES', categoria: 'PRODUÇÃO', cpf: '042.821.340-17', rg: '' },
      { nome: 'ENIVALDO COLOMBO OSORIO', categoria: 'PÁTIO', cpf: '995.986.390-53', rg: '9083874231' },
      { nome: 'ALEX SANDRO DA SILVA', categoria: 'PÁTIO', cpf: '790.187.180-68', rg: '9084812232' },
      { nome: 'SANDRO OMAR', categoria: 'PÁTIO', cpf: '829.928.220-00', rg: '9033312704' },
      { nome: 'MAURICIO BOFF', categoria: 'PÁTIO', cpf: '718.267.770-91', rg: '' },
      { nome: 'ADAIR TEIXEIRA BARBOZA', categoria: 'PÁTIO', cpf: '508.500.400-06', rg: '' },
      { nome: 'BERNARD NUCCI DE OLIVEIRA', categoria: 'PÁTIO', cpf: '019.118.710-04', rg: '9123534373' },
      { nome: 'ADAIR DE LIMA', categoria: 'PÁTIO', cpf: '004.931.930-12', rg: '' },
      { nome: 'THIAGO BUENO DA SILVA', categoria: 'PÁTIO', cpf: '027.743.360-66', rg: '' },
      { nome: 'JOÃO PEDRO VIEIRA PINTO', categoria: 'VENDEDOR', cpf: '589.297.800-30', rg: '5938234' },
      { nome: 'MARIA DE FATIMA RAMOS YANKHNE', categoria: 'VENDEDOR', cpf: '377.397.729-91', rg: '630588' },
      { nome: 'LILIAN REGINA BENKENSTEIN', categoria: 'VENDEDOR', cpf: '936.992.250-00', rg: '5070017503' },
      { nome: 'DANIELE COLOMBO', categoria: 'VENDEDOR', cpf: '012.840.650-06', rg: '8099678065' },
      { nome: 'DANIELLE SANTOS RAMOS', categoria: 'VENDEDOR', cpf: '810.410.870-72', rg: '1074691852' },
      { nome: 'MARCELO D. COLOMBO', categoria: 'VENDEDOR', cpf: '358.517.460-72', rg: '1077746574' },
      { nome: 'MARCELO COLOMBO', categoria: 'VENDEDOR', cpf: '234.524.630-87', rg: '7016314796' },
      { nome: 'BRUNA MOURA COLOMBO', categoria: 'VENDEDOR', cpf: '008.058.060-69', rg: '7116853147' },
      { nome: 'JULIA ARNOLDO SARTORELLI', categoria: 'VENDEDOR', cpf: '034.280.790-30', rg: '41212887-X' },
      { nome: 'JULIO CEZER COLOMBO GUIMARAES', categoria: 'VENDEDOR', cpf: '008.228.780-60', rg: '4117779568' },
      { nome: 'JERONIMO DA CUNHA SANTOS', categoria: 'MADEIRA', cpf: '017.473.460-39', rg: '9098010664' },
      { nome: 'CELENIRO PEREIRA DOS SANTOS', categoria: 'MADEIRA', cpf: '325.504.100-34', rg: '2038542421' },
      { nome: 'SANDRO FEIJO SPFAREMBERGER', categoria: 'MADEIRA', cpf: '026.432.990-20', rg: '2105229681' },
      { nome: 'SILBERTO FEIJO SPARREMBERGER', categoria: 'MADEIRA', cpf: '024.167.980-06', rg: '2105306811' },
      { nome: 'FABIO DE SOUZA BARUFI', categoria: 'MADEIRA', cpf: '939.037.310-72', rg: '6060834147' },
      { nome: 'DIONLENON DE OLIVEIRA | (T)', categoria: 'TERCEIRIZADO', cpf: '019.792.880-00', rg: '1115517051' },
      { nome: 'TIAGO DE OLIVEIRA | (T)', categoria: 'TERCEIRIZADO', cpf: '014.210.100-11', rg: '9093054104' },
      { nome: 'JONAS OTTO PINHEIRO | (J)', categoria: 'TERCEIRIZADO', cpf: '042.449.620-85', rg: '4130825105' },
      { nome: 'JOÃO PEDRO SILVEIRA DE CAMARGO | (T)', categoria: 'TERCEIRIZADO', cpf: '042.232.580-52', rg: '7124933909' },
      { nome: 'CLAUDINEI DA ROSA JOAQUIM', categoria: 'TERCEIRIZADO', cpf: '021.540.980-56', rg: '' },
      { nome: 'FERNANDO | (J)', categoria: 'TERCEIRIZADO', cpf: '021.129.160-92', rg: '1093676921' },
      { nome: 'ESTEVÃO C. DA SILVEIRA JR. | (E)', categoria: 'TERCEIRIZADO', cpf: '021.129.160-92', rg: '1093676921' },
      { nome: 'VILMAR CALABREZI DE OLIVEIRA | (E)', categoria: 'TERCEIRIZADO', cpf: '517.890.780-20', rg: '1085409205' },
      { nome: 'VOLNEI SERGIO ARNOLDI | (E)', categoria: 'TERCEIRIZADO', cpf: '018.290.070-49', rg: '4092984998' },
      { nome: 'GUILHERME SANTOS DA SILVEIRA | (E)', categoria: 'TERCEIRIZADO', cpf: '042.978.040-24', rg: '6125812518' },
      { nome: 'MARCIO FANGUEIRO DA SILVA | (F)', categoria: 'TERCEIRIZADO', cpf: '013.090.270-56', rg: '1088500259' },
      { nome: 'RYAN HEBERLE BOSIN | (F)', categoria: 'TERCEIRIZADO', cpf: '038.639.610-00', rg: '0131813184' },
      { nome: 'GUILHERME DA SILVEIRA TRINDADE | (F)', categoria: 'TERCEIRIZADO', cpf: '036.661.310-95', rg: '1112645101' },
      { nome: 'CRISTIANO COLLEONI FERRI | (F)', categoria: 'TERCEIRIZADO', cpf: '018.289.290-50', rg: '4093678482' },
      { nome: 'VITOR PEDRO OLIVEIRA RAMOS | (F)', categoria: 'TERCEIRIZADO', cpf: '038.765.950-10', rg: '1121739131' },
      { nome: 'ATRICIBIO PAULO DELFINO JAQUES (G)', categoria: 'TERCEIRIZADO', cpf: '', rg: '4077688233' },
      { nome: 'NELTON ALMEIDA BARBOSA | (N)', categoria: 'TERCEIRIZADO', cpf: '000.834.070-65', rg: '3077248689' },
      { nome: 'WILLIAN CALABREZI DE S. BARBOSA | (N)', categoria: 'TERCEIRIZADO', cpf: '067.763.890-63', rg: '7113075019' },
      { nome: 'JOSUÉ DOS SANTOS SERAFIN | (N)', categoria: 'TERCEIRIZADO', cpf: '009.091.020-08', rg: '5101585052' },
      { nome: 'RUY VIEIRA BARBOSA JUNIOR | (N)', categoria: 'TERCEIRIZADO', cpf: '030.899.080-38', rg: '7110185984' },
      { nome: 'CHRISTIAN CALABREZI DE S. BARBOSA | (N)', categoria: 'TERCEIRIZADO', cpf: '053.368.160-00', rg: '4131110532' },
      { nome: 'DOUGLAS SCHMITT SARTURI', categoria: 'TERCEIRIZADO', cpf: '034.224.060-91', rg: '5103790894' },
      { nome: 'PAULO EDUARDO A. ALBANO | (P)', categoria: 'TERCEIRIZADO', cpf: '001.365.540-00', rg: '7081794017' },
      { nome: 'ADERSON MARCELO DA SILVA | (P)', categoria: 'TERCEIRIZADO', cpf: '004.223.840-90', rg: '7103817409' },
      { nome: 'MAURICIO PAIVA DA SILVEIRA', categoria: 'ELETRICA TERCEIRIZADA', cpf: '037.504.060-90', rg: '5112872022' },
      { nome: 'LEONARDO BELLO ANDRADES', categoria: 'LEO RAMAGEM', cpf: '021.568.870-80', rg: '' },
      { nome: 'GUILHERME SILVA DA ROSA', categoria: 'LITORAL CALIÇA', cpf: '030.750.300-81', rg: '4101444901' },
      { nome: 'FABRICIO ANTONIO DA SILVA DE SOUZA | C |', categoria: 'CARRETA', cpf: '032.793.301-51', rg: '908516035' },
      { nome: 'LUCAS MORAIS NUNES | (C)', categoria: 'CARRETA', cpf: '026.191.470-91', rg: '9116706190' },
      { nome: 'IGOR VELHO DE SOUZA', categoria: 'BIOLOGO', cpf: '899.681.500-77', rg: '' },
      { nome: 'LADIR CALABREZI', categoria: 'TERCEIRIZADO', cpf: '021.999.500-97', rg: '' },
      { nome: 'EMERSON ASSIS DA CUNHA TRESSOLDI', categoria: 'TERCEIRIZADO', cpf: '021.999.870-19', rg: '8106718847' },
    ];
    
    // --- NOVA LISTA DE O.S. INICIAIS ---
    const ORDENS_SERVICO_INICIAIS = [
      { numeroOS: 'OP001', cliente: 'CONDOMINIO RESIDENCIAL BELLA VITA', endereco: 'RUA GOVERNADOR ROBERTO SILVEIRA, 1550', bairro: 'CENTRO', cidadeEstado: 'ARROIO DO SAL/RS', vendedorResp: 'JOÃO CAMBRUZZI', dataCadastro: '22/10/2021' },
      { numeroOS: 'OP002', cliente: 'PREFEITURA MUNICIPAL DE BENTO GONÇALVES', endereco: 'RUA MARECHAL DEODORO, 70', bairro: 'CENTRO', cidadeEstado: 'BENTO GONÇALVES/RS', vendedorResp: 'MARCELO COLOMBO', dataCadastro: '22/10/2021' },
      { numeroOS: 'OP003', cliente: 'VINÍCOLA AURORA', endereco: 'RUA OLAVO BILAC, 500', bairro: 'CIDADE ALTA', cidadeEstado: 'BENTO GONÇALVES/RS', vendedorResp: 'MARCELO COLOMBO', dataCadastro: '28/10/2021' },
      { numeroOS: 'OP004', cliente: 'MARCELO PELLICIOLI', endereco: 'RUA DESEMBARGADOR DEOCLECIANO DE ALMEIDA, 45', bairro: 'ZONA RURAL', cidadeEstado: 'BENTO GONÇALVES/RS', vendedorResp: 'MARCELO COLOMBO', dataCadastro: '09/11/2021' },
      { numeroOS: 'OP005', cliente: 'CONDOMINIO RESIDENCIAL PARQUE DOS VINHEDOS', endereco: 'RUA MARQUES DE SOUZA, 480', bairro: 'JARDIM GLÓRIA', cidadeEstado: 'BENTO GONÇALVES/RS', vendedorResp: 'MARCELO COLOMBO', dataCadastro: '10/11/2021' },
      { numeroOS: 'OP006', cliente: 'PREFEITURA MUNICIPAL DE BENTO GONÇALVES', endereco: 'DISTRITO DE SÃO PEDRO', bairro: 'ZONA RURAL', cidadeEstado: 'BENTO GONÇALVES/RS', vendedorResp: 'MARCELO COLOMBO', dataCadastro: '18/11/2021' },
      { numeroOS: 'OP007', cliente: 'PREFEITURA MUNICIPAL DE BENTO GONÇALVES', endereco: 'ESTRADA DO SABIÁ', bairro: 'INTERIOR', cidadeEstado: 'BENTO GONÇALVES/RS', vendedorResp: 'MARCELO COLOMBO', dataCadastro: '18/11/2021' },
      { numeroOS: 'OP008', cliente: 'CONDOMINIO BELLA VITTA', endereco: 'ESTRADA VELHA, 1', bairro: 'INTERIOR', cidadeEstado: 'GARIBALDI/RS', vendedorResp: 'MARCELO COLOMBO', dataCadastro: '24/11/2021' },
      { numeroOS: 'OP009', cliente: 'DEPARTAMENTO AUTÔNOMO DE ESTRADAS DE RODAGEM - DAER', endereco: 'ERS 431 - KM 05', bairro: 'INTERIOR', cidadeEstado: 'BENTO GONÇALVES/RS', vendedorResp: 'MARCELO COLOMBO', dataCadastro: '24/11/2021' },
      { numeroOS: 'OP010', cliente: 'ANDREIA ZONATTO', endereco: 'RUA RAMIRO BARCELOS, 481', bairro: 'CENTRO', cidadeEstado: 'BENTO GONÇALVES/RS', vendedorResp: 'MARCELO COLOMBO', dataCadastro: '25/11/2021' },
    ];

    const CATEGORIAS_PESSOAS_INICIAIS = [...new Set(FUNCIONARIOS_INICIAIS.map(f => f.categoria.toUpperCase()))];
    const VEICULOS_INICIAIS = ["IQZ2697 - TRANSIT", "IUX9342 - SCANIA", "ISI3076 - M. BRANCO 01", "ITO7943 - M. CINZA", "JAO7A46 - M. BRANCO", "JBQ2C94 - FOTON", "ISK4548 - JCB / RETRO", "ILU8022 - TERCEIRIZADO", "IYX1110 - SAVEIRO", "KXM3763 - SAVEIRO", "IQW3678 - SAVEIRO", "ITN4590 - SAVEIRO", "KXM3763 - SAVEIRO LOJA", "IVP3G54 - SAVEIRO MARBELA", "IUO5D74 - STRADA", "ISX6G68 - FIESTA", "IVZ0630 - F. AZUL", "TERCEIRIZADO"];
    const TURNOS_INICIAIS = ["MANHÃ", "TARDE", "NOITE", "DIA INTEIRO"];
    
    // O restante do provider (estados, useEffects, etc.) permanece o mesmo...
    const [currentUser, setCurrentUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [loadingData, setLoadingData] = useState(true);
    const [funcionarios, setFuncionarios] = useState([]);
    const [listasAuxiliares, setListasAuxiliares] = useState({
        veiculos: [],
        turnos: [],
        categorias_pessoas: [],
        ordens_servico: []
    });
    const [initialDataSeeded, setInitialDataSeeded] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);
            } else {
                try {
                    await signInAnonymously(auth);
                } catch (error) {
                    console.error("GlobalProvider: Erro no login anônimo:", error);
                    setCurrentUser(null);
                }
            }
            setLoadingAuth(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!db || !appId || initialDataSeeded) return;

        const parseDate = (dateStr) => {
            const [day, month, year] = dateStr.split('/');
            return new Date(Date.UTC(year, parseInt(month, 10) - 1, parseInt(day, 10)));
        };

        const seedAllData = async () => {
            const basePath = `/artifacts/${appId}/public/data`;
            
            const collectionsToSeed = [
                {
                    path: 'funcionarios',
                    initialData: FUNCIONARIOS_INICIAIS,
                    idKey: (data) => (data.cpf ? data.cpf.replace(/\D/g, '') : data.nome.replace(/[^A-Z0-9]/gi, '_').toUpperCase()) || crypto.randomUUID(),
                    transform: (data) => ({
                        nome: data.nome.trim().toUpperCase(),
                        categoria: data.categoria.trim().toUpperCase(),
                        cpf: data.cpf || '',
                        rg: data.rg || ''
                    })
                },
                {
                    path: 'ordens_servico',
                    initialData: ORDENS_SERVICO_INICIAIS,
                    idKey: (data) => data.numeroOS,
                    transform: (data) => ({
                        ...data,
                        dataCadastro: Timestamp.fromDate(parseDate(data.dataCadastro))
                    })
                },
                {
                    path: 'listas_auxiliares/veiculos/items',
                    initialData: VEICULOS_INICIAIS,
                    idKey: (item) => item.replace(/[^A-Z0-9]/gi, '_').toUpperCase(),
                    transform: (item) => ({ nome: item.toUpperCase() })
                },
                {
                    path: 'listas_auxiliares/turnos/items',
                    initialData: TURNOS_INICIAIS,
                    idKey: (item) => item.replace(/[^A-Z0-9]/gi, '_').toUpperCase(),
                    transform: (item) => ({ nome: item.toUpperCase() })
                },
                {
                    path: 'listas_auxiliares/categorias_pessoas/items',
                    initialData: CATEGORIAS_PESSOAS_INICIAIS,
                    idKey: (item) => item.replace(/[^A-Z0-9]/gi, '_').toUpperCase(),
                    transform: (item) => ({ nome: item.toUpperCase() })
                }
            ];

            const batch = writeBatch(db);
            let operations = 0;

            for (const config of collectionsToSeed) {
                const collectionRef = collection(db, `${basePath}/${config.path}`);
                const snapshot = await getDocs(collectionRef);

                if (snapshot.empty) {
                    console.log(`Seeding ${config.path}...`);
                    config.initialData.forEach(item => {
                        const docId = config.idKey(item);
                        const docRef = doc(collectionRef, docId);
                        const data = config.transform(item);
                        batch.set(docRef, data);
                        operations++;
                    });
                }
            }

            if (operations > 0) {
                await batch.commit();
                console.log("Seeding idempotente concluído para todas as coleções.");
            }
            
            setInitialDataSeeded(true);
        };

        seedAllData().catch(console.error);
    }, [db, appId, initialDataSeeded]);
    
    // ... O restante do provider e do arquivo permanece o mesmo ...
    useEffect(() => {
        if (!currentUser || !appId) return;
        setLoadingData(true);
        const basePath = `/artifacts/${appId}/public/data`;
        const unsubscribers = [];
        const commonErrorHandler = (listName) => (error) => console.error(`Erro ao carregar ${listName}:`, error);
        const listasParaCarregar = ['veiculos', 'turnos', 'categorias_pessoas'];
        const totalListeners = 2 + listasParaCarregar.length;
        let loadedCount = 0;
        const checkLoadingComplete = () => {
            loadedCount++;
            if (loadedCount >= totalListeners) {
                setLoadingData(false);
            }
        };
        const qFuncionarios = query(collection(db, `${basePath}/funcionarios`), orderBy("nome"));
        unsubscribers.push(onSnapshot(qFuncionarios, (snapshot) => {
            setFuncionarios(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            checkLoadingComplete();
        }, commonErrorHandler("Pessoas")));
        const qOS = query(collection(db, `${basePath}/ordens_servico`), orderBy("numeroOS", "desc"));
        unsubscribers.push(onSnapshot(qOS, (snapshot) => {
            setListasAuxiliares(prev => ({ ...prev, ordens_servico: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) }));
            checkLoadingComplete();
        }, commonErrorHandler("Ordens de Serviço")));
        listasParaCarregar.forEach(listaName => {
            const qLista = query(collection(db, `${basePath}/listas_auxiliares/${listaName}/items`), orderBy("nome"));
            unsubscribers.push(onSnapshot(qLista, (snapshot) => {
                setListasAuxiliares(prev => ({ ...prev, [listaName]: snapshot.docs.map(d => ({id: d.id, ...d.data()})) }));
                checkLoadingComplete();
            }, commonErrorHandler(listaName)));
        });
       
        return () => unsubscribers.forEach(unsub => unsub());
    }, [currentUser, appId]); 

    const contextValue = useMemo(() => ({
        currentUser,
        userId: currentUser?.uid,
        db,
        auth,
        appId,
        listasAuxiliares,
        funcionarios,
        isLoading: loadingAuth || loadingData,
    }), [currentUser, listasAuxiliares, funcionarios, loadingAuth, loadingData, appId]);
   
    if (loadingAuth) {
        return <div className="flex justify-center items-center h-screen"><div className="text-xl">Autenticando...</div></div>;
    }

    return (
        <GlobalContext.Provider value={contextValue}>
            {children}
        </GlobalContext.Provider>
    );
};

// ... O restante do arquivo (AuthComponent, Modal, Managers, etc.) ...
// O componente ConfiguracoesComponent precisa ser atualizado para incluir 'ordens_servico' na limpeza.

const ConfiguracoesComponent = () => {
    const { db, appId } = useContext(GlobalContext);

    const handleResetConfiguracoes = async () => {
        if (!window.confirm("ATENÇÃO!\n\nVocê tem certeza que deseja apagar TODAS as Pessoas, Veículos, Turnos, Categorias e Ordens de Serviço?\n\nEsta ação não pode ser desfeita.")) {
            return;
        }
        if (!window.confirm("CONFIRMAÇÃO FINAL:\n\nTodos os dados de configuração serão permanentemente excluídos. Continuar?")) {
            return;
        }

        console.log("Iniciando a limpeza das configurações...");
        try {
            const basePath = `/artifacts/${appId}/public/data`;
            const collectionsToWipe = [
                'funcionarios',
                'ordens_servico', // Adicionado aqui
                'listas_auxiliares/veiculos/items',
                'listas_auxiliares/turnos/items',
                'listas_auxiliares/categorias_pessoas/items',
            ];

            for (const path of collectionsToWipe) {
                const collectionRef = collection(db, `${basePath}/${path}`);
                const snapshot = await getDocs(collectionRef);
                
                if (snapshot.empty) {
                    console.log(`Coleção '${path}' já está vazia.`);
                    continue;
                }

                const batch = writeBatch(db);
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                console.log(`Coleção '${path}' foi limpa com sucesso.`);
            }

            alert("Todas as configurações foram limpas com sucesso!\n\nAgora, recarregue a página (pressione F5) para que o sistema carregue os dados iniciais corretamente.");

        } catch (error) {
            console.error("Erro ao tentar limpar as configurações:", error);
            alert("Ocorreu um erro ao limpar as configurações. Verifique o console para mais detalhes.");
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Configurações Gerais</h2>
                <button 
                    onClick={handleResetConfiguracoes}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md flex items-center shadow-sm"
                    title="Apaga todos os dados de Pessoas, Veículos, Turnos, Categorias e O.S. para reiniciar com os dados padrão."
                >
                    <LucideTrash2 size={18} className="mr-2" />
                    Limpar e Reiniciar Configurações
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PessoasManager />
                <div className="space-y-6">
                    <ListaAuxiliarManager nomeLista="Veículos" nomeSingular="Veículo" collectionPathSegment="veiculos" Icon={LucideCar} />
                    <ListaAuxiliarManager nomeLista="Turnos" nomeSingular="Turno" collectionPathSegment="turnos" Icon={LucideClock4} />
                    <ListaAuxiliarManager nomeLista="Categorias de Pessoas" nomeSingular="Categoria" collectionPathSegment="categorias_pessoas" Icon={LucideUsers} />
                </div>
            </div>
        </div>
    );
};

// Cole o restante do seu arquivo App.jsx aqui, pois os outros componentes não precisam de alteração.
// ... (AuthComponent, Modal, PessoasManager, ListaAuxiliarManager, CadastroOrdensServicoComponent, etc.)
// Apenas o GlobalProvider e o ConfiguracoesComponent foram modificados.
// O restante do arquivo pode ser copiado da sua versão anterior (v5.0.0)

// --- COMPONENTES DE UI GENÉRICOS ---
const AuthComponent = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <img src={LOGO_URL} alt="Logo Gramoterra" className="mx-auto h-16 w-auto mb-6" onError={(e) => e.target.style.display = 'none'} />
                <h2 className="text-2xl font-bold text-center text-gray-700 mb-6">{isLogin ? 'Login' : 'Registrar'} - Gestor de Operações</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4"><label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email</label><input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                    <div className="mb-6"><label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Senha</label><input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3" id="password" type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                    {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
                    <div className="flex items-center justify-between"><button className={`w-full ${loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-700'} text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline`} type="submit" disabled={loading}>{loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Registrar')}</button></div>
                </form>
                <p className="text-center text-sm text-gray-600 mt-6">{isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}<button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="font-bold text-blue-500 hover:text-blue-700 ml-1">{isLogin ? 'Registre-se' : 'Faça Login'}</button></p>
            </div>
        </div>
    );
};

const Modal = memo(({ isOpen, onClose, title, children, width = "max-w-2xl" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className={`bg-white rounded-lg shadow-xl w-full ${width} max-h-[90vh] flex flex-col`}><div className="flex justify-between items-center p-4 border-b"><h3 className="text-xl font-semibold">{title}</h3><button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button></div><div className="p-4 overflow-y-auto">{children}</div></div>
        </div>
    );
});

const ListaAuxiliarManager = ({ nomeLista, nomeSingular, collectionPathSegment, Icon }) => {
    const { listasAuxiliares, db, appId } = useContext(GlobalContext);
    const [newItemName, setNewItemName] = useState('');
    const items = listasAuxiliares[collectionPathSegment] || [];
    const collectionRef = useMemo(() =>
        collection(db, `/artifacts/${appId}/public/data/listas_auxiliares/${collectionPathSegment}/items`),
        [db, appId, collectionPathSegment]
    );
    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!newItemName.trim()) return;
        try {
            const docId = newItemName.trim().replace(/[^A-Z0-9]/gi, '_').toUpperCase();
            const docRef = doc(collectionRef, docId);
            await setDoc(docRef, { nome: newItemName.toUpperCase().trim() });
            setNewItemName('');
        } catch (error) {
            console.error(`Erro ao adicionar ${nomeSingular}:`, error);
        }
    };
    const handleDeleteItem = async (itemId) => {
        if (!window.confirm(`Tem certeza que deseja excluir este ${nomeSingular}?`)) return;
        try {
            await deleteDoc(doc(collectionRef, itemId));
        } catch (error) {
            console.error(`Erro ao excluir ${nomeSingular}:`, error);
        }
    };
    return (
        <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4"><Icon size={22} className="mr-2 text-blue-500" />{nomeLista}</h3>
            <form onSubmit={handleAddItem} className="flex gap-2 mb-3">
                <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder={`Novo ${nomeSingular}`} className="flex-grow border border-gray-300 rounded-md shadow-sm py-2 px-3" />
                <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-md flex items-center shadow-sm"><LucidePlusCircle size={18} /></button>
            </form>
            <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {items.map(item => (
                    <li key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                        <span className="text-sm text-gray-700">{item.nome}</span>
                        <button onClick={() => handleDeleteItem(item.id)} title="Excluir" className="text-red-500 hover:text-red-700"><LucideTrash2 size={16} /></button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const PessoasManager = () => {
    const { funcionarios, listasAuxiliares, db, appId } = useContext(GlobalContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFunc, setEditingFunc] = useState(null);
    const [formState, setFormState] = useState({ nome: '', categoria: '', cpf: '', rg: '' });
    const collectionRef = useMemo(() => collection(db, `/artifacts/${appId}/public/data/funcionarios`), [db, appId]);
    const handleOpenModal = (func = null) => {
        if (func) {
            setEditingFunc(func);
            setFormState({ nome: func.nome || '', categoria: func.categoria || '', cpf: func.cpf || '', rg: func.rg || '' });
        } else {
            setEditingFunc(null);
            setFormState({ nome: '', categoria: '', cpf: '', rg: '' });
        }
        setIsModalOpen(true);
    };
    const handleCloseModal = () => setIsModalOpen(false);
    const handleChange = (e) => setFormState(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formState.nome || !formState.categoria) return;
        const data = {
            nome: formState.nome.toUpperCase().trim(),
            categoria: formState.categoria.toUpperCase(),
            cpf: formState.cpf.trim(),
            rg: formState.rg.trim()
        };
        try {
            if (editingFunc) {
                await updateDoc(doc(collectionRef, editingFunc.id), data);
            } else {
                let docId = data.cpf ? data.cpf.replace(/\D/g, '') : data.nome.replace(/[^A-Z0-9]/gi, '_').toUpperCase();
                if (!docId) docId = crypto.randomUUID();
                await setDoc(doc(collectionRef, docId), data);
            }
            handleCloseModal();
        } catch (error) {
            console.error("Erro ao salvar pessoa:", error);
        }
    };
    const handleDelete = async (funcId) => {
        if (!window.confirm("Tem certeza? Esta ação removerá a pessoa de todos os registros.")) return;
        try {
            await deleteDoc(doc(collectionRef, funcId));
        } catch (error) {
            console.error("Erro ao excluir pessoa:", error);
        }
    };
    return (
        <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center"><LucideUserCog size={22} className="mr-2 text-blue-500" />Gerenciar Pessoas</h3>
                <button onClick={() => handleOpenModal()} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md flex items-center shadow-sm"><LucidePlusCircle size={18} className="mr-2" />Adicionar</button>
            </div>
            <div className="max-h-96 overflow-y-auto pr-2">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {funcionarios.map(f => (
                            <tr key={f.id}>
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{f.nome}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{f.categoria}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    <button onClick={() => handleOpenModal(f)} className="text-blue-600 hover:text-blue-900"><LucideEdit size={16} /></button>
                                    <button onClick={() => handleDelete(f.id)} className="text-red-600 hover:text-red-900"><LucideTrash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingFunc ? "Editar Pessoa" : "Adicionar Pessoa"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label>Nome</label><input name="nome" value={formState.nome} onChange={handleChange} required className="mt-1 w-full border-gray-300 rounded-md" /></div>
                    <div><label>CPF</label><input name="cpf" value={formState.cpf} onChange={handleChange} className="mt-1 w-full border-gray-300 rounded-md" /></div>
                    <div><label>RG</label><input name="rg" value={formState.rg} onChange={handleChange} className="mt-1 w-full border-gray-300 rounded-md" /></div>
                    <div><label>Categoria</label><select name="categoria" value={formState.categoria} onChange={handleChange} required className="mt-1 w-full border-gray-300 rounded-md"><option value="">Selecione...</option>{(listasAuxiliares.categorias_pessoas || []).map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}</select></div>
                    <div className="pt-4 flex justify-end"><button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white">Salvar</button></div>
                </form>
            </Modal>
        </div>
    );
};

const CadastroOrdensServicoComponent = () => {
    const { userId, funcionarios, listasAuxiliares, isLoading, db, appId } = useContext(GlobalContext);
    const ordensServico = listasAuxiliares.ordens_servico;
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingOS, setEditingOS] = useState(null);
    const [numeroOS, setNumeroOS] = useState('');
    const [cliente, setCliente] = useState('');
    const [endereco, setEndereco] = useState('');
    const [bairro, setBairro] = useState('');
    const [cidadeEstado, setCidadeEstado] = useState('');
    const [vendedorResp, setVendedorResp] = useState('');
    const [dataCadastro, setDataCadastro] = useState(new Date().toISOString().split('T')[0]);
    const ordensServicoCollectionRef = useMemo(() =>
        collection(db, `/artifacts/${appId}/public/data/ordens_servico`),
        [db, appId]
    );
    const resetForm = useCallback(() => {
        setNumeroOS(''); setCliente(''); setEndereco(''); setBairro('');
        setCidadeEstado(''); setVendedorResp('');
        setDataCadastro(new Date().toISOString().split('T')[0]);
        setEditingOS(null);
    }, []);
    const handleOpenForm = useCallback((os = null) => {
        if (os) {
            setEditingOS(os);
            setNumeroOS(os.numeroOS || ''); setCliente(os.cliente || ''); setEndereco(os.endereco || '');
            setBairro(os.bairro || ''); setCidadeEstado(os.cidadeEstado || ''); setVendedorResp(os.vendedorResp || '');
            setDataCadastro(os.dataCadastro?.toDate()?.toISOString()?.split('T')[0] || new Date().toISOString().split('T')[0]);
        } else {
            resetForm();
        }
        setIsFormOpen(true);
    }, [resetForm]);
    const handleCloseForm = useCallback(() => {
        setIsFormOpen(false);
        resetForm();
    }, [resetForm]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        const dateParts = dataCadastro.split('-');
        const utcDate = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
        const osData = {
            numeroOS, cliente, endereco, bairro, cidadeEstado, vendedorResp,
            dataCadastro: Timestamp.fromDate(utcDate),
            lastUpdated: Timestamp.now(),
            atualizadoPor: userId
        };
        try {
            if (editingOS) {
                await updateDoc(doc(ordensServicoCollectionRef, editingOS.id), osData);
            } else {
                await addDoc(ordensServicoCollectionRef, { ...osData, criadoPor: userId, criadoEm: Timestamp.now() });
            }
            handleCloseForm();
        } catch (error) {
            console.error("Erro ao salvar Ordem de Serviço: ", error);
        }
    };
    const handleDeleteOS = async (osId) => {
        if (!window.confirm("Tem certeza?")) return;
        try {
            await deleteDoc(doc(ordensServicoCollectionRef, osId));
        } catch (error) {
            console.error("Erro ao excluir Ordem de Serviço:", error);
        }
    };
    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Ordens de Serviço</h2>
                <button onClick={() => handleOpenForm()} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md flex items-center shadow-sm"><LucidePlusCircle size={20} className="mr-2" /> Nova O.S.</button>
            </div>
            <Modal isOpen={isFormOpen} onClose={handleCloseForm} title={editingOS ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"} width="max-w-3xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label htmlFor="numeroOS" className="block text-sm font-medium text-gray-700">Número O.S.</label><input type="text" id="numeroOS" value={numeroOS} onChange={(e) => setNumeroOS(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" /></div>
                        <div><label htmlFor="dataCadastro" className="block text-sm font-medium text-gray-700">Data Cadastro</label><input type="date" id="dataCadastro" value={dataCadastro} onChange={(e) => setDataCadastro(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" /></div>
                    </div>
                    <div><label htmlFor="cliente" className="block text-sm font-medium text-gray-700">Cliente</label><input type="text" id="cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" /></div>
                    <div><label htmlFor="endereco" className="block text-sm font-medium text-gray-700">Endereço</label><input type="text" id="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label htmlFor="bairro" className="block text-sm font-medium text-gray-700">Bairro</label><input type="text" id="bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" /></div>
                        <div><label htmlFor="cidadeEstado" className="block text-sm font-medium text-gray-700">Cidade/Estado</label><input type="text" id="cidadeEstado" value={cidadeEstado} onChange={(e) => setCidadeEstado(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" /></div>
                    </div>
                    <div><label htmlFor="vendedorResp" className="block text-sm font-medium text-gray-700">Vendedor Responsável</label><select id="vendedorResp" value={vendedorResp} onChange={(e) => setVendedorResp(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"><option value="">Selecione...</option>{funcionarios.map(f => <option key={f.id} value={f.nome}>{f.nome}</option>)}</select></div>
                    <div className="pt-4 flex justify-end space-x-2"><button type="button" onClick={handleCloseForm} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button><button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center"><LucideSave size={16} className="mr-2" /> {editingOS ? "Atualizar O.S." : "Salvar O.S."}</button></div>
                </form>
            </Modal>
            <div className="bg-white shadow-md rounded-lg overflow-x-auto mt-6">
                <table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-100"><tr>{["O.S.", "Cliente", "Endereço", "Bairro", "Cidade/Estado", "Vendedor Resp.", "Cadastro", "Ações"].map(header => (<th key={header} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">{header}</th>))}</tr></thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (<tr><td colSpan="8" className="px-4 py-4 text-center text-gray-500">Carregando ordens de serviço...</td></tr>) : !ordensServico || ordensServico.length === 0 ? (<tr><td colSpan="8" className="px-4 py-4 text-center text-gray-500">Nenhuma ordem de serviço cadastrada.</td></tr>) : (ordensServico.map((os) => (<tr key={os.id} className="hover:bg-gray-50"><td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">{os.numeroOS}</td><td className="px-4 py-3 text-sm text-gray-700 whitespace-normal break-words max-w-xs">{os.cliente}</td><td className="px-4 py-3 text-sm text-gray-700 whitespace-normal break-words max-w-xs">{os.endereco}</td><td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{os.bairro}</td><td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{os.cidadeEstado}</td><td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{os.vendedorResp}</td><td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDate(os.dataCadastro)}</td><td className="px-4 py-3 text-sm font-medium whitespace-nowrap"><button onClick={() => handleOpenForm(os)} title="Editar" className="text-blue-600 hover:text-blue-800 mr-2"><LucideEdit size={16}/></button><button onClick={() => handleDeleteOS(os.id)} title="Excluir" className="text-red-600 hover:text-red-800"><LucideTrash2 size={16}/></button></td></tr>)))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ... e assim por diante para todos os outros componentes ...
// ... ListagemEnvelopesComponent, ListagemAcessosComponent, etc. ...
// ... PlanejamentoOperacionalComponent ...
// ... App, WrappedApp ...
// O restante do arquivo é idêntico à versão 5.0.0, apenas o GlobalProvider e o ConfiguracoesComponent foram alterados.

const ListagemEnvelopesComponent = () => {
    const { userId, db, appId } = useContext(GlobalContext);
    const [envelopes, setEnvelopes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEnvelope, setEditingEnvelope] = useState(null);
    const [numeroEnvelope, setNumeroEnvelope] = useState('');
    const [dataServico, setDataServico] = useState('');
    const [ordemServico, setOrdemServico] = useState('');
    const [cidade, setCidade] = useState('');
    const [responsaveis, setResponsaveis] = useState('');
    const [valorDiaria, setValorDiaria] = useState('');
    const [detalhesDiaria, setDetalhesDiaria] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const envelopesCollectionRef = useMemo(() =>
        collection(db, `/artifacts/${appId}/public/data/envelopes`),
        [db, appId]
    );
    useEffect(() => {
        setIsLoading(true);
        const q = query(envelopesCollectionRef, orderBy("numeroEnvelope", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setEnvelopes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
        }, (error) => {
            console.error("Erro ao buscar envelopes:", error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [envelopesCollectionRef]);
    const resetForm = useCallback(() => {
        setNumeroEnvelope(''); setDataServico(''); setOrdemServico(''); setCidade(''); setResponsaveis('');
        setValorDiaria(''); setDetalhesDiaria(''); setObservacoes(''); setEditingEnvelope(null);
    }, []);
    const handleOpenModal = useCallback((envelope = null) => {
        if (envelope) {
            setEditingEnvelope(envelope);
            setNumeroEnvelope(envelope.numeroEnvelope || '');
            setDataServico(envelope.dataServico?.toDate()?.toISOString()?.split('T')[0] || '');
            setOrdemServico(envelope.ordemServico || '');
            setCidade(envelope.cidade || '');
            setResponsaveis(envelope.responsaveis || '');
            setValorDiaria(envelope.valorDiaria || '');
            setDetalhesDiaria(envelope.detalhesDiaria || '');
            setObservacoes(envelope.observacoes || '');
        } else {
            resetForm();
            setDataServico(new Date().toISOString().split('T')[0]);
        }
        setIsModalOpen(true);
    }, [resetForm]);
    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false);
        resetForm();
    }, [resetForm]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const dateParts = dataServico.split('-');
        const utcDate = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
        const envelopeData = {
            numeroEnvelope: numeroEnvelope || 'N/A',
            dataServico: Timestamp.fromDate(utcDate),
            ordemServico, cidade, responsaveis, valorDiaria, detalhesDiaria, observacoes,
            lastUpdated: Timestamp.now(),
            atualizadoPor: userId
        };
        try {
            if (editingEnvelope) {
                await updateDoc(doc(envelopesCollectionRef, editingEnvelope.id), envelopeData);
            } else {
                await addDoc(envelopesCollectionRef, { ...envelopeData, criadoPor: userId, criadoEm: Timestamp.now() });
            }
            handleCloseModal();
        } catch (error) {
            console.error("Erro ao salvar envelope:", error);
        }
    };
    const handleDelete = async (id) => {
        if (!window.confirm("Tem certeza?")) return;
        try {
            await deleteDoc(doc(envelopesCollectionRef, id));
        } catch (error) {
            console.error("Erro ao excluir envelope:", error);
        }
    };
    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Listagem de Envelopes</h2>
                <button onClick={() => handleOpenModal()} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md flex items-center shadow-sm"><LucidePlusCircle size={20} className="mr-2" /> Novo Envelope</button>
            </div>
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingEnvelope ? "Editar Envelope" : "Novo Envelope"} width="max-w-4xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div><label htmlFor="numeroEnvelope" className="block text-sm font-medium text-gray-700">N°</label><input type="text" id="numeroEnvelope" value={numeroEnvelope} onChange={e => setNumeroEnvelope(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" /></div>
                         <div><label htmlFor="dataServico" className="block text-sm font-medium text-gray-700">Data Serviço</label><input type="date" id="dataServico" value={dataServico} onChange={e => setDataServico(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" /></div>
                         <div><label htmlFor="ordemServico" className="block text-sm font-medium text-gray-700">O.S.</label><input type="text" id="ordemServico" value={ordemServico} onChange={e => setOrdemServico(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" /></div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div><label htmlFor="cidade" className="block text-sm font-medium text-gray-700">Cidade</label><input type="text" id="cidade" value={cidade} onChange={e => setCidade(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" /></div>
                         <div><label htmlFor="responsaveis" className="block text-sm font-medium text-gray-700">Responsável</label><input type="text" id="responsaveis" value={responsaveis} onChange={e => setResponsaveis(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" /></div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label htmlFor="valorDiaria" className="block text-sm font-medium text-gray-700">Diária (Valor)</label><input type="number" step="0.01" id="valorDiaria" value={valorDiaria} onChange={e => setValorDiaria(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" /></div>
                        <div><label htmlFor="detalhesDiaria" className="block text-sm font-medium text-gray-700">Detalhes da Diária</label><input type="text" id="detalhesDiaria" value={detalhesDiaria} onChange={e => setDetalhesDiaria(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" placeholder="Ex: 20 PIX + 20 VR" /></div>
                     </div>
                     <div><label htmlFor="observacoes" className="block text-sm font-medium text-gray-700">Observações</label><textarea id="observacoes" value={observacoes} onChange={e => setObservacoes(e.target.value)} rows="3" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" /></div>
                     <div className="pt-4 flex justify-end space-x-2"><button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button><button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center"><LucideSave size={16} className="mr-2" /> {editingEnvelope ? "Atualizar Envelope" : "Salvar Envelope"}</button></div>
                </form>
            </Modal>
            <div className="bg-white shadow-md rounded-lg overflow-x-auto mt-6">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100"><tr>{["N°", "Data Serviço", "O.S", "Cidade", "Responsável", "Diária (R$)", "Detalhes Diária", "OBS", "Ações"].map(header => (<th key={header} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">{header}</th>))}</tr></thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (<tr><td colSpan="9" className="px-4 py-4 text-center text-gray-500">Carregando envelopes...</td></tr>) : envelopes.length === 0 ? (<tr><td colSpan="9" className="px-4 py-4 text-center text-gray-500">Nenhum envelope cadastrado.</td></tr>) : (envelopes.map((env) => (<tr key={env.id} className="hover:bg-gray-50"><td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">{env.numeroEnvelope}</td><td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDate(env.dataServico)}</td><td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{env.ordemServico}</td><td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{env.cidade}</td><td className="px-4 py-3 text-sm text-gray-700 whitespace-normal break-words max-w-xs">{env.responsaveis}</td><td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{env.valorDiaria}</td><td className="px-4 py-3 text-sm text-gray-700 whitespace-normal break-words max-w-xs">{env.detalhesDiaria}</td><td className="px-4 py-3 text-sm text-gray-700 whitespace-normal break-words max-w-xs">{env.observacoes}</td><td className="px-4 py-3 text-sm font-medium whitespace-nowrap"><button onClick={() => handleOpenModal(env)} title="Editar" className="text-blue-600 hover:text-blue-800 mr-2"><LucideEdit size={16}/></button><button onClick={() => handleDelete(env.id)} title="Excluir" className="text-red-600 hover:text-red-800"><LucideTrash2 size={16}/></button></td></tr>)))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ListagemAcessosComponent = () => {
    const { funcionarios, listasAuxiliares, isLoading } = useContext(GlobalContext);
    const [dataExecucao, setDataExecucao] = useState(new Date().toISOString().split('T')[0]);
    const groupedData = useMemo(() => {
        const veiculos = (listasAuxiliares.veiculos || []).map(v => ({ ...v, categoria: 'VEICULO' }));
        const allData = [...(funcionarios || []), ...veiculos];
        if (allData.length === 0) return {};
        return allData.reduce((acc, item) => {
            const category = (item.categoria || 'SEM CATEGORIA').toUpperCase();
            if (!acc[category]) acc[category] = [];
            acc[category].push(item);
            return acc;
        }, {});
    }, [funcionarios, listasAuxiliares.veiculos]);
    const handlePrint = () => window.print();
    const categoryOrder = ['PRODUÇÃO', 'PÁTIO', 'VENDEDORES', 'MADEIRA', 'TERCEIRIZADO', 'ELETRICA TERCEIRIZADA', 'LEO RAMAGEM', 'LITORAL CALIÇA', 'CARRETA', 'BIOLOGO', 'VEICULO', 'SEM CATEGORIA'];
    return (
        <div className="p-4 md:p-6 bg-gray-100 min-h-full">
            <style>{`@media print { body * { visibility: hidden; } #printable-area, #printable-area * { visibility: visible; } #printable-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; } .no-print { display: none; }}`}</style>
            <div className="flex justify-between items-center mb-6 no-print">
                <h2 className="text-2xl font-semibold text-gray-800">Controle de Acessos</h2>
                <div className="flex items-center gap-4">
                    <div>
                        <label htmlFor="dataExecucao" className="block text-sm font-medium text-gray-700">Data de Execução</label>
                        <input type="date" id="dataExecucao" value={dataExecucao} onChange={(e) => setDataExecucao(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
                    </div>
                    <button onClick={handlePrint} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md flex items-center shadow-sm self-end"><LucidePrinter size={20} className="mr-2" /> Imprimir</button>
                </div>
            </div>
            {isLoading ? (
                <div className="text-center p-10"><p>Carregando dados...</p></div>
            ) : (
                <div id="printable-area" className="bg-white p-6 shadow-lg rounded-md">
                    <header className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
                        <div><img src={LOGO_URL} alt="Logo Gramoterra" className="h-16 w-auto" onError={(e) => e.target.style.display = 'none'} /></div>
                        <div className="text-right">
                            <h1 className="text-2xl font-bold">Listagem de Colaboradores</h1>
                            <p className="text-sm">Data Execução: {formatDate(dataExecucao)}</p>
                            <p className="text-sm text-gray-500">O.S.: (A ser preenchido)</p>
                            <p className="text-sm text-gray-500">Cliente: (A ser preenchido)</p>
                        </div>
                    </header>
                    <main>
                        {categoryOrder.map(category => {
                            if (!groupedData[category] || groupedData[category].length === 0) return null;
                            return (
                                <div key={category} className="mb-6 break-inside-avoid">
                                    <h3 className="text-lg font-bold bg-gray-200 px-2 py-1 mb-2">{category}</h3>
                                    <table className="min-w-full text-sm">
                                        <thead><tr className="border-b"><th className="w-10 px-2 py-1 text-left"></th><th className="px-2 py-1 text-left font-semibold">COLABORADOR / VEÍCULO</th><th className="px-2 py-1 text-left font-semibold">CPF</th><th className="px-2 py-1 text-left font-semibold">RG</th></tr></thead>
                                        <tbody>
                                            {groupedData[category].map(item => (
                                                <tr key={item.id} className="border-b border-gray-200">
                                                    <td className="px-2 py-1 text-center"><input type="checkbox" className="h-4 w-4" /></td>
                                                    <td className="px-2 py-1">{item.nome}</td>
                                                    <td className="px-2 py-1">{item.cpf || ''}</td>
                                                    <td className="px-2 py-1">{item.rg || ''}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        })}
                    </main>
                </div>
            )}
        </div>
    );
};

const AvisosAgendaComponent = () => {
    const { userId, db, appId } = useContext(GlobalContext);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState('blue');
    const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const colors = {
        blue: { name: 'Lembrete', bg: 'bg-blue-500', text: 'text-white' },
        green: { name: 'Reunião', bg: 'bg-green-500', text: 'text-white' },
        yellow: { name: 'Aviso', bg: 'bg-yellow-400', text: 'text-black' },
        red: { name: 'Urgente', bg: 'bg-red-500', text: 'text-white' },
    };
    const agendaCollectionRef = useMemo(() => collection(db, `/artifacts/${appId}/public/data/agenda_avisos`), [db, appId]);
    const startOfWeek = useMemo(() => {
        const date = new Date(currentDate);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(date.setDate(diff));
    }, [currentDate]);
    const endOfWeek = useMemo(() => {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + 6);
        return date;
    }, [startOfWeek]);
    useEffect(() => {
        const startTimestamp = Timestamp.fromDate(new Date(startOfWeek.setHours(0, 0, 0, 0)));
        const endTimestamp = Timestamp.fromDate(new Date(endOfWeek.setHours(23, 59, 59, 999)));
        const q = query(agendaCollectionRef, where("date", ">=", startTimestamp), where("date", "<=", endTimestamp));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const weekEvents = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                const eventDate = data.date.toDate();
                const dateKey = eventDate.toISOString().split('T')[0];
                if (!weekEvents[dateKey]) weekEvents[dateKey] = [];
                weekEvents[dateKey].push({ id: doc.id, ...data });
            });
            setEvents(weekEvents);
        }, (error) => console.error("Erro ao buscar eventos da agenda:", error));
        
        return () => unsubscribe();
    }, [agendaCollectionRef, startOfWeek, endOfWeek]);
    const handlePrevWeek = () => setCurrentDate(d => new Date(d.setDate(d.getDate() - 7)));
    const handleNextWeek = () => setCurrentDate(d => new Date(d.setDate(d.getDate() + 7)));
    const handleOpenModal = (date, event = null) => {
        setSelectedDate(date);
        if (event) {
            setEditingEvent(event);
            setTitle(event.title);
            setDescription(event.description);
            setColor(event.color);
        } else {
            setEditingEvent(null);
            setTitle(''); setDescription(''); setColor('blue');
        }
        setIsModalOpen(true);
    };
    const handleCloseModal = () => setIsModalOpen(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedDate) return;
        const eventData = {
            title, description, color,
            date: Timestamp.fromDate(selectedDate),
            updatedAt: Timestamp.now(),
            ...(editingEvent ? {} : { criadoPor: userId, createdAt: Timestamp.now() })
        };
        try {
            if (editingEvent) {
                await updateDoc(doc(agendaCollectionRef, editingEvent.id), eventData);
            } else {
                await addDoc(agendaCollectionRef, eventData);
            }
            handleCloseModal();
        } catch (error) {
            console.error("Erro ao salvar evento:", error);
        }
    };
    const handleDelete = async (eventId) => {
        if (!window.confirm("Tem certeza?")) return;
        await deleteDoc(doc(agendaCollectionRef, eventId));
    };
    const renderWeekDays = () => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(day.getDate() + i);
            const dateKey = day.toISOString().split('T')[0];
            const dayEvents = events[dateKey] || [];
            days.push(
                <div key={i} className="border border-gray-200 rounded-lg p-2 bg-white flex flex-col min-h-[200px]">
                    <div className="flex justify-between items-center"><span className="font-bold">{weekDays[day.getDay()]}</span><span className="text-gray-500">{day.getDate()}</span></div>
                    <div className="flex-grow mt-2 space-y-1 overflow-y-auto">
                        {dayEvents.map(event => (
                            <div key={event.id} className={`p-1.5 rounded text-xs ${colors[event.color]?.bg} ${colors[event.color]?.text}`}>
                                <p className="font-semibold">{event.title}</p>
                                <div className="flex justify-end gap-1 mt-1"><button onClick={() => handleOpenModal(day, event)} className="opacity-70 hover:opacity-100"><LucideEdit size={12} /></button><button onClick={() => handleDelete(event.id)} className="opacity-70 hover:opacity-100"><LucideTrash2 size={12} /></button></div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => handleOpenModal(day)} className="mt-2 w-full text-center text-blue-500 hover:text-blue-700"><LucidePlusCircle size={20} className="mx-auto" /></button>
                </div>
            );
        }
        return days;
    };
    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Avisos / Agenda</h2>
                <div className="flex items-center space-x-4">
                    <button onClick={handlePrevWeek} className="p-2 rounded-full hover:bg-gray-200"><LucideChevronLeft /></button>
                    <span className="text-lg font-semibold">{`${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`}</span>
                    <button onClick={handleNextWeek} className="p-2 rounded-full hover:bg-gray-200"><LucideChevronRight /></button>
                </div>
            </div>
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingEvent ? "Editar Aviso" : "Adicionar Aviso"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="block text-sm">Título</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 w-full border-gray-300 rounded-md" /></div>
                    <div><label className="block text-sm">Descrição</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows="3" className="mt-1 w-full border-gray-300 rounded-md" /></div>
                    <div><label className="block text-sm">Cor</label><select value={color} onChange={e => setColor(e.target.value)} className="mt-1 w-full border-gray-300 rounded-md">{Object.entries(colors).map(([key, { name }]) => <option key={key} value={key}>{name}</option>)}</select></div>
                    <div className="pt-4 flex justify-end space-x-2"><button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm rounded-md bg-gray-100">Cancelar</button><button type="submit" className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white">Salvar</button></div>
                </form>
            </Modal>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">{renderWeekDays()}</div>
        </div>
    );
};

const PlanejamentoOperacionalComponent = () => {
    const { funcionarios, listasAuxiliares, db, appId } = useContext(GlobalContext);
    const { ordens_servico: ordensDeServico } = listasAuxiliares;
    const veiculos = useMemo(() => (listasAuxiliares.veiculos || []).map(v => v.nome), [listasAuxiliares.veiculos]);
    const CATEGORIAS_PLANEJAMENTO = {
        externa: { title: 'EQUIPE PRODUÇÃO - EXTERNA', color: 'border-orange-500', headerBg: 'bg-orange-500' },
        interna: { title: 'EQUIPE PRODUÇÃO - INTERNA', color: 'border-green-600', headerBg: 'bg-green-600' },
        terceiros: { title: 'EQUIPE TERCEIROS', color: 'border-gray-600', headerBg: 'bg-gray-600' },
    };
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [planejamento, setPlanejamento] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBloco, setEditingBloco] = useState(null);
    const [formCategoria, setFormCategoria] = useState('');
    const [formVeiculo, setFormVeiculo] = useState('');
    const [formSupervisor, setFormSupervisor] = useState('');
    const [formAuxiliares, setFormAuxiliares] = useState([]);
    const [formHorarioSaida, setFormHorarioSaida] = useState('07:00');
    const [formTarefasManha, setFormTarefasManha] = useState([]);
    const [formTarefasTarde, setFormTarefasTarde] = useState([]);
    const [novaTarefaManha, setNovaTarefaManha] = useState({ osId: '', osText: '' });
    const [novaTarefaTarde, setNovaTarefaTarde] = useState({ osId: '', osText: '' });
    const planejamentoDocRef = useMemo(() =>
        selectedDate ? doc(db, `/artifacts/${appId}/public/data/planejamentos`, selectedDate) : null,
        [selectedDate, appId]
    );
    useEffect(() => {
        if (!planejamentoDocRef) {
            setPlanejamento([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const unsubscribe = onSnapshot(planejamentoDocRef, (docSnap) => {
            setPlanejamento(docSnap.exists() ? docSnap.data().blocos || [] : []);
            setIsLoading(false);
        }, err => {
            console.error("Erro ao buscar planejamento:", err);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [planejamentoDocRef]);
    const handleDateChange = (days) => {
        const currentDate = new Date(selectedDate);
        currentDate.setUTCDate(currentDate.getUTCDate() + days);
        setSelectedDate(currentDate.toISOString().split('T')[0]);
    };
    const resetForm = () => {
        setEditingBloco(null);
        setFormCategoria(''); setFormVeiculo(''); setFormSupervisor('');
        setFormAuxiliares([]); setFormHorarioSaida('07:00');
        setFormTarefasManha([]);
        setFormTarefasTarde([]);
        setNovaTarefaManha({ osId: '', osText: '' });
        setNovaTarefaTarde({ osId: '', osText: '' });
    };
    const handleOpenModal = (bloco = null, categoria = null) => {
        resetForm();
        if (bloco) {
            setEditingBloco(bloco);
            setFormCategoria(bloco.category || categoria || '');
            setFormVeiculo(bloco.veiculo || '');
            setFormSupervisor(bloco.supervisor || '');
            setFormAuxiliares(bloco.auxiliares || []);
            setFormHorarioSaida(bloco.horarioSaida || '07:00');
            setFormTarefasManha(bloco.tarefasManha || []);
            setFormTarefasTarde(bloco.tarefasTarde || []);
        } else {
            setFormCategoria(categoria || '');
        }
        setIsModalOpen(true);
    };
    const handleCloseModal = () => setIsModalOpen(false);
    const handleAddTask = (periodo) => {
        const novaTarefa = periodo === 'manha' ? novaTarefaManha : novaTarefaTarde;
        if (!novaTarefa.osId && !novaTarefa.osText.trim()) return;
        const tarefaComId = { ...novaTarefa, id: crypto.randomUUID() };
        if (periodo === 'manha') {
            setFormTarefasManha(prev => [...prev, tarefaComId]);
            setNovaTarefaManha({ osId: '', osText: '' });
        } else {
            setFormTarefasTarde(prev => [...prev, tarefaComId]);
            setNovaTarefaTarde({ osId: '', osText: '' });
        }
    };
    const handleRemoveTask = (periodo, taskId) => {
        if (periodo === 'manha') {
            setFormTarefasManha(prev => prev.filter(t => t.id !== taskId));
        } else {
            setFormTarefasTarde(prev => prev.filter(t => t.id !== taskId));
        }
    };
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!planejamentoDocRef || !formCategoria) {
            alert("A categoria da equipe é obrigatória.");
            return;
        }
        const newBloco = {
            id: editingBloco ? editingBloco.id : crypto.randomUUID(),
            category: formCategoria,
            veiculo: formVeiculo, supervisor: formSupervisor, auxiliares: formAuxiliares,
            horarioSaida: formHorarioSaida, 
            tarefasManha: formTarefasManha, 
            tarefasTarde: formTarefasTarde,
        };
        const updatedBlocos = editingBloco
            ? planejamento.map(b => b.id === editingBloco.id ? newBloco : b)
            : [...planejamento, newBloco];
        try {
            await setDoc(planejamentoDocRef, { blocos: updatedBlocos }, { merge: true });
            handleCloseModal();
        } catch (error) {
            console.error("Erro ao salvar planejamento:", error);
        }
    };
    const handleDeleteBloco = async (blocoId) => {
        if (!planejamentoDocRef || !window.confirm("Tem certeza que deseja excluir esta equipe do planejamento?")) return;
        const updatedBlocos = planejamento.filter(b => b.id !== blocoId);
        try {
            await setDoc(planejamentoDocRef, { blocos: updatedBlocos });
        } catch (error) {
            console.error("Erro ao excluir bloco de planejamento:", error);
        }
    };
    const TarefaBloco = ({ titulo, tarefas }) => {
        return (
            <div className="grid grid-cols-[80px_1fr] border-t border-gray-300">
                <div className="p-2 bg-gray-100 font-bold text-sm text-center flex items-center justify-center border-r border-gray-300">{titulo}</div>
                <div className="p-2 space-y-2">
                    {tarefas && tarefas.length > 0 ? (
                        tarefas.map((tarefa, index) => {
                            const os = tarefa.osId ? ordensDeServico.find(o => o.id === tarefa.osId) : null;
                            const textoTarefa = os ? '' : (tarefa.osText || 'N/A');
                            return (
                                <div key={tarefa.id || index} className="text-sm border-b border-gray-200 last:border-0 pb-2 mb-2">
                                    <p><strong className="font-semibold text-gray-600">CLIENTE:</strong> {os ? os.cliente : textoTarefa}</p>
                                    {os && <>
                                        <p><strong className="font-semibold text-gray-600">ENDEREÇO:</strong> {os.endereco} {os.bairro}</p>
                                        <p><strong className="font-semibold text-gray-600">O.S. | VEND.:</strong> {os.numeroOS} | {os.vendedorResp}</p>
                                    </>}
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-gray-400 text-sm p-2">Nenhuma tarefa para este período.</p>
                    )}
                </div>
            </div>
        );
    };
    const TaskInputSection = ({ title, tasks, novaTarefa, setNovaTarefa, onAddTask, onRemoveTask }) => {
        const getTaskDisplayName = (task) => {
            if (task.osId) {
                const os = ordensDeServico.find(o => o.id === task.osId);
                return os ? `${os.numeroOS} | ${os.cliente}` : 'O.S. inválida';
            }
            return task.osText;
        };
        return (
            <div className="bg-gray-50 p-3 rounded-lg border">
                <h4 className="font-semibold text-lg mb-2">{title}</h4>
                <div className="space-y-2 mb-3">
                    {tasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between bg-white p-2 border rounded-md shadow-sm">
                            <span className="text-sm">{getTaskDisplayName(task)}</span>
                            <button type="button" onClick={() => onRemoveTask(task.id)} className="text-red-500 hover:text-red-700">
                                <LucideX size={16} />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="space-y-2">
                    <label className="block text-sm">O.S. | Cliente</label>
                    <select value={novaTarefa.osId} onChange={e => setNovaTarefa({ osId: e.target.value, osText: '' })} className="w-full border-gray-300 rounded-md">
                        <option value="">Selecione O.S. ou digite abaixo</option>
                        {ordensDeServico.map(os => <option key={os.id} value={os.id}>{os.numeroOS} | {os.cliente}</option>)}
                    </select>
                    <input type="text" placeholder="Ou digite uma tarefa customizada" value={novaTarefa.osText} disabled={!!novaTarefa.osId} onChange={e => setNovaTarefa({ osId: '', osText: e.target.value })} className="w-full border-gray-300 rounded-md disabled:bg-gray-200" />
                </div>
                <button type="button" onClick={onAddTask} className="mt-2 w-full text-sm py-1 px-3 rounded-md bg-blue-100 text-blue-800 hover:bg-blue-200">
                    Adicionar Tarefa
                </button>
            </div>
        );
    };
    return (
        <div className="p-4 md:p-6 bg-gray-100 min-h-full">
             <div className="flex justify-between items-center mb-6 no-print">
                 <h2 className="text-2xl font-semibold text-gray-800">Planejamento Operacional</h2>
                 <div className="flex items-center gap-4">
                     <button onClick={() => handleDateChange(-1)} className="p-2 rounded-full hover:bg-gray-200"><LucideChevronLeft/></button>
                     <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="border border-gray-300 rounded-md shadow-sm p-2"/>
                     <button onClick={() => handleDateChange(1)} className="p-2 rounded-full hover:bg-gray-200"><LucideChevronRight/></button>
                     <button onClick={() => window.print()} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md flex items-center shadow-sm"><LucidePrinter size={20} className="mr-2"/> Imprimir</button>
                 </div>
             </div>
             <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingBloco ? "Editar Equipe" : "Adicionar Equipe ao Planejamento"} width="max-w-4xl">
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4">
                        <div>
                            <label className="block text-sm font-medium">Categoria da Equipe</label>
                            <select value={formCategoria} onChange={e => setFormCategoria(e.target.value)} required className="mt-1 w-full border-gray-300 rounded-md shadow-sm">
                                <option value="" disabled>Selecione...</option>
                                {Object.entries(CATEGORIAS_PLANEJAMENTO).map(([key, { title }]) => (<option key={key} value={key}>{title}</option>))}
                            </select>
                        </div>
                         <div><label className="block text-sm">Veículo / Equipe</label><select value={formVeiculo} onChange={e => setFormVeiculo(e.target.value)} required className="mt-1 w-full border-gray-300 rounded-md"><option value="">Selecione...</option>{veiculos.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                         <div><label className="block text-sm">Supervisor Responsável</label><select value={formSupervisor} onChange={e => setFormSupervisor(e.target.value)} required className="mt-1 w-full border-gray-300 rounded-md"><option value="">Selecione...</option>{funcionarios.map(f => <option key={f.id} value={f.nome}>{f.nome}</option>)}</select></div>
                         <div><label className="block text-sm">Horário Saída</label><input type="time" value={formHorarioSaida} onChange={e => setFormHorarioSaida(e.target.value)} className="mt-1 w-full border-gray-300 rounded-md"/></div>
                         <div className="md:col-span-2"><label className="block text-sm">Auxiliares</label><select multiple value={formAuxiliares} onChange={e => setFormAuxiliares(Array.from(e.target.selectedOptions, option => option.value))} className="mt-1 w-full border-gray-300 rounded-md h-24">{funcionarios.map(f => <option key={f.id} value={f.nome}>{f.nome}</option>)}</select></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        <TaskInputSection title="Tarefas Manhã" tasks={formTarefasManha} novaTarefa={novaTarefaManha} setNovaTarefa={setNovaTarefaManha} onAddTask={() => handleAddTask('manha')} onRemoveTask={(taskId) => handleRemoveTask('manha', taskId)} />
                        <TaskInputSection title="Tarefas Tarde" tasks={formTarefasTarde} novaTarefa={novaTarefaTarde} setNovaTarefa={setNovaTarefaTarde} onAddTask={() => handleAddTask('tarde')} onRemoveTask={(taskId) => handleRemoveTask('tarde', taskId)} />
                    </div>
                    <div className="pt-4 flex justify-end"><button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Salvar Planejamento</button></div>
                </form>
             </Modal>
            <div className="space-y-8">
                {isLoading ? <p className="text-center text-gray-500 py-8">Carregando planejamento...</p> : 
                    Object.entries(CATEGORIAS_PLANEJAMENTO).map(([key, { title, color, headerBg }]) => {
                        const blocosDaCategoria = planejamento.filter(b => b.category === key);
                        return (
                            <section key={key}>
                                <header className="flex justify-between items-center mb-3">
                                    <h3 className={`text-xl font-bold ${headerBg} text-white px-4 py-1`}>{title}</h3>
                                    <button onClick={() => handleOpenModal(null, key)} className="bg-white hover:bg-gray-200 text-gray-700 font-semibold py-2 px-3 border border-gray-300 rounded-md flex items-center shadow-sm text-sm">
                                        <LucidePlusCircle size={16} className="mr-2"/> Adicionar
                                    </button>
                                </header>
                                <div className="space-y-4">
                                {blocosDaCategoria.length === 0 ? (
                                    <p className="text-gray-500 text-sm p-4 border-2 border-dashed rounded-md text-center">Nenhuma equipe adicionada para esta categoria.</p>
                                ) : (
                                    blocosDaCategoria.map(bloco => (
                                        <div key={bloco.id} className={`bg-white shadow-md rounded-lg border-t-8 ${color} text-sm`}>
                                            <header className={`p-2 ${headerBg} text-white flex justify-between items-center rounded-t-md`}>
                                                <h4 className="font-bold text-lg">{bloco.veiculo}</h4>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleOpenModal(bloco, key)} className="text-white hover:text-yellow-300" title="Editar"><LucideEdit size={16}/></button>
                                                    <button onClick={() => handleDeleteBloco(bloco.id)} className="text-white hover:text-red-400" title="Excluir"><LucideTrash2 size={16}/></button>
                                                </div>
                                            </header>
                                            <div className="p-2 bg-yellow-50 border-b border-gray-300">
                                                <div className="grid grid-cols-3 gap-x-4">
                                                    <div><strong className="font-semibold text-gray-600">SUPERVISOR RESP:</strong> {bloco.supervisor}</div>
                                                    <div><strong className="font-semibold text-gray-600">AUXILIARES:</strong> {bloco.auxiliares.join(', ')}</div>
                                                    <div><strong className="font-semibold text-gray-600">HORÁRIO SAÍDA:</strong> {bloco.horarioSaida}</div>
                                                </div>
                                            </div>
                                            <TarefaBloco titulo="OBRAS MANHÃ" tarefas={bloco.tarefasManha} />
                                            <TarefaBloco titulo="OBRAS TARDE" tarefas={bloco.tarefasTarde} />
                                        </div>
                                    ))
                                )}
                                </div>
                            </section>
                        );
                })}
            </div>
        </div>
    );
};

const ControleEquipesComponent = () => (<div className="p-6"><h2 className="text-2xl font-semibold">Controle de Equipes</h2><p className="mt-2 text-gray-600">Funcionalidade em desenvolvimento.</p></div>);

function App() {
    const [currentPage, setCurrentPage] = useState('cadastro_os');
    const { currentUser, isLoading } = useContext(GlobalContext);
    if (!currentUser) {
        return <AuthComponent />;
    }
    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><div className="text-xl">Carregando dados da aplicação...</div></div>;
    }
    const PageContent = () => {
        switch (currentPage) {
            case 'cadastro_os': return <CadastroOrdensServicoComponent />;
            case 'planejamento_op': return <PlanejamentoOperacionalComponent />;
            case 'listagem_envelopes': return <ListagemEnvelopesComponent />;
            case 'listagem_acessos': return <ListagemAcessosComponent />;
            case 'avisos_agenda': return <AvisosAgendaComponent />;
            case 'controle_equipes': return <ControleEquipesComponent />;
            case 'config': return <ConfiguracoesComponent />;
            default: return <CadastroOrdensServicoComponent />;
        }
    };
    const NavLink = memo(({ page, children, icon: Icon }) => (
        <button
            onClick={() => setCurrentPage(page)}
            className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out w-full text-left ${currentPage === page ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-blue-100 hover:text-blue-700'}`}
        >
            {Icon && <Icon size={18} className="mr-3 flex-shrink-0" />}
            {children}
        </button>
    ));
    NavLink.displayName = 'NavLink';
    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            <aside className="w-64 bg-white shadow-lg flex flex-col p-4 space-y-2 border-r border-gray-200">
                <div className="mb-4 p-2 text-center">
                    <img src={LOGO_URL} alt="Logo Gramoterra" className="mx-auto h-12 w-auto mb-2" onError={(e) => e.target.style.display = 'none'} />
                    <h1 className="text-xl font-semibold text-gray-700">Gestor de Operações</h1>
                </div>
                <nav className="flex-grow space-y-1">
                    <NavLink page="cadastro_os" icon={LucideClipboardPlus}>Ordens de Serviço</NavLink>
                    <NavLink page="planejamento_op" icon={LucideCalendarCog}>Planejamento</NavLink>
                    <NavLink page="listagem_envelopes" icon={LucideMail}>Envelopes</NavLink>
                    <NavLink page="listagem_acessos" icon={LucideKeyRound}>Acessos</NavLink>
                    <NavLink page="avisos_agenda" icon={LucideBellRing}>Avisos/Agenda</NavLink>
                    <NavLink page="controle_equipes" icon={LucideUsersRound}>Controle de Equipes</NavLink>
                    <hr className="my-2 border-gray-200" />
                    <NavLink page="config" icon={LucideSettings}>Configurações</NavLink>
                </nav>
                <div className="mt-auto">
                    {currentUser && (
                        <p className="text-xs text-gray-500 mb-2 px-2 truncate">
                            Logado como: {currentUser.isAnonymous ? "Anônimo" : currentUser.email || currentUser.uid}
                        </p>
                    )}
                    <button onClick={() => { signOut(auth); }} className="w-full flex items-center justify-center px-3 py-2.5 text-sm font-medium rounded-md text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors duration-150 ease-in-out">
                        <LucideLogOut size={18} className="mr-2" /> Sair
                    </button>
                </div>
            </aside>
            <main className="flex-1 overflow-y-auto">
                <PageContent />
            </main>
        </div>
    );
}

export default function WrappedApp() {
    return (
        <GlobalProvider>
            <App />
        </GlobalProvider>
    );
}