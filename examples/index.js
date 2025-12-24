/**
 * Allow2 Automate - PlayStation Network Plugin
 *
 * Integrates PlayStation Network parental controls with Allow2 quota system.
 * Monitors play time, enforces restrictions, and provides remote control capabilities.
 */

import { PlayStationAPI } from './src/playstation-api.js';
import NodeCache from 'node-cache';
import { EventEmitter } from 'events';

class PlayStationPlugin extends EventEmitter {
  constructor() {
    super();

    // Plugin metadata
    this.id = 'allow2automate-playstation';
    this.name = 'PlayStation Network';
    this.version = '1.0.0';
    this.description = 'PlayStation Network parental controls integration';

    // Configuration state
    this.config = null;
    this.psn = null;

    // Cache for account data (TTL: 5 minutes)
    this.cache = new NodeCache({ stdTTL: 300 });

    // Active session tracking
    this.activeSessions = new Map();

    // Polling interval for play time monitoring
    this.pollingInterval = null;
    this.POLL_INTERVAL_MS = 60000; // 1 minute

    // State
    this.isInitialized = false;
    this.lastError = null;
  }

  /**
   * Plugin lifecycle: Called when plugin is loaded
   * Initialize API connections and restore state
   */
  async onLoad(pluginConfig, allow2Client) {
    try {
      console.log('[PlayStation Plugin] Loading...');

      this.config = pluginConfig;
      this.allow2 = allow2Client;

      // Validate configuration
      this._validateConfig();

      // Initialize PlayStation Network API
      this.psn = new PlayStationAPI({
        npsso: this.config.npsso,
        region: this.config.region || 'en-us'
      });

      // Authenticate with PSN
      await this.psn.authenticate();

      // Restore active sessions from cache/storage
      await this._restoreSessions();

      // Start monitoring active play sessions
      this._startMonitoring();

      this.isInitialized = true;
      this.emit('initialized');

      console.log('[PlayStation Plugin] Loaded successfully');
      return { success: true };

    } catch (error) {
      this.lastError = error;
      console.error('[PlayStation Plugin] Load error:', error);
      this.emit('error', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Plugin lifecycle: Called when plugin is unloaded
   * Clean up resources and save state
   */
  async onUnload() {
    try {
      console.log('[PlayStation Plugin] Unloading...');

      // Stop monitoring
      this._stopMonitoring();

      // Save active sessions
      await this._saveSessions();

      // Clear cache
      this.cache.flushAll();

      this.isInitialized = false;
      this.emit('unloaded');

      console.log('[PlayStation Plugin] Unloaded successfully');
      return { success: true };

    } catch (error) {
      console.error('[PlayStation Plugin] Unload error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Core method: Process new state from Allow2
   * Called when Allow2 quota changes or restrictions are updated
   */
  async newState(allow2State) {
    try {
      console.log('[PlayStation Plugin] Processing new state:', allow2State);

      if (!this.isInitialized) {
        throw new Error('Plugin not initialized');
      }

      const results = [];

      // Process each child's state
      for (const childId in allow2State.children) {
        const childState = allow2State.children[childId];
        const result = await this._processChildState(childId, childState);
        results.push(result);
      }

      this.emit('stateProcessed', { results });
      return { success: true, results };

    } catch (error) {
      this.lastError = error;
      console.error('[PlayStation Plugin] State processing error:', error);
      this.emit('error', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process individual child's Allow2 state
   */
  async _processChildState(childId, state) {
    try {
      // Get PSN account mapping
      const psnAccount = this._getPSNAccountForChild(childId);
      if (!psnAccount) {
        console.warn(`[PlayStation Plugin] No PSN account mapped for child ${childId}`);
        return { childId, skipped: true, reason: 'No PSN account mapped' };
      }

      const actions = [];

      // Check if child is currently blocked
      if (state.blocked) {
        console.log(`[PlayStation Plugin] Child ${childId} is blocked, suspending PSN session`);
        await this._suspendSession(psnAccount);
        actions.push({ type: 'suspend', reason: state.blockedReason });
      } else {
        // Check quota availability
        const quotaCheck = await this._checkQuota(childId, psnAccount);

        if (quotaCheck.allowed) {
          // Allow play - resume if suspended
          if (this.activeSessions.has(psnAccount.accountId)) {
            const session = this.activeSessions.get(psnAccount.accountId);
            if (session.suspended) {
              await this._resumeSession(psnAccount);
              actions.push({ type: 'resume' });
            }
          }
        } else {
          // Quota exhausted - suspend session
          console.log(`[PlayStation Plugin] Quota exhausted for child ${childId}`);
          await this._suspendSession(psnAccount);
          actions.push({ type: 'suspend', reason: 'Quota exhausted' });
        }
      }

      // Apply game restrictions if specified
      if (state.restrictions && state.restrictions.games) {
        await this._applyGameRestrictions(psnAccount, state.restrictions.games);
        actions.push({ type: 'restrictions', games: state.restrictions.games });
      }

      return {
        childId,
        psnAccountId: psnAccount.accountId,
        success: true,
        actions
      };

    } catch (error) {
      console.error(`[PlayStation Plugin] Error processing child ${childId}:`, error);
      return {
        childId,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check Allow2 quota for a child
   */
  async _checkQuota(childId, psnAccount) {
    try {
      // Get current play time from PSN
      const playTime = await this.psn.getPlayTime(psnAccount.accountId);

      // Check quota with Allow2
      const quotaResponse = await this.allow2.check({
        childId,
        activities: [{
          activity: 'gaming',
          log: true,
          time: playTime.todayMinutes
        }]
      });

      return {
        allowed: quotaResponse.allowed,
        remaining: quotaResponse.remaining,
        playTime: playTime.todayMinutes
      };

    } catch (error) {
      console.error('[PlayStation Plugin] Quota check error:', error);
      throw error;
    }
  }

  /**
   * Suspend a PlayStation session (parental control)
   */
  async _suspendSession(psnAccount) {
    try {
      console.log(`[PlayStation Plugin] Suspending session for ${psnAccount.accountId}`);

      // Use PSN parental control API to set play time to 0
      await this.psn.setPlayTimeLimit(psnAccount.accountId, 0);

      // Update session state
      const session = this.activeSessions.get(psnAccount.accountId) || {};
      session.suspended = true;
      session.suspendedAt = Date.now();
      this.activeSessions.set(psnAccount.accountId, session);

      this.emit('sessionSuspended', { accountId: psnAccount.accountId });

    } catch (error) {
      console.error('[PlayStation Plugin] Suspend error:', error);
      throw error;
    }
  }

  /**
   * Resume a PlayStation session
   */
  async _resumeSession(psnAccount) {
    try {
      console.log(`[PlayStation Plugin] Resuming session for ${psnAccount.accountId}`);

      // Reset play time limit (or set to configured value)
      const dailyLimit = this.config.defaultDailyLimit || 480; // 8 hours default
      await this.psn.setPlayTimeLimit(psnAccount.accountId, dailyLimit);

      // Update session state
      const session = this.activeSessions.get(psnAccount.accountId) || {};
      session.suspended = false;
      session.resumedAt = Date.now();
      this.activeSessions.set(psnAccount.accountId, session);

      this.emit('sessionResumed', { accountId: psnAccount.accountId });

    } catch (error) {
      console.error('[PlayStation Plugin] Resume error:', error);
      throw error;
    }
  }

  /**
   * Apply game restrictions (block/unblock specific games)
   */
  async _applyGameRestrictions(psnAccount, gameRestrictions) {
    try {
      console.log(`[PlayStation Plugin] Applying game restrictions for ${psnAccount.accountId}`);

      for (const restriction of gameRestrictions) {
        if (restriction.action === 'block') {
          await this.psn.blockGame(psnAccount.accountId, restriction.gameId);
        } else if (restriction.action === 'unblock') {
          await this.psn.unblockGame(psnAccount.accountId, restriction.gameId);
        }
      }

      this.emit('restrictionsApplied', {
        accountId: psnAccount.accountId,
        restrictions: gameRestrictions
      });

    } catch (error) {
      console.error('[PlayStation Plugin] Restrictions error:', error);
      throw error;
    }
  }

  /**
   * Start monitoring active play sessions
   */
  _startMonitoring() {
    if (this.pollingInterval) {
      return; // Already monitoring
    }

    console.log('[PlayStation Plugin] Starting session monitoring');

    this.pollingInterval = setInterval(async () => {
      try {
        await this._monitorSessions();
      } catch (error) {
        console.error('[PlayStation Plugin] Monitoring error:', error);
      }
    }, this.POLL_INTERVAL_MS);
  }

  /**
   * Stop monitoring active play sessions
   */
  _stopMonitoring() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('[PlayStation Plugin] Stopped session monitoring');
    }
  }

  /**
   * Monitor active sessions and report to Allow2
   */
  async _monitorSessions() {
    try {
      // Get all mapped PSN accounts
      const psnAccounts = this._getAllPSNAccounts();

      for (const psnAccount of psnAccounts) {
        const childId = psnAccount.childId;

        // Get current play time
        const playTime = await this.psn.getPlayTime(psnAccount.accountId);

        // Check if actively playing
        if (playTime.currentlyPlaying) {
          // Report to Allow2
          await this.allow2.log({
            childId,
            activities: [{
              activity: 'gaming',
              time: 1, // 1 minute increment
              meta: {
                game: playTime.currentGame,
                platform: 'PlayStation',
                accountId: psnAccount.accountId
              }
            }]
          });

          // Update session tracking
          const session = this.activeSessions.get(psnAccount.accountId) || {};
          session.lastActive = Date.now();
          session.currentGame = playTime.currentGame;
          this.activeSessions.set(psnAccount.accountId, session);
        }
      }

    } catch (error) {
      console.error('[PlayStation Plugin] Session monitoring error:', error);
    }
  }

  /**
   * Validate plugin configuration
   */
  _validateConfig() {
    if (!this.config) {
      throw new Error('Plugin configuration is required');
    }

    if (!this.config.npsso) {
      throw new Error('PSN NPSSO token is required in configuration');
    }

    if (!this.config.accountMapping || !Array.isArray(this.config.accountMapping)) {
      throw new Error('Account mapping is required in configuration');
    }

    console.log('[PlayStation Plugin] Configuration validated');
  }

  /**
   * Get PSN account for Allow2 child ID
   */
  _getPSNAccountForChild(childId) {
    const mapping = this.config.accountMapping.find(m => m.childId === childId);
    return mapping ? {
      accountId: mapping.psnAccountId,
      childId: mapping.childId
    } : null;
  }

  /**
   * Get all PSN accounts from mapping
   */
  _getAllPSNAccounts() {
    return this.config.accountMapping.map(m => ({
      accountId: m.psnAccountId,
      childId: m.childId
    }));
  }

  /**
   * Restore active sessions from storage
   */
  async _restoreSessions() {
    // Implementation depends on your storage mechanism
    // This is a placeholder
    console.log('[PlayStation Plugin] Restoring sessions');
  }

  /**
   * Save active sessions to storage
   */
  async _saveSessions() {
    // Implementation depends on your storage mechanism
    // This is a placeholder
    console.log('[PlayStation Plugin] Saving sessions');
  }

  /**
   * Get plugin status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      lastError: this.lastError ? this.lastError.message : null,
      activeSessions: Array.from(this.activeSessions.keys()),
      monitoring: !!this.pollingInterval
    };
  }

  /**
   * List child accounts from PSN
   */
  async listChildAccounts() {
    if (!this.isInitialized) {
      throw new Error('Plugin not initialized');
    }

    return await this.psn.listChildAccounts();
  }

  /**
   * Get play time for an account
   */
  async getPlayTime(accountId) {
    if (!this.isInitialized) {
      throw new Error('Plugin not initialized');
    }

    return await this.psn.getPlayTime(accountId);
  }
}

// Export plugin instance
export default new PlayStationPlugin();
