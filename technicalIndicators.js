const { SMA, EMA, RSI, MACD, BollingerBands, Stochastic, ATR, WilliamsR, CCI, MFI, OBV, ADX, VWAP } = require('technicalindicators');

class TechnicalIndicators {
  constructor() {
    // Проверяем доступность библиотек
    this.libraries = {
      SMA: SMA,
      EMA: EMA,
      RSI: RSI,
      MACD: MACD,
      BollingerBands: BollingerBands,
      Stochastic: Stochastic,
      ATR: ATR,
      WilliamsR: WilliamsR,
      CCI: CCI,
      MFI: MFI,
      OBV: OBV,
      ADX: ADX,
      VWAP: VWAP
    };
  }

  // Простая скользящая средняя
  calculateSMA(data, period = 20) {
    if (!data || data.length < period) return [];
    
    const sma = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(null);
        continue;
      }
      
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.close, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  // Экспоненциальная скользящая средняя
  calculateEMA(data, period = 20) {
    if (!data || data.length < period) return [];
    
    const ema = [];
    const multiplier = 2 / (period + 1);
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        ema.push(null);
        continue;
      }
      
      if (i === period - 1) {
        // Первое значение EMA = SMA
        const sum = data.slice(0, period).reduce((acc, d) => acc + d.close, 0);
        ema.push(sum / period);
      } else {
        const currentEMA = (data[i].close * multiplier) + (ema[i - 1] * (1 - multiplier));
        ema.push(currentEMA);
      }
    }
    return ema;
  }

  // RSI
  calculateRSI(data, period = 14) {
    if (!data || data.length < period + 1) return [];
    
    const rsi = [];
    const gains = [];
    const losses = [];
    
    // Вычисляем изменения цены
    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    // Вычисляем RSI
    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        rsi.push(null);
        continue;
      }
      
      const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
    
    return rsi;
  }

  // MACD
  calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (!data || data.length < slowPeriod) return [];
    
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);
    
    const macd = [];
    for (let i = 0; i < data.length; i++) {
      if (fastEMA[i] !== null && slowEMA[i] !== null) {
        macd.push(fastEMA[i] - slowEMA[i]);
      } else {
        macd.push(null);
      }
    }
    
    // Сигнальная линия (EMA от MACD)
    const signal = this.calculateEMA(macd.filter(v => v !== null), signalPeriod);
    
    // Гистограмма
    const histogram = [];
    for (let i = 0; i < macd.length; i++) {
      if (macd[i] !== null && signal[i] !== null) {
        histogram.push(macd[i] - signal[i]);
      } else {
        histogram.push(null);
      }
    }
    
    return macd.map((value, index) => ({
      MACD: value,
      signal: signal[index] || null,
      histogram: histogram[index] || null
    }));
  }

  // Bollinger Bands
  calculateBollingerBands(data, period = 20, stdDev = 2) {
    if (!data || data.length < period) return [];
    
    const sma = this.calculateSMA(data, period);
    const bands = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        bands.push({ upper: null, middle: null, lower: null });
        continue;
      }
      
      const middle = sma[i];
      const slice = data.slice(i - period + 1, i + 1);
      const variance = slice.reduce((acc, d) => acc + Math.pow(d.close - middle, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      bands.push({
        upper: middle + (standardDeviation * stdDev),
        middle: middle,
        lower: middle - (standardDeviation * stdDev)
      });
    }
    
    return bands;
  }

  // Stochastic
  calculateStochastic(data, period = 14, signalPeriod = 3) {
    if (!data || data.length < period) return [];
    
    const k = [];
    const d = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        k.push(null);
        d.push(null);
        continue;
      }
      
      const slice = data.slice(i - period + 1, i + 1);
      const highest = Math.max(...slice.map(d => d.high));
      const lowest = Math.min(...slice.map(d => d.low));
      const current = data[i].close;
      
      const kValue = ((current - lowest) / (highest - lowest)) * 100;
      k.push(kValue);
    }
    
    // Сигнальная линия D (SMA от K)
    for (let i = 0; i < k.length; i++) {
      if (i < signalPeriod - 1) {
        d.push(null);
        continue;
      }
      
      const slice = k.slice(i - signalPeriod + 1, i + 1).filter(v => v !== null);
      const dValue = slice.reduce((a, b) => a + b, 0) / slice.length;
      d.push(dValue);
    }
    
    return k.map((kValue, index) => ({
      k: kValue,
      d: d[index] || null
    }));
  }

  // ATR (Average True Range)
  calculateATR(data, period = 14) {
    if (!data || data.length < period + 1) return [];
    
    const trueRanges = [];
    
    for (let i = 1; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevClose = data[i - 1].close;
      
      const tr1 = high - low;
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(low - prevClose);
      
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    
    const atr = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        atr.push(null);
        continue;
      }
      
      const slice = trueRanges.slice(i - period, i);
      const avgTR = slice.reduce((a, b) => a + b, 0) / period;
      atr.push(avgTR);
    }
    
    return atr;
  }

  // Williams %R
  calculateWilliamsR(data, period = 14) {
    if (!data || data.length < period) return [];
    
    const williamsR = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        williamsR.push(null);
        continue;
      }
      
      const slice = data.slice(i - period + 1, i + 1);
      const highest = Math.max(...slice.map(d => d.high));
      const lowest = Math.min(...slice.map(d => d.low));
      const current = data[i].close;
      
      const wr = ((highest - current) / (highest - lowest)) * -100;
      williamsR.push(wr);
    }
    
    return williamsR;
  }

  // CCI (Commodity Channel Index)
  calculateCCI(data, period = 20) {
    if (!data || data.length < period) return [];
    
    const cci = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        cci.push(null);
        continue;
      }
      
      const slice = data.slice(i - period + 1, i + 1);
      const typicalPrices = slice.map(d => (d.high + d.low + d.close) / 3);
      const sma = typicalPrices.reduce((a, b) => a + b, 0) / period;
      
      const meanDeviation = typicalPrices.reduce((acc, tp) => acc + Math.abs(tp - sma), 0) / period;
      const currentTP = (data[i].high + data[i].low + data[i].close) / 3;
      
      if (meanDeviation === 0) {
        cci.push(0);
      } else {
        cci.push((currentTP - sma) / (0.015 * meanDeviation));
      }
    }
    
    return cci;
  }

  // MFI (Money Flow Index)
  calculateMFI(data, period = 14) {
    if (!data || data.length < period + 1) return [];
    
    const mfi = [];
    const moneyFlows = [];
    
    for (let i = 1; i < data.length; i++) {
      const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
      const prevTypicalPrice = (data[i - 1].high + data[i - 1].low + data[i - 1].close) / 3;
      
      let moneyFlow = 0;
      if (typicalPrice > prevTypicalPrice) {
        moneyFlow = typicalPrice * data[i].volume;
      } else if (typicalPrice < prevTypicalPrice) {
        moneyFlow = -typicalPrice * data[i].volume;
      }
      
      moneyFlows.push(moneyFlow);
    }
    
    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        mfi.push(null);
        continue;
      }
      
      const slice = moneyFlows.slice(i - period, i);
      const positiveFlow = slice.filter(mf => mf > 0).reduce((a, b) => a + b, 0);
      const negativeFlow = Math.abs(slice.filter(mf => mf < 0).reduce((a, b) => a + b, 0));
      
      if (negativeFlow === 0) {
        mfi.push(100);
      } else {
        const moneyRatio = positiveFlow / negativeFlow;
        mfi.push(100 - (100 / (1 + moneyRatio)));
      }
    }
    
    return mfi;
  }

  // OBV (On Balance Volume)
  calculateOBV(data) {
    if (!data || data.length === 0) return [];
    
    const obv = [0];
    
    for (let i = 1; i < data.length; i++) {
      let currentOBV = obv[i - 1];
      
      if (data[i].close > data[i - 1].close) {
        currentOBV += data[i].volume;
      } else if (data[i].close < data[i - 1].close) {
        currentOBV -= data[i].volume;
      }
      
      obv.push(currentOBV);
    }
    
    return obv;
  }

  // ADX (Average Directional Index)
  calculateADX(data, period = 14) {
    if (!data || data.length < period + 1) return [];
    
    const adx = [];
    const plusDM = [];
    const minusDM = [];
    const trueRanges = [];
    
    for (let i = 1; i < data.length; i++) {
      const highDiff = data[i].high - data[i - 1].high;
      const lowDiff = data[i - 1].low - data[i].low;
      
      let plusDMValue = 0;
      let minusDMValue = 0;
      
      if (highDiff > lowDiff && highDiff > 0) {
        plusDMValue = highDiff;
      }
      if (lowDiff > highDiff && lowDiff > 0) {
        minusDMValue = lowDiff;
      }
      
      plusDM.push(plusDMValue);
      minusDM.push(minusDMValue);
      
      // True Range
      const tr1 = data[i].high - data[i].low;
      const tr2 = Math.abs(data[i].high - data[i - 1].close);
      const tr3 = Math.abs(data[i].low - data[i - 1].close);
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    
    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        adx.push(null);
        continue;
      }
      
      const slicePlusDM = plusDM.slice(i - period, i);
      const sliceMinusDM = minusDM.slice(i - period, i);
      const sliceTR = trueRanges.slice(i - period, i);
      
      const avgPlusDM = slicePlusDM.reduce((a, b) => a + b, 0) / period;
      const avgMinusDM = sliceMinusDM.reduce((a, b) => a + b, 0) / period;
      const avgTR = sliceTR.reduce((a, b) => a + b, 0) / period;
      
      const plusDI = (avgPlusDM / avgTR) * 100;
      const minusDI = (avgMinusDM / avgTR) * 100;
      
      const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
      adx.push(dx);
    }
    
    return adx;
  }

  // VWAP (Volume Weighted Average Price)
  calculateVWAP(data) {
    if (!data || data.length === 0) return [];
    
    const vwap = [];
    let cumulativeTPV = 0; // Cumulative Typical Price * Volume
    let cumulativeVolume = 0;
    
    for (let i = 0; i < data.length; i++) {
      const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
      const volume = data[i].volume;
      
      cumulativeTPV += typicalPrice * volume;
      cumulativeVolume += volume;
      
      if (cumulativeVolume === 0) {
        vwap.push(null);
      } else {
        vwap.push(cumulativeTPV / cumulativeVolume);
      }
    }
    
    return vwap;
  }

  // Parabolic SAR
  calculateParabolicSAR(data, step = 0.02, max = 0.2) {
    if (!data || data.length === 0) {
      return [];
    }
    
    try {
      const highs = data.map(d => d.high);
      const lows = data.map(d => d.low);
      
      // Простая реализация Parabolic SAR
      const sar = [];
      let isLong = true;
      let af = step;
      let ep = lows[0];
      let sarValue = highs[0];
      
      for (let i = 0; i < data.length; i++) {
        if (i === 0) {
          sar.push(sarValue);
          continue;
        }
        
        const high = highs[i];
        const low = lows[i];
        
        if (isLong) {
          if (low < sarValue) {
            isLong = false;
            sarValue = ep;
            af = step;
            ep = high;
          } else {
            if (high > ep) {
              ep = high;
              af = Math.min(af + step, max);
            }
            sarValue = sarValue + af * (ep - sarValue);
          }
        } else {
          if (high > sarValue) {
            isLong = true;
            sarValue = ep;
            af = step;
            ep = low;
          } else {
            if (low < ep) {
              ep = low;
              af = Math.min(af + step, max);
            }
            sarValue = sarValue + af * (ep - sarValue);
          }
        }
        
        sar.push(sarValue);
      }
      
      return sar;
    } catch (error) {
      console.error('Error calculating Parabolic SAR:', error);
      return [];
    }
  }

  // Ichimoku Cloud
  calculateIchimoku(data) {
    try {
      // Since IchimokuCloud is not available in the library, we'll implement a basic version
      if (!data || data.length < 52) {
        return [];
      }
      
      const highs = data.map(d => d.high);
      const lows = data.map(d => d.low);
      const closes = data.map(d => d.close);
      
      const ichimoku = [];
      
      for (let i = 0; i < data.length; i++) {
        if (i < 52) {
          ichimoku.push({
            conversion: null,
            base: null,
            spanA: null,
            spanB: null,
            lagging: null
          });
          continue;
        }
        
        // Tenkan-sen (Conversion Line): (9-period high + 9-period low)/2
        const high9 = Math.max(...highs.slice(i - 9, i + 1));
        const low9 = Math.min(...lows.slice(i - 9, i + 1));
        const conversion = (high9 + low9) / 2;
        
        // Kijun-sen (Base Line): (26-period high + 26-period low)/2
        const high26 = Math.max(...highs.slice(i - 26, i + 1));
        const low26 = Math.min(...lows.slice(i - 26, i + 1));
        const base = (high26 + low26) / 2;
        
        // Senkou Span A (Leading Span A): (Conversion Line + Base Line)/2
        const spanA = (conversion + base) / 2;
        
        // Senkou Span B (Leading Span B): (52-period high + 52-period low)/2
        const high52 = Math.max(...highs.slice(i - 52, i + 1));
        const low52 = Math.min(...lows.slice(i - 52, i + 1));
        const spanB = (high52 + low52) / 2;
        
        // Chikou Span (Lagging Span): Close price plotted 26 periods back
        const lagging = i >= 26 ? closes[i - 26] : null;
        
        ichimoku.push({
          conversion,
          base,
          spanA,
          spanB,
          lagging
        });
      }
      
      return ichimoku;
    } catch (error) {
      console.error('Error calculating Ichimoku Cloud:', error);
      return [];
    }
  }

  // Volume Delta (разность между покупками и продажами)
  calculateVolumeDelta(data) {
    const deltas = [];
    for (let i = 0; i < data.length; i++) {
      const candle = data[i];
      const prevCandle = i > 0 ? data[i - 1] : null;
      
      if (prevCandle) {
        const priceChange = candle.close - prevCandle.close;
        const volumeDelta = priceChange >= 0 ? candle.volume : -candle.volume;
        deltas.push(volumeDelta);
      } else {
        deltas.push(0);
      }
    }
    return deltas;
  }

  // Candlestick Pattern Recognition
  detectCandlestickPatterns(data) {
    try {
      const patterns = [];
      
      for (let i = 2; i < data.length; i++) {
        const current = data[i];
        const prev = data[i - 1];
        const prev2 = data[i - 2];
        
        // Hammer
        if (this.isHammer(current)) {
          patterns.push({
            type: 'Hammer',
            index: i,
            signal: 'BULLISH',
            strength: 'STRONG'
          });
        }
        
        // Shooting Star
        if (this.isShootingStar(current)) {
          patterns.push({
            type: 'Shooting Star',
            index: i,
            signal: 'BEARISH',
            strength: 'STRONG'
          });
        }
        
        // Doji
        if (this.isDoji(current)) {
          patterns.push({
            type: 'Doji',
            index: i,
            signal: 'NEUTRAL',
            strength: 'WEAK'
          });
        }
        
        // Engulfing Patterns
        if (this.isBullishEngulfing(prev, current)) {
          patterns.push({
            type: 'Bullish Engulfing',
            index: i,
            signal: 'BULLISH',
            strength: 'STRONG'
          });
        }
        
        if (this.isBearishEngulfing(prev, current)) {
          patterns.push({
            type: 'Bearish Engulfing',
            index: i,
            signal: 'BEARISH',
            strength: 'STRONG'
          });
        }
        
        // Morning Star
        if (this.isMorningStar(prev2, prev, current)) {
          patterns.push({
            type: 'Morning Star',
            index: i,
            signal: 'BULLISH',
            strength: 'VERY_STRONG'
          });
        }
        
        // Evening Star
        if (this.isEveningStar(prev2, prev, current)) {
          patterns.push({
            type: 'Evening Star',
            index: i,
            signal: 'BEARISH',
            strength: 'VERY_STRONG'
          });
        }
        
        // Three White Soldiers
        if (this.isThreeWhiteSoldiers(data.slice(i - 2, i + 1))) {
          patterns.push({
            type: 'Three White Soldiers',
            index: i,
            signal: 'BULLISH',
            strength: 'VERY_STRONG'
          });
        }
        
        // Three Black Crows
        if (this.isThreeBlackCrows(data.slice(i - 2, i + 1))) {
          patterns.push({
            type: 'Three Black Crows',
            index: i,
            signal: 'BEARISH',
            strength: 'VERY_STRONG'
          });
        }
      }
      
      return patterns;
    } catch (error) {
      console.error('Error detecting candlestick patterns:', error);
      return [];
    }
  }

  isHammer(candle) {
    const body = Math.abs(candle.close - candle.open);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    
    return lowerShadow > 2 * body && upperShadow < body;
  }

  isShootingStar(candle) {
    const body = Math.abs(candle.close - candle.open);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    
    return upperShadow > 2 * body && lowerShadow < body;
  }

  isDoji(candle) {
    const body = Math.abs(candle.close - candle.open);
    const totalRange = candle.high - candle.low;
    
    return body <= totalRange * 0.1;
  }

  isBullishEngulfing(prev, current) {
    return prev.close < prev.open && // Previous candle is bearish
           current.close > current.open && // Current candle is bullish
           current.open < prev.close && // Current opens below previous close
           current.close > prev.open; // Current closes above previous open
  }

  isBearishEngulfing(prev, current) {
    return prev.close > prev.open && // Previous candle is bullish
           current.close < current.open && // Current candle is bearish
           current.open > prev.close && // Current opens above previous close
           current.close < prev.open; // Current closes below previous open
  }

  isMorningStar(prev2, prev, current) {
    return prev2.close < prev2.open && // First candle is bearish
           Math.abs(prev.close - prev.open) < Math.abs(prev2.close - prev2.open) * 0.3 && // Middle candle is small
           current.close > current.open && // Third candle is bullish
           current.open > (prev2.close + prev2.open) / 2; // Third opens above first's midpoint
  }

  isEveningStar(prev2, prev, current) {
    return prev2.close > prev2.open && // First candle is bullish
           Math.abs(prev.close - prev.open) < Math.abs(prev2.close - prev2.open) * 0.3 && // Middle candle is small
           current.close < current.open && // Third candle is bearish
           current.open < (prev2.close + prev2.open) / 2; // Third opens below first's midpoint
  }

  isThreeWhiteSoldiers(candles) {
    if (candles.length !== 3) return false;
    
    return candles.every(candle => 
      candle.close > candle.open && // All candles are bullish
      candle.close > candle.high * 0.6 // Each closes in upper 40% of range
    ) && candles[1].open > candles[0].open && // Each opens higher than previous
       candles[2].open > candles[1].open;
  }

  isThreeBlackCrows(candles) {
    if (candles.length !== 3) return false;
    
    return candles.every(candle => 
      candle.close < candle.open && // All candles are bearish
      candle.close < candle.low * 1.4 // Each closes in lower 40% of range
    ) && candles[1].open < candles[0].open && // Each opens lower than previous
       candles[2].open < candles[1].open;
  }

  // Стратегия "Вход под фандинг"
  analyzeFundingStrategy(fundingRate, fundingTime, currentPrice, orderBook, openInterest) {
    try {
      const analysis = {
        signal: 'NEUTRAL',
        strength: 'WEAK',
        confidence: 0,
        details: [],
        entryPrice: currentPrice,
        stopLoss: null,
        takeProfit: null,
        leverage: 1,
        positionSize: 0
      };

      // Анализ фандинга
      const fundingRatePercent = fundingRate * 100;
      const timeToFunding = this.calculateTimeToFunding(fundingTime);
      
      analysis.details.push(`💰 Фандинг: ${fundingRatePercent.toFixed(4)}%`);
      analysis.details.push(`⏰ До фандинга: ${timeToFunding}`);

      // Определение направления сигнала на основе фандинга
      if (fundingRate > 0.01) { // Положительный фандинг > 0.01%
        analysis.signal = 'LONG';
        analysis.strength = fundingRate > 0.05 ? 'STRONG' : 'MEDIUM';
        analysis.confidence = Math.min(fundingRate * 1000, 90);
        analysis.details.push('🟢 Положительный фандинг - сигнал на LONG');
      } else if (fundingRate < -0.01) { // Отрицательный фандинг < -0.01%
        analysis.signal = 'SHORT';
        analysis.strength = fundingRate < -0.05 ? 'STRONG' : 'MEDIUM';
        analysis.confidence = Math.min(Math.abs(fundingRate) * 1000, 90);
        analysis.details.push('🔴 Отрицательный фандинг - сигнал на SHORT');
      } else {
        analysis.details.push('🟡 Нейтральный фандинг - нет четкого сигнала');
      }

      // Анализ времени до фандинга
      if (timeToFunding.includes('менее 1 часа')) {
        analysis.confidence += 10;
        analysis.details.push('⚡ Близкий фандинг - повышенная уверенность');
      }

      // Анализ стакана заявок
      if (orderBook && orderBook.bids && orderBook.asks) {
        const bidVolume = orderBook.bids.reduce((sum, bid) => sum + bid.size, 0);
        const askVolume = orderBook.asks.reduce((sum, ask) => sum + ask.size, 0);
        
        if (analysis.signal === 'LONG' && bidVolume > askVolume * 1.2) {
          analysis.confidence += 15;
          analysis.details.push('📈 Преобладают покупки в стакане');
        } else if (analysis.signal === 'SHORT' && askVolume > bidVolume * 1.2) {
          analysis.confidence += 15;
          analysis.details.push('📉 Преобладают продажи в стакане');
        }
      }

      // Анализ открытого интереса
      if (openInterest) {
        analysis.details.push(`📊 Открытый интерес: ${this.formatNumber(openInterest)}`);
      }

      // Расчет уровней входа, стоп-лосса и тейк-профита
      if (analysis.signal !== 'NEUTRAL') {
        const atr = this.calculateATR([{ high: currentPrice * 1.02, low: currentPrice * 0.98, close: currentPrice }], 1)[0] || currentPrice * 0.01;
        
        if (analysis.signal === 'LONG') {
          analysis.entryPrice = currentPrice * 1.001; // Вход чуть выше текущей цены
          analysis.stopLoss = currentPrice * 0.995; // Стоп-лосс 0.5% ниже
          analysis.takeProfit = currentPrice * (1 + Math.abs(fundingRate) * 10); // Тейк-профит на основе фандинга
        } else {
          analysis.entryPrice = currentPrice * 0.999; // Вход чуть ниже текущей цены
          analysis.stopLoss = currentPrice * 1.005; // Стоп-лосс 0.5% выше
          analysis.takeProfit = currentPrice * (1 - Math.abs(fundingRate) * 10); // Тейк-профит на основе фандинга
        }
        
        analysis.leverage = Math.min(Math.abs(fundingRate) * 50, 20); // Плечо на основе фандинга
        analysis.positionSize = Math.min(analysis.confidence / 10, 10); // Размер позиции на основе уверенности
      }

      return analysis;
    } catch (error) {
      console.error('Error analyzing funding strategy:', error);
      return {
        signal: 'NEUTRAL',
        strength: 'WEAK',
        confidence: 0,
        details: ['❌ Ошибка анализа стратегии фандинга'],
        entryPrice: currentPrice,
        stopLoss: null,
        takeProfit: null,
        leverage: 1,
        positionSize: 0
      };
    }
  }

  calculateTimeToFunding(fundingTime) {
    try {
      const now = new Date();
      const funding = new Date(fundingTime);
      const diffMs = funding - now;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours < 0) {
        return 'фандинг уже прошел';
      } else if (diffHours === 0) {
        return `менее 1 часа (${diffMinutes} мин)`;
      } else if (diffHours < 24) {
        return `${diffHours}ч ${diffMinutes}м`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}д ${diffHours % 24}ч`;
      }
    } catch (error) {
      return 'неизвестно';
    }
  }

  formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  }

  // Полный анализ всех индикаторов
  async analyzeAll(data) {
    try {
      if (!data || data.length === 0) {
        console.warn('No data provided for indicator analysis');
        return {
          sma: [],
          ema: [],
          rsi: [],
          macd: [],
          bollinger: [],
          stochastic: [],
          atr: [],
          williamsR: [],
          cci: [],
          mfi: [],
          obv: [],
          adx: [],
          parabolicSAR: [],
          ichimoku: [],
          volumeDelta: [],
          vwap: []
        };
      }

      const analysis = {
        sma: this.calculateSMA(data) || [],
        ema: this.calculateEMA(data) || [],
        rsi: this.calculateRSI(data) || [],
        macd: this.calculateMACD(data) || [],
        bollinger: this.calculateBollingerBands(data) || [],
        stochastic: this.calculateStochastic(data) || [],
        atr: this.calculateATR(data) || [],
        williamsR: this.calculateWilliamsR(data) || [],
        cci: this.calculateCCI(data) || [],
        mfi: this.calculateMFI(data) || [],
        obv: this.calculateOBV(data) || [],
        adx: this.calculateADX(data) || [],
        parabolicSAR: this.calculateParabolicSAR(data) || [],
        ichimoku: this.calculateIchimoku(data) || [],
        volumeDelta: this.calculateVolumeDelta(data) || [],
        vwap: this.calculateVWAP(data) || []
      };

      return analysis;
    } catch (error) {
      console.error('Error calculating indicators:', error);
      return {
        sma: [],
        ema: [],
        rsi: [],
        macd: [],
        bollinger: [],
        stochastic: [],
        atr: [],
        williamsR: [],
        cci: [],
        mfi: [],
        obv: [],
        adx: [],
        parabolicSAR: [],
        ichimoku: [],
        volumeDelta: [],
        vwap: []
      };
    }
  }

  // Генерация торговых сигналов
  generateSignals(analysis, currentPrice) {
    const signals = {
      buy: 0,
      sell: 0,
      neutral: 0,
      details: []
    };

    // RSI сигналы
    if (analysis.rsi && analysis.rsi.length > 0) {
      const currentRSI = analysis.rsi[analysis.rsi.length - 1];
      if (currentRSI < 30) {
        signals.buy++;
        signals.details.push('RSI: Oversold (Buy signal)');
      } else if (currentRSI > 70) {
        signals.sell++;
        signals.details.push('RSI: Overbought (Sell signal)');
      } else {
        signals.neutral++;
      }
    }

    // MACD сигналы
    if (analysis.macd && analysis.macd.length > 0) {
      const currentMACD = analysis.macd[analysis.macd.length - 1];
      if (currentMACD.MACD > currentMACD.signal) {
        signals.buy++;
        signals.details.push('MACD: Bullish crossover');
      } else {
        signals.sell++;
        signals.details.push('MACD: Bearish crossover');
      }
    }

    // Bollinger Bands сигналы
    if (analysis.bollinger && analysis.bollinger.length > 0) {
      const currentBB = analysis.bollinger[analysis.bollinger.length - 1];
      if (currentPrice < currentBB.lower) {
        signals.buy++;
        signals.details.push('BB: Price below lower band (Buy)');
      } else if (currentPrice > currentBB.upper) {
        signals.sell++;
        signals.details.push('BB: Price above upper band (Sell)');
      } else {
        signals.neutral++;
      }
    }

    // Stochastic сигналы
    if (analysis.stochastic && analysis.stochastic.length > 0) {
      const currentStoch = analysis.stochastic[analysis.stochastic.length - 1];
      if (currentStoch.k < 20 && currentStoch.d < 20) {
        signals.buy++;
        signals.details.push('Stochastic: Oversold');
      } else if (currentStoch.k > 80 && currentStoch.d > 80) {
        signals.sell++;
        signals.details.push('Stochastic: Overbought');
      } else {
        signals.neutral++;
      }
    }

    return signals;
  }
}

module.exports = TechnicalIndicators;

