const TelegramBot = require('node-telegram-bot-api');
const BybitAPI = require('./bybitApi');
const TechnicalIndicators = require('./technicalIndicators');
const LSTM = require('./lstmModel');
const Analyzer = require('./analyzer');
const WebInterface = require('./webInterface');
const config = require('./config');
const fs = require('fs').promises;
const path = require('path');

class BybitAnalyzerBot {
  constructor() {
    this.bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: true });
    this.bybitAPI = new BybitAPI();
    this.technicalIndicators = new TechnicalIndicators();
    this.lstm = new LSTM();
    this.analyzer = new Analyzer(this.bybitAPI, this.technicalIndicators, this.lstm);
    
    // Инициализация веб-интерфейса
    this.webInterface = new WebInterface();
    
    this.userStates = new Map();
    this.setupBot();
  }

  setupBot() {
    // Command handlers
    this.bot.onText(/\/start/, this.handleStart.bind(this));
    this.bot.onText(/\/analyze (.+)/, this.handleAnalyzeCommand.bind(this));
    this.bot.onText(/\/strategy (.+)/, this.handleStrategyCommand.bind(this));
    this.bot.onText(/\/help/, this.handleHelp.bind(this));
    this.bot.onText(/\/balance/, this.handleBalance.bind(this));
    this.bot.onText(/\/liquidations (.+)/, this.handleLiquidations.bind(this));
    this.bot.onText(/\/trades (.+)/, this.handleTrades.bind(this));
    this.bot.onText(/\/positions/, this.handlePositions.bind(this));
    this.bot.onText(/\/popular/, this.handlePopular.bind(this));

    // Callback query handlers
    this.bot.on('callback_query', this.handleCallbackQuery.bind(this));

    // General message handler
    this.bot.on('message', this.handleMessage.bind(this));
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    const welcomeMessage = `
🚀 *Добро пожаловать в Bybit Analyzer Bot!*

Этот бот предоставляет комплексный анализ криптовалютных фьючерсов на Bybit с использованием:
• 🤖 ML LSTM модели для предсказаний
• 📊 15+ технических индикаторов
• 📈 Анализа паттернов свечей
• 💰 Мониторинга ликвидаций
• 📊 Анализа вашего баланса и позиций
• 🎯 Стратегии "Вход под фандинг"

*Доступные команды:*
/analyze TICKER - Полный анализ криптовалюты
/strategy TICKER - Анализ по стратегиям
/balance - Проверить баланс аккаунта
/liquidations TICKER - Мониторинг ликвидаций
/trades TICKER - Анализ последних сделок
/positions - Открытые позиции
/popular - Популярные пары
/help - Справка

*Примеры:*
/analyze BTCUSDT
/strategy ETHUSDT
/liquidations SOLUSDT
/trades ADAUSDT
`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📊 Анализ BTCUSDT', callback_data: 'analyze_BTCUSDT' },
          { text: '📊 Анализ ETHUSDT', callback_data: 'analyze_ETHUSDT' }
        ],
        [
          { text: '🎯 Стратегии', callback_data: 'strategy_menu' },
          { text: '💰 Мой баланс', callback_data: 'balance' }
        ],
        [
          { text: '📈 Мои позиции', callback_data: 'positions' },
          { text: '🔥 Ликвидации', callback_data: 'liquidations_menu' }
        ],
        [
          { text: '📋 Последние сделки', callback_data: 'trades_menu' },
          { text: '📚 Справка', callback_data: 'help' }
        ],
        [
          { text: '⭐ Популярные пары', callback_data: 'popular' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

    // Set persistent menu
    await this.setPersistentMenu(chatId);
  }

  async setPersistentMenu(chatId) {
    const menu = {
      keyboard: [
        [
          { text: '📊 Анализ' },
          { text: '💰 Баланс' }
        ],
        [
          { text: '🔥 Ликвидации' },
          { text: '📈 Позиции' }
        ],
        [
          { text: '📋 Сделки' },
          { text: '📚 Помощь' }
        ]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    };

    await this.bot.sendMessage(chatId, 'Меню настроено! Используйте кнопки внизу для быстрого доступа.', {
      reply_markup: menu
    });
  }

  async handleAnalyzeCommand(msg, match) {
    const chatId = msg.chat.id;
    const symbol = match[1].toUpperCase();
    
    await this.performAnalysis(chatId, symbol);
  }

  async handleStrategyCommand(msg, match) {
    const chatId = msg.chat.id;
    const symbol = match[1].toUpperCase();
    
    await this.showStrategyMenu(chatId, symbol);
  }

  async handleBalance(msg) {
    const chatId = msg.chat.id;
    await this.showBalance(chatId);
  }

  async handleLiquidations(msg, match) {
    const chatId = msg.chat.id;
    const symbol = match ? match[1].toUpperCase() : 'BTCUSDT';
    await this.showLiquidations(chatId, symbol);
  }

  async handleTrades(msg, match) {
    const chatId = msg.chat.id;
    const symbol = match ? match[1].toUpperCase() : 'BTCUSDT';
    await this.showTrades(chatId, symbol);
  }

  async handlePositions(msg) {
    const chatId = msg.chat.id;
    await this.showPositions(chatId);
  }

  async handleHelp(msg) {
    const chatId = msg.chat.id;
    await this.showHelp(chatId);
  }

  async handlePopular(msg) {
    const chatId = msg.chat.id;
    await this.showPopular(chatId);
  }

  async handleCallbackQuery(query) {
    const chatId = query.message.chat.id;
    const data = query.data;

    await this.bot.answerCallbackQuery(query.id);

    if (data.startsWith('analyze_')) {
      const symbol = data.split('_')[1];
      await this.performAnalysis(chatId, symbol);
    } else if (data.startsWith('strategy_')) {
      const parts = data.split('_');
      const strategyType = parts[1];
      const symbol = parts[2];
      
      if (strategyType === 'funding') {
        await this.performFundingStrategy(chatId, symbol);
      } else if (strategyType === 'technical') {
        await this.performTechnicalStrategy(chatId, symbol);
      } else if (strategyType === 'lstm') {
        await this.performLSTMStrategy(chatId, symbol);
      } else if (strategyType === 'patterns') {
        await this.performPatternsStrategy(chatId, symbol);
      } else if (strategyType === 'all') {
        await this.performAllStrategies(chatId, symbol);
      }
    } else if (data === 'balance') {
      await this.showBalance(chatId);
    } else if (data === 'positions') {
      await this.showPositions(chatId);
    } else if (data === 'strategy_menu') {
      await this.showStrategySelectionMenu(chatId);
    } else if (data === 'strategy_funding_menu') {
      await this.showPopular(chatId, 'funding');
    } else if (data === 'strategy_technical_menu') {
      await this.showPopular(chatId, 'technical');
    } else if (data === 'strategy_lstm_menu') {
      await this.showPopular(chatId, 'lstm');
    } else if (data === 'strategy_patterns_menu') {
      await this.showPopular(chatId, 'patterns');
    } else if (data === 'strategy_full_menu') {
      await this.showPopular(chatId, 'full');
    } else if (data === 'strategy_all_menu') {
      await this.showPopular(chatId, 'all');
    } else if (data === 'liquidations_menu') {
      await this.showLiquidationsMenu(chatId);
    } else if (data === 'trades_menu') {
      await this.showTradesMenu(chatId);
    } else if (data === 'help') {
      await this.showHelp(chatId);
    } else if (data === 'popular') {
      await this.showPopular(chatId);
    }
  }

  async handleMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '📊 Анализ') {
      await this.bot.sendMessage(chatId, 'Введите тикер для анализа (например: BTCUSDT):');
      this.userStates.set(chatId, { waitingFor: 'symbol' });
    } else if (text === '💰 Баланс') {
      await this.showBalance(chatId);
    } else if (text === '🔥 Ликвидации') {
      await this.showLiquidationsMenu(chatId);
    } else if (text === '📈 Позиции') {
      await this.showPositions(chatId);
    } else if (text === '📋 Сделки') {
      await this.showTradesMenu(chatId);
    } else if (text === '📚 Помощь') {
      await this.showHelp(chatId);
    } else if (this.userStates.get(chatId)?.waitingFor === 'symbol') {
      const symbol = text.toUpperCase();
      this.userStates.delete(chatId);
      await this.performAnalysis(chatId, symbol);
    }
  }

  async performAnalysis(chatId, symbol) {
    try {
      const progressMsg = await this.bot.sendMessage(chatId, '🔍 Начинаю анализ...');
      
      // Progress updates
      await this.updateProgress(progressMsg.chat.id, progressMsg.message_id, '📊 Получение данных...', 20);
      const analysis = await this.analyzer.analyzeCrypto(symbol);
      
      await this.updateProgress(progressMsg.chat.id, progressMsg.message_id, '🤖 Анализ LSTM модели...', 50);
      
      await this.updateProgress(progressMsg.chat.id, progressMsg.message_id, '📈 Генерация графиков...', 80);
      
      await this.updateProgress(progressMsg.chat.id, progressMsg.message_id, '✅ Анализ завершен!', 100);

      // Send comprehensive report
      await this.sendAnalysisReport(chatId, analysis);
      
      // Send charts
      if (analysis.charts) {
        await this.sendCharts(chatId, analysis.charts, symbol);
      }

    } catch (error) {
      console.error('Error in analysis:', error);
      await this.bot.sendMessage(chatId, `❌ Ошибка при анализе ${symbol}: ${error.message}`);
    }
  }

  async performFundingStrategy(chatId, symbol) {
    try {
      const progressMsg = await this.bot.sendMessage(chatId, '🎯 Анализ стратегии фандинга...');
      
      await this.updateProgress(progressMsg.chat.id, progressMsg.message_id, '📊 Получение данных...', 30);
      
      // Получаем необходимые данные для стратегии фандинга
      const tickerInfo = await this.analyzer.bybitAPI.getTickerInfo(symbol);
      const fundingRate = await this.analyzer.bybitAPI.getFundingRate(symbol);
      const orderBook = await this.analyzer.bybitAPI.getOrderBook(symbol);
      const openInterest = await this.analyzer.bybitAPI.getOpenInterest(symbol);
      
      await this.updateProgress(progressMsg.chat.id, progressMsg.message_id, '🎯 Анализ фандинга...', 70);
      
      // Анализируем стратегию фандинга
      const fundingStrategy = this.analyzer.indicators.analyzeFundingStrategy(
        fundingRate.fundingRate,
        tickerInfo.nextFundingTime,
        tickerInfo.lastPrice,
        orderBook,
        openInterest.openInterest
      );
      
      await this.updateProgress(progressMsg.chat.id, progressMsg.message_id, '✅ Анализ завершен!', 100);
      
      // Отправляем отчет по стратегии фандинга
      await this.sendFundingStrategyReport(chatId, symbol, fundingStrategy, tickerInfo, fundingRate);
      
    } catch (error) {
      console.error('Error in funding strategy:', error);
      await this.bot.sendMessage(chatId, `❌ Ошибка при анализе стратегии фандинга ${symbol}: ${error.message}`);
    }
  }

  async performTechnicalStrategy(chatId, symbol) {
    try {
      const progressMsg = await this.bot.sendMessage(chatId, '📊 Технический анализ...');
      
      await this.updateProgress(progressMsg.chat.id, progressMsg.message_id, '📊 Получение данных...', 30);
      const klineData = await this.analyzer.bybitAPI.getKlineData(symbol);
      
      await this.updateProgress(progressMsg.chat.id, progressMsg.message_id, '📈 Расчет индикаторов...', 70);
      const technicalAnalysis = await this.analyzer.indicators.analyzeAll(klineData);
      const signals = this.analyzer.indicators.generateSignals(technicalAnalysis, klineData[klineData.length - 1].close);
      
      await this.updateProgress(progressMsg.chat.id, progressMsg.message_id, '✅ Анализ завершен!', 100);
      
      await this.sendTechnicalStrategyReport(chatId, symbol, technicalAnalysis, signals);
      
    } catch (error) {
      console.error('Error in technical strategy:', error);
      await this.bot.sendMessage(chatId, `❌ Ошибка при техническом анализе ${symbol}: ${error.message}`);
    }
  }

  async performLSTMStrategy(chatId, symbol) {
    try {
      const progressMsg = await this.bot.sendMessage(chatId, '🤖 LSTM анализ...');
      
      await this.updateProgress(progressMsg.chat.id, progressMsg.message_id, '📊 Получение данных...', 30);
      const klineData = await this.analyzer.bybitAPI.getKlineData(symbol);
      
      await this.updateProgress(progressMsg.chat.id, progressMsg.message_id, '🤖 Обучение модели...', 70);
      const lstmPrediction = await this.analyzer.lstmModel.quickPredict(klineData);
      const trendAnalysis = this.analyzer.lstmModel.analyzeTrend(klineData, lstmPrediction);
      
      await this.updateProgress(progressMsg.chat.id, progressMsg.message_id, '✅ Анализ завершен!', 100);
      
      await this.sendLSTMStrategyReport(chatId, symbol, lstmPrediction, trendAnalysis);
      
    } catch (error) {
      console.error('Error in LSTM strategy:', error);
      await this.bot.sendMessage(chatId, `❌ Ошибка при LSTM анализе ${symbol}: ${error.message}`);
    }
  }

  async performPatternsStrategy(chatId, symbol) {
    try {
      const progressMsg = await this.bot.sendMessage(chatId, '📈 Анализ паттернов...');
      
      await this.updateProgress(progressMsg.chat.id, progressMsg.message_id, '📊 Получение данных...', 30);
      const klineData = await this.analyzer.bybitAPI.getKlineData(symbol);
      
      await this.updateProgress(progressMsg.chat.id, progressMsg.message_id, '📈 Поиск паттернов...', 70);
      const patterns = this.analyzer.indicators.detectCandlestickPatterns(klineData);
      
      await this.updateProgress(progressMsg.chat.id, progressMsg.message_id, '✅ Анализ завершен!', 100);
      
      await this.sendPatternsStrategyReport(chatId, symbol, patterns);
      
    } catch (error) {
      console.error('Error in patterns strategy:', error);
      await this.bot.sendMessage(chatId, `❌ Ошибка при анализе паттернов ${symbol}: ${error.message}`);
    }
  }

  async performAllStrategies(chatId, symbol) {
    try {
      const progressMsg = await this.bot.sendMessage(chatId, '🔍 Комплексный анализ всех стратегий...');
      
      await this.updateProgress(progressMsg.chat.id, progressMsg.message_id, '📊 Получение данных...', 20);
      const analysis = await this.analyzer.analyzeCrypto(symbol);
      
      await this.updateProgress(progressMsg.chat.id, progressMsg.message_id, '🎯 Анализ стратегий...', 60);
      
      await this.updateProgress(progressMsg.chat.id, progressMsg.message_id, '📈 Генерация отчетов...', 80);
      
      await this.updateProgress(progressMsg.chat.id, progressMsg.message_id, '✅ Анализ завершен!', 100);
      
      await this.sendAllStrategiesReport(chatId, symbol, analysis);
      
    } catch (error) {
      console.error('Error in all strategies:', error);
      await this.bot.sendMessage(chatId, `❌ Ошибка при комплексном анализе ${symbol}: ${error.message}`);
    }
  }

  async updateProgress(chatId, messageId, text, percentage) {
    const progressBar = this.createProgressBar(percentage);
    const message = `${text}\n\n${progressBar} ${percentage}%`;
    
    try {
      await this.bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId
      });
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }

  createProgressBar(percentage) {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  async sendAnalysisReport(chatId, analysis) {
    const report = analysis;
    
    let message = `📊 *Анализ ${this.escapeMarkdown(report.symbol)}*\n\n`;
    
    // Price Information
    message += `💰 *Цена:* $${this.escapeMarkdown(report.priceInfo.currentPrice.toFixed(2))}\n`;
    message += `📈 *Изменение 24ч:* ${this.escapeMarkdown((report.priceInfo.priceChange24h * 100).toFixed(2))}%\n`;
    message += `📊 *Объем 24ч:* ${this.escapeMarkdown(this.formatNumber(report.priceInfo.volume24h))}\n\n`;
    
    // Technical Indicators
    message += `📊 *Технические индикаторы:*\n`;
    if (report.technicalIndicators.rsi) {
      const rsi = report.technicalIndicators.rsi;
      const rsiEmoji = rsi < 30 ? '🟢' : rsi > 70 ? '🔴' : '🟡';
      message += `${rsiEmoji} RSI: ${this.escapeMarkdown(rsi.toFixed(2))}\n`;
    }
    
    if (report.technicalIndicators.macd) {
      const macd = report.technicalIndicators.macd;
      const macdEmoji = macd.macd > macd.signal ? '🟢' : '🔴';
      message += `${macdEmoji} MACD: ${this.escapeMarkdown(macd.macd.toFixed(4))}\n`;
    }
    
    // LSTM Analysis
    if (report.lstmAnalysis) {
      message += `\n🤖 *LSTM Предсказание:*\n`;
      const trendText = report.lstmAnalysis.trend === 'bullish' ? '🟢 Бычий' : '🔴 Медвежий';
      message += `📈 Тренд: ${this.escapeMarkdown(trendText)}\n`;
      message += `💪 Сила: ${this.escapeMarkdown(report.lstmAnalysis.strength)}\n`;
    }
    
    // Candlestick Patterns
    if (report.candlestickPatterns && report.candlestickPatterns.length > 0) {
      message += `\n🕯️ *Паттерны свечей:*\n`;
      const recentPatterns = report.candlestickPatterns.slice(-3);
      recentPatterns.forEach(pattern => {
        const emoji = pattern.signal === 'BULLISH' ? '🟢' : pattern.signal === 'BEARISH' ? '🔴' : '🟡';
        message += `${emoji} ${this.escapeMarkdown(pattern.type)} (${this.escapeMarkdown(pattern.strength)})\n`;
      });
    }
    
    // Recommendations
    if (report.recommendations && report.recommendations.length > 0) {
      message += `\n💡 *Рекомендации:*\n`;
      report.recommendations.slice(0, 3).forEach(rec => {
        message += `• ${this.escapeMarkdown(rec)}\n`;
      });
    }
    
    // Support/Resistance
    if (report.supportResistance) {
      message += `\n📊 *Уровни:*\n`;
      if (report.supportResistance.support.length > 0) {
        const support = report.supportResistance.support[0];
        message += `🟢 Поддержка: $${this.escapeMarkdown(support.level.toFixed(2))}\n`;
      }
      if (report.supportResistance.resistance.length > 0) {
        const resistance = report.supportResistance.resistance[0];
        message += `🔴 Сопротивление: $${this.escapeMarkdown(resistance.level.toFixed(2))}\n`;
      }
    }

    try {
      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error sending analysis report:', error);
      // Fallback to plain text if Markdown fails
      const plainMessage = message.replace(/\*/g, '').replace(/_/g, '');
      await this.bot.sendMessage(chatId, plainMessage);
    }
  }

  async sendFundingStrategyReport(chatId, symbol, fundingStrategy, tickerInfo, fundingRate) {
    let message = `🎯 *Стратегия "Вход под фандинг" - ${symbol}*\n\n`;
    
    message += `💰 *Текущая цена:* $${tickerInfo.lastPrice.toFixed(2)}\n`;
    message += `📈 *Изменение 24ч:* ${(tickerInfo.price24hPcnt * 100).toFixed(2)}%\n\n`;
    
    // Фандинг информация
    message += `🎯 *Анализ фандинга:*\n`;
    fundingStrategy.details.forEach(detail => {
      message += `• ${detail}\n`;
    });
    
    message += `\n📊 *Сигнал:* ${fundingStrategy.signal}\n`;
    message += `💪 *Сила сигнала:* ${fundingStrategy.strength}\n`;
    message += `🎯 *Уверенность:* ${fundingStrategy.confidence.toFixed(1)}%\n\n`;
    
    if (fundingStrategy.signal !== 'NEUTRAL') {
      message += `📈 *Рекомендации по входу:*\n`;
      message += `📍 Вход: $${fundingStrategy.entryPrice.toFixed(2)}\n`;
      message += `🛑 Стоп-лосс: $${fundingStrategy.stopLoss.toFixed(2)}\n`;
      message += `🎯 Тейк-профит: $${fundingStrategy.takeProfit.toFixed(2)}\n`;
      message += `⚡ Рекомендуемое плечо: ${fundingStrategy.leverage.toFixed(1)}x\n`;
      message += `📏 Размер позиции: ${fundingStrategy.positionSize.toFixed(1)}%\n\n`;
      
      const riskReward = Math.abs((fundingStrategy.takeProfit - fundingStrategy.entryPrice) / (fundingStrategy.entryPrice - fundingStrategy.stopLoss));
      message += `⚖️ Соотношение риск/прибыль: 1:${riskReward.toFixed(2)}\n`;
    }
    
    message += `\n💡 *Стратегия основана на:*\n`;
    message += `• Анализе текущего фандинга\n`;
    message += `• Времени до следующего фандинга\n`;
    message += `• Анализе стакана заявок\n`;
    message += `• Открытом интересе\n`;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  async sendTechnicalStrategyReport(chatId, symbol, technicalAnalysis, signals) {
    let message = `📊 *Технический анализ - ${symbol}*\n\n`;
    
    message += `📈 *Торговые сигналы:*\n`;
    message += `🟢 Покупка: ${signals.buy}\n`;
    message += `🔴 Продажа: ${signals.sell}\n`;
    message += `🟡 Нейтрально: ${signals.neutral}\n\n`;
    
    message += `📊 *Детали сигналов:*\n`;
    signals.details.forEach(detail => {
      message += `• ${detail}\n`;
    });
    
    message += `\n📊 *Ключевые индикаторы:*\n`;
    
    if (technicalAnalysis.rsi && technicalAnalysis.rsi.length > 0) {
      const rsi = technicalAnalysis.rsi[technicalAnalysis.rsi.length - 1];
      const rsiEmoji = rsi < 30 ? '🟢' : rsi > 70 ? '🔴' : '🟡';
      message += `${rsiEmoji} RSI: ${rsi.toFixed(2)}\n`;
    }
    
    if (technicalAnalysis.macd && technicalAnalysis.macd.length > 0) {
      const macd = technicalAnalysis.macd[technicalAnalysis.macd.length - 1];
      const macdEmoji = macd.MACD > macd.signal ? '🟢' : '🔴';
      message += `${macdEmoji} MACD: ${macd.MACD.toFixed(4)}\n`;
    }
    
    if (technicalAnalysis.stochastic && technicalAnalysis.stochastic.length > 0) {
      const stoch = technicalAnalysis.stochastic[technicalAnalysis.stochastic.length - 1];
      const stochEmoji = stoch.k < 20 ? '🟢' : stoch.k > 80 ? '🔴' : '🟡';
      message += `${stochEmoji} Stochastic K: ${stoch.k.toFixed(2)}\n`;
    }

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  async sendLSTMStrategyReport(chatId, symbol, lstmPrediction, trendAnalysis) {
    let message = `🤖 *LSTM анализ - ${symbol}*\n\n`;
    
    message += `📈 *Предсказание цены:*\n`;
    message += `🎯 Следующий период: $${lstmPrediction.toFixed(2)}\n\n`;
    
    message += `📊 *Анализ тренда:*\n`;
    message += `📈 Направление: ${trendAnalysis.trend === 'bullish' ? '🟢 Бычий' : '🔴 Медвежий'}\n`;
    message += `💪 Сила тренда: ${trendAnalysis.strength}\n`;
    message += `📊 Изменение цены: ${trendAnalysis.priceChange.toFixed(2)}%\n\n`;
    
    message += `🤖 *Особенности LSTM модели:*\n`;
    message += `• Анализ исторических паттернов\n`;
    message += `• Учет волатильности рынка\n`;
    message += `• Предсказание краткосрочных движений\n`;
    message += `• Адаптация к изменениям рынка\n`;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  async sendPatternsStrategyReport(chatId, symbol, patterns) {
    let message = `📈 *Анализ паттернов свечей - ${symbol}*\n\n`;
    
    if (patterns.length === 0) {
      message += `🟡 Не обнаружено значимых паттернов в последних свечах\n`;
    } else {
      message += `📊 *Обнаруженные паттерны:*\n`;
      
      const recentPatterns = patterns.slice(-5); // Последние 5 паттернов
      recentPatterns.forEach((pattern, index) => {
        const emoji = pattern.signal === 'BULLISH' ? '🟢' : pattern.signal === 'BEARISH' ? '🔴' : '🟡';
        const strengthEmoji = pattern.strength === 'VERY_STRONG' ? '🔥' : pattern.strength === 'STRONG' ? '💪' : '📊';
        message += `${index + 1}. ${emoji} ${pattern.type} (${strengthEmoji} ${pattern.strength})\n`;
      });
      
      // Статистика
      const bullishCount = patterns.filter(p => p.signal === 'BULLISH').length;
      const bearishCount = patterns.filter(p => p.signal === 'BEARISH').length;
      const neutralCount = patterns.filter(p => p.signal === 'NEUTRAL').length;
      
      message += `\n📊 *Статистика паттернов:*\n`;
      message += `🟢 Бычьи: ${bullishCount}\n`;
      message += `🔴 Медвежьи: ${bearishCount}\n`;
      message += `🟡 Нейтральные: ${neutralCount}\n`;
    }
    
    message += `\n💡 *Интерпретация паттернов:*\n`;
    message += `• Паттерны показывают настроения рынка\n`;
    message += `• Сильные паттерны имеют большее значение\n`;
    message += `• Рекомендуется использовать в сочетании с другими индикаторами\n`;

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  async sendAllStrategiesReport(chatId, symbol, analysis) {
    let message = `🔍 *Комплексный анализ всех стратегий - ${symbol}*\n\n`;
    
    // Общая информация
    message += `💰 *Цена:* $${analysis.priceInfo.currentPrice.toFixed(2)}\n`;
    message += `📈 *Изменение 24ч:* ${(analysis.priceInfo.priceChange24h * 100).toFixed(2)}%\n\n`;
    
    // Стратегия фандинга
    if (analysis.fundingStrategy) {
      message += `🎯 *Стратегия фандинга:*\n`;
      message += `📊 Сигнал: ${analysis.fundingStrategy.signal}\n`;
      message += `💪 Уверенность: ${analysis.fundingStrategy.confidence.toFixed(1)}%\n`;
      if (analysis.fundingStrategy.signal !== 'NEUTRAL') {
        message += `📍 Вход: $${analysis.fundingStrategy.entryPrice.toFixed(2)}\n`;
        message += `🎯 Тейк-профит: $${analysis.fundingStrategy.takeProfit.toFixed(2)}\n`;
      }
      message += `\n`;
    }
    
    // Технический анализ
    if (analysis.signals) {
      message += `📊 *Технический анализ:*\n`;
      message += `🟢 Покупка: ${analysis.signals.buy}\n`;
      message += `🔴 Продажа: ${analysis.signals.sell}\n`;
      message += `🟡 Нейтрально: ${analysis.signals.neutral}\n\n`;
    }
    
    // LSTM анализ
    if (analysis.lstmAnalysis) {
      message += `🤖 *LSTM анализ:*\n`;
      message += `📈 Тренд: ${analysis.lstmAnalysis.trend === 'bullish' ? '🟢 Бычий' : '🔴 Медвежий'}\n`;
      message += `💪 Сила: ${analysis.lstmAnalysis.strength}\n\n`;
    }
    
    // Паттерны свечей
    if (analysis.candlestickPatterns && analysis.candlestickPatterns.length > 0) {
      message += `📈 *Паттерны свечей:*\n`;
      const recentPatterns = analysis.candlestickPatterns.slice(-3);
      recentPatterns.forEach(pattern => {
        const emoji = pattern.signal === 'BULLISH' ? '🟢' : pattern.signal === 'BEARISH' ? '🔴' : '🟡';
        message += `${emoji} ${pattern.type}\n`;
      });
      message += `\n`;
    }
    
    // Общая рекомендация
    message += `💡 *Общая рекомендация:*\n`;
    if (analysis.recommendations && analysis.recommendations.length > 0) {
      analysis.recommendations.slice(0, 3).forEach(rec => {
        message += `• ${rec}\n`;
      });
    }

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  async sendCharts(chatId, charts, symbol) {
    try {
      if (charts.main) {
        await this.bot.sendPhoto(chatId, charts.main, {
          caption: `📈 Основной график ${symbol}`
        });
      }
      
      if (charts.rsi) {
        await this.bot.sendPhoto(chatId, charts.rsi, {
          caption: `📊 RSI ${symbol}`
        });
      }
      
      if (charts.macd) {
        await this.bot.sendPhoto(chatId, charts.macd, {
          caption: `📈 MACD ${symbol}`
        });
      }
      
      if (charts.prediction) {
        await this.bot.sendPhoto(chatId, charts.prediction, {
          caption: `🤖 LSTM Предсказание ${symbol}`
        });
      }
    } catch (error) {
      console.error('Error sending charts:', error);
      await this.bot.sendMessage(chatId, '❌ Ошибка при отправке графиков');
    }
  }

  async showBalance(chatId) {
    try {
      const balance = await this.analyzer.bybitAPI.getAccountBalance();
      
      if (!balance || balance.length === 0) {
        await this.bot.sendMessage(chatId, '❌ Не удалось получить данные баланса');
        return;
      }
      
      let message = `💰 *Баланс аккаунта:*\n\n`;
      
      balance.forEach(account => {
        if (parseFloat(account.walletBalance) > 0) {
          message += `🪙 *${account.coin}:*\n`;
          message += `   💰 Баланс: ${parseFloat(account.walletBalance).toFixed(4)}\n`;
          message += `   💳 Доступно: ${parseFloat(account.availableBalance).toFixed(4)}\n`;
          message += `   📈 P&L: ${parseFloat(account.totalUnrealizedProfit).toFixed(4)}\n\n`;
        }
      });
      
      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error showing balance:', error);
      await this.bot.sendMessage(chatId, '❌ Ошибка при получении баланса');
    }
  }

  async showLiquidations(chatId, symbol) {
    try {
      const liquidations = await this.analyzer.bybitAPI.getLiquidations(symbol, 20);
      
      if (!liquidations || liquidations.length === 0) {
        await this.bot.sendMessage(chatId, `📊 Нет данных о ликвидациях для ${symbol}`);
        return;
      }
      
      let message = `🔥 *Ликвидации ${symbol} (последние 20):*\n\n`;
      
      liquidations.slice(0, 10).forEach((liq, index) => {
        const emoji = liq.side === 'Buy' ? '🔴' : '🟢';
        const time = new Date(liq.timestamp).toLocaleTimeString();
        message += `${index + 1}. ${emoji} ${liq.side} ${liq.size} @ $${liq.price.toFixed(2)}\n`;
        message += `   ⏰ ${time}\n\n`;
      });
      
      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error showing liquidations:', error);
      await this.bot.sendMessage(chatId, '❌ Ошибка при получении ликвидаций');
    }
  }

  async showTrades(chatId, symbol) {
    try {
      const recentTrades = await this.analyzer.bybitAPI.getRecentTrades(symbol, 20);
      const myTrades = await this.analyzer.bybitAPI.getMyTrades(symbol, 10);
      
      let message = `📋 *Сделки ${symbol}:*\n\n`;
      
      message += `🔄 *Последние рыночные сделки:*\n`;
      if (recentTrades && recentTrades.length > 0) {
        recentTrades.slice(0, 5).forEach((trade, index) => {
          const emoji = trade.side === 'Buy' ? '🟢' : '🔴';
          const time = new Date(trade.timestamp).toLocaleTimeString();
          message += `${index + 1}. ${emoji} ${trade.side} ${trade.size} @ $${trade.price.toFixed(2)}\n`;
          message += `   ⏰ ${time}\n`;
        });
      }
      
      message += `\n👤 *Мои последние сделки:*\n`;
      if (myTrades && myTrades.length > 0) {
        myTrades.slice(0, 5).forEach((trade, index) => {
          const emoji = trade.side === 'Buy' ? '🟢' : '🔴';
          const time = new Date(trade.timestamp).toLocaleTimeString();
          message += `${index + 1}. ${emoji} ${trade.side} ${trade.size} @ $${trade.price.toFixed(2)}\n`;
          message += `   💰 Комиссия: $${trade.fee.toFixed(4)}\n`;
          message += `   ⏰ ${time}\n`;
        });
      } else {
        message += `Нет данных о ваших сделках\n`;
      }
      
      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error showing trades:', error);
      await this.bot.sendMessage(chatId, '❌ Ошибка при получении сделок');
    }
  }

  async showPositions(chatId) {
    try {
      const positions = await this.analyzer.bybitAPI.getOpenPositions();
      
      if (!positions || positions.length === 0) {
        await this.bot.sendMessage(chatId, '📊 У вас нет открытых позиций');
        return;
      }
      
      let message = `📈 *Открытые позиции:*\n\n`;
      
      positions.forEach((pos, index) => {
        const emoji = pos.side === 'Buy' ? '🟢' : '🔴';
        const pnlEmoji = pos.unrealizedPnl >= 0 ? '📈' : '📉';
        message += `${index + 1}. ${emoji} *${pos.symbol}*\n`;
        message += `   📊 Сторона: ${pos.side}\n`;
        message += `   📏 Размер: ${pos.size}\n`;
        message += `   💰 Вход: $${pos.entryPrice.toFixed(2)}\n`;
        message += `   📍 Текущая: $${pos.markPrice.toFixed(2)}\n`;
        message += `   ${pnlEmoji} P&L: $${pos.unrealizedPnl.toFixed(2)}\n`;
        message += `   ⚡ Плечо: ${pos.leverage}x\n\n`;
      });
      
      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error showing positions:', error);
      await this.bot.sendMessage(chatId, '❌ Ошибка при получении позиций');
    }
  }

  async showLiquidationsMenu(chatId) {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔥 BTCUSDT', callback_data: 'liquidations_BTCUSDT' },
          { text: '🔥 ETHUSDT', callback_data: 'liquidations_ETHUSDT' }
        ],
        [
          { text: '🔥 SOLUSDT', callback_data: 'liquidations_SOLUSDT' },
          { text: '🔥 ADAUSDT', callback_data: 'liquidations_ADAUSDT' }
        ]
      ]
    };
    
    await this.bot.sendMessage(chatId, '🔥 Выберите пару для мониторинга ликвидаций:', {
      reply_markup: keyboard
    });
  }

  async showTradesMenu(chatId) {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '📋 BTCUSDT', callback_data: 'trades_BTCUSDT' },
          { text: '📋 ETHUSDT', callback_data: 'trades_ETHUSDT' }
        ],
        [
          { text: '📋 SOLUSDT', callback_data: 'trades_SOLUSDT' },
          { text: '📋 ADAUSDT', callback_data: 'trades_ADAUSDT' }
        ]
      ]
    };
    
    await this.bot.sendMessage(chatId, '📋 Выберите пару для анализа сделок:', {
      reply_markup: keyboard
    });
  }

  async showStrategyMenu(chatId, symbol) {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🎯 Фандинг стратегия', callback_data: `strategy_funding_${symbol}` },
          { text: '📊 Технический анализ', callback_data: `strategy_technical_${symbol}` }
        ],
        [
          { text: '🤖 LSTM анализ', callback_data: `strategy_lstm_${symbol}` },
          { text: '📈 Паттерны свечей', callback_data: `strategy_patterns_${symbol}` }
        ],
        [
          { text: '🔍 Полный анализ', callback_data: `analyze_${symbol}` },
          { text: '📋 Все стратегии', callback_data: `strategy_all_${symbol}` }
        ]
      ]
    };
    
    await this.bot.sendMessage(chatId, `🎯 *Выберите стратегию анализа для ${symbol}:*`, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async showStrategySelectionMenu(chatId) {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🎯 Фандинг стратегия', callback_data: 'strategy_funding_menu' },
          { text: '📊 Технический анализ', callback_data: 'strategy_technical_menu' }
        ],
        [
          { text: '🤖 LSTM анализ', callback_data: 'strategy_lstm_menu' },
          { text: '📈 Паттерны свечей', callback_data: 'strategy_patterns_menu' }
        ],
        [
          { text: '🔍 Полный анализ', callback_data: 'strategy_full_menu' },
          { text: '📋 Все стратегии', callback_data: 'strategy_all_menu' }
        ]
      ]
    };
    
    await this.bot.sendMessage(chatId, '🎯 *Выберите тип стратегии:*', {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async showHelp(chatId) {
    const helpMessage = `
📚 *Справка по командам:*

🔍 *Анализ:*
/analyze TICKER - Полный анализ криптовалюты
/strategy TICKER - Анализ по стратегиям
Пример: /analyze BTCUSDT

🎯 *Стратегии:*
• Фандинг стратегия - вход под фандинг
• Технический анализ - классические индикаторы
• LSTM анализ - машинное обучение
• Паттерны свечей - анализ графических паттернов
• Все стратегии - комплексный анализ

💰 *Аккаунт:*
/balance - Проверить баланс аккаунта
/positions - Открытые позиции

🔥 *Мониторинг:*
/liquidations TICKER - Мониторинг ликвидаций
/trades TICKER - Анализ последних сделок

📊 *Популярные пары:*
BTCUSDT, ETHUSDT, SOLUSDT, ADAUSDT, DOTUSDT, LINKUSDT, MATICUSDT, AVAXUSDT

💡 *Советы:*
• Используйте кнопки меню для быстрого доступа
• Стратегия фандинга особенно эффективна перед выплатами
• Анализ включает ML предсказания и паттерны свечей
• Мониторинг ликвидаций помогает понять настроения рынка
• Регулярно проверяйте свой баланс и позиции

🎯 *Стратегия "Вход под фандинг":*
• Анализирует текущий фандинг и время до выплаты
• Рекомендует направление входа (LONG/SHORT)
• Рассчитывает оптимальные уровни входа, стоп-лосса и тейк-профита
• Учитывает стакан заявок и открытый интерес
• Предлагает размер позиции и плечо

🆘 *Поддержка:*
При возникновении проблем обратитесь к разработчику
`;

    await this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  }

  async showPopular(chatId, strategyType = null) {
    const popularPairs = [
      'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 
      'DOTUSDT', 'LINKUSDT', 'MATICUSDT', 'AVAXUSDT',
      'ATOMUSDT', 'UNIUSDT', 'LTCUSDT', 'BCHUSDT'
    ];
    
    let title = '⭐ Популярные торговые пары:';
    let callbackPrefix = 'analyze';
    
    if (strategyType) {
      switch (strategyType) {
        case 'funding':
          title = '🎯 Выберите пару для анализа стратегии фандинга:';
          callbackPrefix = 'strategy_funding';
          break;
        case 'technical':
          title = '📊 Выберите пару для технического анализа:';
          callbackPrefix = 'strategy_technical';
          break;
        case 'lstm':
          title = '🤖 Выберите пару для LSTM анализа:';
          callbackPrefix = 'strategy_lstm';
          break;
        case 'patterns':
          title = '📈 Выберите пару для анализа паттернов:';
          callbackPrefix = 'strategy_patterns';
          break;
        case 'full':
          title = '🔍 Выберите пару для полного анализа:';
          callbackPrefix = 'analyze';
          break;
        case 'all':
          title = '📋 Выберите пару для анализа всех стратегий:';
          callbackPrefix = 'strategy_all';
          break;
      }
    }
    
    const keyboard = {
      inline_keyboard: popularPairs.map(pair => [{
        text: `📊 ${pair}`,
        callback_data: `${callbackPrefix}_${pair}`
      }])
    };
    
    await this.bot.sendMessage(chatId, title, {
      reply_markup: keyboard
    });
  }

  formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  }

  // Helper function to escape Markdown characters
  escapeMarkdown(text) {
    if (!text) return '';
    return text.toString()
      .replace(/_/g, '\\_')
      .replace(/\*/g, '\\*')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/~/g, '\\~')
      .replace(/`/g, '\\`')
      .replace(/>/g, '\\>')
      .replace(/#/g, '\\#')
      .replace(/\+/g, '\\+')
      .replace(/-/g, '\\-')
      .replace(/=/g, '\\=')
      .replace(/\|/g, '\\|')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\./g, '\\.')
      .replace(/!/g, '\\!');
  }

  start() {
    console.log('🚀 Bybit Analyzer Bot запущен!');
    console.log('📱 Используйте /start для начала работы');
  }

  // Запуск веб-интерфейса
  startWebInterface() {
    try {
      this.webInterface.start();
      console.log('🌐 Web interface started successfully');
    } catch (error) {
      console.error('❌ Error starting web interface:', error);
    }
  }
}

// Запуск бота
const bot = new BybitAnalyzerBot();
bot.start();

// Обработка завершения работы
process.on('SIGINT', () => {
  console.log('\n🛑 Завершение работы бота...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Завершение работы бота...');
  process.exit(0);
});
