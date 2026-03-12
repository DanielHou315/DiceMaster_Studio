export const CHINESE_QUIZLET_CODE = `"""
Shake Quizlet — dice API example.
Shaking the dice cycles through flashcards.
"""
import random
import time

from dice import screen, motion, log
from dice.strategy import BaseStrategy


class ShakeQuizletStrategy(BaseStrategy):
    _strategy_name = "shake_quizlet"

    def __init__(self, game_name, config, assets_path, **kwargs):
        super().__init__(game_name, config, assets_path, **kwargs)
        self.cards = [
            {"q": "Apple", "a": "苹果", "hints": ["Red", "Sweet", "Fruit", "🍎"]},
            {"q": "Cat", "a": "猫", "hints": ["Meow", "Feline", "Whiskers", "🐱"]},
            {"q": "Computer", "a": "电脑", "hints": ["Screen", "Keyboard", "Electric", "💻"]},
        ]
        self.current = 0
        self.last_shake = 0.0

    def start_strategy(self):
        motion.on_shake(self._on_shake)
        self._display()
        log("ShakeQuizlet started")

    def stop_strategy(self):
        log("ShakeQuizlet stopped")

    def _on_shake(self, intensity):
        now = time.time()
        if now - self.last_shake < 1.0:
            return
        self.last_shake = now
        self.current = (self.current + 1) % len(self.cards)
        self._display()

    def _display(self):
        card = self.cards[self.current]
        screen.set_text(1, card["q"])
        screen.set_text(6, card["a"])
        for i, hint in enumerate(card["hints"][:4]):
            screen.set_text(i + 2, hint)
        log(f"Showing: {card['q']} = {card['a']}")


game = ShakeQuizletStrategy("quizlet", {}, "/assets")
game.start_strategy()
`;

export const HARDWARE_OPTIMIZER_CODE = `"""
Pipeline Test — sends text to screens on a timer.
Simplest dice API example, no assets needed.
"""
from dice import screen, log, timer
from dice.strategy import BaseStrategy


class TestStrategy(BaseStrategy):
    _strategy_name = "pipeline_test"

    def __init__(self, game_name, config, assets_path, **kwargs):
        super().__init__(game_name, config, assets_path, **kwargs)
        self.available_screen_ids = list(range(1, 7))
        self.current_screen_index = 0
        self.message_count = 0
        self._timer_id = None

    def start_strategy(self):
        self._timer_id = timer.set(1.0, self._send_notification)
        log("TestStrategy started - sending notifications every 1s")

    def stop_strategy(self):
        if self._timer_id is not None:
            timer.cancel(self._timer_id)
            self._timer_id = None
        log("TestStrategy stopped")

    def _send_notification(self):
        target_id = self.available_screen_ids[self.current_screen_index]
        self.current_screen_index = (self.current_screen_index + 1) % len(self.available_screen_ids)
        self.message_count += 1
        content = f"Test #{self.message_count} screen {target_id}"
        screen.set_text(target_id, content)
        log(f"Sent: {content}")


game = TestStrategy("test", {}, "/assets")
game.start_strategy()
`;

export const DEFAULT_BASE_CODE = `"""
DiceMaster — write your game here!

Available APIs:
  from dice import screen, motion, orientation, log, timer
  from dice.strategy import BaseStrategy

  screen.set_text(screen_id, text)    — show text on screen 1-6
  screen.set_image(screen_id, path)   — show image on screen
  motion.on_shake(callback)           — callback(intensity) on shake
  orientation.on_change(callback)     — callback(top, bottom) on flip
  timer.set(interval, callback)       — repeat every N seconds
  timer.once(delay, callback)         — fire once after N seconds
  timer.cancel(timer_id)              — cancel a timer
  log(message)                        — print to console

Screen IDs: 1=top, 2=front, 3=right, 4=back, 5=left, 6=bottom

IMPORTANT: Your code MUST define a class that inherits from BaseStrategy.
"""
from dice import screen, log, timer
from dice.strategy import BaseStrategy


class HelloStrategy(BaseStrategy):
    _strategy_name = "hello"

    def __init__(self, game_name, config, assets_path, **kwargs):
        super().__init__(game_name, config, assets_path, **kwargs)
        self.count = 0
        self._timer_id = None

    def start_strategy(self):
        screen.set_text(1, "Starting...")
        log("Game started! Screens update every 2 seconds.")
        self._timer_id = timer.set(2.0, self._tick)

    def stop_strategy(self):
        if self._timer_id is not None:
            timer.cancel(self._timer_id)
        log("Game stopped.")

    def _tick(self):
        self.count += 1
        screen.set_text(1, f"Hello #{self.count}")
        log(f"tick {self.count}")
`;
