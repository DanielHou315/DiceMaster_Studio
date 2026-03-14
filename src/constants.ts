export const CHINESE_QUIZLET_CODE = `"""
Chinese Quizlet - Advanced multi-screen vocabulary card game.
"""
import os
import random

from dice import screen, motion, orientation, assets, log
from dice.strategy import BaseStrategy


class ChineseQuizlet(BaseStrategy):
    _strategy_name = "chinese_quizlet"

    def __init__(self, game_name: str, config: dict, assets_path: str, **kwargs):
        super().__init__(game_name, config, assets_path, **kwargs)
        self.top_screen_id = None
        self.bottom_screen_id = None
        self.side_screen_ids = []
        self.current_round = 0
        self.total_rounds = 3
        self.displayed_initial = False
        self.last_trigger_time = 0.0
        self.cooldown_duration = 3.0

    def _on_orientation_change(self, top, bottom):
        self.top_screen_id = top
        self.bottom_screen_id = bottom
        self.side_screen_ids = [sid for sid in range(1, 7) if sid != top and sid != bottom]
        if not self.displayed_initial:
            self._display_round()
            self.displayed_initial = True

    def _display_round(self):
        if self.top_screen_id is None:
            return
        r = self.current_round
        root = self._assets_path
        screen.set_text(self.top_screen_id, os.path.join(root, f"round_{r}_top.json"))
        screen.set_text(self.bottom_screen_id, os.path.join(root, f"round_{r}_bottom.json"))
        face_names = ["front", "back", "left", "right"]
        for i, sid in enumerate(self.side_screen_ids[:4]):
            screen.set_text(sid, os.path.join(root, f"round_{r}_{face_names[i]}.json"))

    def _on_shake(self, intensity):
        import time
        now = time.time()
        if now - self.last_trigger_time < self.cooldown_duration:
            return
        self.last_trigger_time = now
        self.current_round = random.randint(0, self.total_rounds - 1)
        self._display_round()

    def start_strategy(self):
        motion.on_shake(self._on_shake)
        orientation.on_change(self._on_orientation_change)

    def stop_strategy(self):
        pass


game = ChineseQuizlet("chinese_quizlet", {}, "/assets")
game.start_strategy()
`;

export const DICE_API_REFERENCE = `# DiceMaster Central Web — dice Package

Python SDK for the DiceMaster web simulator.
Docs & source: https://github.com/DanielHou315/DiceMaster_Central_Web

## Student API

\`\`\`python
from dice import screen, motion, orientation, timer, assets, log
from dice.strategy import BaseStrategy

class MyGame(BaseStrategy):
    _strategy_name = "my_game"

    def start_strategy(self):
        screen.set_image(1, assets.get("welcome.jpg"))
        motion.on_shake(self.on_shake)
        orientation.on_change(self.on_flip)

    def stop_strategy(self):
        pass

    def on_shake(self, intensity):
        screen.set_text(1, assets.get("next.json"))

    def on_flip(self, top, bottom):
        log(f"Top screen: {top}")
\`\`\`

## Modules

| Module            | Functions                                              |
|-------------------|--------------------------------------------------------|
| dice.screen       | set_text(id, path), set_image(id, path), set_gif(id, path) |
| dice.motion       | on_shake(fn), is_shaking(), shake_intensity()          |
| dice.orientation  | on_change(fn), top(), bottom()                         |
| dice.timer        | set(interval, fn), once(delay, fn), cancel(id)         |
| dice.assets       | get(name), list_all()                                  |
| dice.log          | log(message)                                           |
| dice.strategy     | BaseStrategy (abstract: start_strategy(), stop_strategy()) |

Screen IDs: 1=top, 2=front, 3=right, 4=back, 5=left, 6=bottom

## JS Bridge Protocol

### Outbound (Python → JS)
| type             | fields                |
|------------------|-----------------------|
| screen.set_text  | screen_id, path       |
| screen.set_image | screen_id, path       |
| screen.set_gif   | screen_id, path       |
| log              | message               |

### Inbound (JS → Python)
| type               | fields                         |
|--------------------|--------------------------------|
| motion.shake       | intensity (0.0-1.0)            |
| motion.still       | (none)                         |
| orientation.change | top, bottom (screen IDs)       |
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
