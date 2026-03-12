export const CHINESE_QUIZLET_CODE = `from m5stack import *
from m5ui import *
from uiflow import *
import random

# MOCK_SCREENS = {"top": {"type": "text", "content": "Chinese Quizlet"}, "bottom": {"type": "text", "content": "Shake to Start"}, "front": {"type": "text", "content": "DiceMaster"}, "back": {"type": "text", "content": "Ready"}, "left": {"type": "text", "content": "v2.4"}, "right": {"type": "text", "content": "Lab"}}

# Chinese Quizlet - Advanced Multi-Screen Game
# Official DiceMaster Example: https://github.com/DanielHou315/DiceMaster
# Top: Question in English
# Bottom: Answer in Chinese
# Sides: Visual hints/Context

cards = [
    {
        "eng": "Apple",
        "chi": "苹果 (Píngguǒ)",
        "hints": ["Red Fruit", "Sweet", "Crunchy", "🍎"],
        "mock": {
            "top": {"type": "text", "content": "How do you say 'Apple'?"},
            "bottom": {"type": "text", "content": "苹果 (Píngguǒ)"},
            "front": {"type": "text", "content": "Red Fruit"},
            "back": {"type": "text", "content": "Sweet"},
            "left": {"type": "text", "content": "Crunchy"},
            "right": {"type": "text", "content": "🍎"}
        }
    },
    {
        "eng": "Computer",
        "chi": "电脑 (Diànnǎo)",
        "hints": ["Electric Brain", "Screen", "Keyboard", "💻"],
        "mock": {
            "top": {"type": "text", "content": "How do you say 'Computer'?"},
            "bottom": {"type": "text", "content": "电脑 (Diànnǎo)"},
            "front": {"type": "text", "content": "Electric Brain"},
            "back": {"type": "text", "content": "Screen"},
            "left": {"type": "text", "content": "Keyboard"},
            "right": {"type": "text", "content": "💻"}
        }
    },
    {
        "eng": "Cat",
        "chi": "猫 (Māo)",
        "hints": ["Meow", "Feline", "Whiskers", "🐱"],
        "mock": {
            "top": {"type": "text", "content": "How do you say 'Cat'?"},
            "bottom": {"type": "text", "content": "猫 (Māo)"},
            "front": {"type": "text", "content": "Meow"},
            "back": {"type": "text", "content": "Feline"},
            "left": {"type": "text", "content": "Whiskers"},
            "right": {"type": "text", "content": "🐱"}
        }
    }
]

current_idx = -1
cooldown = 0

def show_next():
    global current_idx, cooldown
    if cooldown > 0: return
    
    current_idx = (current_idx + 1) % len(cards)
    card = cards[current_idx]
    
    lcd.clear()
    lcd.setCursor(0, 0)
    lcd.print("Question: " + card['eng'], 0, 0, 0xffffff)
    lcd.print("Answer: " + card['chi'], 0, 40, 0x00ff00)
    
    # Update simulator state
    print("--- QUIZLET TRIGGERED ---")
    print("Card: " + card['eng'])
    
    # Cooldown to prevent double triggers
    cooldown = 30 # ~3 seconds at 100ms loop

# Initial setup
lcd.setBrightness(50)
lcd.print("Shake to Start Quiz", 10, 100, 0x00ff00)

while True:
    if imu0.was_shaken():
        show_next()
    
    if cooldown > 0:
        cooldown -= 1
        
    wait_ms(100)
`;

export const HARDWARE_OPTIMIZER_CODE = `# Hardware Optimizer Utility
# Ported from DanielHou315/DiceMaster/scripts/hardware_optimizer.py
# Calculates optimal screen refresh rates based on SPI bus load.

import time

screens = 6
resolution = 240 * 240
bit_depth = 16
spi_clock = 40000000 # 40MHz

def calculate_max_fps():
    bits_per_frame = resolution * bit_depth
    total_bits_per_refresh = bits_per_frame * screens
    
    # Theoretical max FPS
    max_fps = spi_clock / total_bits_per_refresh
    return max_fps

print("--- DiceMaster Hardware Optimization ---")
print(f"Screens: {screens}")
print(f"Resolution: {resolution}px")
print(f"SPI Clock: {spi_clock/1000000} MHz")

fps = calculate_max_fps()
print(f"Theoretical Max FPS: {fps:.2f}")

if fps < 30:
    print("WARNING: SPI bandwidth limited. Consider reducing bit depth or resolution.")
else:
    print("STATUS: Bandwidth optimal for 30FPS operation.")
`;

export const DEFAULT_BASE_CODE = `from m5stack import *
from m5ui import *
from uiflow import *
import random

# MOCK_SCREENS = {"top": {"type": "text", "content": "DiceMaster Quiz"}, "bottom": {"type": "text", "content": "Shake to Start"}, "front": {"type": "text", "content": "?"}, "back": {"type": "text", "content": "?"}, "left": {"type": "text", "content": "?"}, "right": {"type": "text", "content": "?"}}

# DiceMaster Quiz Game
# This script simulates a multi-screen quiz game.
# Top: Question
# Bottom: Answer
# Sides: Hints

lcd.setBrightness(100)
lcd.clear()

questions = [
    {
        "q": "What is 7x8?", 
        "a": "56", 
        "h": ["50+6", "8x7", "7x7+7", "60-4"],
        "mock": {
            "top": {"type": "text", "content": "What is 7x8?"},
            "bottom": {"type": "text", "content": "56"},
            "front": {"type": "text", "content": "50+6"},
            "back": {"type": "text", "content": "8x7"},
            "left": {"type": "text", "content": "7x7+7"},
            "right": {"type": "text", "content": "60-4"}
        }
    },
    {
        "q": "Capital of France?", 
        "a": "Paris", 
        "h": ["Eiffel Tower", "Louvre", "Seine", "Europe"],
        "mock": {
            "top": {"type": "text", "content": "Capital of France?"},
            "bottom": {"type": "text", "content": "Paris"},
            "front": {"type": "text", "content": "Eiffel Tower"},
            "back": {"type": "text", "content": "Louvre"},
            "left": {"type": "text", "content": "Seine"},
            "right": {"type": "text", "content": "Europe"}
        }
    }
]

current_q = 0

def update_simulator(mock_data):
    # In this simulator, we use the MOCK_SCREENS comment for initial state.
    # For dynamic updates, we print to console which the user can see.
    print("--- SIMULATOR UPDATE ---")
    for face, data in mock_data.items():
        print(f"{face.upper()}: {data['content']}")

def on_shake():
    global current_q
    current_q = (current_q + 1) % len(questions)
    q = questions[current_q]
    lcd.clear()
    lcd.print(q['q'], 10, 10, 0x00ff00)
    update_simulator(q['mock'])

# Initial Screen
lcd.print("DiceMaster", 20, 20, 0xffffff)
lcd.print("Shake to Play", 20, 50, 0x00ff00)

while True:
    if imu0.was_shaken():
        on_shake()
    wait_ms(100)
`;
