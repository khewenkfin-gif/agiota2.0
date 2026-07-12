export const initialLoans = [
  {
    id: 1,
    client: "Takeshi Sato",
    valueOriginal: 200000,
    interest: 8,
    dueDate: "2026-07-05", // Overdue (reference is 2026-07-12)
    balance: 216000,
    dateCreated: "2026-06-05",
    status: "em_dia",
    isActive: true
  },
  {
    id: 2,
    client: "Yuki Tanaka",
    valueOriginal: 500000,
    interest: 5,
    dueDate: "2026-07-25", // In order
    balance: 525000,
    dateCreated: "2026-06-25",
    status: "em_dia",
    isActive: true
  },
  {
    id: 3,
    client: "Hiroshi Watanabe",
    valueOriginal: 150000,
    interest: 10,
    dueDate: "2026-07-01",
    balance: 0,
    dateCreated: "2026-06-01",
    status: "pago",
    isActive: false
  },
  {
    id: 4,
    client: "Kenji Takahashi",
    valueOriginal: 1000000,
    interest: 6,
    dueDate: "2026-08-10", // In order
    balance: 1060000,
    dateCreated: "2026-07-10",
    status: "em_dia",
    isActive: true
  }
];

export const initialInvestors = [
  {
    id: 1,
    name: "Ichiro Suzuki",
    value: 1000000,
    percentage: 12,
    date: "2026-05-15",
    qtdParcelas: 10,
    parcelasPagas: 2,
    valorParcela: 110000
  },
  {
    id: 2,
    name: "Naomi Osaka",
    value: 2000000,
    percentage: 10,
    date: "2026-06-01",
    qtdParcelas: 5,
    parcelasPagas: 1,
    valorParcela: 430000
  }
];

export const initialCashFlow = [
  { id: 1, date: "2026-05-01", value: 5000000 },
  { id: 2, date: "2026-05-15", value: 1000000 },
  { id: 3, date: "2026-06-01", value: 2000000 },
  { id: 4, date: "2026-05-20", value: -100000 },
  { id: 5, date: "2026-06-15", value: -110000 },
  { id: 6, date: "2026-07-01", value: -110000 },
  { id: 7, date: "2026-07-01", value: -430000 }
];

export const initialPaymentLogs = [
  {
    id: 1,
    rowClient: 3,
    clientName: "Hiroshi Watanabe",
    date: "2026-07-01",
    value: 165000
  }
];
