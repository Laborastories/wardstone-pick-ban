# Scout Ahead

A real-time League of Legends draft tool with fearless mode support.

## Features

- Real-time draft simulation for competitive League of Legends
- Support for Best of 1, Best of 3, and Best of 5 series
- Fearless draft mode - track picked champions across games
- Side selection tracking and management
- Unique URLs for team captains and spectators
- No account required - just create a lobby and share links

## Getting Started

Start the development server

```bash
wasp db start
wasp db migrate-dev
wasp start
```

Visit [scoutahead.pro](https://scoutahead.pro) to try it out.

## How It Works

### For Teams

1. Create a new draft series
2. Choose series type (Bo1/Bo3/Bo5)
3. Get unique URLs for:
   - Blue side captain
   - Red side captain
   - Spectators
4. Share links with your team

### For Captains

- Real-time champion grid with role filtering
- Pick/ban phase indicators
- Timer display
- Ready/confirm system
- Validation for legal picks/bans

### For Spectators

- Live updates of all picks and bans
- Full champion grid view
- Phase progression display
- Series history tracking

## Technical Stack

- Built with [Wasp](https://wasp-lang.dev)
- Real-time updates via WebSocket
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Animations powered by [Motion](https://motion.dev)

## Contributing

We welcome contributions! Whether it's:

- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 💡 Suggestions

Feel free to open an issue or submit a pull request on our
[GitHub repository](https://github.com/Laborastories/wardstone-pick-ban).

## License

MIT License - feel free to use this in your own projects!

![Format & Lint pipeline status](https://github.com/Laborastories/wardstone-pick-ban/actions/workflows/format.yml/badge.svg)
