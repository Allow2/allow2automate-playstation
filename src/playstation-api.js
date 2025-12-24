/**
 * PlayStation Network API Wrapper
 *
 * Handles authentication and API calls to PlayStation Network.
 * Based on unofficial PSN API (psn-api npm package patterns).
 */

import axios from 'axios';
import NodeCache from 'node-cache';

export class PlayStationAPI {
  constructor(config) {
    this.config = config;
    this.npsso = config.npsso;
    this.region = config.region || 'en-us';

    // API endpoints
    this.baseURL = 'https://m.np.playstation.com';
    this.authURL = 'https://ca.account.sony.com';

    // Authentication tokens
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;

    // Cache for API responses
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minute TTL

    // Rate limiting
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.RATE_LIMIT_MS = 100; // 100ms between requests
  }

  /**
   * Authenticate with PlayStation Network
   * Uses NPSSO token to get access token
   */
  async authenticate() {
    try {
      console.log('[PSN API] Authenticating...');

      if (!this.npsso) {
        throw new Error('NPSSO token is required for authentication');
      }

      // Exchange NPSSO for access token
      const response = await axios.post(
        `${this.authURL}/api/authz/v3/oauth/token`,
        {
          npsso: this.npsso,
          grant_type: 'npsso_code',
          scope: 'psn:mobile.v2.core psn:clientapp'
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

      console.log('[PSN API] Authentication successful');
      return true;

    } catch (error) {
      console.error('[PSN API] Authentication failed:', error.message);
      throw new Error(`PSN authentication failed: ${error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    try {
      console.log('[PSN API] Refreshing access token...');

      const response = await axios.post(
        `${this.authURL}/api/authz/v3/oauth/token`,
        {
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
          scope: 'psn:mobile.v2.core psn:clientapp'
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

      console.log('[PSN API] Token refreshed');
      return true;

    } catch (error) {
      console.error('[PSN API] Token refresh failed:', error.message);
      // If refresh fails, try full re-authentication
      return await this.authenticate();
    }
  }

  /**
   * Ensure valid access token before API call
   */
  async ensureAuthenticated() {
    if (!this.accessToken) {
      await this.authenticate();
      return;
    }

    // Check if token is expired or will expire soon (within 5 minutes)
    if (this.tokenExpiry && (Date.now() + 300000) >= this.tokenExpiry) {
      await this.refreshAccessToken();
    }
  }

  /**
   * Make authenticated API request with rate limiting
   */
  async request(method, endpoint, data = null) {
    await this.ensureAuthenticated();

    return new Promise((resolve, reject) => {
      this.requestQueue.push({ method, endpoint, data, resolve, reject });
      this._processQueue();
    });
  }

  /**
   * Process request queue with rate limiting
   */
  async _processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const { method, endpoint, data, resolve, reject } = this.requestQueue.shift();

      try {
        const response = await axios({
          method,
          url: `${this.baseURL}${endpoint}`,
          data,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept-Language': this.region,
            'Content-Type': 'application/json'
          }
        });

        resolve(response.data);
      } catch (error) {
        reject(error);
      }

      // Rate limiting delay
      if (this.requestQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_MS));
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * List child accounts under the authenticated account
   */
  async listChildAccounts() {
    try {
      const cacheKey = 'childAccounts';
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;

      // Get family members
      const data = await this.request('GET', '/api/familyManagement/v1/families');

      const childAccounts = data.familyMembers
        .filter(member => member.role === 'child')
        .map(child => ({
          accountId: child.onlineId,
          displayName: child.displayName,
          age: child.age,
          restrictions: child.parentalControls
        }));

      this.cache.set(cacheKey, childAccounts);
      return childAccounts;

    } catch (error) {
      console.error('[PSN API] List child accounts error:', error.message);
      throw new Error(`Failed to list child accounts: ${error.message}`);
    }
  }

  /**
   * Get play time for an account
   */
  async getPlayTime(accountId) {
    try {
      const cacheKey = `playTime_${accountId}`;
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;

      // Get play session data
      const data = await this.request(
        'GET',
        `/api/familyManagement/v1/users/${accountId}/playTime`
      );

      const playTime = {
        accountId,
        todayMinutes: data.todayPlayTime || 0,
        weekMinutes: data.weekPlayTime || 0,
        currentlyPlaying: data.status === 'online',
        currentGame: data.currentTitle || null,
        lastPlayed: data.lastPlayedAt || null
      };

      // Shorter cache for play time (1 minute)
      this.cache.set(cacheKey, playTime, 60);
      return playTime;

    } catch (error) {
      console.error('[PSN API] Get play time error:', error.message);
      throw new Error(`Failed to get play time: ${error.message}`);
    }
  }

  /**
   * Set play time limit (in minutes) for an account
   */
  async setPlayTimeLimit(accountId, limitMinutes) {
    try {
      console.log(`[PSN API] Setting play time limit for ${accountId}: ${limitMinutes} minutes`);

      await this.request(
        'PUT',
        `/api/familyManagement/v1/users/${accountId}/playTimeSettings`,
        {
          dailyPlayTimeLimit: limitMinutes,
          enabled: limitMinutes > 0
        }
      );

      // Invalidate cache
      this.cache.del(`playTime_${accountId}`);

      return true;

    } catch (error) {
      console.error('[PSN API] Set play time limit error:', error.message);
      throw new Error(`Failed to set play time limit: ${error.message}`);
    }
  }

  /**
   * Block a game for an account
   */
  async blockGame(accountId, gameId) {
    try {
      console.log(`[PSN API] Blocking game ${gameId} for ${accountId}`);

      await this.request(
        'POST',
        `/api/familyManagement/v1/users/${accountId}/restrictedContent`,
        {
          contentId: gameId,
          type: 'game',
          action: 'block'
        }
      );

      return true;

    } catch (error) {
      console.error('[PSN API] Block game error:', error.message);
      throw new Error(`Failed to block game: ${error.message}`);
    }
  }

  /**
   * Unblock a game for an account
   */
  async unblockGame(accountId, gameId) {
    try {
      console.log(`[PSN API] Unblocking game ${gameId} for ${accountId}`);

      await this.request(
        'DELETE',
        `/api/familyManagement/v1/users/${accountId}/restrictedContent/${gameId}`
      );

      return true;

    } catch (error) {
      console.error('[PSN API] Unblock game error:', error.message);
      throw new Error(`Failed to unblock game: ${error.message}`);
    }
  }

  /**
   * Get restricted content list for an account
   */
  async getRestrictedContent(accountId) {
    try {
      const data = await this.request(
        'GET',
        `/api/familyManagement/v1/users/${accountId}/restrictedContent`
      );

      return data.restrictedContent || [];

    } catch (error) {
      console.error('[PSN API] Get restricted content error:', error.message);
      throw new Error(`Failed to get restricted content: ${error.message}`);
    }
  }

  /**
   * Get parental control settings for an account
   */
  async getParentalControls(accountId) {
    try {
      const cacheKey = `parentalControls_${accountId}`;
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;

      const data = await this.request(
        'GET',
        `/api/familyManagement/v1/users/${accountId}/parentalControls`
      );

      this.cache.set(cacheKey, data);
      return data;

    } catch (error) {
      console.error('[PSN API] Get parental controls error:', error.message);
      throw new Error(`Failed to get parental controls: ${error.message}`);
    }
  }

  /**
   * Update parental control settings
   */
  async updateParentalControls(accountId, settings) {
    try {
      console.log(`[PSN API] Updating parental controls for ${accountId}`);

      await this.request(
        'PUT',
        `/api/familyManagement/v1/users/${accountId}/parentalControls`,
        settings
      );

      // Invalidate cache
      this.cache.del(`parentalControls_${accountId}`);

      return true;

    } catch (error) {
      console.error('[PSN API] Update parental controls error:', error.message);
      throw new Error(`Failed to update parental controls: ${error.message}`);
    }
  }
}
