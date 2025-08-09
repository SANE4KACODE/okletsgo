const axios = require('axios');
const crypto = require('crypto');
const config = require('./config');

class BybitAPI {
  constructor() {
    this.baseURL = 'https://api.bybit.com';
    this.apiKey = config.BYBIT_API_KEY;
    this.secretKey = config.BYBIT_SECRET_KEY;
  }

  generateSignature(params, timestamp) {
    const queryString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    const signString = timestamp + this.apiKey + '5000' + queryString;
    return crypto.createHmac('sha256', this.secretKey).update(signString).digest('hex');
  }

  async getKlineData(symbol, interval = '1', limit = 200) {
    try {
      const response = await axios.get(`${this.baseURL}/v5/market/kline`, {
        params: {
          category: 'linear',
          symbol: symbol,
          interval: interval,
          limit: limit
        }
      });

      if (response.data.retCode === 0) {
        return response.data.result.list.map(candle => ({
          timestamp: parseInt(candle[0]),
          open: parseFloat(candle[1]),
          high: parseFloat(candle[2]),
          low: parseFloat(candle[3]),
          close: parseFloat(candle[4]),
          volume: parseFloat(candle[5])
        }));
      } else {
        throw new Error(`Bybit API error: ${response.data.retMsg}`);
      }
    } catch (error) {
      console.error('Error fetching kline data:', error);
      throw error;
    }
  }

  async getTickerInfo(symbol) {
    try {
      const response = await axios.get(`${this.baseURL}/v5/market/tickers`, {
        params: {
          category: 'linear',
          symbol: symbol
        }
      });

      if (response.data.retCode === 0 && response.data.result.list.length > 0) {
        const ticker = response.data.result.list[0];
        return {
          symbol: ticker.symbol,
          lastPrice: parseFloat(ticker.lastPrice),
          prevPrice24h: parseFloat(ticker.prevPrice24h),
          price24hPcnt: parseFloat(ticker.price24hPcnt),
          highPrice24h: parseFloat(ticker.highPrice24h),
          lowPrice24h: parseFloat(ticker.lowPrice24h),
          turnover24h: parseFloat(ticker.turnover24h),
          volume24h: parseFloat(ticker.volume24h),
          usdIndexPrice: parseFloat(ticker.usdIndexPrice),
          fundingRate: parseFloat(ticker.fundingRate),
          nextFundingTime: ticker.nextFundingTime
        };
      } else {
        throw new Error(`Bybit API error: ${response.data.retMsg}`);
      }
    } catch (error) {
      console.error('Error fetching ticker info:', error);
      throw error;
    }
  }

  async getOrderBook(symbol, limit = 25) {
    try {
      const response = await axios.get(`${this.baseURL}/v5/market/orderbook`, {
        params: {
          category: 'linear',
          symbol: symbol,
          limit: limit
        }
      });

      if (response.data.retCode === 0) {
        return {
          symbol: response.data.result.s,
          bids: response.data.result.b.map(bid => ({
            price: parseFloat(bid[0]),
            size: parseFloat(bid[1])
          })),
          asks: response.data.result.a.map(ask => ({
            price: parseFloat(ask[0]),
            size: parseFloat(ask[1])
          }))
        };
      } else {
        throw new Error(`Bybit API error: ${response.data.retMsg}`);
      }
    } catch (error) {
      console.error('Error fetching order book:', error);
      throw error;
    }
  }

  async getFundingRate(symbol) {
    try {
      const response = await axios.get(`${this.baseURL}/v5/market/funding/history`, {
        params: {
          category: 'linear',
          symbol: symbol,
          limit: 1
        }
      });

      if (response.data.retCode === 0 && response.data.result.list.length > 0) {
        const funding = response.data.result.list[0];
        return {
          symbol: funding.symbol,
          fundingRate: parseFloat(funding.fundingRate),
          fundingRateTimestamp: parseInt(funding.fundingRateTimestamp)
        };
      } else {
        throw new Error(`Bybit API error: ${response.data.retMsg}`);
      }
    } catch (error) {
      console.error('Error fetching funding rate:', error);
      throw error;
    }
  }

  async getOpenInterest(symbol) {
    try {
      const response = await axios.get(`${this.baseURL}/v5/market/open-interest`, {
        params: {
          category: 'linear',
          symbol: symbol,
          intervalTime: '1d'
        }
      });

      if (response.data.retCode === 0 && response.data.result.list.length > 0) {
        const oi = response.data.result.list[0];
        return {
          symbol: oi.symbol,
          openInterest: parseFloat(oi.openInterest),
          timestamp: parseInt(oi.timestamp)
        };
      } else {
        throw new Error(`Bybit API error: ${response.data.retMsg}`);
      }
    } catch (error) {
      console.error('Error fetching open interest:', error);
      throw error;
    }
  }

  async getLongShortRatio(symbol) {
    try {
      const response = await axios.get(`${this.baseURL}/v5/market/long-short-account-ratio`, {
        params: {
          category: 'linear',
          symbol: symbol,
          period: '1d',
          limit: 1
        }
      });

      if (response.data.retCode === 0 && response.data.result && response.data.result.list && response.data.result.list.length > 0) {
        const ratio = response.data.result.list[0];
        return {
          symbol: ratio.symbol,
          buyRatio: parseFloat(ratio.buyRatio),
          sellRatio: parseFloat(ratio.sellRatio),
          timestamp: parseInt(ratio.timestamp)
        };
      } else {
        // Возвращаем null вместо ошибки, если нет данных
        console.log('No long/short ratio data available');
        return null;
      }
    } catch (error) {
      console.error('Error fetching long/short ratio:', error);
      return null;
    }
  }

