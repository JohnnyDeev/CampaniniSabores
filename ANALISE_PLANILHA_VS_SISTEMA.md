# 📊 ANÁLISE COMPARATIVA: PLANILHA vs SISTEMA ATUAL

## 1️⃣ ABA: PEDIDOS

### O que a planilha tem:
```
Colunas: PEDIDO, PAGAMENTO
Dados:
- Número do pedido
- Nome do cliente
- Data do pedido
- Sabor da esfiha
- Quantidade
- Status (CONCLUIDO)
- Forma de pagamento (Pix, Permuta)
- Data de entrega
```

### O que já temos no sistema:
```typescript
interface Order {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress: string;
  customerObs: string;
  items: { 
    productId: string; 
    quantity: number;
    comboId?: string;
  }[];
  total: number;
  status: 'novo' | 'producao' | 'saiu' | 'entregue';
  paid: boolean;
  paidAt?: Date;
  createdAt: Date;
  whatsappSent: boolean;
  couponCode?: string;
  couponDiscount?: number;
}
```

### ✅ JÁ TEMOS:
- [x] Nome do cliente
- [x] Data do pedido (createdAt)
- [x] Itens do pedido (products)
- [x] Quantidade
- [x] Status (mais completo: novo → producao → saiu → entregue)
- [x] Forma de pagamento (paid: boolean)
- [x] Data de entrega (pode ser customerObs ou campo novo)

### ❌ FALTA:
- [ ] **Número sequencial do pedido** (temos UUID, ela usa número 1, 2, 3...)
- [ ] **Campo específico para "Data de Entrega"** (agora está em obs)
- [ ] **Forma de pagamento específica** (só temos paid: boolean, não "Pix", "Dinheiro")

### 🔧 AJUSTES SUGERIDOS:
```typescript
// Adicionar ao Order:
orderNumber: number; // Sequencial (1, 2, 3...)
deliveryDate?: Date; // Data específica de entrega
paymentMethod?: 'pix' | 'dinheiro' | 'cartao' | 'permuta';
```

---

## 2️⃣ ABA: FATURAMENTO

### O que a planilha tem:
```
- Tabela dinâmica agrupando pedidos por cliente
- Total a receber por cliente
- Status (pago/pendente)
- Agrupamento por data
```

### O que já temos:
```typescript
// No ReportsContent já temos:
- totalRevenue (receita total)
- totalOrders (total de pedidos)
- avgOrderValue (ticket médio)
- Pedidos por dia
```

### ✅ JÁ TEMOS:
- [x] Total de vendas por período
- [x] Pedidos pagos vs pendentes
- [x] Agrupamento por data

### ❌ FALTA:
- [ ] **Agrupamento por cliente** (quanto cada cliente deve)
- [ ] **Contas a pagar** (despesas, fornecedores)
- [ ] **Fluxo de caixa** (entradas - saídas)

### 🔧 IMPLEMENTAR:
```typescript
// Nova collection: receivables (contas a receber)
interface Receivable {
  orderId: string;
  customerId: string;
  customerName: string;
  amount: number;
  dueDate: Date;
  paidAt?: Date;
  status: 'pending' | 'paid' | 'overdue';
  paymentMethod?: string;
}

// Nova collection: payables (contas a pagar)
interface Payable {
  description: string;
  category: 'ingredientes' | 'embalagem' | 'fixo' | 'variavel';
  amount: number;
  dueDate: Date;
  paidAt?: Date;
  status: 'pending' | 'paid' | 'overdue';
  supplier?: string;
}
```

---

## 3️⃣ ABA: PRODUÇÃO / CUSTO ESFIHA CARNE

### O que a planilha tem:
```
Colunas: ITEM, EMBALAGEM, VALOR EMBALAGEM, RECEITA, MEDIDA, VALOR RECEITA
Exemplo:
- Farinha | 5kg | R$ 20,00 | 500g | R$ 2,00
- Carne | 1kg | R$ 30,00 | 100g | R$ 3,00
```

