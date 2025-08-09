const BybitAPI = require('./bybitApi');
const BybitWebSocket = require('./bybitWebSocket');
const TechnicalIndicators = require('./technicalIndicators');
const LSTMModel = require('./lstmModel');
const ChartGenerator = require('./chartGenerator');
const fs = require('fs').promises;
const path = require('path');

class CryptoAnalyzer {
  constructor() {
    this.bybitAPI = new BybitAPI();
    this.bybitWS = new BybitWebSocket();
    this.indicators = new TechnicalIndicators();
    this.lstmModel = new LSTMModel();
    this.chartGenerator = new ChartGenerator();
    this.analysisCache = new Map();
  }

  // Полный анализ криптовалюты
  async analyzeCrypto(symbol, interval = '1', limit = 200) {
    try {
      console.log(`🔍 Начинаю анализ ${symbol}...`);

      // Получение данных
      const klineData = await this.bybitAPI.getKlineData(symbol, interval, limit);
      const tickerInfo = await this.bybitAPI.getTickerInfo(symbol);
      const orderBook = await this.bybitAPI.getOrderBook(symbol);
      const fundingRate = await this.bybitAPI.getFundingRate(symbol);
      const openInterest = await this.bybitAPI.getOpenInterest(symbol);
      const longShortRatio = await this.bybitAPI.getLongShortRatio(symbol);
      
      // Новые функции
      const liquidations = await this.bybitAPI.getLiquidations(symbol);
      const recentTrades = await this.bybitAPI.getRecentTrades(symbol);
      const myTrades = await this.bybitAPI.getMyTrades(symbol);
      const accountBalance = await this.bybitAPI.getAccountBalance();
      const openPositions = await this.bybitAPI.getOpenPositions(symbol);

      // Технический анализ
      const technicalAnalysis = await this.indicators.analyzeAll(klineData);
      const signals = this.indicators.generateSignals(technicalAnalysis, tickerInfo.lastPrice);
      
      // Анализ паттернов свечей
      const candlestickPatterns = this.indicators.detectCandlestickPatterns(klineData);

      // Анализ стратегии фандинга
      let fundingStrategy = null;
      if (fundingRate && tickerInfo && orderBook && openInterest) {
        fundingStrategy = this.indicators.analyzeFundingStrategy(
          fundingRate.fundingRate,
          tickerInfo.nextFundingTime,
          tickerInfo.lastPrice,
          orderBook,
          openInterest.openInterest
        );
      }

      // LSTM предсказания
      const lstmPrediction = await this.lstmModel.quickPredict(klineData);
      const trendAnalysis = this.lstmModel.analyzeTrend(klineData, lstmPrediction);

      // Генерация графиков
      let charts = [];
      try {
        charts = await this.generateCharts(klineData, technicalAnalysis, symbol, lstmPrediction);
      } catch (error) {
        console.error('Error generating charts:', error);
        charts = [];
      }

      // Формирование отчета
      const report = this.generateReport({
        symbol,
        tickerInfo,
        klineData,
        fundingRate,
        openInterest,
        longShortRatio,
        liquidations: liquidations || [],
        recentTrades: recentTrades || [],
        myTrades: myTrades || [],
        accountBalance: accountBalance || [],
        openPositions: openPositions || [],
        candlestickPatterns: candlestickPatterns || [],
        fundingStrategy: fundingStrategy || {},
        technicalAnalysis,
        signals,
        lstmPrediction,
        trendAnalysis
      });

      return report;

    } catch (error) {
      console.error(`Ошибка при анализе ${symbol}:`, error);
      throw error;
    }
  }

  // Генерация всех графиков
  async generateCharts(data, analysis, symbol, lstmPrediction) {
    try {
      const charts = {};

      // Основной график
      charts.main = await this.chartGenerator.generateMainChart(data, analysis, symbol);
      
      // RSI график
      if (analysis.rsi && analysis.rsi.length > 0) {
        charts.rsi = await this.chartGenerator.generateRSIChart(data, analysis, symbol);
      }

      // MACD график
      if (analysis.macd && analysis.macd.length > 0) {
        charts.macd = await this.chartGenerator.generateMACDChart(data, analysis, symbol);
      }

      // График объема
      charts.volume = await this.chartGenerator.generateVolumeChart(data, analysis, symbol);

      // Stochastic график
      if (analysis.stochastic && analysis.stochastic.length > 0) {
        charts.stochastic = await this.chartGenerator.generateStochasticChart(data, analysis, symbol);
      }

      // График предсказаний LSTM
      const predictions = [lstmPrediction];
      charts.prediction = await this.chartGenerator.generatePredictionChart(data, predictions, symbol);

      return charts;
    } catch (error) {
      console.error('Ошибка при генерации графиков:', error);
      return {};
    }
  }

