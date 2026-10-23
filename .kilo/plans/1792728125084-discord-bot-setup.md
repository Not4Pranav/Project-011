# Discord Bot Complete Setup Plan

## Project Overview
Build a production-ready, extensible Discord bot with a single `/setup` command that configures an entire server with tickets, welcome, moderation, games, and utility features.

## Tech Stack
- **Runtime**: Node.js 20+ with TypeScript
- **Library**: discord.js v14 (future-proof, TypeScript-first, extensive ecosystem)
- **Database**: PostgreSQL (via Prisma ORM) - production-grade, scalable, free tier on Render/Neon/Supabase
- **Deployment**: Docker + docker-compose for Render.com free tier
- **Process Manager**: Single container (no PM2 needed in Docker)
- **Config**: Environment variables + `config.json` for defaults
- **Permissions**: Role-based permission system with configurable levels

## Project Structure
```
/workspace/app/
├── src/
│   ├── index.ts                 # Entry point
│   ├── config/
│   │   ├── index.ts            # Config loader (env + config.json)
│   │   └── config.json         # Default configuration
│   ├── database/
│   │   ├── client.ts           # Prisma client singleton
│   │   └── schema.prisma       # Database schema
│   ├── commands/
│   │   ├── index.ts            # Command loader/registrar
│   │   ├── setup.ts            # /setup main command
│   │   ├── moderation/         # Moderation commands
│   │   ├── tickets/            # Ticket commands
│   │   ├── welcome/            # Welcome commands
│   │   ├── games/              # Game commands
│   │   └── utility/            # Snipe, quote, etc.
│   ├── events/
│   │   ├── index.ts            # Event loader
│   │   ├── ready.ts            # Bot ready
│   │   ├── interactionCreate.ts # Slash/prefix handling
│   │   ├── messageCreate.ts    # Prefix + snipe/quote
│   │   ├── guildMemberAdd.ts   # Welcome
│   │   ├── guildMemberRemove.ts # Goodbye
│   │   └── messageDelete.ts    # Snipe
│   ├── handlers/
│   │   ├── ticketHandler.ts    # Ticket logic
│   │   ├── welcomeHandler.ts   # Welcome logic
│   │   ├── modHandler.ts       # Moderation logic
│   │   ├── gameHandler.ts      # Game logic
│   │   └── permissionHandler.ts # Permission checks
│   ├── structures/
│   │   ├── ExtendedClient.ts   # Custom client class
│   │   └── Command.ts          # Command interface
│   ├── utils/
│   │   ├── embeds.ts           # Embed builders
│   │   ├── permissions.ts      # Permission utilities
│   │   ├── database.ts         # DB helpers
│   │   └── constants.ts        # Constants/enums
│   └── types/
│       └── index.ts            # TypeScript types
├── prisma/
│   └── schema.prisma           # Prisma schema
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── .dockerignore
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Database Schema (Prisma)

```prisma
// Core models
model GuildConfig {
  id              String   @id @default(cuid())
  guildId         String   @unique
  prefix          String   @default("!")
  language        String   @default("en")
  logChannelId    String?
  modLogChannelId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  ticketConfig    TicketConfig?
  welcomeConfig   WelcomeConfig?
  modConfig       ModConfig?
  gameConfig      GameConfig?
  permissions     PermissionRole[]
  snipedMessages  SnipedMessage[]
  quotes          Quote[]
}

model PermissionRole {
  id        String   @id @default(cuid())
  guildId   String
  roleId    String
  level     Int      // 1=mod, 2=admin, 3=owner
  guildConfig GuildConfig @relation(fields: [guildId], references: [guildId], onDelete: Cascade)
  @@unique([guildId, roleId])
}

// Ticket System
model TicketConfig {
  id              String   @id @default(cuid())
  guildId         String   @unique
  categoryId      String?
  logChannelId    String?
  supportRoleId   String?
  transcriptChannelId String?
  guildConfig     GuildConfig @relation(fields: [guildId], references: [guildId], onDelete: Cascade)
  panels          TicketPanel[]
  tickets         Ticket[]
}

