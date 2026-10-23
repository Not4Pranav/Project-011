# Discord All-Rounder Bot

A production-ready Discord bot with a complete server setup wizard (`/setup`) that configures tickets, welcome, moderation, games, and utility features in one command.

## Features

### 🎫 Ticket System
- Interactive ticket panels with buttons
- Categories, support roles, transcripts
- Claim, close, reopen, delete tickets
- Add/remove users from tickets
- Transcript generation (text file)

### 👋 Welcome System
- Customizable welcome/leave messages with embeds
- Auto-role assignment on join
- DM welcome messages
- Invite tracking
- Fake user detection (flags suspicious accounts)

### 🛡️ Moderation
- Warn, mute, kick, ban, unban, timeout
- Message purge (bulk delete)
- Warning system with case tracking
- Mod logs with detailed embeds
- DM notifications on actions
- Appeal system

### 🎮 Games & Economy
- Economy system (balance, daily, work)
- Slot machine
- Coin flip
- Rock Paper Scissors
- Trivia questions
- Hangman
- Leaderboards (balance, XP, wins, games played)

### 🔧 Utility
- Message snipe (deleted messages)
- Quote system (save messages as quotes)
- User info, server info, avatar
- Ping/latency check

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Discord Bot Token

### Local Development

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd discord-bot
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Setup database**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

### Docker Deployment (Recommended)

1. **Build and run**
   ```bash
   cd docker
   docker-compose up --build -d
   ```

2. **View logs**
   ```bash
   docker-compose logs -f bot
   ```

### Render.com Deployment (Free Tier)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Deploy via Blueprint**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New Blueprint Instance"
   - Connect your GitHub repository
   - Fill in required environment variables (DISCORD_TOKEN, CLIENT_ID, etc.)
   - Deploy!

   Or use the CLI:
   ```bash
   render blueprint launch
   ```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | Yes | Bot token from Discord Developer Portal |