### O que já temos:
```typescript
interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // Preço de venda
  category: 'tradicional' | 'fit';
  active: boolean;
}
```

### ✅ JÁ TEMOS:
- [x] Cadastro de produtos (esfihas)
- [x] Preço de venda

### ❌ FALTA TUDO:
- [ ] **Ingredientes** (farinha, carne, queijo, etc.)
- [ ] **Ficha técnica** (quanto cada esfiha usa de cada ingrediente)
- [ ] **Custo por ingrediente**
- [ ] **Custo total do produto**
- [ ] **Margem de lucro**

### 🔧 IMPLEMENTAR:
```typescript
// Nova collection: ingredients
interface Ingredient {
  id: string;
  name: string;
  purchaseUnit: 'kg' | 'g' | 'L' | 'ml' | 'unidade';
  purchasePrice: number;
  purchaseQuantity: number; // Quantos vem na embalagem comprada
  currentStock: number;
  stockUnit: 'kg' | 'g' | 'L' | 'ml' | 'unidade';
  minStock: number;
  supplier?: string;
}

// Nova collection: productRecipes
interface ProductRecipe {
  productId: string;
  ingredients: {
    ingredientId: string;
    quantity: number;
    unit: 'g' | 'ml' | 'unidade';
  }[];
  totalCost: number; // Calculado automaticamente
  yield: number; // Quantas esfihas a receita rende
}
```

---

## 4️⃣ ABA: LISTA DE COMPRAS

### O que a planilha tem:
```
Colunas: QUANTIDADE, UNIDADE DE MEDIDA, INGREDIENTE
Exemplo:
- 500g de farinha
- 200g de carne
- 100g de queijo
```

### O que já temos:
- Nada específico

### ❌ FALTA TUDO:
- [ ] **Lista de compras baseada na produção**
- [ ] **Soma de ingredientes necessários**
- [ ] **Comparação com estoque atual**

### 🔧 IMPLEMENTAR:
```typescript
// Gerar automaticamente baseado em:
// 1. Pedidos da semana (items)
// 2. Ficha técnica (receita de cada produto)
// 3. Estoque atual

interface ShoppingListItem {
  ingredientId: string;
  ingredientName: string;
  requiredQuantity: number;
  unit: string;
  inStock: number;
  toBuy: number; // requiredQuantity - inStock
  estimatedCost: number;
}
```

---

## 5️⃣ ABA: ENTREGA

### O que a planilha tem:
```
- Agrupamento de pedidos por data de entrega
- Total por cliente
- Status de entrega
```

### O que já temos:
```typescript
interface Order {
  status: 'novo' | 'producao' | 'saiu' | 'entregue';
  customerAddress: string;
}
```

### ✅ JÁ TEMOS:
- [x] Status de entrega
- [x] Endereço do cliente

### ❌ FALTA:
- [ ] **Agrupamento por data de entrega** (filtro específico)
- [ ] **Roteirização** (pedidos do mesmo bairro/região)
- [ ] **Checklist de entrega**

### 🔧 IMPLEMENTAR:
```typescript
// Adicionar filtro no OrdersContent:
const [deliveryDateFilter, setDeliveryDateFilter] = useState<string | null>(null);

// Agrupar pedidos:
const ordersByDeliveryDate = orders.reduce((acc, order) => {
  const date = order.deliveryDate?.toDateString() || 'Sem data';
  if (!acc[date]) acc[date] = [];
  acc[date].push(order);
  return acc;
}, {});
```

---

## 6️⃣ ABA: CONVERSÃO

### O que a planilha tem:
```
- Conversão de unidades (kg → g, L → ml)
- Fator de conversão para receita
```

### O que já temos:
- Nada

### ❌ FALTA:
- [ ] **Tabela de conversão** (útil para ficha técnica)

