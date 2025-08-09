const moment = require('moment');

class ChartGenerator {
  constructor() {
    this.width = 1200;
    this.height = 800;
  }

  // Упрощенная версия без графиков
  async generateMainChart(data, analysis, symbol) {
    try {
      // Возвращаем текстовый отчет вместо графика
      const report = this.generateTextReport(data, analysis, symbol);
      return Buffer.from(report, 'utf8');
    } catch (error) {
      console.error('Error generating main chart:', error);
      return Buffer.from('Error generating chart', 'utf8');
    }
  }

  async generateRSIChart(data, analysis, symbol) {
    try {
      const report = this.generateRSITextReport(data, analysis, symbol);
      return Buffer.from(report, 'utf8');
    } catch (error) {
      console.error('Error generating RSI chart:', error);
      return Buffer.from('Error generating RSI chart', 'utf8');
    }
  }

  async generateMACDChart(data, analysis, symbol) {
    try {
      const report = this.generateMACDTextReport(data, analysis, symbol);
      return Buffer.from(report, 'utf8');
    } catch (error) {
      console.error('Error generating MACD chart:', error);
      return Buffer.from('Error generating MACD chart', 'utf8');
    }
  }

  async generateVolumeChart(data, analysis, symbol) {
    try {
      const report = this.generateVolumeTextReport(data, analysis, symbol);
      return Buffer.from(report, 'utf8');
    } catch (error) {
      console.error('Error generating volume chart:', error);
      return Buffer.from('Error generating volume chart', 'utf8');
    }
  }

  async generateStochasticChart(data, analysis, symbol) {
    try {
      const report = this.generateStochasticTextReport(data, analysis, symbol);
      return Buffer.from(report, 'utf8');
    } catch (error) {
      console.error('Error generating stochastic chart:', error);
      return Buffer.from('Error generating stochastic chart', 'utf8');
    }
  }

  async generatePredictionChart(data, predictions, symbol) {
    try {
      const report = this.generatePredictionTextReport(data, predictions, symbol);
      return Buffer.from(report, 'utf8');
    } catch (error) {
      console.error('Error generating prediction chart:', error);
      return Buffer.from('Error generating prediction chart', 'utf8');
    }
  }

  generateTextReport(data, analysis, symbol) {
    const lastCandle = data[data.length - 1];
    const report = `
📊 Анализ ${symbol}
═══════════════════════════════════════════════════════════════

💰 Цена: $${lastCandle.close.toFixed(2)}
📈 Изменение: ${((lastCandle.close - lastCandle.open) / lastCandle.open * 100).toFixed(2)}%
📊 Объем: ${this.formatNumber(lastCandle.volume)}

📈 Технические индикаторы:
${this.formatIndicators(analysis)}

🎯 Рекомендации:
${this.generateRecommendations(analysis)}

═══════════════════════════════════════════════════════════════
    `;
    return report;
  }

  generateRSITextReport(data, analysis, symbol) {
    const rsi = analysis.rsi ? analysis.rsi[analysis.rsi.length - 1] : null;
    const report = `
📊 RSI Анализ ${symbol}
═══════════════════════════════════════════════════════════════

📈 Текущий RSI: ${rsi ? rsi.toFixed(2) : 'N/A'}

💡 Интерпретация:
${rsi < 30 ? '🟢 Перепроданность - возможен отскок' : 
  rsi > 70 ? '🔴 Перекупленность - возможна коррекция' : 
  '🟡 Нейтральная зона'}

📊 Уровни:
• Перепроданность: < 30
• Перекупленность: > 70
• Нейтральная зона: 30-70

═══════════════════════════════════════════════════════════════
    `;
    return report;
  }

  generateMACDTextReport(data, analysis, symbol) {
    const macd = analysis.macd ? analysis.macd[analysis.macd.length - 1] : null;
    const report = `
📊 MACD Анализ ${symbol}
═══════════════════════════════════════════════════════════════

📈 MACD: ${macd ? macd.MACD.toFixed(4) : 'N/A'}
📊 Signal: ${macd ? macd.signal.toFixed(4) : 'N/A'}
📉 Histogram: ${macd ? macd.histogram.toFixed(4) : 'N/A'}

💡 Сигнал:
${macd && macd.MACD > macd.signal ? '🟢 Бычий - MACD выше сигнальной линии' : 
  macd && macd.MACD < macd.signal ? '🔴 Медвежий - MACD ниже сигнальной линии' : 
  '🟡 Нейтральный'}

═══════════════════════════════════════════════════════════════
    `;
    return report;
  }

