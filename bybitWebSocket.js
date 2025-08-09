const WebSocket = require('ws');
const crypto = require('crypto');

class BybitWebSocket {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.subscribers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket('wss://stream.bybit.com/v5/public/linear');
        
        this.ws.on('open', () => {
          console.log('🔗 Bybit WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        });

        this.ws.on('close', () => {
          console.log('🔌 Bybit WebSocket disconnected');
          this.isConnected = false;
          this.handleReconnect();
        });

        this.ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => {
        this.connect();
      }, 5000 * this.reconnectAttempts);
    }
  }

  subscribeToTicker(symbol, callback) {
    if (!this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    const topic = `orderbook.1.${symbol}`;
    const subscription = {
      op: 'subscribe',
      args: [topic]
    };

    this.ws.send(JSON.stringify(subscription));
    this.subscribers.set(symbol, callback);

    console.log(`📊 Subscribed to ${symbol}`);
  }

  subscribeToKline(symbol, interval = '1', callback) {
    if (!this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    const topic = `kline.${interval}.${symbol}`;
    const subscription = {
      op: 'subscribe',
      args: [topic]
    };

    this.ws.send(JSON.stringify(subscription));
    this.subscribers.set(`${symbol}_kline_${interval}`, callback);

    console.log(`📈 Subscribed to ${symbol} kline ${interval}`);
  }

  subscribeToTrade(symbol, callback) {
    if (!this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    const topic = `publicTrade.${symbol}`;
    const subscription = {
      op: 'subscribe',
      args: [topic]
    };

    this.ws.send(JSON.stringify(subscription));
    this.subscribers.set(`${symbol}_trade`, callback);

    console.log(`💹 Subscribed to ${symbol} trades`);
  }

  handleMessage(message) {
    if (message.topic) {
      const symbol = this.extractSymbolFromTopic(message.topic);
      const callback = this.subscribers.get(symbol);
      
      if (callback) {
        callback(message.data);
      }
    }
  }

  extractSymbolFromTopic(topic) {
    const parts = topic.split('.');
    if (topic.includes('orderbook')) {
      return parts[parts.length - 1];
    } else if (topic.includes('kline')) {
      return parts[parts.length - 1];
    } else if (topic.includes('publicTrade')) {
      return parts[parts.length - 1];
    }
    return topic;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.isConnected = false;
    }
  }
}

module.exports = BybitWebSocket;
