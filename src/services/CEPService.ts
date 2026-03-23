export interface CEPData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ddd?: string;
  erro?: boolean;
}

export interface AddressFromCEP {
  street: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export async function fetchCEP(cep: string): Promise<AddressFromCEP | null> {
  // Remove caracteres não numéricos
  const cleanCEP = cep.replace(/\D/g, '');

  // Valida se tem 8 dígitos
  if (cleanCEP.length !== 8) {
    return null;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);

    if (!response.ok) {
      throw new Error('Erro ao buscar CEP');
    }

    const data: CEPData = await response.json();

    // Verifica se é um CEP válido
    if (data.erro) {
      return null;
    }

    return {
      street: data.logradouro,
      complement: data.complemento,
      neighborhood: data.bairro,
      city: data.localidade,
      state: data.uf,
    };
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
}

export function formatCEP(value: string): string {
  const cleanCEP = value.replace(/\D/g, '').slice(0, 8);

  if (cleanCEP.length <= 5) {
    return cleanCEP;
  }

  return `${cleanCEP.slice(0, 5)}-${cleanCEP.slice(5)}`;
}

export function isValidCEP(cep: string): boolean {
  const cleanCEP = cep.replace(/\D/g, '');
  return cleanCEP.length === 8;
}