model TicketPanel {
  id          String   @id @default(cuid())
  configId    String
  channelId   String
  messageId   String
  title       String
  description String
  emoji       String
  categoryId  String?
  config      TicketConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
}

model Ticket {
  id          String   @id @default(cuid())
  configId    String
  channelId   String   @unique
  userId      String
  claimedBy   String?
  status      TicketStatus @default(OPEN)
  type        String?
  createdAt   DateTime @default(now())
  closedAt    DateTime?
  config      TicketConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
  messages    TicketMessage[]
}

model TicketMessage {
  id        String   @id @default(cuid())
  ticketId  String
  userId    String
  content   String
  attachments String[] @default([])
  createdAt DateTime @default(now())
  ticket    Ticket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
}

enum TicketStatus {
  OPEN
  CLAIMED
  CLOSED
  DELETED
}

// Welcome System
model WelcomeConfig {
  id              String   @id @default(cuid())
  guildId         String   @unique
  enabled         Boolean  @default(true)
  channelId       String?
  dmEnabled       Boolean  @default(false)
  dmMessage       String?
  roleId          String?
  leaveChannelId  String?
  leaveMessage    String?
  inviteTracking  Boolean  @default(true)
  fakeUserCheck   Boolean  @default(true)
  guildConfig     GuildConfig @relation(fields: [guildId], references: [guildId], onDelete: Cascade)
  messages        WelcomeMessage[]
}

model WelcomeMessage {
  id        String   @id @default(cuid())
  configId  String
  type      WelcomeType
  content   String
  embedData Json?
  config    WelcomeConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
}

enum WelcomeType {
  WELCOME
  LEAVE
  DM
}

// Moderation
model ModConfig {
  id            String   @id @default(cuid())
  guildId       String   @unique
  logChannelId  String?
  dmOnAction    Boolean  @default(true)
  guildConfig   GuildConfig @relation(fields: [guildId], references: [guildId], onDelete: Cascade)
  warnings      Warning[]
  mutes         Mute[]
  cases         ModCase[]
}

model Warning {
  id        String   @id @default(cuid())
  configId  String
  userId    String
  moderatorId String
  reason    String
  createdAt DateTime @default(now())
  config    ModConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
}

model Mute {
  id        String   @id @default(cuid())
  configId  String
  userId    String
  moderatorId String
  reason    String
  duration  Int?     // minutes, null = permanent
  expiresAt DateTime?
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  config    ModConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
}

model ModCase {
  id          String   @id @default(cuid())
  configId    String
  type        CaseType
  userId      String
  moderatorId String
  reason      String
  duration    Int?
  createdAt   DateTime @default(now())
  config      ModConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
}

enum CaseType {
  WARN
  MUTE
  UNMUTE
  KICK
  BAN
  UNBAN
  TIMEOUT
  PURGE
}

// Games
model GameConfig {
  id          String   @id @default(cuid())
  guildId     String   @unique
  economyEnabled Boolean @default(true)
  guildConfig GuildConfig @relation(fields: [guildId], references: [guildId], onDelete: Cascade)
  users       GameUser[]
  leaderboards Leaderboard[]
}

model GameUser {
  id        String   @id @default(cuid())
  configId  String
  userId    String
  balance   Int      @default(1000)
  xp        Int      @default(0)
  level     Int      @default(1)
  streak    Int      @default(0)
  lastDaily DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  config    GameConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
  @@unique([configId, userId])
}

model Leaderboard {
  id        String   @id @default(cuid())
  configId  String
  type      LeaderboardType
  userId    String
  value     Int
  config    GameConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
  @@unique([configId, type, userId])
}

enum LeaderboardType {
  BALANCE
  XP
  WINS
  GAMES_PLAYED
}

// Utility
model SnipedMessage {
  id        String   @id @default(cuid())
  guildId   String
  channelId String
  userId    String
  content   String
  attachments String[] @default([])
  embeds    Json?
  deletedAt DateTime @default(now())
  guildConfig GuildConfig @relation(fields: [guildId], references: [guildId], onDelete: Cascade)
}

