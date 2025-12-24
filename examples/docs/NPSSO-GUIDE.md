# How to Get Your PlayStation Network NPSSO Token

The NPSSO (Network Platform Single Sign-On) token is required to authenticate with PlayStation Network's unofficial API. This guide walks you through obtaining it safely.

## What is NPSSO?

NPSSO is an authentication token that PlayStation uses for single sign-on across their services. It's stored as a browser cookie when you log into PlayStation.com.

**Important Security Notes**:
- Treat this token like a password
- Never share it publicly
- It provides access to your PSN account
- Tokens expire after approximately 2 months
- The plugin will automatically refresh the token

## Step-by-Step Instructions

### For Desktop Browsers

#### Google Chrome / Microsoft Edge

1. **Open PlayStation.com**
   - Navigate to https://www.playstation.com
   - Click "Sign In" in the top right
   - Log in with your PlayStation Network credentials

2. **Open Developer Tools**
   - Windows/Linux: Press `F12` or `Ctrl + Shift + I`
   - Mac: Press `Cmd + Option + I`
   - Or right-click anywhere and select "Inspect"

3. **Navigate to Application Tab**
   - Click the "Application" tab at the top of Developer Tools
   - If you don't see it, click the `>>` icon to show more tabs

4. **Find the NPSSO Cookie**
   - In the left sidebar, expand "Cookies"
   - Click on "https://www.playstation.com"
   - Scroll through the cookie list to find "npsso"
   - The cookie name is exactly: `npsso`

5. **Copy the Token**
   - Click on the "npsso" cookie row
   - In the bottom panel, find the "Value" field
   - Double-click the value to select it all
   - Right-click and copy, or press `Ctrl+C` (Windows/Linux) or `Cmd+C` (Mac)
   - The value should be a long string of letters and numbers

#### Mozilla Firefox

1. **Open PlayStation.com**
   - Navigate to https://www.playstation.com
   - Click "Sign In" and log in

2. **Open Developer Tools**
   - Windows/Linux: Press `F12` or `Ctrl + Shift + I`
   - Mac: Press `Cmd + Option + I`
   - Or Menu → More Tools → Web Developer Tools

3. **Navigate to Storage Tab**
   - Click the "Storage" tab at the top
   - If you don't see it, click the `>>` icon

4. **Find the NPSSO Cookie**
   - In the left sidebar, expand "Cookies"
   - Click on "https://www.playstation.com"
   - Find the "npsso" cookie in the list

5. **Copy the Token**
   - Right-click on the "npsso" cookie row
   - Select "Copy Value"
   - Or click the cookie and copy the value from the bottom panel

#### Safari (Mac)

1. **Enable Developer Tools** (if not already enabled)
   - Safari → Preferences → Advanced
   - Check "Show Develop menu in menu bar"

2. **Open PlayStation.com**
   - Navigate to https://www.playstation.com
   - Sign in to your account

3. **Open Web Inspector**
   - Develop → Show Web Inspector
   - Or press `Cmd + Option + I`

4. **Navigate to Storage**
   - Click the "Storage" tab
   - Expand "Cookies" in the sidebar
   - Click on "https://www.playstation.com"

5. **Copy the NPSSO Cookie**
   - Find "npsso" in the cookie list
   - Copy the value

## Adding Token to Plugin

### Option 1: Environment File

1. Open `.env` file in the plugin directory
2. Find the line: `PSN_NPSSO=your_npsso_token_here`
3. Replace `your_npsso_token_here` with your copied token
4. Save the file

Example:
```bash
PSN_NPSSO=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

### Option 2: Configuration UI

1. Open Allow2 Automate admin panel
2. Navigate to Plugins → PlayStation Network
3. Find the "NPSSO Token" field
4. Paste your token
5. Click "Test Connection" to verify
6. Save configuration

## Troubleshooting

### "Authentication failed" Error

**Possible Causes**:
- Token copied incorrectly (extra spaces, incomplete)
- Token has expired (older than 2 months)
- Not logged into correct PSN region
- PlayStation Network is down

**Solutions**:
1. Verify you copied the entire token value
2. Try logging out and back into PlayStation.com
3. Get a fresh token following the steps above
4. Check https://status.playstation.com for outages

### Can't Find NPSSO Cookie

**Solutions**:
1. Make sure you're logged into PlayStation.com
2. Try a different browser
3. Clear cookies and log in again
4. Check you're on the correct domain (www.playstation.com, not store.playstation.com)

### Token Keeps Expiring

**Solutions**:
- NPSSO tokens naturally expire after ~2 months
- The plugin automatically refreshes the token
- If issues persist, you may need to get a new NPSSO token
- Consider setting a reminder to refresh every 2 months

### Security Concerns

**Q: Is this safe?**
A: Yes, if you keep the token secure. The token is stored encrypted in your plugin configuration and never transmitted except to official PlayStation servers.

**Q: Can someone hack my account with this?**
A: The token does provide access to your account, so treat it like a password. Never share it publicly or commit it to version control.

**Q: Should I use a dedicated account?**
A: For maximum security, you could create a dedicated "parent" PSN account just for parental controls, separate from your personal gaming account.

## Token Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                      NPSSO Token Lifecycle                   │
└─────────────────────────────────────────────────────────────┘

1. User logs into PlayStation.com
   └─> Browser receives NPSSO cookie

2. User copies NPSSO from browser
   └─> Adds to plugin configuration

3. Plugin uses NPSSO to get Access Token
   └─> Access Token valid for ~1 hour

4. Plugin automatically refreshes Access Token
   └─> Uses Refresh Token (valid for 2 months)

5. After 2 months: NPSSO expires
   └─> User must get new NPSSO token
```

## Alternative: Using Command Line (Advanced)

If you're comfortable with command-line tools, you can extract the NPSSO cookie programmatically:

### Using Browser's Cookie Manager

```bash
# Chrome (Linux)
sqlite3 ~/.config/google-chrome/Default/Cookies \
  "SELECT value FROM cookies WHERE host_key='.playstation.com' AND name='npsso';"

# Chrome (Mac)
sqlite3 ~/Library/Application\ Support/Google/Chrome/Default/Cookies \
  "SELECT value FROM cookies WHERE host_key='.playstation.com' AND name='npsso';"
```

**Note**: Modern browsers encrypt cookies, so this may not work without additional decryption steps.

## Best Practices

1. **Secure Storage**
   - Never commit `.env` to version control
   - Add `.env` to `.gitignore`
   - Use environment variables in production

2. **Regular Rotation**
   - Set a calendar reminder to refresh every 2 months
   - Monitor plugin logs for authentication errors

3. **Access Control**
   - Limit who has access to the plugin configuration
   - Use separate PSN account for parental controls if possible

4. **Monitoring**
   - Check plugin status regularly
   - Enable authentication error alerts

## Getting Help

If you continue to have issues:

1. Check the [Troubleshooting](../README.md#troubleshooting) section
2. Review plugin logs for specific error messages
3. Open an issue on GitHub with details (never include your actual token!)
4. Contact support at support@allow2.com

## References

- [PlayStation Network Official Site](https://www.playstation.com)
- [Allow2 Documentation](https://allow2.com/docs)
- [Plugin Repository](https://github.com/allow2/allow2automate-playstation)

---

**Last Updated**: December 2024
