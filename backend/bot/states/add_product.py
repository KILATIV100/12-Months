from aiogram.fsm.state import State, StatesGroup


class AddProductStates(StatesGroup):
    """FSM states for the admin /add command — 6-step product creation.

    Step 1: Photo
    Step 2: Name
    Step 3: Price
    Step 4: Category (inline keyboard)
    Step 5: Composition / tags
    Step 6: Confirmation (publish / edit / cancel)
    """
    waiting_for_photo = State()
    waiting_for_name = State()
    waiting_for_price = State()
    waiting_for_category = State()
    waiting_for_composition = State()
    waiting_for_confirmation = State()


class DeleteProductStates(StatesGroup):
    """FSM states for the /del command confirmation."""
    waiting_for_confirm = State()