model Quote {
  id        String   @id @default(cuid())
  guildId   String
  messageId String   @unique
  userId    String
  content   String
  createdAt DateTime @default(now())
  guildConfig GuildConfig @relation(fields: [guildId], references: [guildId], onDelete: Cascade)
}
```

## /setup Command Flow

The `/setup` command will be an interactive, multi-step wizard:

### Step 1: Basic Configuration
- Set bot prefix
- Set language
- Set log channels (general, moderation)

### Step 2: Permission Roles
- Select moderator role(s)
- Select admin role(s)
- Select owner role(s)

### Step 3: Ticket System
- Enable/disable
- Create/select category
- Create/select support role
- Create panel (channel, title, description, emoji)

### Step 4: Welcome System
- Enable/disable
- Set welcome channel
- Set welcome message (embed builder)
- Set auto-role
- Set DM welcome
- Set leave channel/message
- Enable invite tracking
- Enable fake user detection

### Step 5: Moderation
- Enable/disable
- Set mod log channel
- Configure DM on action
- Set default mute role (auto-create if needed)

### Step 6: Games/Economy
- Enable/disable economy
- Set starting balance
- Configure daily rewards

### Step 7: Utility
- Enable message snipe
- Enable quote system

### Step 8: Confirmation & Execution
- Show summary
- Create channels/roles/categories
- Send panel messages
- Save all to database
- Send completion embed

## Command List

### Setup
- `/setup` - Interactive server setup wizard
- `/setup reset` - Reset all configuration (owner only)

### Moderation (slash + prefix)
- `/warn <user> <reason>` / `!warn`
- `/mute <user> <duration> <reason>` / `!mute`
- `/unmute <user> <reason>` / `!unmute`
- `/kick <user> <reason>` / `!kick`
- `/ban <user> <reason> [deleteDays]` / `!ban`
- `/unban <userId> <reason>` / `!unban`
- `/timeout <user> <duration> <reason>` / `!timeout`
- `/purge <amount> [user]` / `!purge`
- `/warnings <user>` / `!warnings`
- `/case <caseId>` / `!case`
- `/appeal <caseId> <reason>` / `!appeal`

### Tickets (slash + prefix + buttons)
- `/ticket panel <title> <description> <emoji> [category]` - Create panel
- `/ticket close [reason]` - Close ticket
- `/ticket claim` - Claim ticket
- `/ticket add <user>` - Add user
- `/ticket remove <user>` - Remove user
- `/ticket transcript` - Generate transcript
- `/ticket reopen` - Reopen closed ticket
- `/ticket delete` - Delete ticket channel
- Button: Create Ticket, Close, Claim, Transcript

### Welcome (slash + prefix)
- `/welcome configure` - Interactive config
- `/welcome test` - Test welcome message
- `/welcome toggle` - Enable/disable
- `/welcome setmessage <type> <content>` - Set message
- `/welcome setchannel <type> <channel>` - Set channel
- `/welcome setrole <role>` - Set auto-role

### Games (slash + prefix)
- `/balance [user]` / `!bal` - Check balance
- `/daily` / `!daily` - Daily reward
- `/work` / `!work` - Work for money
- `/slots <bet>` / `!slots` - Slot machine
- `/coinflip <bet> <heads|tails>` / `!cf` - Coin flip
- `/rps <rock|paper|scissors> [bet]` / `!rps` - Rock paper scissors
- `/trivia` / `!trivia` - Trivia question
- `/hangman` / `!hangman` - Hangman game
- `/leaderboard [balance|xp|wins]` / `!lb` - Leaderboard
- `/shop` / `!shop` - View shop
- `/buy <item>` / `!buy` - Buy item
- `/inventory` / `!inv` - View inventory

### Utility (slash + prefix)
- `/snipe [channel]` / `!snipe` - Show last deleted message
- `/esnipe [channel]` / `!esnipe` - Show last edited message
- `/quote <messageId> [name]` / `!quote` - Create quote
- `/quotes [user]` / `!quotes` - List quotes
- `/avatar [user]` / `!avatar` - Show avatar
- `/serverinfo` / `!serverinfo` - Server info
- `/userinfo [user]` / `!userinfo` - User info
- `/ping` / `!ping` - Bot latency

## Events Handled
- `ready` - Register commands, start tasks
- `interactionCreate` - Slash commands, buttons, select menus, modals
- `messageCreate` - Prefix commands, snipe/quote triggers
- `guildMemberAdd` - Welcome, fake user check, invite tracking
- `guildMemberRemove` - Goodbye message
- `messageDelete` - Snipe storage
- `messageUpdate` - Edit snipe storage
- `guildBanAdd/Remove` - Mod logs
- `channelCreate/Delete/Update` - Logs

## Permission System
- Level 0: Everyone (basic commands)
- Level 1: Moderator (warn, mute, kick, purge, tickets)
- Level 2: Admin (ban, unban, timeout, config)
- Level 3: Owner (setup, reset, all commands)

Permissions checked via:
1. Discord permissions (ManageGuild, Administrator)
2. Configured role levels in database
3. Bot owner (application owner) = Level 3 always

## Deployment (Render.com Free Tier)

### docker-compose.yml
```yaml
version: '3.8'
services:
  bot:
    build: .
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - db
  
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: bot
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: discord_bot
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### Render.com Setup
1. Create PostgreSQL database (free tier)
2. Create Web Service from GitHub repo
3. Set environment variables
4. Deploy

