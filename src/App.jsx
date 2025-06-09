import React, { useState, useEffect, createContext, useContext, memo, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, getDocs, getDoc, setDoc, deleteDoc, onSnapshot, query, where, Timestamp, writeBatch, updateDoc, orderBy } from 'firebase/firestore';
import {
    LucidePlusCircle, LucideEdit, LucideTrash2, LucideCalendarDays, LucideClipboardList,
    LucideSettings, LucideLogOut, LucidePrinter, LucideUserCog, LucideCar, 
    LucideClock4, LucideChevronLeft, LucideChevronRight, LucideMail, LucideKeyRound, 
    LucideBellRing, LucideUsersRound, LucideSave, LucideClipboardPlus, LucideCalendarCog
} from 'lucide-react';

// --- INICIALIZAÇÃO DO FIREBASE ---
let app;
let auth;
let db;
let appId = 'default-app-id';

try {
  // eslint-disable-next-line no-undef
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    // eslint-disable-next-line no-undef
    const firebaseConfig = JSON.parse(__firebase_config);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    // eslint-disable-next-line no-undef
    appId = typeof __app_id !== 'undefined' ? __app_id : firebaseConfig.projectId;
  } else {
      console.warn("Variável de configuração do Firebase não encontrada.");
  }
} catch (error) {
    console.error("Erro ao inicializar o Firebase: ", error);
}
// --- FIM DA INICIALIZAÇÃO ---

// Contexto Global
const GlobalContext = createContext();

// Constantes
const LOGO_URL = "https://gramoterra.com.br/assets/images/misc/Logo%20Gramoterra-02.png";

// Função auxiliar para formatar data
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

const GlobalProvider = ({ children }) => {
    const VENDEDORES_INICIAIS = [
        "DANIELE RAMOS", "JOÃO CAMBRUZZI", "LILIAN", "FABIANE MENEGAZ",
        "BRUNA COLOMBO", "MARCELO COLOMBO", "MARCIO COLOMBO", "DANIELE COLOMBO", "JOÃO PEDRO"
    ];

    const VEICULOS_INICIAIS = [
        "IQZ2697 - TRANSIT", "IUX9342 - SCANIA", "ISI3076 - M. BRANCO 01", "ITO7943 - M. CINZA",
        "JAO7A46 - M. BRANCO", "JBQ2C94 - FOTON", "ISK4548 - JCB / RETRO", "ILU8022 - TERCEIRIZADO",
        "IYX1110 - SAVEIRO", "KXM3763 - SAVEIRO", "IQW3678 - SAVEIRO", "ITN4590 - SAVEIRO",
        "KXM3763 - SAVEIRO LOJA", "IVP3G54 - SAVEIRO MARBELA", "IUO5D74 - STRADA",
        "ISX6G68 - FIESTA", "IVZ0630 - F. AZUL", "TERCEIRIZADO"
    ];

    const TURNOS_INICIAIS = [
        "MANHÃ", "TARDE", "NOITE", "DIA INTEIRO"
    ];
    
    const CATEGORIAS_PESSOAS_INICIAIS = [
        "PRODUÇÃO", "PÁTIO", "VENDEDORES", "MADEIRA", "TERCEIRIZADO", "BIOLOGO"
    ];

    const DADOS_INICIAIS_CONFIG = {
        responsaveis: VENDEDORES_INICIAIS, 
        veiculos: VEICULOS_INICIAIS,
        turnos: TURNOS_INICIAIS,
        categorias_pessoas: CATEGORIAS_PESSOAS_INICIAIS,
    };

    const [currentUser, setCurrentUser] = useState(null);
    const [userId, setUserId] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [funcionarios, setFuncionarios] = useState([]); 
    const [listasAuxiliares, setListasAuxiliares] = useState({
        veiculos: [],
        turnos: [],
        categorias_pessoas: [],
        ordens_servico: []
    });
    const [initialDataSeeded, setInitialDataSeeded] = useState(false);

    useEffect(() => {
        if (!auth) {
            setLoadingAuth(false);
            return;
        }
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);
                setUserId(user.uid);
            } else {
                 try {
                     await signInAnonymously(auth);
                } catch (error) {
                    console.error("GlobalProvider: Erro no login anônimo:", error);
                }
                const finalUser = auth.currentUser;
                setCurrentUser(finalUser);
                setUserId(finalUser ? finalUser.uid : crypto.randomUUID());
            }
            setLoadingAuth(false); 
        });
        return () => unsubscribe();
    }, []); 

    useEffect(() => {
        if (!userId || !db || !appId || initialDataSeeded) return;

        const seedAllData = async () => {
            const basePath = `/artifacts/${appId}/public/data`;
            
            const funcCollectionRef = collection(db, `${basePath}/funcionarios`);
            const funcSnap = await getDocs(query(funcCollectionRef));
            if (funcSnap.empty) {
                const batch = writeBatch(db);
                DADOS_INICIAIS_CONFIG.responsaveis.forEach(nomeFunc => {
                    const nomeIdFormatado = nomeFunc.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^\w-]/g, ''); 
                    const funcDocRef = doc(funcCollectionRef, nomeIdFormatado);
                    batch.set(funcDocRef, { nome: nomeFunc.trim().toUpperCase(), categoria: "VENDEDORES" }); 
                });
                await batch.commit();
            }

            const listas = [
                { key: 'veiculos', data: VEICULOS_INICIAIS },
                { key: 'turnos', data: TURNOS_INICIAIS },
                { key: 'categorias_pessoas', data: CATEGORIAS_PESSOAS_INICIAIS }
            ];

            for (const lista of listas) {
                const itemsRef = collection(db, `${basePath}/listas_auxiliares/${lista.key}/items`);
                const itemsSnap = await getDocs(query(itemsRef));
                if (itemsSnap.empty) {
                    const batch = writeBatch(db);
                    lista.data.forEach(item => {
                        const newItemRef = doc(itemsRef);
                        batch.set(newItemRef, { nome: item.toUpperCase() });
                    });
                    await batch.commit();
                }
            }
            setInitialDataSeeded(true);
        };
        
        seedAllData().catch(console.error);
    }, [userId, db, appId, initialDataSeeded]);

    useEffect(() => {
        if (!userId || !db || !appId) return;

        const basePath = `/artifacts/${appId}/public/data`;
        const unsubscribers = [];

        const qFuncionarios = query(collection(db, `${basePath}/funcionarios`), orderBy("nome"));
        unsubscribers.push(onSnapshot(qFuncionarios, (snapshot) => {
            setFuncionarios(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }, error => console.error("Erro ao carregar Pessoas:", error)));

        const qOS = query(collection(db, `${basePath}/ordens_servico`), orderBy("numeroOS", "desc"));
         unsubscribers.push(onSnapshot(qOS, (snapshot) => {
            setListasAuxiliares(prev => ({...prev, ordens_servico: snapshot.docs.map(d => ({ id: d.id, ...d.data() }))}));
        }, error => console.error("Erro ao carregar Ordens de Serviço:", error)));

        const listasParaCarregar = ['veiculos', 'turnos', 'categorias_pessoas']; 
        listasParaCarregar.forEach(listaName => {
            const qLista = query(collection(db, `${basePath}/listas_auxiliares/${listaName}/items`), orderBy("nome"));
            unsubscribers.push(onSnapshot(qLista, (snapshot) => {
                setListasAuxiliares(prev => ({ ...prev, [listaName]: snapshot.docs.map(d => d.data().nome) }));
            }, error => console.error(`Erro ao carregar ${listaName}:`, error)));
        });

        return () => unsubscribers.forEach(unsub => unsub());
    }, [userId, db, appId]);


    if (loadingAuth) { 
        return <div className="flex justify-center items-center h-screen"><div className="text-xl">Carregando aplicação...</div></div>;
    }

    return (
        <GlobalContext.Provider value={{
            currentUser,
            userId: currentUser?.uid,
            db,
            auth,
            appId,
            listasAuxiliares, 
            funcionarios, 
        }}>
            {children}
        </GlobalContext.Provider>
    );
};

