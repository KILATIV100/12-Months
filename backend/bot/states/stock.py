from aiogram.fsm.state import State, StatesGroup


class StockStates(StatesGroup):
    """FSM states for the /stock morning availability update.

    The admin taps ✅/❌ per product.
    Pending changes are stored in FSM data as {"changes": {"uuid": bool}}.
    On 'Save' — all changes are applied to DB in one transaction.
    """
    editing = State()