## Implementation Tasks (Ordered)

### Phase 1: Foundation
1. Initialize Node.js project with TypeScript
2. Set up ESLint, Prettier, Husky
3. Configure Prisma with PostgreSQL schema
4. Create config system (env + config.json)
5. Build ExtendedClient with command/event loaders
6. Implement permission handler

### Phase 2: Core Systems
7. Implement database helpers and transactions
8. Build embed utilities and constants
9. Create command/event registration system
10. Implement interactionCreate handler (slash + buttons + modals)

### Phase 3: /setup Command
11. Build interactive setup wizard with modals
12. Implement each setup step (basic, perms, tickets, welcome, mod, games, utility)
13. Add channel/role/category creation logic
14. Add panel message creation with components
15. Add confirmation and execution

### Phase 4: Ticket System
16. Ticket panel creation (buttons/select menus)
17. Ticket channel creation with permissions
18. Ticket buttons (close, claim, add, remove, transcript)
19. Transcript generation (HTML/text)
20. Ticket management commands

### Phase 5: Welcome System
21. Welcome message builder (embed + components)
22. Auto-role assignment
23. DM welcome system
24. Leave messages
25. Invite tracking (store inviter)
25. Fake user detection (account age, no avatar, etc.)

### Phase 6: Moderation
27. Warning system with case tracking
28. Mute system (role-based with timer)
29. Kick/ban/unban with logging
30. Timeout (Discord native)
31. Purge command with filters
32. Mod log embeds
33. Appeal system

### Phase 7: Games/Economy
34. Economy system (balance, daily, work)
35. Slot machine
36. Coin flip
37. Rock Paper Scissors
38. Trivia (API or local questions)
39. Hangman
40. Leaderboards
41. Shop/Inventory system

### Phase 8: Utility
42. Message snipe (delete + edit)
43. Quote system
44. Info commands (avatar, serverinfo, userinfo)

### Phase 9: Polish & Deploy
45. Error handling & logging
46. Rate limiting handling
47. Docker configuration
48. Render.com deployment guide
49. README with setup instructions
50. Testing & bug fixes

## Validation Checklist
- [ ] Bot starts without errors
- [ ] `/setup` completes full configuration
- [ ] All slash commands register globally
- [ ] Prefix commands work
- [ ] Permissions enforced correctly
- [ ] Tickets create/close/transcript work
- [ ] Welcome messages send correctly
- [ ] Moderation actions log properly
- [ ] Games function and persist data
- [ ] Snipe/quote capture messages
- [ ] Docker builds and runs locally
- [ ] Deploys to Render successfully
- [ ] Database migrations work

## Open Questions / Decisions Needed
1. **Trivia source**: Use OpenTDB API or local question database?
2. **Economy items**: Define shop items or keep extensible?
3. **Language support**: Multi-language or English only initially?
4. **Web dashboard**: Plan for future or skip for v1?
5. **Music/Voice**: Out of scope for now?