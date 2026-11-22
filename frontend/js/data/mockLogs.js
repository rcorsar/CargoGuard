// Initial Audit & Shift History Logs
const MOCK_LOGS = [
  {
    id: "LOG-1",
    time: "10:42",
    boxId: "BOX-098",
    qr: "5POST-QR-90712",
    flow: "Отправка",
    item: "Процессор AMD Ryzen 7 7800X3D",
    weight: "0.3 кг",
    parties: "Соловьев А. Н. → Орлов Д. В.",
    status: "Товар без брака → Доставка в ПВЗ",
    actor: "Мамбетов Р. Р. (Контролер)",
    ok: true,
    pay: 600
  },
  {
    id: "LOG-2",
    time: "11:25",
    boxId: "BOX-184",
    qr: "5POST-QR-77301",
    flow: "Возврат",
    item: "Ноутбук ASUS ROG Strix G16",
    weight: "5.1 кг",
    parties: "Орлов Д. В. → Соловьев А. Н.",
    status: "Спор 3 дня и выплата продавцу",
    actor: "Мамбетов Р. Р. (Контролер)",
    ok: false,
    pay: 1150
  },
  {
    id: "LOG-3",
    time: "12:10",
    boxId: "BOX-202",
    qr: "5POST-QR-77489",
    flow: "Отправка",
    item: "ПК HyperPC Cyber (Core i7 / RTX 4070Ti)",
    weight: "14.2 кг",
    parties: "ООО ТехноСток → Захаров М. Ю.",
    status: "Товар без брака → Доставка в ПВЗ",
    actor: "Мамбетов Р. Р. (Контролер)",
    ok: true,
    pay: 1450
  }
];
