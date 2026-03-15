# SweetSprint | Endless Cookie Run 🍪🏃‍♀️

SweetSprint is a high-speed, perspective-driven endless runner built with **Next.js 15** and **Phaser 3**. Help the runner navigate a massive three-level bridge, dodging urban obstacles and collecting delicious cookies!

## 🎮 Game Features

- **Triple-Lane Perspective**: Navigate three distinct bridge levels, each with its own speed and scale.
- **Dynamic Difficulty**: The game gets faster and more challenging the further you run.
- **Lane-Dependent Scoring**: Higher risk, higher reward! Running on the bottom level increases your distance significantly faster than the top.
- **Procedural Obstacles**: A math-based generation system ensures a consistent and fair challenge.
- **Responsive Controls**: Fluid movement optimized for desktop play.
- **Modern HUD**: Real-time tracking of distance (metres), cookie count, and health.

## 🕹 Controls

| Action | Key | Description |
| :--- | :--- | :--- |
| **Move Up** | `↑` (Up Arrow) | Switch to the bridge level above. |
| **Move Down** | `↓` (Down Arrow) | Switch to the bridge level below. |
| **Jump** | `↑` (Up Arrow) | Perform a jump ONLY when already on the top level (Level 0). |
| **Slide** | `←` / `→` (Left/Right) | Slide to dodge low obstacles on your current level. |
| **Pause** | `UI Button` | Pause the game to take a breather. |

## 🛠 Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Game Engine**: [Phaser 3](https://phaser.io/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [Shadcn UI](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **AI Integration**: [Google Genkit](https://firebase.google.com/docs/genkit) (Infrastructure ready for dynamic level design)

## 🚀 Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kisb2k/cookiesprint.git
   cd cookiesprint
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open the game:**
   Navigate to `http://localhost:9002` in your browser.

## 📝 Project Structure

- `src/components/game`: Contains the Phaser scene logic (`SweetSprintScene.ts`) and the React container (`GameContainer.tsx`).
- `src/ai`: Genkit flows for potential AI-driven obstacle placement.
- `src/app`: Next.js page routes and global styles.

---

Made with ❤️ by the App Prototyper.