  async makeSignedRequest(method, endpoint, params = {}) {
    try {
      // Получаем серверное время для синхронизации
      const serverTimeResponse = await axios.get(`${this.baseURL}/v5/market/time`);
      const serverTime = serverTimeResponse.data.result.timeSecond * 1000;
      const timestamp = serverTime.toString();
      
      const signature = this.generateSignature(params, timestamp);
      
      const headers = {
        'X-BAPI-API-KEY': this.apiKey,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': '5000',
        'Content-Type': 'application/json'
      };

      const response = await axios({
        method,
        url: `${this.baseURL}${endpoint}`,
        params,
        headers
      });
      return response.data;
    } catch (error) {
      console.error('Error in signed request:', error);
      // Возвращаем null вместо ошибки для graceful handling
      return null;
    }
  }

  async getLiquidations(symbol, limit = 100) {
    try {
      // Пробуем основной эндпоинт
      const response = await axios.get(`${this.baseURL}/v5/market/liquidation-records`, {
        params: {
          category: 'linear',
          symbol: symbol,
          limit: limit
        }
      });

      if (response.data.retCode === 0 && response.data.result && response.data.result.list) {
        return response.data.result.list.map(item => ({
          symbol: item.symbol,
          side: item.side,
          size: parseFloat(item.size),
          price: parseFloat(item.price),
          timestamp: parseInt(item.time)
        }));
      } else {
        console.log('Liquidation endpoint not available, returning empty array');
        return [];
      }
    } catch (error) {
      console.error('Error fetching liquidations:', error);
      // Возвращаем пустой массив вместо ошибки
      return [];
    }
  }

  async getAccountBalance() {
    try {
      if (!this.apiKey || !this.secretKey) {
        console.log('API credentials not configured, returning null');
        return null;
      }

      const response = await this.makeSignedRequest('GET', '/v5/account/wallet-balance', {
        accountType: 'UNIFIED'
      });

      if (response && response.retCode === 0 && response.result && response.result.list) {
        return response.result.list.map(account => ({
          coin: account.coin,
          walletBalance: parseFloat(account.walletBalance),
          availableBalance: parseFloat(account.availableBalance),
          unrealizedPnl: parseFloat(account.unrealizedPnl)
        }));
      } else {
        console.log('Account balance endpoint requires proper authentication, returning null');
        return null;
      }
    } catch (error) {
      console.error('Error fetching account balance:', error);
      return null;
    }
  }

  async getRecentTrades(symbol, limit = 50) {
    try {
      const response = await axios.get(`${this.baseURL}/v5/market/recent-trade`, {
        params: {
          category: 'linear',
          symbol: symbol,
          limit: limit
        }
      });

      if (response.data.retCode === 0) {
        return response.data.result.list.map(trade => ({
          symbol: trade.symbol,
          side: trade.side,
          size: parseFloat(trade.size),
          price: parseFloat(trade.price),
          timestamp: parseInt(trade.time)
        }));
      } else {
        throw new Error(`Bybit API error: ${response.data.retMsg}`);
      }
    } catch (error) {
      console.error('Error fetching recent trades:', error);
      return null;
    }
  }

  async getMyTrades(symbol, limit = 50) {
    try {
      if (!this.apiKey || !this.secretKey) {
        console.log('API credentials not configured, returning null');
        return null;
      }

      const response = await this.makeSignedRequest('GET', '/v5/execution/list', {
        category: 'linear',
        symbol: symbol,
        limit: limit
      });

      if (response && response.retCode === 0 && response.result && response.result.list) {
        return response.result.list.map(trade => ({
          symbol: trade.symbol,
          side: trade.side,
          size: parseFloat(trade.size),
          price: parseFloat(trade.price),
          timestamp: parseInt(trade.time),
          fee: parseFloat(trade.execFee),
          feeRate: parseFloat(trade.execFeeRate)
        }));
      } else {
        console.log('My trades endpoint requires proper authentication, returning null');
        return null;
      }
    } catch (error) {
      console.error('Error fetching my trades:', error);
      return null;
    }
  }

  async getOpenPositions(symbol = null) {
    try {
      if (!this.apiKey || !this.secretKey) {
        console.log('API credentials not configured, returning empty array');
        return [];
      }

      const params = {
        category: 'linear'
      };
      
      if (symbol) {
        params.symbol = symbol;
      }

      const response = await this.makeSignedRequest('GET', '/v5/position/list', params);

      if (response && response.retCode === 0 && response.result && response.result.list) {
        return response.result.list.map(position => ({
          symbol: position.symbol,
          side: position.side,
          size: parseFloat(position.size),
          avgPrice: parseFloat(position.avgPrice),
          unrealizedPnl: parseFloat(position.unrealizedPnl),
          markPrice: parseFloat(position.markPrice),
          leverage: parseFloat(position.leverage),
          marginMode: position.marginMode
        }));
      } else {
        console.log('Open positions endpoint requires proper authentication, returning empty array');
        return [];
      }
    } catch (error) {
      console.error('Error fetching open positions:', error);
      return [];
    }
  }
}

module.exports = BybitAPI;
