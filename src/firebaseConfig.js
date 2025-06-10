// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// As variáveis de ambiente são injetadas pelo Vite durante o build.
// Certifique-se de que seu arquivo .env na raiz do projeto está correto.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validação para garantir que a aplicação não inicie com configuração ausente.
if (!firebaseConfig.projectId) {
  throw new Error("Configuração do Firebase não encontrada. Verifique suas variáveis de ambiente (VITE_...) e reinicie o servidor de desenvolvimento.");
}

// Inicializa o Firebase e exporta as instâncias necessárias para a aplicação.
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = app.options.projectId;

// ✅ CORREÇÃO: Adicionada a linha de exportação para que outros arquivos possam importar 'app', 'auth', 'db', e 'appId'.
export { app, auth, db, appId };