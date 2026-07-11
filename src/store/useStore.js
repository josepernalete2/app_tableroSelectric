import { create } from 'zustand';
import { initialTablerosData } from '../data/mockTableros';

// Intentar cargar estado inicial persistido en LocalStorage
const savedState = localStorage.getItem('tableroselectrico_store');
const initialData = savedState ? JSON.parse(savedState) : {
  user: null,
  companies: [
    {
      id: 'c-1',
      nombre: 'Clínica Metropolitana de Caracas',
      tableros: [
        { ...initialTablerosData['11'], id: '11', nombre: 'Tablero TD-11 (Sótano)' },
        { ...initialTablerosData['10'], id: '10', nombre: 'Tablero TD-10 (Imágenes)' }
      ]
    },
    {
      id: 'c-2',
      nombre: 'Alimentos Polar Planta Turmero',
      tableros: []
    }
  ]
};

export const useStore = create((set, get) => ({
  user: initialData.user,
  companies: initialData.companies,

  // Autenticación básica
  login: (email, password) => {
    if (email && password) {
      const user = { email };
      set({ user });
      get().persist();
      return true;
    }
    return false;
  },

  logout: () => {
    set({ user: null });
    get().persist();
  },

  // Gestión de Empresas
  addCompany: (nombre) => {
    const newCompany = {
      id: `company-${Date.now()}`,
      nombre,
      tableros: []
    };
    set((state) => ({
      companies: [...state.companies, newCompany]
    }));
    get().persist();
  },

  deleteCompany: (companyId) => {
    set((state) => ({
      companies: state.companies.filter((c) => c.id !== companyId)
    }));
    get().persist();
  },

  // Gestión de Tableros con prevención de duplicados en tiempo real
  addTablero: (companyId, tableroData) => {
    const { companies } = get();
    const company = companies.find((c) => c.id === companyId);
    if (!company) return { success: false, error: 'Empresa no encontrada.' };

    // Validar duplicados de Nombre/ID del tablero
    const existeDuplicado = company.tableros.some(
      (t) => t.id.toLowerCase() === tableroData.id.toLowerCase() || 
             t.nombre.toLowerCase() === tableroData.nombre.toLowerCase()
    );

    if (existeDuplicado) {
      return { 
        success: false, 
        error: `Error de negocio: El tablero con Nombre/ID "${tableroData.id}" o "${tableroData.nombre}" ya existe en esta empresa.` 
      };
    }

    const nuevoTablero = {
      id: tableroData.id,
      nombre: tableroData.nombre,
      ubicacion: tableroData.ubicacion || 'Sin ubicación',
      alimentadoPor: tableroData.alimentadoPor || '',
      tipo: tableroData.tipo || 'superficial',
      barrasPrincipales: tableroData.barrasPrincipales || { ia: '0', ib: '0', ic: '0' },
      breakerPrincipal: tableroData.breakerPrincipal || { marca: '', tipo: '', amp: '' },
      voltaje: tableroData.voltaje || { va: '208', vb: '205', vc: '205' },
      acometida: tableroData.acometida || '',
      maxPoles: tableroData.maxPoles || 24,
      circuits: tableroData.circuits || [],
      neutroLlegada: tableroData.neutroLlegada || { calibre: '', observaciones: '' },
      puestaTierra: tableroData.puestaTierra || { calibre: '', observaciones: '' },
      observacionesGenerales: tableroData.observacionesGenerales || '',
      elementosPorCrear: []
    };

    set((state) => ({
      companies: state.companies.map((c) => {
        if (c.id === companyId) {
          return { ...c, tableros: [...c.tableros, nuevoTablero] };
        }
        return c;
      })
    }));

    get().persist();
    return { success: true };
  },

  updateTablero: (companyId, tableroId, updatedData) => {
    set((state) => ({
      companies: state.companies.map((c) => {
        if (c.id === companyId) {
          return {
            ...c,
            tableros: c.tableros.map((t) => {
              if (t.id === tableroId) {
                return { ...t, ...updatedData };
              }
              return t;
            })
          };
        }
        return c;
      })
    }));
    get().persist();
  },

  deleteTablero: (companyId, tableroId) => {
    set((state) => ({
      companies: state.companies.map((c) => {
        if (c.id === companyId) {
          return {
            ...c,
            tableros: c.tableros.filter((t) => t.id !== tableroId)
          };
        }
        return c;
      })
    }));
    get().persist();
  },

  // Persistir en LocalStorage
  persist: () => {
    const { user, companies } = get();
    localStorage.setItem('tableroselectrico_store', JSON.stringify({ user, companies }));
  }
}));

export default useStore;