// Componente de Autenticação Simples
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
        if (!auth) {
            setError("Serviço de autenticação não está disponível.");
            setLoading(false);
            return;
        }
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
                    <div className="flex items-center justify-between"><button className={`w-full ${loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-700'} text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline`} type="submit" disabled={loading || !auth}>{loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Registrar')}</button></div>
                </form>
                <p className="text-center text-sm text-gray-600 mt-6">{isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}<button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="font-bold text-blue-500 hover:text-blue-700 ml-1">{isLogin ? 'Registre-se' : 'Faça Login'}</button></p>
                <p className="text-center text-xs text-gray-500 mt-4">Se o login anônimo estiver ativo, você pode ser logado automaticamente.</p>
            </div>
        </div>
    );
};


// Componente Modal Genérico
const Modal = ({ isOpen, onClose, title, children, width = "max-w-2xl" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className={`bg-white rounded-lg shadow-xl w-full ${width} max-h-[90vh] flex flex-col`}><div className="flex justify-between items-center p-4 border-b"><h3 className="text-xl font-semibold">{title}</h3><button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button></div><div className="p-4 overflow-y-auto">{children}</div></div>
        </div>
    );
};

// --- COMPONENTES DA APLICAÇÃO (DEFINIDOS ANTES DE SEREM USADOS) ---

