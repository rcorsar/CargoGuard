# Backend — CargoGuard API

Папка подготовлена для разработки серверной части (Python REST API + БД).

## Ожидаемый контракт REST API (для стыковки с `frontend/js/services/apiService.js`)
- `GET /api/state` — получить текущее состояние (`commissionRate`, `tariffs`, `users`, `orders`, `logs`).
- `POST /api/orders` — Бухгалтерия: создать заказ, собрать данные клиента и заморозить средства.
- `POST /api/orders/:id/inspect` — Контролер: зафиксировать результат проверки отправки или возврата.
- `POST /api/orders/:id/complete` — Бухгалтерия: покупатель забрал товар, списать комиссию 3% и перевести 97% продавцу.
- `POST /api/orders/:id/return` — ПВЗ/Бухгалтерия: покупатель отказался, перевести коробку на проверку возврата.
- `POST /api/admin/settings` — Админ: обновить процент комиссии и тарифы контролера.
- `DELETE /api/orders/:id` и `DELETE /api/logs/:id` — Админ: удаление записей.
