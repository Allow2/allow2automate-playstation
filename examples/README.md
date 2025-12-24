# Allow2 Automate - PlayStation Network Plugin

A production-ready plugin that integrates PlayStation Network parental controls with the Allow2 quota system. Monitor play time, enforce restrictions, and provide remote control capabilities for PlayStation consoles.

## Features

- **Authentication**: OAuth flow with PlayStation Network API
- **Child Account Management**: List and manage child PSN accounts
- **Play Time Monitoring**: Real-time tracking of gaming sessions
- **Quota Integration**: Seamless integration with Allow2 quota system
- **Remote Control**: Suspend/resume gaming sessions remotely
- **Game Restrictions**: Block/unblock specific games
- **Automatic Reporting**: Report play time to Allow2 automatically

## Installation

### Prerequisites

- Node.js 18+
- Allow2 Automate system installed
- PlayStation Network account with family management enabled
- NPSSO token from PlayStation Network

### Install Plugin

```bash
# Clone or download the plugin
git clone https://github.com/allow2/allow2automate-playstation.git

# Install dependencies
cd allow2automate-playstation
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials
```

### Get Your NPSSO Token

The NPSSO token is required to authenticate with PlayStation Network.

1. **Open PlayStation.com in your browser**
   - Go to https://www.playstation.com
   - Log in with your PlayStation Network account

2. **Open Developer Tools**
   - Chrome/Edge: Press F12 or Right-click → Inspect
   - Firefox: Press F12 or Tools → Browser Tools → Web Developer Tools
   - Safari: Enable Develop menu, then Develop → Show Web Inspector

