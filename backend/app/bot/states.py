from aiogram.fsm.state import State, StatesGroup


class AddProduct(StatesGroup):
    """TZ §06 /add — 6 steps."""
    photo = State()
    name = State()
    price = State()
    category = State()
    composition = State()
    confirm = State()


class EditPhoto(StatesGroup):
    """/photo <ref> — replace the photo of an existing product."""
    waiting = State()


class AddFlower(StatesGroup):
    """/addflower — add a bouquet element (flower/base/green/decor) for the Constructor."""
    photo = State()
    name = State()
    type = State()
    price = State()


class AddDate(StatesGroup):
    label = State()
    person = State()
    date = State()
    reminder_days = State()


class Subscribe(StatesGroup):
    frequency = State()
    address = State()
    confirm = State()
