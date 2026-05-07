from aiogram.fsm.state import State, StatesGroup


class AddProduct(StatesGroup):
    """TZ §06 /add — 6 steps."""
    photo = State()
    name = State()
    price = State()
    category = State()
    composition = State()
    confirm = State()


class AddDate(StatesGroup):
    label = State()
    person = State()
    date = State()
    reminder_days = State()


class Subscribe(StatesGroup):
    frequency = State()
    address = State()
    confirm = State()