### 🔧 IMPLEMENTAR:
```typescript
const CONVERSIONS = {
  'kg': { 'g': 1000 },
  'L': { 'ml': 1000 },
  'unidade': { 'g': null } // Depende do ingrediente
};

function convertUnit(value: number, from: string, to: string): number {
  // Lógica de conversão
}
```

---

## 7️⃣ ABA: PLANILHA1 (CLIENTES)

### O que a planilha tem:
```
Colunas: CLIENTES, ORIGEM
Exemplo:
- Aline Szepal | Handebol
- Bruno Basevic | Handebol
- Camila Rocha | IMCD
```

### O que já temos:
```typescript
interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  addresses: Address[];
  loyaltyPoints: number;
  totalSpent: number;
  orderCount: number;
}
```

### ✅ JÁ TEMOS:
- [x] Nome do cliente
- [x] Email
- [x] Telefone
- [x] Histórico de pedidos
- [x] Total gasto

### ❌ FALTA:
- [ ] **Campo "Origem/Tag"** (Handebol, IMCD, etc.)

### 🔧 IMPLEMENTAR:
```typescript
// Adicionar ao Customer:
tags?: string[]; // ['handebol', 'imcd', 'vip']
source?: string; // Origem principal
```

---

## 8️⃣ ABA: PLANILHA2 (SABORES)

### O que a planilha tem:
```
Colunas: Sabores, Status Operacional
Exemplo:
- 01 - Escarola com Queijo | CONCLUIDO
- 02 - Frango com Catupiry
```

### O que já temos:
```typescript
interface Product {
  name: string;
  category: 'tradicional' | 'fit';
  active: boolean;
  tags: string[];
}
```

### ✅ JÁ TEMOS:
- [x] Nome do sabor
- [x] Status (active: boolean)
- [x] Categoria

### ❌ FALTA:
- [ ] **Código/Número do sabor** (01, 02, 03...)
- [ ] **Status operacional** (pode ser tag)

### 🔧 IMPLEMENTAR:
```typescript
// Adicionar ao Product:
code?: string; // '01', '02', etc.
operationalStatus?: 'ativo' | 'pausado' | 'descontinuado';
```

---

# 📋 RESUMO: PRIORIDADES DE IMPLEMENTAÇÃO

## 🔴 ALTA PRIORIDADE (Fase 1)

### 1. Financeiro (Faturamento)
- [ ] Contas a receber (vinculado a pedidos)
- [ ] Contas a pagar (despesas)
- [ ] Fluxo de caixa
- [ ] Relatório por cliente

### 2. Ajustes em Pedidos
- [ ] Número sequencial do pedido
- [ ] Forma de pagamento (pix, dinheiro, etc.)
- [ ] Data de entrega (campo específico)

## 🟡 MÉDIA PRIORIDADE (Fase 2)

### 3. Ficha Técnica / Custos
- [ ] Cadastro de ingredientes
- [ ] Ficha técnica por produto
- [ ] Custo automático
- [ ] Margem de lucro

### 4. Lista de Compras
- [ ] Gerar baseada nos pedidos
- [ ] Comparar com estoque
- [ ] Soma de ingredientes

## 🟢 BAIXA PRIORIDADE (Fase 3)

### 5. Entregas
- [ ] Filtro por data de entrega
- [ ] Agrupamento por bairro
- [ ] Checklist

### 6. Clientes
- [ ] Campo "Origem/Tag"

### 7. Produtos
- [ ] Código numérico
- [ ] Status operacional

---

# 🎯 PRÓXIMO PASSO SUGERIDO:

**Começar pelos AJUSTES EM PEDIDOS** (Fase 1 - item 2) porque:
1. É rápido de implementar
2. Já temos a base
3. Libera o Financeiro funcionar corretamente

**Depois implementar FINANCEIRO** (Fase 1 - item 1) porque:
1. É o que mais dói na planilha
2. Substitui a aba "Faturamento"
3. Traz valor imediato

**O que você acha?**