  // Генерация текстового отчета
  generateReport(data) {
    const {
      symbol,
      tickerInfo,
      klineData,
      fundingRate,
      openInterest,
      longShortRatio,
      liquidations,
      recentTrades,
      myTrades,
      accountBalance,
      openPositions,
      candlestickPatterns,
      fundingStrategy,
      technicalAnalysis,
      signals,
      lstmPrediction,
      trendAnalysis
    } = data;

    const report = {
      // Основная информация
      symbol: symbol,
      timestamp: new Date().toISOString(),
      
      // Информация о тикере
      ticker: {
        lastPrice: tickerInfo.lastPrice,
        priceChange: tickerInfo.priceChange,
        priceChangePercent: tickerInfo.priceChangePercent,
        high24h: tickerInfo.high24h,
        low24h: tickerInfo.low24h,
        volume24h: tickerInfo.volume24h,
        turnover24h: tickerInfo.turnover24h
      },

      // Рыночные данные
      marketData: {
        fundingRate: fundingRate ? fundingRate.fundingRate : null,
        openInterest: openInterest ? openInterest.openInterest : null,
        longShortRatio: longShortRatio ? {
          buyRatio: longShortRatio.buyRatio,
          sellRatio: longShortRatio.sellRatio
        } : null
      },

      // Новые данные
      liquidations: liquidations ? liquidations.slice(0, 10) : [], // Последние 10 ликвидаций
      recentTrades: recentTrades ? recentTrades.slice(0, 20) : [], // Последние 20 сделок
      myTrades: myTrades ? myTrades.slice(0, 10) : [], // Мои последние сделки
      accountBalance: accountBalance || [],
      openPositions: openPositions || [],
      candlestickPatterns: candlestickPatterns || [],
      fundingStrategy: fundingStrategy || {},

      // Технические индикаторы
      technicalIndicators: {
        rsi: technicalAnalysis.rsi && technicalAnalysis.rsi.length > 0 ? technicalAnalysis.rsi[technicalAnalysis.rsi.length - 1] : null,
        macd: technicalAnalysis.macd && technicalAnalysis.macd.length > 0 ? {
          macd: technicalAnalysis.macd[technicalAnalysis.macd.length - 1].MACD,
          signal: technicalAnalysis.macd[technicalAnalysis.macd.length - 1].signal,
          histogram: technicalAnalysis.macd[technicalAnalysis.macd.length - 1].histogram
        } : null,
        bollingerBands: technicalAnalysis.bollinger && technicalAnalysis.bollinger.length > 0 ? {
          upper: technicalAnalysis.bollinger[technicalAnalysis.bollinger.length - 1].upper,
          middle: technicalAnalysis.bollinger[technicalAnalysis.bollinger.length - 1].middle,
          lower: technicalAnalysis.bollinger[technicalAnalysis.bollinger.length - 1].lower
        } : null,
        stochastic: technicalAnalysis.stochastic && technicalAnalysis.stochastic.length > 0 ? {
          k: technicalAnalysis.stochastic[technicalAnalysis.stochastic.length - 1].k,
          d: technicalAnalysis.stochastic[technicalAnalysis.stochastic.length - 1].d
        } : null,
        atr: technicalAnalysis.atr && technicalAnalysis.atr.length > 0 ? technicalAnalysis.atr[technicalAnalysis.atr.length - 1] : null,
        vwap: technicalAnalysis.vwap && technicalAnalysis.vwap.length > 0 ? technicalAnalysis.vwap[technicalAnalysis.vwap.length - 1] : null
      },

      // Торговые сигналы
      signals: {
        buy: signals.buy,
        sell: signals.sell,
        neutral: signals.neutral,
        details: signals.details
      },

      // LSTM анализ
      lstmAnalysis: {
        predictedPrice: lstmPrediction,
        trend: trendAnalysis.trend,
        strength: trendAnalysis.strength,
        priceChange: trendAnalysis.priceChange
      },

      // Рекомендации
      recommendations: this.generateRecommendations(signals, trendAnalysis, technicalAnalysis),

      // Уровни поддержки и сопротивления
      supportResistance: this.calculateSupportResistance(technicalAnalysis, tickerInfo.lastPrice)
    };

    return report;
  }

