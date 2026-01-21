<div align="center">

# 🤖 OpenNova
### A Minecraft Companion Bot

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Minecraft](https://img.shields.io/badge/Minecraft-1.21.1-62B47A?style=for-the-badge&logo=minecraft&logoColor=white)](https://minecraft.net/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

OpenNova is a command-based Minecraft bot built with Mineflayer. 
It's designed to be a helpful utility companion for single-player or LAN worlds that can handle boring chores like mining, crafting, and sorting chests.

[Features](#-features) • [Installation](#-installation) • [Commands](COMMANDS.md) • [Configuration](#-configuration)

</div>

---

## ✨ What it does

It's not a complex neural network AI—it's a scripted bot with a good memory system. It helps you by:

| Feature | Description |
|---------|-------------|
| ⛏️ **Mining** | Can mine specific blocks or strip mine and collect drops |
| 🔨 **Crafting** | Handles recipes fairly well (including utilizing crafting tables) |
| 🛒 **Inventory** | Can check inventory, equip and unequip items |
| 📦 **Organizing** | Remembers where your chests are and what's inside them |
| ⚔️ **Guarding** | Can follow you and fight off mobs (basic combat) attack 1 mob at a time |
| 🏠 **Teleporting** | Saves waypoints and home locations for easy travel |
| 🔌 **Eating and Sleep system** | By using command he can eat when hungry and sleep by finding bed itself |

---

## ⚠️ Known Limitations
*   Intended for **single-player** or private servers.
*   Pathfinding can struggle on complex terrain or long distances.
*   It requires you to be within render distance for some interaction commands.
*   It is a work-in-progress project!

---

## 📦 Installation

### Prerequisites
- **Node.js**: v18 or higher
- **Java**: Java 17+ (for the Minecraft server)
- **Minecraft**: Java Edition 1.21.1

### Setup
```bash
# Clone the repository
git clone https://github.com/orbix03/opennova.git
cd opennova

# Install dependencies
npm install

# Configure the bot (edit config/default.json)
# Set your server host, port, and bot username

# Start the bot
npm start
```

---

## 🎮 Basic Usage

Once the bot connects, you control it via chat commands:

```
!come              → Bot walks to your location
!follow            → Bot follows you
!mine iron_ore 5   → Mines 5 iron ore
!craft iron_pickaxe → Crafts a tool (auto-places table if needed)
!sleep             → Finds a bed or goes home to sleep
```

### 📖 [See All 70+ Commands →](COMMANDS.md)

---

## ⚙️ Configuration

Edit `config/default.json` to change settings:

```json
{
    "bot": {
        "username": "OpenNova",
        "port": 25565
    }, ...

}
```

---

## 🤝 Contributing

This is an open-source hobby project. If you find bugs (and you probably will), feel free to open an issue or submit a PR!

---

<div align="center">

Made with ❤️ by Orbix
</div>
