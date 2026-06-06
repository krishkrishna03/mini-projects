# 🎮 Rock Paper Scissors vs AI

A modern Rock Paper Scissors game built using HTML, CSS, and JavaScript featuring an AI opponent powered by `Math.random()`.

## 🚀 Features

- 🤖 AI opponent using random move generation
- 📊 Dynamic scoreboard
- 🏆 Win, Loss, and Draw tracking
- 🔥 Winning/Losing streak counter
- 📈 Live win-rate calculation
- 📝 Match history tracking
- 🎨 Modern cyberpunk-inspired UI
- ⚡ Smooth animations and transitions
- 📱 Fully responsive design

---

## 🛠 Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript
- Math.random()

---

## 🎯 How It Works

The AI selects its move randomly:

```javascript
function aiPick() {
    return CHOICES[Math.floor(Math.random() * 3)];
}
```

Each move has an equal probability:

- Rock → 33.3%
- Paper → 33.3%
- Scissors → 33.3%

---

## 📂 Project Structure

```
rock-paper-scissors-ai/
│
├── index.html
├── README.md
└── assets/
```

---

## 🎮 Gameplay Rules

| Choice | Beats |
|----------|----------|
| Rock 🪨 | Scissors ✂️ |
| Paper 📄 | Rock 🪨 |
| Scissors ✂️ | Paper 📄 |

### Win Conditions

- Rock beats Scissors
- Paper beats Rock
- Scissors beats Paper
- Same choices result in a Draw

---

## 📊 Statistics Tracked

- Total Games
- Wins
- Losses
- Draws
- Win Rate
- Current Streak
- Match History

---

## 🚀 Getting Started

### Clone Repository

```bash
git clone https://github.com/yourusername/rock-paper-scissors-ai.git
```

### Open Project

Simply open:

```bash
index.html
```

in your browser.

No installation required.

---

## 📸 Preview

Features:

- Dynamic Scoreboard
- AI Thinking Animation
- Match History
- Win Rate Progress Bar
- Streak Tracking

---

## 🌟 Future Improvements

- Difficulty Levels
- Local Storage Support
- Sound Effects
- Multiplayer Mode
- Best Score Records
- Dark/Light Themes

---

## 📄 License

This project is open-source and available under the MIT License.

---

### Made with ❤️ using HTML, CSS & JavaScript
