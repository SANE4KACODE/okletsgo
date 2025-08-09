const fs = require('fs');
const path = require('path');

class HTMLReportGenerator {
  constructor() {
    this.reportsDir = 'reports';
    this.ensureReportsDirectory();
  }

  ensureReportsDirectory() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  generateHTMLReport(analysisData, symbol) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${symbol}_analysis_${timestamp}.html`;
      const filepath = path.join(this.reportsDir, filename);

      const html = this.generateHTML(analysisData, symbol);
      
      fs.writeFileSync(filepath, html, 'utf8');
      console.log(`📊 HTML отчет сохранен: ${filepath}`);
      
      return filepath;
    } catch (error) {
      console.error('Ошибка при генерации HTML отчета:', error);
      return null;
    }
  }

  generateHTML(analysisData, symbol) {
    const {
      ticker,
      technicalAnalysis,
      candlestickPatterns,
      fundingStrategy,
      liquidations,
      recentTrades,
      accountBalance,
      openPositions,
      longShortRatio,
      volumeDelta,
      newsAnalysis,
      predictions
    } = analysisData;

    const currentTime = new Date().toLocaleString('ru-RU');
    
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Анализ ${symbol} - ${currentTime}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            color: #2c3e50;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .header .subtitle {
            font-size: 1.2em;
            color: #7f8c8d;
            font-weight: 300;
        }
        
        .card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
        }
        
        .card h2 {
            color: #2c3e50;
            font-size: 1.8em;
            margin-bottom: 20px;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 25px;
            margin-bottom: 25px;
        }
        
        .metric {
            background: linear-gradient(135deg, #74b9ff, #0984e3);
            color: white;
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 10px 25px rgba(116, 185, 255, 0.3);
        }
        
        .metric h3 {
            font-size: 1.2em;
            margin-bottom: 10px;
            opacity: 0.9;
        }
        
        .metric .value {
            font-size: 2em;
            font-weight: 700;
        }
        
        .signal-bullish {
            background: linear-gradient(135deg, #00b894, #00a085);
        }
        
        .signal-bearish {
            background: linear-gradient(135deg, #e17055, #d63031);
        }
        
        .signal-neutral {
            background: linear-gradient(135deg, #fdcb6e, #e17055);
        }
        
        .chart-container {
            background: white;
            border-radius: 15px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        .pattern-item {
            background: linear-gradient(135deg, #a29bfe, #6c5ce7);
            color: white;
            padding: 15px;
            border-radius: 10px;
            margin: 10px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .pattern-signal {
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 600;
        }
        
        .signal-bullish .pattern-signal {
            background: rgba(0, 184, 148, 0.3);
        }
        
        .signal-bearish .pattern-signal {
            background: rgba(225, 112, 85, 0.3);
        }
        
        .signal-neutral .pattern-signal {
            background: rgba(253, 203, 110, 0.3);
        }
        
        .news-item {
            background: linear-gradient(135deg, #fd79a8, #e84393);
            color: white;
            padding: 20px;
            border-radius: 15px;
            margin: 15px 0;
        }
        
        .prediction-item {
            background: linear-gradient(135deg, #00cec9, #00b894);
            color: white;
            padding: 20px;
            border-radius: 15px;
            margin: 15px 0;
        }
        
        .timeframe-tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .timeframe-tab {
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            border-radius: 25px;
            color: white;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .timeframe-tab.active {
            background: rgba(255, 255, 255, 0.9);
            color: #2c3e50;
        }
        
        .timeframe-tab:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        
        .footer {
            text-align: center;
            padding: 30px;
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.9em;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .grid {
                grid-template-columns: 1fr;
            }
            
            .header h1 {
                font-size: 2em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Анализ ${symbol}</h1>
            <div class="subtitle">Глубокий технический анализ с прогнозами</div>
            <div class="subtitle">${currentTime}</div>
        </div>

        <!-- Основная информация -->
        <div class="card">
            <h2>💰 Основная информация</h2>
            <div class="grid">
                ${this.generatePriceMetrics(ticker)}
            </div>
        </div>

        <!-- Технический анализ -->
        <div class="card">
            <h2>📈 Технический анализ</h2>
            <div class="grid">
                ${this.generateTechnicalMetrics(technicalAnalysis)}
            </div>
            ${this.generateTechnicalCharts(technicalAnalysis)}
        </div>

        <!-- Паттерны свечей -->
        ${candlestickPatterns && candlestickPatterns.length > 0 ? `
        <div class="card">
            <h2>🕯️ Паттерны свечей</h2>
            ${this.generateCandlestickPatterns(candlestickPatterns)}
        </div>
        ` : ''}

        <!-- Стратегия фандинга -->
        ${fundingStrategy ? `
        <div class="card">
            <h2>🎯 Стратегия фандинга</h2>
            ${this.generateFundingStrategy(fundingStrategy)}
        </div>
        ` : ''}

        <!-- Мониторинг ликвидаций -->
        ${liquidations && liquidations.length > 0 ? `
        <div class="card">
            <h2>💥 Мониторинг ликвидаций</h2>
            ${this.generateLiquidations(liquidations)}
        </div>
        ` : ''}

        <!-- Последние сделки -->
        ${recentTrades && recentTrades.length > 0 ? `
        <div class="card">
            <h2>🔄 Последние сделки</h2>
            ${this.generateRecentTrades(recentTrades)}
        </div>
        ` : ''}

        <!-- Анализ новостей -->
        <div class="card">
            <h2>📰 Анализ новостей</h2>
            ${this.generateNewsAnalysis(newsAnalysis)}
        </div>

        <!-- Прогнозы на разных таймфреймах -->
        <div class="card">
            <h2>🔮 Прогнозы на разных таймфреймах</h2>
            ${this.generateMultiTimeframePredictions(predictions)}
        </div>

        <!-- Анализ объема -->
        ${volumeDelta ? `
        <div class="card">
            <h2>📊 Анализ объема</h2>
            ${this.generateVolumeAnalysis(volumeDelta)}
        </div>
        ` : ''}

        <!-- Соотношение длинных/коротких позиций -->
        ${longShortRatio ? `
        <div class="card">
            <h2>⚖️ Соотношение позиций</h2>
            ${this.generateLongShortRatio(longShortRatio)}
        </div>
        ` : ''}

        <div class="footer">
            <p>Отчет сгенерирован автоматически | Bybit Analyzer Bot v2.0</p>
        </div>
    </div>

    <script>
        // Интерактивность для таймфреймов
        document.querySelectorAll('.timeframe-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.timeframe-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                const timeframe = this.dataset.timeframe;
                document.querySelectorAll('.timeframe-content').forEach(content => {
                    content.style.display = content.dataset.timeframe === timeframe ? 'block' : 'none';
                });
            });
        });
        
        // Анимация появления карточек
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);
        
        document.querySelectorAll('.card').forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(card);
        });
    </script>
</body>
</html>`;
  }

  generatePriceMetrics(ticker) {
    if (!ticker) return '<div class="metric"><h3>Нет данных</h3></div>';
    
    const priceChange = ticker.priceChange || 0;
    const priceChangePercent = ticker.priceChangePercent || 0;
    const volume = ticker.volume || 0;
    
    return `
        <div class="metric ${priceChange >= 0 ? 'signal-bullish' : 'signal-bearish'}">
            <h3>Текущая цена</h3>
            <div class="value">$${this.formatNumber(ticker.lastPrice || 0)}</div>
        </div>
        <div class="metric ${priceChange >= 0 ? 'signal-bullish' : 'signal-bearish'}">
            <h3>Изменение</h3>
            <div class="value">${priceChange >= 0 ? '+' : ''}$${this.formatNumber(priceChange)}</div>
        </div>
        <div class="metric ${priceChangePercent >= 0 ? 'signal-bullish' : 'signal-bearish'}">
            <h3>Изменение %</h3>
            <div class="value">${priceChangePercent >= 0 ? '+' : ''}${this.formatNumber(priceChangePercent)}%</div>
        </div>
        <div class="metric">
            <h3>Объем 24ч</h3>
            <div class="value">$${this.formatNumber(volume)}</div>
        </div>
    `;
  }

  generateTechnicalMetrics(analysis) {
    if (!analysis) return '<div class="metric"><h3>Нет данных</h3></div>';
    
    return `
        <div class="metric ${this.getSignalClass(analysis.rsi)}">
            <h3>RSI</h3>
            <div class="value">${this.formatNumber(analysis.rsi)}</div>
        </div>
        <div class="metric ${this.getSignalClass(analysis.macd)}">
            <h3>MACD</h3>
            <div class="value">${this.formatNumber(analysis.macd?.histogram || 0)}</div>
        </div>
        <div class="metric ${this.getSignalClass(analysis.bollingerBands)}">
            <h3>Bollinger Bands</h3>
            <div class="value">${this.getBollingerSignal(analysis.bollingerBands)}</div>
        </div>
        <div class="metric ${this.getSignalClass(analysis.stochastic)}">
            <h3>Stochastic</h3>
            <div class="value">${this.formatNumber(analysis.stochastic?.k || 0)}</div>
        </div>
    `;
  }

  generateTechnicalCharts(analysis) {
    if (!analysis) return '';
    
    return `
        <div class="chart-container">
            <h3>📊 Графики индикаторов</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                ${this.generateRSIChart(analysis.rsi)}
                ${this.generateMACDChart(analysis.macd)}
                ${this.generateBollingerChart(analysis.bollingerBands)}
                ${this.generateVolumeChart(analysis.volume)}
            </div>
        </div>
    `;
  }

  generateRSIChart(rsi) {
    if (!rsi) return '';
    
    const rsiValue = parseFloat(rsi);
    let color = '#3498db';
    if (rsiValue > 70) color = '#e74c3c';
    if (rsiValue < 30) color = '#27ae60';
    
    return `
        <div style="text-align: center;">
            <h4>RSI (14)</h4>
            <svg width="200" height="100" viewBox="0 0 200 100">
                <rect x="0" y="0" width="200" height="100" fill="#f8f9fa" rx="10"/>
                <line x1="0" y1="50" x2="200" y2="50" stroke="#ddd" stroke-width="1"/>
                <line x1="0" y1="20" x2="200" y2="20" stroke="#e74c3c" stroke-width="1" stroke-dasharray="5,5"/>
                <line x1="0" y1="80" x2="200" y2="80" stroke="#e74c3c" stroke-width="1" stroke-dasharray="5,5"/>
                <circle cx="${(rsiValue / 100) * 200}" cy="50" r="8" fill="${color}" stroke="#fff" stroke-width="2"/>
                <text x="100" y="95" text-anchor="middle" fill="#666" font-size="12">${this.formatNumber(rsiValue)}</text>
            </svg>
        </div>
    `;
  }

  generateMACDChart(macd) {
    if (!macd) return '';
    
    const histogram = parseFloat(macd.histogram || 0);
    const color = histogram >= 0 ? '#27ae60' : '#e74c3c';
    
    return `
        <div style="text-align: center;">
            <h4>MACD</h4>
            <svg width="200" height="100" viewBox="0 0 200 100">
                <rect x="0" y="0" width="200" height="100" fill="#f8f9fa" rx="10"/>
                <line x1="0" y1="50" x2="200" y2="50" stroke="#ddd" stroke-width="1"/>
                <rect x="90" y="${50 - Math.min(Math.abs(histogram) * 20, 40)}" width="20" height="${Math.min(Math.abs(histogram) * 20, 40)}" fill="${color}"/>
                <text x="100" y="95" text-anchor="middle" fill="#666" font-size="12">${this.formatNumber(histogram)}</text>
            </svg>
        </div>
    `;
  }

  generateBollingerChart(bollinger) {
    if (!bollinger) return '';
    
    const { upper, middle, lower } = bollinger;
    const currentPrice = parseFloat(middle || 0);
    
    return `
        <div style="text-align: center;">
            <h4>Bollinger Bands</h4>
            <svg width="200" height="100" viewBox="0 0 200 100">
                <rect x="0" y="0" width="200" height="100" fill="#f8f9fa" rx="10"/>
                <line x1="0" y1="20" x2="200" y2="20" stroke="#e74c3c" stroke-width="2"/>
                <line x1="0" y1="50" x2="200" y2="50" stroke="#3498db" stroke-width="2"/>
                <line x1="0" y1="80" x2="200" y2="80" stroke="#e74c3c" stroke-width="2"/>
                <text x="100" y="95" text-anchor="middle" fill="#666" font-size="12">$${this.formatNumber(currentPrice)}</text>
            </svg>
        </div>
    `;
  }

  generateVolumeChart(volume) {
    if (!volume) return '';
    
    const volumeValue = parseFloat(volume || 0);
    const maxVolume = volumeValue * 1.2;
    
    return `
        <div style="text-align: center;">
            <h4>Объем</h4>
            <svg width="200" height="100" viewBox="0 0 200 100">
                <rect x="0" y="0" width="200" height="100" fill="#f8f9fa" rx="10"/>
                <rect x="80" y="${100 - (volumeValue / maxVolume) * 80}" width="40" height="${(volumeValue / maxVolume) * 80}" fill="#9b59b6"/>
                <text x="100" y="95" text-anchor="middle" fill="#666" font-size="12">$${this.formatNumber(volumeValue)}</text>
            </svg>
        </div>
    `;
  }

  generateCandlestickPatterns(patterns) {
    if (!patterns || patterns.length === 0) {
      return '<p>Паттерны не обнаружены</p>';
    }
    
    return patterns.map(pattern => `
        <div class="pattern-item ${this.getPatternSignalClass(pattern.signal)}">
            <div>
                <strong>${pattern.type}</strong>
                <br>
                <small>Индекс: ${pattern.index}</small>
            </div>
            <div class="pattern-signal">
                ${this.getSignalEmoji(pattern.signal)} ${pattern.signal}
                <br>
                <small>${pattern.strength}</small>
            </div>
        </div>
    `).join('');
  }

  generateFundingStrategy(strategy) {
    if (!strategy) return '<p>Нет данных о стратегии фандинга</p>';
    
    return `
        <div class="grid">
            <div class="metric ${this.getSignalClass(strategy.signal)}">
                <h3>Сигнал</h3>
                <div class="value">${strategy.signal}</div>
            </div>
            <div class="metric">
                <h3>Сила сигнала</h3>
                <div class="value">${strategy.strength}</div>
            </div>
            <div class="metric">
                <h3>Уверенность</h3>
                <div class="value">${strategy.confidence}%</div>
            </div>
            <div class="metric">
                <h3>Рекомендуемый кредит</h3>
                <div class="value">${strategy.leverage}x</div>
            </div>
        </div>
        ${strategy.details && strategy.details.length > 0 ? `
            <div style="margin-top: 20px;">
                <h4>Детали анализа:</h4>
                <ul style="margin-left: 20px;">
                    ${strategy.details.map(detail => `<li>${detail}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    `;
  }

  generateLiquidations(liquidations) {
    if (!liquidations || liquidations.length === 0) {
      return '<p>Ликвидации не обнаружены</p>';
    }
    
    return `
        <div style="max-height: 300px; overflow-y: auto;">
            ${liquidations.map(liq => `
                <div style="background: #e74c3c; color: white; padding: 15px; border-radius: 10px; margin: 10px 0;">
                    <strong>Символ:</strong> ${liq.symbol || 'N/A'}<br>
                    <strong>Цена:</strong> $${this.formatNumber(liq.price || 0)}<br>
                    <strong>Количество:</strong> ${this.formatNumber(liq.quantity || 0)}<br>
                    <strong>Время:</strong> ${liq.time || 'N/A'}
                </div>
            `).join('')}
        </div>
    `;
  }

  generateRecentTrades(trades) {
    if (!trades || trades.length === 0) {
      return '<p>Сделки не найдены</p>';
    }
    
    return `
        <div style="max-height: 300px; overflow-y: auto;">
            ${trades.map(trade => `
                <div style="background: ${trade.side === 'Buy' ? '#27ae60' : '#e74c3c'}; color: white; padding: 15px; border-radius: 10px; margin: 10px 0;">
                    <strong>Сторона:</strong> ${trade.side}<br>
                    <strong>Цена:</strong> $${this.formatNumber(trade.price || 0)}<br>
                    <strong>Количество:</strong> ${this.formatNumber(trade.quantity || 0)}<br>
                    <strong>Время:</strong> ${trade.time || 'N/A'}
                </div>
            `).join('')}
        </div>
    `;
  }

  generateNewsAnalysis(news) {
    if (!news || news.length === 0) {
      return `
        <div class="news-item">
            <h4>📰 Новости не найдены</h4>
            <p>В данный момент нет доступных новостей для анализа. Рекомендуется следить за официальными источниками и социальными сетями.</p>
        </div>
      `;
    }
    
    return news.map(item => `
        <div class="news-item">
            <h4>${item.title || 'Заголовок не указан'}</h4>
            <p>${item.summary || 'Описание не доступно'}</p>
            <div style="margin-top: 10px; font-size: 0.9em; opacity: 0.8;">
                <strong>Источник:</strong> ${item.source || 'Неизвестно'} | 
                <strong>Время:</strong> ${item.time || 'Не указано'} |
                <strong>Влияние:</strong> ${item.impact || 'Неизвестно'}
            </div>
        </div>
    `).join('');
  }

  generateMultiTimeframePredictions(predictions) {
    if (!predictions || predictions.length === 0) {
      return `
        <div class="prediction-item">
            <h4>🔮 Прогнозы не доступны</h4>
            <p>В данный момент прогнозы на разных таймфреймах не могут быть сгенерированы. Это может быть связано с недостатком данных или временными техническими проблемами.</p>
        </div>
      `;
    }
    
    const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
    
    return `
        <div class="timeframe-tabs">
            ${timeframes.map(tf => `<button class="timeframe-tab" data-timeframe="${tf}">${tf}</button>`).join('')}
        </div>
        
        ${timeframes.map(timeframe => {
            const prediction = predictions.find(p => p.timeframe === timeframe) || {
                direction: 'NEUTRAL',
                confidence: 0,
                targetPrice: 0,
                stopLoss: 0,
                takeProfit: 0
            };
            
            return `
                <div class="timeframe-content" data-timeframe="${timeframe}" style="display: ${timeframe === '1h' ? 'block' : 'none'}">
                    <div class="grid">
                        <div class="metric ${this.getSignalClass(prediction.direction)}">
                            <h3>Направление</h3>
                            <div class="value">${this.getDirectionEmoji(prediction.direction)} ${prediction.direction}</div>
                        </div>
                        <div class="metric">
                            <h3>Уверенность</h3>
                            <div class="value">${prediction.confidence}%</div>
                        </div>
                        <div class="metric">
                            <h3>Целевая цена</h3>
                            <div class="value">$${this.formatNumber(prediction.targetPrice)}</div>
                        </div>
                        <div class="metric">
                            <h3>Стоп-лосс</h3>
                            <div class="value">$${this.formatNumber(prediction.stopLoss)}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('')}
    `;
  }

  generateVolumeAnalysis(volumeDelta) {
    if (!volumeDelta) return '<p>Нет данных об объеме</p>';
    
    const delta = parseFloat(volumeDelta);
    const color = delta >= 0 ? '#27ae60' : '#e74c3c';
    
    return `
        <div class="grid">
            <div class="metric" style="background: linear-gradient(135deg, ${color}, ${color}dd);">
                <h3>Изменение объема</h3>
                <div class="value">${delta >= 0 ? '+' : ''}${this.formatNumber(delta)}%</div>
            </div>
        </div>
        <div style="margin-top: 20px;">
            <h4>Анализ объема:</h4>
            <p>${this.getVolumeAnalysis(delta)}</p>
        </div>
    `;
  }

  generateLongShortRatio(ratio) {
    if (!ratio) return '<p>Нет данных о соотношении позиций</p>';
    
    const buyRatio = parseFloat(ratio.buyRatio || 0);
    const sellRatio = parseFloat(ratio.sellRatio || 0);
    
    return `
        <div class="grid">
            <div class="metric signal-bullish">
                <h3>Длинные позиции</h3>
                <div class="value">${this.formatNumber(buyRatio)}%</div>
            </div>
            <div class="metric signal-bearish">
                <h3>Короткие позиции</h3>
                <div class="value">${this.formatNumber(sellRatio)}%</div>
            </div>
        </div>
        <div style="margin-top: 20px;">
            <h4>Интерпретация:</h4>
            <p>${this.getRatioAnalysis(buyRatio, sellRatio)}</p>
        </div>
    `;
  }

  // Вспомогательные методы
  getSignalClass(signal) {
    if (!signal) return '';
    const s = signal.toString().toUpperCase();
    if (s.includes('BULLISH') || s.includes('BUY') || s.includes('STRONG')) return 'signal-bullish';
    if (s.includes('BEARISH') || s.includes('SELL') || s.includes('WEAK')) return 'signal-bearish';
    return 'signal-neutral';
  }

  getPatternSignalClass(signal) {
    if (!signal) return '';
    const s = signal.toString().toUpperCase();
    if (s.includes('BULLISH') || s.includes('BUY')) return 'signal-bullish';
    if (s.includes('BEARISH') || s.includes('SELL')) return 'signal-bearish';
    return 'signal-neutral';
  }

  getBollingerSignal(bollinger) {
    if (!bollinger) return 'N/A';
    const { upper, middle, lower } = bollinger;
    if (upper && middle && lower) {
      return 'Активен';
    }
    return 'Недоступен';
  }

  getSignalEmoji(signal) {
    if (!signal) return '❓';
    const s = signal.toString().toUpperCase();
    if (s.includes('BULLISH') || s.includes('BUY')) return '🟢';
    if (s.includes('BEARISH') || s.includes('SELL')) return '🔴';
    return '🟡';
  }

  getDirectionEmoji(direction) {
    if (!direction) return '❓';
    const d = direction.toString().toUpperCase();
    if (d.includes('BULLISH') || d.includes('UP')) return '📈';
    if (d.includes('BEARISH') || d.includes('DOWN')) return '📉';
    return '➡️';
  }

  getVolumeAnalysis(delta) {
    if (delta > 20) return 'Сильный рост объема указывает на высокую активность и возможное продолжение тренда.';
    if (delta > 10) return 'Умеренный рост объема поддерживает текущее движение цены.';
    if (delta > -10) return 'Стабильный объем, тренд может продолжиться.';
    if (delta > -20) return 'Снижение объема может указывать на ослабление тренда.';
    return 'Значительное снижение объема - возможна смена тренда или консолидация.';
  }

  getRatioAnalysis(buyRatio, sellRatio) {
    if (buyRatio > 60) return 'Преобладание длинных позиций указывает на бычий рынок.';
    if (sellRatio > 60) return 'Преобладание коротких позиций указывает на медвежий рынок.';
    return 'Сбалансированное соотношение позиций - рынок в равновесии.';
  }

  formatNumber(num) {
    if (num === null || num === undefined) return '0';
    const n = parseFloat(num);
    if (isNaN(n)) return '0';
    
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    
    return n.toFixed(4);
  }
}

module.exports = HTMLReportGenerator;