3. **Find the NPSSO Cookie**
   - Go to the "Application" tab (Chrome/Edge) or "Storage" tab (Firefox)
   - Expand "Cookies" in the left sidebar
   - Click on "https://www.playstation.com"
   - Find the cookie named "npsso"
   - Copy the entire cookie value (it's a long string)

4. **Add to Configuration**
   - Paste the value into your `.env` file as `PSN_NPSSO`
   - Or enter it in the plugin configuration UI

**Important**:
- NPSSO tokens expire after about 2 months
- Keep this token secure - it provides access to your PSN account
- The plugin will automatically refresh the token when needed

### Configure in Allow2 Automate

1. Open Allow2 Automate admin panel
2. Navigate to Plugins → Add New
3. Select "PlayStation Network" from the list
4. Enter your PSN credentials (NPSSO token)
5. Click "Test Connection" to verify
6. Map PSN child accounts to Allow2 children
7. Save configuration

## Configuration

### Environment Variables

```bash
# Required
PSN_NPSSO=your_npsso_token_here
ALLOW2_API_KEY=your_allow2_api_key
ALLOW2_API_SECRET=your_allow2_api_secret

# Optional
PSN_REGION=en-us
PSN_DEFAULT_DAILY_LIMIT=480
MONITOR_INTERVAL_MS=60000
```

### Account Mapping

Map PlayStation child accounts to Allow2 children:

```javascript
{
  "accountMapping": [
    {
      "childId": "allow2-child-id-1",
      "psnAccountId": "psn-child-account-1"
    },
    {
      "childId": "allow2-child-id-2",
      "psnAccountId": "psn-child-account-2"
    }
  ]
}
```

## Usage

### Automatic Operation

Once configured, the plugin automatically:

1. **Monitors Play Sessions**: Checks every minute for active gaming
2. **Reports to Allow2**: Logs gaming time to Allow2 quota system
3. **Enforces Quotas**: Suspends sessions when quota is exhausted
4. **Applies Blocks**: Immediately suspends when Allow2 blocks a child
5. **Manages Restrictions**: Blocks/unblocks games based on Allow2 rules

### Manual Operations

You can also use the plugin API directly:

```javascript
// Get play time for a child
const playTime = await plugin.getPlayTime('psn-account-id');
console.log(`Today: ${playTime.todayMinutes} minutes`);

// List child accounts
const children = await plugin.listChildAccounts();

// Check plugin status
const status = plugin.getStatus();
```

## How It Works

### 1. Authentication Flow

```
User → NPSSO Token → PlayStation API → Access Token → API Calls
```

The plugin uses your NPSSO token to obtain an access token from PlayStation's OAuth service. This token is automatically refreshed when needed.

### 2. Monitoring Loop

```
Every 1 minute:
  ├─ Check each child's PSN account
  ├─ Get current play time
  ├─ If playing → Report to Allow2
  ├─ Check Allow2 quota
  └─ Enforce restrictions if needed
```

### 3. State Processing

When Allow2 sends a new state (quota change, block, etc.):

```
Allow2 State Update
  ├─ For each child:
  │   ├─ Get PSN account mapping
  │   ├─ Check if blocked → Suspend session
  │   ├─ Check quota → Suspend if exhausted
  │   └─ Apply game restrictions
  └─ Report results back
```

## API Reference

### Plugin Methods

#### `onLoad(config, allow2Client)`
Initialize the plugin with configuration and Allow2 client.

#### `newState(allow2State)`
Process new state from Allow2 (quota updates, blocks, restrictions).

#### `listChildAccounts()`
Get list of PlayStation child accounts.

#### `getPlayTime(accountId)`
Get current play time for an account.

#### `getStatus()`
Get plugin status and health information.

### Events

The plugin emits these events:

- `initialized`: Plugin successfully initialized
- `error`: An error occurred
- `sessionSuspended`: A gaming session was suspended
- `sessionResumed`: A gaming session was resumed
- `restrictionsApplied`: Game restrictions were applied
- `stateProcessed`: Allow2 state was processed

## Troubleshooting

### Connection Issues

**Problem**: "PSN authentication failed"

**Solutions**:
- Verify your NPSSO token is correct and not expired
- Check your internet connection
- Ensure PlayStation Network is not down (check status.playstation.com)
- Try re-authenticating by getting a new NPSSO token

### Token Expiration

**Problem**: "Token refresh failed"

**Solutions**:
- NPSSO tokens expire after ~2 months
- Get a new NPSSO token following the instructions above
- Update your configuration with the new token

### Rate Limiting

**Problem**: "Too many requests"

**Solutions**:
- The plugin has built-in rate limiting (100ms between requests)
- If you still hit limits, increase `RATE_LIMIT_MS` in `.env`
- Reduce `MONITOR_INTERVAL_MS` to check less frequently

### Account Mapping Issues

**Problem**: "No PSN account mapped for child"

**Solutions**:
- Verify account mapping in configuration
- Ensure child accounts exist in both PSN and Allow2
- Test connection to load available PSN accounts

### Quota Not Enforcing

**Problem**: Child can still play after quota exhausted

**Solutions**:
- Check Allow2 quota is actually exhausted (not just low)
- Verify plugin is running (`getStatus()`)
- Check logs for errors during state processing
- Ensure PSN parental controls allow time limits

## API Rate Limits

PlayStation Network API has rate limits:

- **Authentication**: ~10 requests/minute
- **Family Management**: ~30 requests/minute
- **Play Time**: ~60 requests/minute

The plugin automatically handles rate limiting with queuing.

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Development Mode

```bash
npm run dev
```

This runs the plugin with hot-reload for development.

### Plugin Structure

```
allow2automate-playstation/
├── index.js              # Main plugin class
├── src/
│   ├── playstation-api.js    # PSN API wrapper
│   └── config-ui.js          # Configuration UI
├── package.json          # Plugin metadata
├── .env.example         # Example environment variables
├── LICENSE              # MIT License
└── README.md            # This file
```

### Adding Features

To add new features:

1. Add method to `PlayStationAPI` class
2. Add corresponding method to main plugin class
3. Update `newState()` to handle new state types
4. Add configuration options if needed
5. Update UI component for new settings
6. Document in README

## Security Best Practices

1. **Never commit `.env` file**: Contains sensitive credentials
2. **Secure NPSSO token**: Treat like a password
3. **Use HTTPS**: Plugin uses HTTPS for all API calls
4. **Token refresh**: Automatic token refresh prevents exposure
5. **Rate limiting**: Prevents abuse and detection
6. **Error handling**: Errors don't expose sensitive data

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

- **Issues**: https://github.com/allow2/allow2automate-playstation/issues
- **Documentation**: https://allow2.com/docs/automate/plugins/playstation
- **Community**: https://community.allow2.com

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- PlayStation Network API (unofficial)
- Allow2 Team
- Contributors and testers

## Changelog

### v1.0.0 (2024-12-22)
- Initial release
- PSN authentication
- Play time monitoring
- Quota integration
- Remote control
- Game restrictions
- Configuration UI

## Roadmap

Future features planned:

- [ ] PS5 activity tracking
- [ ] Trophy monitoring
- [ ] Friend activity integration
- [ ] Multiple console support
- [ ] Bedtime enforcement
- [ ] Homework completion triggers
- [ ] Weekly reports
- [ ] Advanced analytics

---

**Made with ❤️ by the Allow2 Team**