  // Генерация рекомендаций
  generateRecommendations(signals, trendAnalysis, technicalAnalysis) {
    const recommendations = [];

    // Анализ сигналов
    if (signals.buy > signals.sell) {
      recommendations.push('🟢 Преобладают сигналы на покупку');
    } else if (signals.sell > signals.buy) {
      recommendations.push('🔴 Преобладают сигналы на продажу');
    } else {
      recommendations.push('🟡 Смешанные сигналы - рекомендуется осторожность');
    }

    // Анализ тренда
    if (trendAnalysis.trend === 'bullish') {
      recommendations.push(`📈 LSTM предсказывает восходящий тренд (${trendAnalysis.strength})`);
    } else if (trendAnalysis.trend === 'bearish') {
      recommendations.push(`📉 LSTM предсказывает нисходящий тренд (${trendAnalysis.strength})`);
    } else {
      recommendations.push('➡️ LSTM предсказывает боковое движение');
    }

    // RSI анализ
    if (technicalAnalysis.rsi && technicalAnalysis.rsi.length > 0) {
      const currentRSI = technicalAnalysis.rsi[technicalAnalysis.rsi.length - 1];
      if (currentRSI < 30) {
        recommendations.push('💚 RSI показывает перепроданность - возможен отскок');
      } else if (currentRSI > 70) {
        recommendations.push('❤️ RSI показывает перекупленность - возможна коррекция');
      }
    }

    // MACD анализ
    if (technicalAnalysis.macd && technicalAnalysis.macd.length > 0) {
      const currentMACD = technicalAnalysis.macd[technicalAnalysis.macd.length - 1];
      if (currentMACD.MACD > currentMACD.signal && currentMACD.histogram > 0) {
        recommendations.push('🚀 MACD показывает бычий импульс');
      } else if (currentMACD.MACD < currentMACD.signal && currentMACD.histogram < 0) {
        recommendations.push('🐻 MACD показывает медвежий импульс');
      }
    }

    // Bollinger Bands анализ
    if (technicalAnalysis.bollinger && technicalAnalysis.bollinger.length > 0) {
      const currentBB = technicalAnalysis.bollinger[technicalAnalysis.bollinger.length - 1];
      const currentPrice = currentBB.middle; // Используем среднюю линию как текущую цену
      
      if (currentPrice < currentBB.lower) {
        recommendations.push('📊 Цена ниже нижней полосы Боллинджера - возможен отскок');
      } else if (currentPrice > currentBB.upper) {
        recommendations.push('📊 Цена выше верхней полосы Боллинджера - возможна коррекция');
      }
    }

    return recommendations;
  }

  // Расчет уровней поддержки и сопротивления
  calculateSupportResistance(technicalAnalysis, currentPrice) {
    const levels = {
      support: [],
      resistance: []
    };

    // Используем Bollinger Bands
    if (technicalAnalysis.bollinger && technicalAnalysis.bollinger.length > 0) {
      const currentBB = technicalAnalysis.bollinger[technicalAnalysis.bollinger.length - 1];
      levels.support.push({
        level: currentBB.lower,
        type: 'Bollinger Lower Band',
        strength: 'Strong'
      });
      levels.resistance.push({
        level: currentBB.upper,
        type: 'Bollinger Upper Band',
        strength: 'Strong'
      });
    }

    // Используем скользящие средние
    if (technicalAnalysis.sma && technicalAnalysis.sma.length > 0) {
      const currentSMA = technicalAnalysis.sma[technicalAnalysis.sma.length - 1];
      if (currentPrice > currentSMA) {
        levels.support.push({
          level: currentSMA,
          type: 'SMA 20',
          strength: 'Medium'
        });
      } else {
        levels.resistance.push({
          level: currentSMA,
          type: 'SMA 20',
          strength: 'Medium'
        });
      }
    }

    if (technicalAnalysis.ema && technicalAnalysis.ema.length > 0) {
      const currentEMA = technicalAnalysis.ema[technicalAnalysis.ema.length - 1];
      if (currentPrice > currentEMA) {
        levels.support.push({
          level: currentEMA,
          type: 'EMA 20',
          strength: 'Medium'
        });
      } else {
        levels.resistance.push({
          level: currentEMA,
          type: 'EMA 20',
          strength: 'Medium'
        });
      }
    }

    return levels;
  }

  // Сохранение отчета
  async saveReport(report, charts) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportDir = `./reports/${report.symbol}_${timestamp}`;
      
      await fs.mkdir(reportDir, { recursive: true });

      // Сохранение JSON отчета
      await fs.writeFile(
        `${reportDir}/analysis_report.json`,
        JSON.stringify(report, null, 2)
      );

      // Сохранение графиков
      for (const [chartName, chartBuffer] of Object.entries(charts)) {
        await fs.writeFile(`${reportDir}/${chartName}_chart.png`, chartBuffer);
      }

      console.log(`📁 Отчет сохранен в ${reportDir}`);
      return reportDir;
    } catch (error) {
      console.error('Ошибка при сохранении отчета:', error);
      throw error;
    }
  }

  // Получение кэшированного анализа
  getCachedAnalysis(symbol) {
    const cached = this.analysisCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 минут
      return cached.data;
    }
    return null;
  }

  // Кэширование анализа
  cacheAnalysis(symbol, data) {
    this.analysisCache.set(symbol, {
      data,
      timestamp: Date.now()
    });
  }
}

module.exports = CryptoAnalyzer;