const CadastroOrdensServicoComponent = () => {
    const { db, appId, funcionarios, userId } = useContext(GlobalContext);
    const [ordensServico, setOrdensServico] = useState([]);
    const [isLoading, setIsLoading] = useState(true); 
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingOS, setEditingOS] = useState(null);

    const [numeroOS, setNumeroOS] = useState('');
    const [cliente, setCliente] = useState('');
    const [endereco, setEndereco] = useState('');
    const [bairro, setBairro] = useState('');
    const [cidadeEstado, setCidadeEstado] = useState('');
    const [vendedorResp, setVendedorResp] = useState('');
    const [dataCadastro, setDataCadastro] = useState(new Date().toISOString().split('T')[0]);

    const ordensServicoCollectionRef = useMemo(() => {
        if (db && appId && appId !== 'default-app-id-fallback') {
            return collection(db, `/artifacts/${appId}/public/data/ordens_servico`);
        }
        return null;
    }, [db, appId]);

    useEffect(() => {
        if (!ordensServicoCollectionRef) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true); 
        const q = query(ordensServicoCollectionRef, orderBy("dataCadastro", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedOrdens = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setOrdensServico(fetchedOrdens);
            setIsLoading(false); 
        }, (error) => {
            console.error("CadastroOS: Erro ao buscar ordens:", error);
            setIsLoading(false); 
        });

        return () => unsubscribe();
    }, [ordensServicoCollectionRef]); 

    const resetForm = () => {
        setNumeroOS(''); setCliente(''); setEndereco(''); setBairro('');
        setCidadeEstado(''); setVendedorResp('');
        setDataCadastro(new Date().toISOString().split('T')[0]);
        setEditingOS(null);
    };

    const handleOpenForm = (os = null) => {
        if (os) {
            setEditingOS(os);
            setNumeroOS(os.numeroOS || ''); setCliente(os.cliente || ''); setEndereco(os.endereco || '');
            setBairro(os.bairro || ''); setCidadeEstado(os.cidadeEstado || ''); setVendedorResp(os.vendedorResp || '');
            setDataCadastro(os.dataCadastro instanceof Timestamp ? os.dataCadastro.toDate().toISOString().split('T')[0] : (os.dataCadastro || new Date().toISOString().split('T')[0]));
        } else {
            resetForm();
        }
        setIsFormOpen(true);
    };

    const handleCloseForm = () => { setIsFormOpen(false); resetForm(); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!ordensServicoCollectionRef) return;
        const osData = {
            numeroOS, cliente, endereco, bairro, cidadeEstado, vendedorResp,
            dataCadastro: Timestamp.fromDate(new Date(dataCadastro + "T00:00:00Z")),
            lastUpdated: Timestamp.now(),
            criadoPor: editingOS ? editingOS.criadoPor : userId,
            atualizadoPor: userId
        };

        try {
            if (editingOS) {
                await updateDoc(doc(ordensServicoCollectionRef, editingOS.id), osData);
            } else {
                await addDoc(ordensServicoCollectionRef, { ...osData, criadoEm: Timestamp.now() });
            }
            handleCloseForm();
        } catch (error) {
            console.error("Erro ao salvar Ordem de Serviço: ", error);
        }
    };
    
    const handleDeleteOS = async (osId) => {
        if (!ordensServicoCollectionRef) return;
        if (window.confirm("Tem certeza que deseja excluir esta Ordem de Serviço?")) { 
            try { await deleteDoc(doc(ordensServicoCollectionRef, osId)); } 
            catch (error) { console.error("Erro ao excluir Ordem de Serviço:", error); }
        }
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Ordens de Serviço</h2>
                <button onClick={() => handleOpenForm()} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md flex items-center shadow-sm"><LucidePlusCircle size={20} className="mr-2" /> Nova O.S.</button>
            </div>
            {isFormOpen && (
                <Modal isOpen={isFormOpen} onClose={handleCloseForm} title={editingOS ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"} width="max-w-3xl">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label htmlFor="numeroOS" className="block text-sm font-medium text-gray-700">Número O.S.</label><input type="text" id="numeroOS" value={numeroOS} onChange={(e) => setNumeroOS(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"/></div>
                            <div><label htmlFor="dataCadastro" className="block text-sm font-medium text-gray-700">Data Cadastro</label><input type="date" id="dataCadastro" value={dataCadastro} onChange={(e) => setDataCadastro(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"/></div>
                        </div>
                        <div><label htmlFor="cliente" className="block text-sm font-medium text-gray-700">Cliente</label><input type="text" id="cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"/></div>
                        <div><label htmlFor="endereco" className="block text-sm font-medium text-gray-700">Endereço</label><input type="text" id="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"/></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label htmlFor="bairro" className="block text-sm font-medium text-gray-700">Bairro</label><input type="text" id="bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"/></div>
                            <div><label htmlFor="cidadeEstado" className="block text-sm font-medium text-gray-700">Cidade/Estado</label><input type="text" id="cidadeEstado" value={cidadeEstado} onChange={(e) => setCidadeEstado(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"/></div>
                        </div>
                        <div><label htmlFor="vendedorResp" className="block text-sm font-medium text-gray-700">Vendedor Responsável</label><select id="vendedorResp" value={vendedorResp} onChange={(e) => setVendedorResp(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"><option value="">Selecione...</option>{funcionarios.map(f => <option key={f.id} value={f.nome}>{f.nome}</option>)}</select></div>
                        <div className="pt-4 flex justify-end space-x-2"><button type="button" onClick={handleCloseForm} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button><button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center"><LucideSave size={16} className="mr-2" /> {editingOS ? "Atualizar O.S." : "Salvar O.S."}</button></div>
                    </form>
                </Modal>
            )}
            <div className="bg-white shadow-md rounded-lg overflow-x-auto mt-6">
                <table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-100"><tr>{["O.S.", "Cliente", "Endereço", "Bairro", "Cidade/Estado", "Vendedor Resp.", "Cadastro", "Ações"].map(header => (<th key={header} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">{header}</th>))}</tr></thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (<tr><td colSpan="8" className="px-4 py-4 text-center text-gray-500">Carregando ordens de serviço...</td></tr>) : ordensServico.length === 0 ? (<tr><td colSpan="8" className="px-4 py-4 text-center text-gray-500">Nenhuma ordem de serviço cadastrada.</td></tr>) : (ordensServico.map((os) => (<tr key={os.id} className="hover:bg-gray-50"><td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">{os.numeroOS}</td><td className="px-4 py-3 text-sm text-gray-700 whitespace-normal break-words max-w-xs">{os.cliente}</td><td className="px-4 py-3 text-sm text-gray-700 whitespace-normal break-words max-w-xs">{os.endereco}</td><td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{os.bairro}</td><td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{os.cidadeEstado}</td><td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{os.vendedorResp}</td><td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDate(os.dataCadastro)}</td><td className="px-4 py-3 text-sm font-medium whitespace-nowrap"><button onClick={() => handleOpenForm(os)} title="Editar" className="text-blue-600 hover:text-blue-800 mr-2"><LucideEdit size={16}/></button><button onClick={() => handleDeleteOS(os.id)} title="Excluir" className="text-red-600 hover:text-red-800"><LucideTrash2 size={16}/></button></td></tr>)))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ListagemEnvelopesComponent = () => {
    const { db, appId, userId } = useContext(GlobalContext);
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

    const envelopesCollectionRef = useMemo(() => {
        if (db && appId && appId !== 'default-app-id-fallback') {
            return collection(db, `/artifacts/${appId}/public/data/envelopes`);
        }
        return null;
    }, [db, appId]);

    useEffect(() => {
        if (!envelopesCollectionRef) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const q = query(envelopesCollectionRef, orderBy("numeroEnvelope", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedEnvelopes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEnvelopes(fetchedEnvelopes);
            setIsLoading(false);
        }, (error) => {
            console.error("Erro ao buscar envelopes:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [envelopesCollectionRef]);

    const resetForm = () => {
        setNumeroEnvelope(''); setDataServico(''); setOrdemServico(''); setCidade(''); setResponsaveis('');
        setValorDiaria(''); setDetalhesDiaria(''); setObservacoes(''); setEditingEnvelope(null);
    };

    const handleOpenModal = (envelope = null) => {
        if (envelope) {
            setEditingEnvelope(envelope);
            setNumeroEnvelope(envelope.numeroEnvelope || '');
            setDataServico(envelope.dataServico instanceof Timestamp ? envelope.dataServico.toDate().toISOString().split('T')[0] : '');
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
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!envelopesCollectionRef) return;

        const envelopeData = {
            numeroEnvelope: numeroEnvelope || 'N/A', 
            dataServico: Timestamp.fromDate(new Date(dataServico + "T00:00:00Z")),
            ordemServico, cidade, responsaveis, valorDiaria, detalhesDiaria, observacoes,
            lastUpdated: Timestamp.now(),
            criadoPor: editingEnvelope ? editingEnvelope.criadoPor : userId,
            atualizadoPor: userId
        };

        try {
            if (editingEnvelope) {
                await updateDoc(doc(envelopesCollectionRef, editingEnvelope.id), envelopeData);
            } else {
                await addDoc(envelopesCollectionRef, { ...envelopeData, criadoEm: Timestamp.now() });
            }
            handleCloseModal();
        } catch (error) {
            console.error("Erro ao salvar envelope:", error);
        }
    };

    const handleDelete = async (id) => {
        if (!envelopesCollectionRef) return;
        if (window.confirm("Tem certeza que deseja excluir este envelope?")) {
            try {
                await deleteDoc(doc(envelopesCollectionRef, id));
            } catch (error) {
                console.error("Erro ao excluir envelope:", error);
            }
        }
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Listagem de Envelopes</h2>
                <button onClick={() => handleOpenModal()} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md flex items-center shadow-sm">
                    <LucidePlusCircle size={20} className="mr-2" /> Novo Envelope
                </button>
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
                    <thead className="bg-gray-100">
                        <tr>
                            {["N°", "Data Serviço", "O.S", "Cidade", "Responsável", "Diária (R$)", "Detalhes Diária", "OBS", "Ações"].map(header => (
                                <th key={header} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                            <tr><td colSpan="9" className="px-4 py-4 text-center text-gray-500">Carregando envelopes...</td></tr>
                        ) : envelopes.length === 0 ? (
                            <tr><td colSpan="9" className="px-4 py-4 text-center text-gray-500">Nenhum envelope cadastrado.</td></tr>
                        ) : (
                            envelopes.map((env) => (
                                <tr key={env.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">{env.numeroEnvelope}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDate(env.dataServico)}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{env.ordemServico}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{env.cidade}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-normal break-words max-w-xs">{env.responsaveis}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{env.valorDiaria}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-normal break-words max-w-xs">{env.detalhesDiaria}</td>
                                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-normal break-words max-w-xs">{env.observacoes}</td>
                                    <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                                        <button onClick={() => handleOpenModal(env)} title="Editar" className="text-blue-600 hover:text-blue-800 mr-2"><LucideEdit size={16}/></button>
                                        <button onClick={() => handleDelete(env.id)} title="Excluir" className="text-red-600 hover:text-red-800"><LucideTrash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ListagemAcessosComponent = () => {
    const { db, appId } = useContext(GlobalContext);
    const [colaboradores, setColaboradores] = useState([]);
    const [veiculos, setVeiculos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dataExecucao, setDataExecucao] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (!db || !appId || appId === 'default-app-id-fallback') {
            setIsLoading(false);
            return;
        }

        let isStillMounted = true;
        
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const funcQuery = query(collection(db, `/artifacts/${appId}/public/data/funcionarios`), orderBy("nome"));
                const funcSnapshot = await getDocs(funcQuery);
                const fetchedColaboradores = funcSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const veicQuery = query(collection(db, `/artifacts/${appId}/public/data/listas_auxiliares/veiculos/items`), orderBy("nome"));
                const veicSnapshot = await getDocs(veicQuery);
                const fetchedVeiculos = veicSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), categoria: 'VEICULO' }));
                
                if (isStillMounted) {
                    setColaboradores(fetchedColaboradores);
                    setVeiculos(fetchedVeiculos);
                }

            } catch (error) {
                console.error("Erro ao buscar dados para Acessos:", error);
            } finally {
                if (isStillMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            isStillMounted = false;
        };
    }, [db, appId]);

    const groupedData = useMemo(() => {
        const allData = [...colaboradores, ...veiculos];
        if (allData.length === 0) return {};
        
        const grouped = allData.reduce((acc, item) => {
            const category = (item.categoria || 'SEM CATEGORIA').toUpperCase();
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(item);
            return acc;
        }, {});
        return grouped;
    }, [colaboradores, veiculos]);

    const handlePrint = () => {
        window.print();
    };

    const categoryOrder = ['PRODUÇÃO', 'PÁTIO', 'VENDEDORES', 'MADEIRA', 'TERCEIRIZADO', 'BIOLOGO', 'VEICULO', 'SEM CATEGORIA'];
    
    return (
        <div className="p-4 md:p-6 bg-gray-100 min-h-full">
            <style>{`@media print { body * { visibility: hidden; } #printable-area, #printable-area * { visibility: visible; } #printable-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; } .no-print { display: none; }}`}</style>
            <div className="flex justify-between items-center mb-6 no-print">
                 <h2 className="text-2xl font-semibold text-gray-800">Controle de Acessos</h2>
                 <div className="flex items-center gap-4">
                     <div>
                        <label htmlFor="dataExecucao" className="block text-sm font-medium text-gray-700">Data de Execução</label>
                        <input type="date" id="dataExecucao" value={dataExecucao} onChange={(e) => setDataExecucao(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"/>
                     </div>
                     <button onClick={handlePrint} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md flex items-center shadow-sm self-end">
                        <LucidePrinter size={20} className="mr-2"/> Imprimir
                     </button>
                 </div>
            </div>

            {isLoading ? (
                 <div className="text-center p-10">
                    <p>Carregando dados de colaboradores e veículos...</p>
                 </div>
            ) : (
                <div id="printable-area" className="bg-white p-6 shadow-lg rounded-md">
                    <header className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
                        <div>
                            <img src={LOGO_URL} alt="Logo Gramoterra" className="h-16 w-auto" onError={(e) => e.target.style.display='none'}/>
                        </div>
                        <div className="text-right">
                             <h1 className="text-2xl font-bold">Listagem de Colaboradores</h1>
                             <p className="text-sm">Data Execução: {formatDate(dataExecucao)}</p>
                             <p className="text-sm text-gray-500">O.S.: (Informação da OS aqui)</p>
                             <p className="text-sm text-gray-500">Cliente: (Informação do Cliente aqui)</p>
                        </div>
                    </header>

                    <main>
                       {categoryOrder.map(category => {
                           if (!groupedData[category] || groupedData[category].length === 0) return null;

                           return (
                               <div key={category} className="mb-6 break-inside-avoid">
                                   <h3 className="text-lg font-bold bg-gray-200 px-2 py-1 mb-2">{category}</h3>
                                   <table className="min-w-full text-sm">
                                       <thead>
                                            <tr className="border-b">
                                                <th className="w-10 px-2 py-1 text-left"></th> 
                                                <th className="px-2 py-1 text-left font-semibold">COLABORADOR / VEÍCULO</th>
                                                <th className="px-2 py-1 text-left font-semibold">CPF</th>
                                                <th className="px-2 py-1 text-left font-semibold">RG</th>
                                            </tr>
                                       </thead>
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
    const { db, appId, userId } = useContext(GlobalContext);
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

    const agendaCollectionRef = useMemo(() => {
        if (db && appId && appId !== 'default-app-id-fallback') {
            return collection(db, `/artifacts/${appId}/public/data/agenda_avisos`);
        }
        return null;
    }, [db, appId]);

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
        if (!agendaCollectionRef) return;
    
        const startTimestamp = Timestamp.fromDate(startOfWeek);
        const endTimestamp = Timestamp.fromDate(new Date(endOfWeek.getTime() + 24 * 60 * 60 * 1000));
    
        const q = query(
            agendaCollectionRef,
            where("date", ">=", startTimestamp),
            where("date", "<", endTimestamp)
        );
    
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const weekEvents = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                const eventDate = data.date.toDate();
                const dateKey = eventDate.toISOString().split('T')[0];
                if (!weekEvents[dateKey]) {
                    weekEvents[dateKey] = [];
                }
                weekEvents[dateKey].push({ id: doc.id, ...data });
            });
            setEvents(weekEvents);
        }, (error) => {
            console.error("Erro ao buscar eventos da agenda:", error);
        });
    
        return () => unsubscribe();
    }, [agendaCollectionRef, startOfWeek, endOfWeek]);

    const handlePrevWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };
    
    const handleOpenModal = (date, event = null) => {
        setSelectedDate(date);
        if (event) {
            setEditingEvent(event);
            setTitle(event.title);
            setDescription(event.description);
            setColor(event.color);
        } else {
            setEditingEvent(null);
            setTitle('');
            setDescription('');
            setColor('blue');
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!agendaCollectionRef) return;
        
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
        } catch(error) {
            console.error("Erro ao salvar evento:", error);
        }
    };
    
    const handleDelete = async (eventId) => {
        if(!agendaCollectionRef) return;
        if(window.confirm("Tem certeza que deseja excluir este aviso?")) {
            await deleteDoc(doc(agendaCollectionRef, eventId));
        }
    }

    const renderWeekDays = () => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(day.getDate() + i);
            const dateKey = day.toISOString().split('T')[0];
            const dayEvents = events[dateKey] || [];
            
            days.push(
                <div key={i} className="border border-gray-200 rounded-lg p-2 bg-white flex flex-col min-h-[150px]">
                    <div className="flex justify-between items-center">
                        <span className="font-bold">{weekDays[day.getDay()]}</span>
                        <span className="text-gray-500">{day.getDate()}</span>
                    </div>
                    <div className="flex-grow mt-2 space-y-1 overflow-y-auto">
                        {dayEvents.map(event => (
                            <div key={event.id} className={`p-1.5 rounded text-xs ${colors[event.color]?.bg} ${colors[event.color]?.text}`}>
                                <p className="font-semibold">{event.title}</p>
                                <div className="flex justify-end gap-1 mt-1">
                                    <button onClick={() => handleOpenModal(day, event)} className="opacity-70 hover:opacity-100"><LucideEdit size={12}/></button>
                                    <button onClick={() => handleDelete(event.id)} className="opacity-70 hover:opacity-100"><LucideTrash2 size={12}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                     <button onClick={() => handleOpenModal(day)} className="mt-2 w-full text-center text-blue-500 hover:text-blue-700">
                        <LucidePlusCircle size={20} className="mx-auto"/>
                    </button>
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
                    <button onClick={handlePrevWeek} className="p-2 rounded-full hover:bg-gray-200"><LucideChevronLeft/></button>
                    <span className="text-lg font-semibold">{`${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`}</span>
                    <button onClick={handleNextWeek} className="p-2 rounded-full hover:bg-gray-200"><LucideChevronRight/></button>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingEvent ? "Editar Aviso" : "Adicionar Aviso"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="block text-sm">Título</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 w-full border-gray-300 rounded-md"/></div>
                    <div><label className="block text-sm">Descrição</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows="3" className="mt-1 w-full border-gray-300 rounded-md"/></div>
                    <div><label className="block text-sm">Cor</label>
                        <select value={color} onChange={e => setColor(e.target.value)} className="mt-1 w-full border-gray-300 rounded-md">
                            {Object.entries(colors).map(([key, {name}]) => <option key={key} value={key}>{name}</option>)}
                        </select>
                    </div>
                    <div className="pt-4 flex justify-end space-x-2"><button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm rounded-md bg-gray-100">Cancelar</button><button type="submit" className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white">Salvar</button></div>
                </form>
            </Modal>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {renderWeekDays()}
            </div>
        </div>
    );
};

const ControleEquipesComponent = () => ( <div className="p-6"> <h2 className="text-2xl font-semibold">Controle de Equipes</h2> <p className="mt-2 text-gray-600">Funcionalidade em desenvolvimento.</p> </div> );

const PlanejamentoOperacionalComponent = () => {
    const { db, appId, funcionarios, listasAuxiliares } = useContext(GlobalContext);
    const { ordens_servico: ordensDeServico, veiculos } = listasAuxiliares;
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [planejamento, setPlanejamento] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBloco, setEditingBloco] = useState(null);

    const [formVeiculo, setFormVeiculo] = useState('');
    const [formSupervisor, setFormSupervisor] = useState('');
    const [formAuxiliares, setFormAuxiliares] = useState([]);
    const [formHorarioSaida, setFormHorarioSaida] = useState('07:00');
    const [formTarefaManha, setFormTarefaManha] = useState({ osId: '', osText: '' });
    const [formTarefaTarde, setFormTarefaTarde] = useState({ osId: '', osText: '' });
    
    const planejamentoDocRef = useMemo(() => {
        if (db && appId && appId !== 'default-app-id-fallback' && selectedDate) {
            return doc(db, `/artifacts/${appId}/public/data/planejamentos`, selectedDate);
        }
        return null;
    }, [db, appId, selectedDate]);
    
    useEffect(() => {
        if (!planejamentoDocRef) {
            setPlanejamento([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const unsubscribe = onSnapshot(planejamentoDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setPlanejamento(docSnap.data().blocos || []);
            } else {
                setPlanejamento([]);
            }
            setIsLoading(false);
        }, err => {
            console.error("Erro ao buscar planejamento:", err);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [planejamentoDocRef]);

    const handleDateChange = (days) => {
        const currentDate = new Date(selectedDate + "T12:00:00Z");
        currentDate.setDate(currentDate.getDate() + days);
        setSelectedDate(currentDate.toISOString().split('T')[0]);
    };
    
    const handleOpenModal = (bloco = null) => {
        if (bloco) {
            setEditingBloco(bloco);
            setFormVeiculo(bloco.veiculo || '');
            setFormSupervisor(bloco.supervisor || '');
            setFormAuxiliares(bloco.auxiliares || []);
            setFormHorarioSaida(bloco.horarioSaida || '07:00');
            setFormTarefaManha(bloco.tarefaManha || { osId: '', osText: '' });
            setFormTarefaTarde(bloco.tarefaTarde || { osId: '', osText: '' });
        } else {
            setEditingBloco(null);
            setFormVeiculo('');
            setFormSupervisor('');
            setFormAuxiliares([]);
            setFormHorarioSaida('07:00');
            setFormTarefaManha({ osId: '', osText: '' });
            setFormTarefaTarde({ osId: '', osText: '' });
        }
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => setIsModalOpen(false);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if(!planejamentoDocRef) return;
        
        const newBloco = {
            id: editingBloco ? editingBloco.id : crypto.randomUUID(),
            veiculo: formVeiculo,
            supervisor: formSupervisor,
            auxiliares: formAuxiliares,
            horarioSaida: formHorarioSaida,
            tarefaManha: formTarefaManha,
            tarefaTarde: formTarefaTarde,
        };

        let updatedBlocos = [...planejamento];
        if (editingBloco) {
            const index = updatedBlocos.findIndex(b => b.id === editingBloco.id);
            if (index > -1) updatedBlocos[index] = newBloco;
        } else {
            updatedBlocos.push(newBloco);
        }

        try {
            await setDoc(planejamentoDocRef, { blocos: updatedBlocos });
            handleCloseModal();
        } catch(error) {
            console.error("Erro ao salvar planejamento:", error);
        }
    };
    
    const handleDeleteBloco = async (blocoId) => {
        if (!planejamentoDocRef) return;
        if(window.confirm("Tem certeza que deseja excluir este bloco de planejamento?")) {
            const updatedBlocos = planejamento.filter(b => b.id !== blocoId);
            try {
                await setDoc(planejamentoDocRef, { blocos: updatedBlocos });
            } catch(error) {
                console.error("Erro ao excluir bloco de planejamento:", error);
            }
        }
    };
    
    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-full">
             <div className="flex justify-between items-center mb-6 no-print">
                <h2 className="text-2xl font-semibold text-gray-800">Planejamento Operacional</h2>
                <div className="flex items-center gap-4">
                    <button onClick={() => handleDateChange(-1)} className="p-2 rounded-full hover:bg-gray-200"><LucideChevronLeft/></button>
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="border border-gray-300 rounded-md shadow-sm p-2"/>
                    <button onClick={() => handleDateChange(1)} className="p-2 rounded-full hover:bg-gray-200"><LucideChevronRight/></button>
                    <button onClick={() => handleOpenModal()} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md flex items-center shadow-sm">
                        <LucidePlusCircle size={20} className="mr-2"/> Adicionar Equipe/Veículo
                    </button>
                    <button onClick={() => window.print()} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md flex items-center shadow-sm">
                        <LucidePrinter size={20} className="mr-2"/> Imprimir
                    </button>
                </div>
             </div>
             
             {isModalOpen && <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingBloco ? "Editar Planejamento" : "Adicionar Planejamento"} width="max-w-4xl">
                 <form onSubmit={handleFormSubmit} className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm">Veículo</label>
                            <select value={formVeiculo} onChange={e => setFormVeiculo(e.target.value)} required className="mt-1 w-full border-gray-300 rounded-md">
                                <option value="">Selecione um veículo</option>
                                {listasAuxiliares.veiculos.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                         </div>
                         <div>
                            <label className="block text-sm">Horário Saída</label>
                             <input type="time" value={formHorarioSaida} onChange={e => setFormHorarioSaida(e.target.value)} className="mt-1 w-full border-gray-300 rounded-md"/>
                         </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm">Supervisor</label>
                            <select value={formSupervisor} onChange={e => setFormSupervisor(e.target.value)} required className="mt-1 w-full border-gray-300 rounded-md">
                                <option value="">Selecione um supervisor</option>
                                {funcionarios.map(f => <option key={f.id} value={f.nome}>{f.nome}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm">Auxiliares</label>
                            <select multiple value={formAuxiliares} onChange={e => setFormAuxiliares(Array.from(e.target.selectedOptions, option => option.value))} className="mt-1 w-full border-gray-300 rounded-md h-24">
                                {funcionarios.map(f => <option key={f.id} value={f.nome}>{f.nome}</option>)}
                            </select>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                         <div>
                             <h4 className="font-semibold text-lg mb-2">Manhã</h4>
                             <label className="block text-sm">O.S. | Cliente</label>
                              <select value={formTarefaManha.osId} onChange={e => {
                                 const osId = e.target.value;
                                 const os = ordensDeServico.find(o => o.id === osId);
                                 setFormTarefaManha({ osId: osId, osText: os ? `${os.numeroOS} | ${os.cliente}` : ''});
                             }} className="mt-1 w-full border-gray-300 rounded-md">
                                 <option value="">Selecione O.S. ou digite abaixo</option>
                                 {ordensDeServico.map(os => <option key={os.id} value={os.id}>{os.numeroOS} | {os.cliente}</option>)}
                             </select>
                             <input type="text" placeholder="Ou digite uma tarefa customizada" value={formTarefaManha.osId ? '' : formTarefaManha.osText} disabled={!!formTarefaManha.osId} onChange={e => setFormTarefaManha({osId: '', osText: e.target.value})} className="mt-1 w-full border-gray-300 rounded-md disabled:bg-gray-100"/>
                         </div>
                         <div>
                            <h4 className="font-semibold text-lg mb-2">Tarde</h4>
                             <label className="block text-sm">O.S. | Cliente</label>
                             <select value={formTarefaTarde.osId} onChange={e => {
                                 const osId = e.target.value;
                                 const os = ordensDeServico.find(o => o.id === osId);
                                 setFormTarefaTarde({ osId: osId, osText: os ? `${os.numeroOS} | ${os.cliente}` : ''});
                             }} className="mt-1 w-full border-gray-300 rounded-md">
                                 <option value="">Selecione O.S. ou digite abaixo</option>
                                 {ordensDeServico.map(os => <option key={os.id} value={os.id}>{os.numeroOS} | {os.cliente}</option>)}
                             </select>
                             <input type="text" placeholder="Ou digite uma tarefa customizada" value={formTarefaTarde.osId ? '' : formTarefaTarde.osText} disabled={!!formTarefaTarde.osId} onChange={e => setFormTarefaTarde({osId: '', osText: e.target.value})} className="mt-1 w-full border border-gray-300 rounded-md disabled:bg-gray-100"/>
                         </div>
                     </div>
                     <div className="pt-4 flex justify-end"><button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white">Salvar Planejamento</button></div>
                 </form>
             </Modal>}
             
             <div className="space-y-4">
                 {isLoading ? <p className="text-center text-gray-500 py-8">Carregando planejamento...</p> : 
                    planejamento.length === 0 ? <p className="text-center text-gray-500 py-8">Nenhum planejamento para este dia.</p> :
                    planejamento.map(bloco => {
                        const osManha = bloco.tarefaManha.osId ? ordensDeServico.find(o => o.id === bloco.tarefaManha.osId) : null;
                        const osTarde = bloco.tarefaTarde.osId ? ordensDeServico.find(o => o.id === bloco.tarefaTarde.osId) : null;
                        
                        return (
                        <div key={bloco.id} className="bg-white shadow rounded-lg border-l-8 border-gray-700">
                           <header className="p-2 bg-gray-700 text-white flex justify-between items-center rounded-t-md">
                               <h3 className="font-bold text-lg">{bloco.veiculo}</h3>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleOpenModal(bloco)} className="text-white hover:text-yellow-300"><LucideEdit size={16}/></button>
                                    <button onClick={() => handleDeleteBloco(bloco.id)} className="text-white hover:text-red-400"><LucideTrash2 size={16}/></button>
                                </div>
                           </header>
                           <div className="p-2 bg-orange-100">
                               <div className="grid grid-cols-3 gap-2 text-sm">
                                   <div><strong>Supervisor:</strong> {bloco.supervisor}</div>
                                   <div><strong>Auxiliares:</strong> {bloco.auxiliares.join(', ')}</div>
                                   <div><strong>Saída:</strong> {bloco.horarioSaida}</div>
                               </div>
                           </div>
                           <div className="grid grid-cols-[80px_1fr] border-t">
                               <div className="p-2 bg-gray-50 font-bold text-center flex items-center justify-center border-r">MANHÃ</div>
                               <div className="p-2">
                                   <p><strong>Cliente:</strong> {osManha ? osManha.cliente : bloco.tarefaManha.osText || 'N/A'}</p>
                                   <p><strong>Endereço:</strong> {osManha?.endereco} {osManha?.bairro} {osManha?.cidadeEstado}</p>
                                   <p><strong>O.S. | VEND.:</strong> {osManha ? `${osManha.numeroOS} | ${osManha.vendedorResp}` : ''}</p>
                               </div>
                           </div>
                            <div className="grid grid-cols-1 md:grid-cols-[80px_1fr] border-t">
                               <div className="p-2 bg-gray-50 font-bold text-center flex items-center justify-center border-r">TARDE</div>
                               <div className="p-2">
                                   <p><strong>Cliente:</strong> {osTarde ? osTarde.cliente : bloco.tarefaTarde.osText || 'N/A'}</p>
                                   <p><strong>Endereço:</strong> {osTarde?.endereco} {osTarde?.bairro} {osTarde?.cidadeEstado}</p>
                                   <p><strong>O.S. | VEND.:</strong> {osTarde ? `${osTarde.numeroOS} | ${osTarde.vendedorResp}` : ''}</p>
                               </div>
                           </div>
                        </div>
                    )})
                 }
             </div>
        </div>
    );
};

const ConfiguracoesComponent = () => {
    const { db } = useContext(GlobalContext); 
    if (!db) {
        return (
            <div className="p-6 bg-gray-50 min-h-full text-center">
                <p className="text-xl text-gray-700">Carregando configurações...</p>
            </div>
        );
    }
    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Configurações Gerais</h2>
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


// Componente Principal App
function App() {
    const [currentPage, setCurrentPage] = useState('cadastro_os');
    const { currentUser, db: contextDb, appId: contextAppId } = useContext(GlobalContext);

    if (!currentUser) { 
        return <AuthComponent />;
    }
    
    if (!contextDb || !contextAppId || contextAppId === 'default-app-id-fallback') {
        return <div className="flex justify-center items-center h-screen"><div className="text-xl">Carregando configurações da aplicação...</div></div>;
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

    const NavLink = memo(({ page, children, icon: Icon, currentPage, setCurrentPage }) => (
        <button
            onClick={() => setCurrentPage(page)}
            className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out
                            ${currentPage === page ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-blue-100 hover:text-blue-700'}`}
        >
            {Icon && <Icon size={18} className="mr-2" />}
            {children}
        </button>
    ));

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            <aside className="w-64 bg-white shadow-lg flex flex-col p-4 space-y-2 border-r border-gray-200">
                <div className="mb-4 p-2 text-center">
                    <img src={LOGO_URL} alt="Logo Gramoterra" className="mx-auto h-12 w-auto mb-2" onError={(e) => e.target.style.display = 'none'} />
                    <h1 className="text-xl font-semibold text-gray-700">Gestor de Operações</h1>
                </div>
                <nav className="flex-grow space-y-1">
                    <NavLink page="cadastro_os" icon={LucideClipboardPlus} currentPage={currentPage} setCurrentPage={setCurrentPage}>Ordens de Serviço</NavLink>
                    <NavLink page="planejamento_op" icon={LucideCalendarCog} currentPage={currentPage} setCurrentPage={setCurrentPage}>Planejamento</NavLink>
                    <NavLink page="listagem_envelopes" icon={LucideMail} currentPage={currentPage} setCurrentPage={setCurrentPage}>Envelopes</NavLink>
                    <NavLink page="listagem_acessos" icon={LucideKeyRound} currentPage={currentPage} setCurrentPage={setCurrentPage}>Acessos</NavLink>
                    <NavLink page="avisos_agenda" icon={LucideBellRing} currentPage={currentPage} setCurrentPage={setCurrentPage}>Avisos/Agenda</NavLink>
                    <NavLink page="controle_equipes" icon={LucideUsersRound} currentPage={currentPage} setCurrentPage={setCurrentPage}>Controle de Equipes</NavLink>
                    <hr className="my-2 border-gray-200" />
                    <NavLink page="config" icon={LucideSettings} currentPage={currentPage} setCurrentPage={setCurrentPage}>Configurações</NavLink>
                </nav>
                <div className="mt-auto">
                    {currentUser && (
                        <p className="text-xs text-gray-500 mb-2 px-2">
                            Logado como: {currentUser.isAnonymous ? "Anônimo" : currentUser.email || currentUser.uid}
                        </p>
                    )}
                    <button
                        onClick={() => { if (auth) signOut(auth);}}
                        className="w-full flex items-center justify-center px-3 py-2.5 text-sm font-medium rounded-md text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors duration-150 ease-in-out"
                    >
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
