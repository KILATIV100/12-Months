# 12 Months

Telegram Bot + Telegram Web App для квіткового магазину. Реалізація під ТЗ у `12months-tz.html`.

## Структура

```
backend/    FastAPI + aiogram 3 + PostgreSQL + Redis + Claude + R2 + APScheduler
frontend/   Vite + React + TypeScript (TWA)
src/        Statyczный React-Babel прототип (для перегляду UX-макетів)
12months-tz.html   ТЗ
12months.html      Демо прототипу (відкривати у браузері)
```

## Архітектура (ТЗ §02)

**Backend + Bot** в одному сервісі (`backend/`):

- FastAPI віддає REST API (`/api/*`) для TWA та webhook для Telegram (`/bot/webhook`).
- aiogram 3 з RedisStorage для FSM.
- APScheduler сканує важливі дати щодня о 9:00 і шле push.
- Claude API (`anthropic` SDK) — три сценарії з ТЗ §08.
- Cloudflare R2 — фото товарів і відео-листівки.
- LiqPay — оплата (стаб у `services/liqpay.py`).

**Frontend TWA** (`frontend/`) — Vite-збірка React-додатку. Використовує `VITE_API_URL` для звернень до бекенду. Окремий маршрут `/greeting/:token` — приймач QR-листівки.

## Команди бота (ТЗ §05)

| Команда | Доступ | Опис |
|---|---|---|
| `/start` | Всі | Онбординг: «Підібрати», «Зібрати», «Дати» + питання «для кого». |
| `/order` | Всі | Відкриває TWA на каталозі. |
| `/status` | Всі | Статус останнього замовлення. |
| `/history` | Всі | Останні 5 замовлень. |
| `/dates` | Всі | CRUD важливих дат (ID, ім'я, дата, повторювати, нагадування). |
| `/subscribe` | Всі | Абонемент щотижня / раз у 2 тижні + пауза/скасування. |
| `/admin` | Адмін+ | Меню адміна. |
| `/add` | Менеджер+ | FSM з 6 кроків: фото → назва → ціна → категорія → склад → підтвердження. |
| `/stock` | Адмін+ | Інлайн-список ✅/❌ для всіх позицій + «Зберегти». |
| `/orders` | Адмін+ | Нові замовлення одним повідомленням. |
| `/hide /show /price /del` | Менеджер+ | Швидкі команди (з захистом від видалення при активних замовленнях). |
| `/stats [day|week|month]` | Власник | Статистика: замовлення, виручка, середній чек, топ. |

## Push-логіка (ТЗ §05)

- За 3 / 1 / 0 днів до події (`reminder_days` налаштовується на дату).
- Сервісні: «Прийнято» → «В роботі» → «Готово» → NPS через 2 години.

## AI-сценарії (ТЗ §08)

1. **Конструктор** — `POST /api/ai/hint`, debounce 1.5 c на клієнті.
2. **Тіндер** — `POST /api/ai/taste` після ≥10 свайпів.
3. **Нагадування** — `POST /api/ai/picks`, 3 варіанти за подією і історією.

## Локальний запуск

```bash
cp backend/.env.example backend/.env
# заповнити BOT_TOKEN, ANTHROPIC_API_KEY, OWNER_TG_ID, R2_*

docker compose up --build

# Bot webhook потребує публічний домен. Локально:
#   ngrok http 8000   →   WEBHOOK_HOST=https://<ngrok>.ngrok.app

# Міграції БД (перший раз):
docker compose exec backend alembic revision --autogenerate -m "init"
docker compose exec backend alembic upgrade head
```

API-документація — на `http://localhost:8000/docs`.

## Деплой (Railway)

Два сервіси з env, що збігаються із обмінами:

**12-Months-Backend + Bot** — деплой `backend/`. Змінні:
`BOT_TOKEN`, `OWNER_TG_ID`, `WEBHOOK_HOST`, `WEBHOOK_PATH`, `DATABASE_URL`, `REDIS_URL`, `ANTHROPIC_API_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `SECRET_KEY`, `ENVIRONMENT`, `DEBUG`, `LIQPAY_PUBLIC_KEY`, `LIQPAY_PRIVATE_KEY`, `TWA_URL`.

**12-Months-Frontend TWA** — деплой `frontend/` як статика. Змінні (build-time):
`VITE_API_URL` → URL бекенду.

## Прототип

`12months.html` лишився як живий UX-макет: вкладки `?view=phones` (TWA + бот) і `?view=admin` (десктопний кабінет, виходить за обсяг ТЗ MVP — використовується як артбук для майбутніх фаз).
