# PlayStation Network Controls Plugin

Control PlayStation Network access with Allow2 parental controls to manage gaming time and ensure healthy gaming habits.

## Description

This plugin integrates PlayStation Network (PSN) with Allow2 parental controls, enabling parents to automatically manage access to PlayStation gaming, track play time, and enforce time quotas across PS4, PS5, and other PlayStation devices.

## Features

- Real-time quota checking with Allow2
- Automatic enable/disable of PlayStation Network access
- Play session tracking and reporting
- Time quota management
- Session start/end notifications
- Support for multiple child profiles
- Seamless integration with PSN parental controls

## Installation

### Via NPM

```bash
npm install allow2automate-playstation
```

### Via Git

```bash
git clone https://github.com/Allow2/allow2automate-playstation.git
cd allow2automate-playstation
npm install
npm run build
```

## Configuration

1. Install the plugin in your Allow2Automate application
2. Configure your Allow2 API credentials
3. Link your PlayStation Network account
4. Set up child sub-accounts and time quotas in Allow2
5. Configure the plugin with your PSN credentials

### Required Permissions

This plugin requires the following permissions:

- **network**: To communicate with PlayStation Network servers and Allow2 API for quota checks and access control
- **configuration**: To read and modify plugin settings, including API credentials and child profile configurations

These permissions are necessary for the plugin to:
- Check time quotas with Allow2 services
- Enable or disable PSN access based on quota availability
- Track gaming sessions and report usage time
- Synchronize settings between Allow2 and PSN

## Usage

### Check Quota

```javascript
import PlayStationPlugin from 'allow2automate-playstation';

const plugin = new PlayStationPlugin({
  allow2Token: 'your-allow2-token',
  psnCredentials: {
    // Your PSN configuration
  }
});

const quota = await plugin.actions.checkQuota({
  childId: 'child-123',
  activityId: 'gaming'
});
```

### Enable Access

```javascript
await plugin.actions.enableAccess({
  childId: 'child-123',
  deviceId: 'ps5-001'
});
```

### Disable Access

```javascript
await plugin.actions.disableAccess({
  childId: 'child-123',
  deviceId: 'ps5-001'
});
```

### Report Usage

```javascript
await plugin.actions.reportUsage({
  childId: 'child-123',
  activityId: 'gaming',
  duration: 3600, // seconds
  metadata: {
    game: 'Spider-Man',
    device: 'PS5'
  }
});
```

## API Documentation

### Actions

#### `checkQuota`
- **Name**: Check Quota
- **Description**: Check Allow2 quota for PlayStation access
- **Parameters**:
  - `childId` (string): Allow2 child identifier
  - `activityId` (string): Activity type identifier
- **Returns**: Quota information including remaining time

#### `enableAccess`
- **Name**: Enable Access
- **Description**: Enable PlayStation Network access
- **Parameters**:
  - `childId` (string): Allow2 child identifier
  - `deviceId` (string, optional): Specific device identifier

#### `disableAccess`
- **Name**: Disable Access
- **Description**: Disable PlayStation Network access
- **Parameters**:
  - `childId` (string): Allow2 child identifier
  - `deviceId` (string, optional): Specific device identifier

#### `reportUsage`
- **Name**: Report Usage
- **Description**: Report play time to Allow2
- **Parameters**:
  - `childId` (string): Child identifier
  - `activityId` (string): Activity type
  - `duration` (number): Time used in seconds
  - `metadata` (object, optional): Additional session information

### Triggers

#### `quotaExceeded`
- **Name**: Quota Exceeded
- **Description**: Triggered when child's play time quota is exceeded
- **Payload**:
  - `childId` (string): Child identifier
  - `timeUsed` (number): Total time used in minutes
  - `quotaLimit` (number): Quota limit in minutes

#### `quotaRenewed`
- **Name**: Quota Renewed
- **Description**: Triggered when child's quota is renewed
- **Payload**:
  - `childId` (string): Child identifier
  - `newQuota` (number): New quota amount in minutes
  - `renewalDate` (date): Date of quota renewal

#### `sessionStarted`
- **Name**: Session Started
- **Description**: Triggered when a play session starts
- **Payload**:
  - `childId` (string): Child identifier
  - `deviceId` (string): Device identifier
  - `startTime` (date): Session start time

#### `sessionEnded`
- **Name**: Session Ended
- **Description**: Triggered when a play session ends
- **Payload**:
  - `childId` (string): Child identifier
  - `deviceId` (string): Device identifier
  - `duration` (number): Session duration in seconds
  - `endTime` (date): Session end time

## Development Setup

```bash
# Clone the repository
git clone https://github.com/Allow2/allow2automate-playstation.git
cd allow2automate-playstation

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## Requirements

- Node.js 12.0 or higher
- Allow2Automate 2.0.0 or higher
- Valid Allow2 account and API credentials
- PlayStation Network account with parental controls enabled

## License

MIT - See [LICENSE](LICENSE) file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/Allow2/allow2automate-playstation/issues)
- **Documentation**: [Allow2 Documentation](https://www.allow2.com/docs)
- **Community**: [Allow2 Community Forums](https://community.allow2.com)

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## Author

Allow2

## Keywords

allow2automate, playstation, psn, gaming, plugin, parental-controls
