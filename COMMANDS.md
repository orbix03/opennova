# OpenNova Commands Reference

Complete list of all available commands. Default prefix: `!`

---

## 📍 Navigation Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `!goto` | Navigate to coordinates | `!goto <x> <y> <z>` |
| `!come` | Come to you | `!come` |
| `!follow` | Follow a player | `!follow [player]` |
| `!stop` | Stop all movement | `!stop` |
| `!waypoint` | Manage waypoints | `!waypoint <save\|goto\|list\|delete> [name]` |
| `!sethome` | Set home location | `!sethome` |
| `!home` | Go to home | `!home` |
| `!death` | Go to last death location | `!death` |
| `!look` | Look at player/coords | `!look <player\|x y z>` |
| `!players` | List nearby players | `!players` |

**Aliases:** `!wp` = waypoint, `!here` = come, `!tome` = come

---

## ⚔️ Combat Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `!attack` | Attack a player or mob | `!attack <target>` |
| `!defend` | Toggle defense mode | `!defend [on\|off]` |
| `!guard` | Guard a player | `!guard [player]` |
| `!flee` | Run away from danger | `!flee` |
| `!pvp` | Toggle PvP mode | `!pvp [on\|off]` |
| `!mobs` | List nearby hostile mobs | `!mobs` |
| `!weapon` | Equip best weapon | `!weapon` |

---

## ⛏️ Mining Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `!mine` | Mine specific blocks | `!mine <block> [count]` |
| `!digat` | Dig at coordinates | `!digat <x> <y> <z>` |
| `!stripmine` | Strip mine forward | `!stripmine [length]` |
| `!ores` | Find and mine ores | `!ores [count]` |
| `!stopmining` | Stop mining | `!stopmining` |
| `!collect` | Collect nearby items | `!collect` |
| `!find` | Find nearby blocks | `!find <block>` |
| `!gotoblock` | Go to a block type | `!gotoblock <block>` |
| `!chop` | Chop trees | `!chop [count]` |

---

## 🔨 Crafting Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `!craft` | Craft an item | `!craft <item> [count]` |
| `!smelt` | Smelt items in furnace | `!smelt <item> [count]` |
| `!recipe` | Show recipe for item | `!recipe <item>` |
| `!cancraft` | Check if can craft | `!cancraft <item>` |
| `!planks` | Craft planks from logs | `!planks [count]` |
| `!sticks` | Craft sticks | `!sticks [count]` |
| `!tools` | Craft a set of tools | `!tools <wood\|stone\|iron\|diamond>` |
| `!armor` | Craft a set of armor | `!armor <iron\|diamond>` |

> **Note:** Bot automatically finds/places crafting table for 3x3 recipes!

---

## 🎒 Inventory Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `!inventory` | Show inventory | `!inventory` |
| `!equip` | Equip an item | `!equip <item> [slot]` |
| `!unequip` | Unequip held item | `!unequip` |
| `!drop` | Drop items | `!drop <item\|all> [count]` |
| `!count` | Count specific item | `!count <item>` |
| `!give` | Give item to player | `!give <item> [count]` |

**Aliases:** `!inv` = inventory, `!i` = inventory, `!hand` = give

---

## 📦 Chest Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `!chest` | View/label nearby chest | `!chest [label]` |
| `!store` | Store items in chest | `!store [item]` |
| `!withdraw` | Withdraw from chest | `!withdraw <item> [count]` |
| `!finditem` | Search all remembered chests | `!finditem <item>` |
| `!chests` | List all remembered chests | `!chests` |
| `!labelchest` | Label a chest | `!labelchest <label>` |
| `!basechest` | Mark chest as base chest | `!basechest` |

**Aliases:** `!search` = finditem, `!get` = withdraw

> **Note:** Bot remembers chest contents automatically when you open them!

---

## 🏠 Survival Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `!eat` | Eat food manually | `!eat` |
| `!sleep` | Sleep in bed (or go home) | `!sleep` |
| `!wake` | Wake up from bed | `!wake` |
| `!status` | Show bot status | `!status` |
| `!equiparmor` | Equip best armor | `!equiparmor` |

> **Note:** `!sleep` will go to home if no bed is nearby!

---

## 🔧 Utility Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `!help` | Show help | `!help [command]` |
| `!say` | Make bot say something | `!say <message>` |
| `!pos` | Show bot position | `!pos` |
| `!time` | Show world time | `!time` |
| `!weather` | Show weather | `!weather` |
| `!uptime` | Show bot uptime | `!uptime` |
| `!version` | Show bot version | `!version` |
| `!disconnect` | Disconnect bot | `!disconnect` |
| `!reconnect` | Reconnect bot | `!reconnect` |
| `!jump` | Make bot jump | `!jump` |
| `!sneak` | Toggle sneak | `!sneak` |
| `!sprint` | Toggle sprint | `!sprint` |
| `!memory` | Show memory stats | `!memory` |

---

## Examples

### Basic Workflow
```
!come                     # Bot comes to you
!follow                   # Bot follows you
!mine oak_log 10          # Mine 10 oak logs
!craft wooden_pickaxe     # Auto-handles crafting table!
!give wooden_pickaxe      # Gives it to you
```

### Base Management
```
!sethome                  # Set home at base
!chest tools              # Label nearby chest as "tools"
!basechest                # Mark it as base chest
!store                    # Store all items in chest
```

### Finding Items
```
!finditem diamond         # Search all chests for diamonds
!chests                   # List all remembered chests
```

### Survival
```
!sleep                    # Sleep in nearby bed or go home
!eat                      # Eat food when hungry
!status                   # Check health, hunger, position
```

---

*Total Commands: 70+*