| `CLIENT_ID` | Yes | Application ID from Discord Developer Portal |
| `CLIENT_SECRET` | Yes | Client secret from Discord Developer Portal |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DB_PASSWORD` | Docker only | Database password for Docker Compose |
| `OWNER_IDS` | No | Comma-separated owner user IDs |
| `BOT_PREFIX` | No | Prefix for text commands (default: `!`) |
| `LOG_LEVEL` | No | Log level: debug, info, warn, error (default: info) |

### Default Config (src/config/config.json)

The bot loads defaults from `src/config/config.json` which can be overridden by environment variables.

## Usage

### Setup Wizard
Run `/setup` in your server to configure everything interactively:
1. Basic config (prefix, language, log channels)
2. Permission roles (moderator, admin, owner)
3. Ticket system (category, support role, panel)
4. Welcome system (messages, auto-role, DMs)
5. Moderation (log channel, mute role)
6. Games & Economy (enable, starting balance)
7. Utility (snipe, quotes)
8. Confirm & Apply

### Commands

#### Slash Commands (Primary)
All commands available as slash commands. Use `/command` in Discord.

#### Prefix Commands (Legacy)
All commands also work with prefix (default `!`). Example: `!balance`, `!warn @user reason`

#### Key Commands
| Command | Description | Permission |
|---------|-------------|------------|
| `/setup` | Interactive server setup | Owner |
| `/warn <user> <reason>` | Warn a user | Moderator |
| `/mute <user> [duration] <reason>` | Mute/timeout a user | Moderator |
| `/kick <user> <reason>` | Kick a user | Moderator |
| `/ban <user> <reason> [days]` | Ban a user | Admin |
| `/timeout <user> <duration> <reason>` | Discord native timeout | Moderator |
| `/purge <amount> [user]` | Delete messages | Moderator |
| `/ticket panel <channel> <title> <desc>` | Create ticket panel | Moderator |
| `/balance [user]` | Check balance | Everyone |
| `/daily` | Claim daily reward | Everyone |
| `/work` | Work for money | Everyone |
| `/slots <bet>` | Play slots | Everyone |
| `/coinflip <bet> <choice>` | Flip a coin | Everyone |
| `/rps <choice> [bet]` | Rock Paper Scissors | Everyone |
| `/trivia` | Answer trivia | Everyone |
| `/hangman [bet]` | Play hangman | Everyone |
| `/leaderboard [type]` | View leaderboards | Everyone |
| `/snipe [channel]` | Show last deleted message | Everyone |
| `/quote <message_id> [name]` | Create quote | Everyone |
| `/quotes [user]` | List quotes | Everyone |
| `/avatar [user]` | Show avatar | Everyone |
| `/serverinfo` | Server info | Everyone |
| `/userinfo [user]` | User info | Everyone |
| `/ping` | Check latency | Everyone |

### Ticket Panel Buttons
- **Create Ticket** - Opens a new ticket
- **Close** - Closes the ticket
- **Claim** - Claims the ticket
- **Transcript** - Generates transcript
- **Reopen** - Reopens closed ticket
- **Delete** - Deletes ticket channel

## Permission System

The bot uses a 4-level permission system:

| Level | Name | Discord Perms | DB Roles |
|-------|------|---------------|----------|
| 0 | Everyone | None | None |
| 1 | Moderator | ManageMessages, KickMembers, MuteMembers, ViewAuditLog | Configurable |
| 2 | Admin | ManageGuild, BanMembers, ManageRoles, ManageChannels | Configurable |
| 3 | Owner | Administrator | Configurable + Guild Owner + Bot Owner |

Configure roles via `/setup` or `/welcome setrole`.

## Database Schema

The bot uses Prisma with PostgreSQL. Key models:
- `GuildConfig` - Per-server settings
- `TicketConfig/Ticket/TicketPanel` - Ticket system
- `WelcomeConfig/WelcomeMessage` - Welcome system
- `ModConfig/Warning/Mute/ModCase` - Moderation
- `GameConfig/GameUser/Leaderboard` - Games/Economy
- `SnipedMessage/Quote` - Utility

## Development

### Project Structure
```
src/
├── commands/          # Slash + prefix commands
│   ├── moderation/    # Warn, mute, kick, ban, etc.
│   ├── tickets/       # Ticket system
│   ├── welcome/       # Welcome system
│   ├── games/         # Economy, games
│   └── utility/       # Snipe, quote, info
├── events/            # Discord event handlers
├── handlers/          # Feature handlers (future)
├── structures/        # Extended Client class
├── utils/             # Embeds, database, permissions, constants
├── config/            # Configuration loader
├── database/          # Prisma client
└── types/             # TypeScript types
```

### Commands
```bash
npm run dev          # Development with hot reload
npm run build        # Build TypeScript
npm run start        # Run built version
npm run lint         # ESLint
npm run format       # Prettier
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to DB
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
```

### Adding New Commands
1. Create file in `src/commands/<category>/<name>.ts`
2. Export default `Command` object with `data` and `execute`
3. For prefix commands, export `PrefixCommand` with `name` and `execute`
4. Run `npm run dev` - commands auto-load

## Discord Developer Portal Setup

1. Create application at [Discord Developer Portal](https://discord.com/developers/applications)
2. Enable **Privileged Gateway Intents**:
   - Server Members Intent
   - Message Content Intent
   - Server Invites Intent
3. Copy **Application ID** (CLIENT_ID) and **Client Secret**
4. Create **Bot** → Copy **Token** (DISCORD_TOKEN)
5. Invite bot with scopes: `bot`, `applications.commands`
6. Required permissions: Administrator (or specific perms)

## License

MIT License - see LICENSE file for details.

## Support

- Create an issue on GitHub for bugs/features
- Check Discord Developer Portal for intent requirements
- Ensure PostgreSQL is accessible from your deployment environment