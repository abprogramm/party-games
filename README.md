# 🎉 Party Games

**Party Games** is a real-time multiplayer web game inspired by popular YouTube and TikTok-style party games like *Impostor*, *Spy*, *What's the Question?*, and *Wavelength*. It's designed to be fun, social, and chaotic — perfect for playing with friends online.

Built with **React**, **Node.js**, and **Socket.IO**, this project allows players to join a room, choose a game mode, and dive into fast-paced rounds of hidden roles, guessing, and deduction.

## 🚀 Features

- 🕹️ Multiple game modes:
  - **Impostor** – Can you fool your friends and spot the impostor?
  - **Spy** – Guess the word while pretending you know it.
  - **What's the Question?** – Reverse game where you guess the original question.
  - **Wavelength** – Find the perfect position on the scale as a team.
- 👥 Real-time multiplayer via **Socket.IO**
- 🎨 Sleek and modern UI with bottom navigation tabs (Home, Detect, History)
- 🛠️ Built using modern web tools:
  - React (frontend)
  - Node.js + Express + Socket.IO (backend)
  - Tailwind CSS for styling

## 📸 Screenshots

![image](https://github.com/user-attachments/assets/2001d80b-723b-41d7-a761-9da44bf797fc)


## 🧱 Project Structure

```
party-games/
│
├── client/               # React frontend
│   ├── public/
│   └── src/
│       ├── components/
│       ├── pages/
│       └── App.jsx
│
├── server/               # Node.js + Socket.IO backend
│   ├── index.js
│   └── gameLogic/
│
└── README.md
```

## 📦 Installation

### 1. Clone the repo

```bash
git clone https://github.com/abprogramm/party-games.git
cd party-games
```

### 2. Set up the backend

```bash
cd server
npm install
npm start
```

### 3. Set up the frontend

```bash
cd ../client
npm install
npm run dev
```

The app will typically be available at `http://localhost:5173`

## 🧠 How It Works

1. A player creates a room and chooses a game mode.
2. Others can join using the room code.
3. Game logic is handled server-side via Socket.IO.
4. Players interact in real-time as the game unfolds!

## 🌐 Deployment

- Frontend: [Vercel](https://vercel.com/)
- Backend: [Render](https://render.com/) or [Fly.io](https://fly.io/)

## 🙋‍♂️ Contributing

Pull requests are welcome! Got a cool new game idea or want to improve the UI/UX? Let’s build it together.

## 📄 License

MIT License

---

Built by [@abprogramm](https://github.com/abprogramm) 💻
