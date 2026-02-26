from aiogram.fsm.state import State, StatesGroup


class OnboardingStates(StatesGroup):
    """FSM states for the new-user onboarding flow.

    Flow: /start → (ask occasion) → waiting_for_occasion → (save) → done
    """
    waiting_for_occasion = State()
