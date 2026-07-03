import os
import json
import random
import time

from dice import screen, motion, orientation, assets, log, timer
from dice.strategy import BaseStrategy


class LoanwordLabyrinthStrategy(BaseStrategy):
    _strategy_name = "loanword_labyrinth"

    def __init__(self, game_name: str, config: dict, assets_path: str, **kwargs):
        super().__init__(game_name, config, assets_path, **kwargs)
        self.top_screen_id = None
        self.bottom_screen_id = None
        self.side_screen_ids = []
        self.current_round = 0
        self.rounds = []
        self.last_trigger_time = 0.0
        self.cooldown = 3.0
        self._load_rounds()

    def _load_rounds(self):
        """Load round data from assets directory."""
        root = self._assets_path
        rounds_file = os.path.join(root, "rounds.json")
        if os.path.exists(rounds_file):
            with open(rounds_file, "r") as f:
                self.rounds = json.load(f)
        log(f"{self._strategy_name} loaded {len(self.rounds)} rounds")

    def _on_orientation_change(self, top, bottom):
        self.top_screen_id = top
        self.bottom_screen_id = bottom
        self.side_screen_ids = [s for s in range(1, 7) if s != top and s != bottom]
        self._display_current()

    def _display_current(self):
        if not self.rounds or self.top_screen_id is None:
            return
        rd = self.rounds[self.current_round]
        face_keys = ["top", "bottom", "front", "back", "left", "right"]
        screen_ids = [self.top_screen_id, self.bottom_screen_id] + self.side_screen_ids[:4]
        
        for i, key in enumerate(face_keys):
            if i < len(screen_ids):
                text_path = os.path.join(self._assets_path, f"round_{self.current_round}_{key}.json")
                if os.path.exists(text_path):
                    screen.set_text(screen_ids[i], text_path)

    def _on_shake(self, intensity):
        now = time.time()
        if now - self.last_trigger_time < self.cooldown:
            return
        self.last_trigger_time = now
        self.current_round = random.randint(0, len(self.rounds) - 1)
        self._display_current()
        log(f"Shake! Now showing round {self.current_round}")

    def start_strategy(self):
        motion.on_shake(self._on_shake)
        orientation.on_change(self._on_orientation_change)
        log(f"{self._strategy_name} started")

    def stop_strategy(self):
        log(f"{self._strategy_name} stopped")