  generateVolumeTextReport(data, analysis, symbol) {
    const volumes = data.map(d => d.volume);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const currentVolume = volumes[volumes.length - 1];
    const volumeRatio = currentVolume / avgVolume;
    
    const report = `
📊 Анализ Объема ${symbol}
═══════════════════════════════════════════════════════════════

📈 Текущий объем: ${this.formatNumber(currentVolume)}
📊 Средний объем: ${this.formatNumber(avgVolume)}
📉 Соотношение: ${volumeRatio.toFixed(2)}x

💡 Интерпретация:
${volumeRatio > 1.5 ? '🔥 Высокий объем - сильное движение' :
  volumeRatio < 0.5 ? '💤 Низкий объем - слабое движение' :
  '📊 Нормальный объем'}

═══════════════════════════════════════════════════════════════
    `;
    return report;
  }

  generateStochasticTextReport(data, analysis, symbol) {
    const stoch = analysis.stochastic ? analysis.stochastic[analysis.stochastic.length - 1] : null;
    const report = `
📊 Stochastic Анализ ${symbol}
═══════════════════════════════════════════════════════════════

📈 %K: ${stoch ? stoch.k.toFixed(2) : 'N/A'}
📊 %D: ${stoch ? stoch.d.toFixed(2) : 'N/A'}

💡 Сигналы:
${stoch && stoch.k < 20 && stoch.d < 20 ? '🟢 Перепроданность - сигнал на покупку' :
  stoch && stoch.k > 80 && stoch.d > 80 ? '🔴 Перекупленность - сигнал на продажу' :
  '🟡 Нейтральная зона'}

═══════════════════════════════════════════════════════════════
    `;
    return report;
  }

  generatePredictionTextReport(data, predictions, symbol) {
    const currentPrice = data[data.length - 1].close;
    const predictedPrice = predictions[0];
    const change = ((predictedPrice - currentPrice) / currentPrice * 100);
    
    const report = `
🤖 LSTM Предсказание ${symbol}
═══════════════════════════════════════════════════════════════

💰 Текущая цена: $${currentPrice.toFixed(2)}
🎯 Предсказание: $${predictedPrice.toFixed(2)}
📈 Изменение: ${change.toFixed(2)}%

💡 Тренд:
${change > 2 ? '🟢 Бычий тренд' :
  change < -2 ? '🔴 Медвежий тренд' :
  '🟡 Боковое движение'}

⚠️ Внимание: Это предсказание основано на исторических данных
и не является гарантией будущих результатов.

═══════════════════════════════════════════════════════════════
    `;
    return report;
  }

  formatIndicators(analysis) {
    let report = '';
    
    if (analysis.rsi && analysis.rsi.length > 0) {
      const rsi = analysis.rsi[analysis.rsi.length - 1];
      report += `• RSI: ${rsi.toFixed(2)}\n`;
    }
    
    if (analysis.macd && analysis.macd.length > 0) {
      const macd = analysis.macd[analysis.macd.length - 1];
      report += `• MACD: ${macd.MACD.toFixed(4)}\n`;
    }
    
    if (analysis.stochastic && analysis.stochastic.length > 0) {
      const stoch = analysis.stochastic[analysis.stochastic.length - 1];
      report += `• Stochastic K: ${stoch.k.toFixed(2)}\n`;
    }
    
    return report;
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.rsi && analysis.rsi.length > 0) {
      const rsi = analysis.rsi[analysis.rsi.length - 1];
      if (rsi < 30) recommendations.push('🟢 RSI показывает перепроданность');
      else if (rsi > 70) recommendations.push('🔴 RSI показывает перекупленность');
    }
    
    if (analysis.macd && analysis.macd.length > 0) {
      const macd = analysis.macd[analysis.macd.length - 1];
      if (macd.MACD > macd.signal) recommendations.push('🟢 MACD бычий сигнал');
      else recommendations.push('🔴 MACD медвежий сигнал');
    }
    
    return recommendations.length > 0 ? recommendations.join('\n') : '🟡 Нет четких сигналов';
  }

  formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  }
}

module.exports = ChartGenerator;
