const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const BybitAPI = require('./bybitApi');
const TechnicalIndicators = require('./technicalIndicators');
const LSTM = require('./lstmModel');
const HTMLReportGenerator = require('./htmlReportGenerator');

class WebInterface {
    constructor() {
        this.app = express();
        this.bybitAPI = new BybitAPI();
        this.technicalIndicators = new TechnicalIndicators();
        this.lstm = new LSTM();
        this.port = process.env.PORT || 3000;
        this.reportsDir = path.join(__dirname, 'reports');
        
        this.setupMiddleware();
        this.setupRoutes();
        this.ensureDirectories();
    }

    setupMiddleware() {
        // CORS для кросс-доменных запросов
        this.app.use(cors({
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));

        // Парсинг JSON
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Статические файлы
        this.app.use('/public', express.static(path.join(__dirname, 'public')));
        this.app.use('/reports', express.static(this.reportsDir));

        // Логирование запросов
        this.app.use((req, res, next) => {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
            next();
        });

        // Обработка ошибок
        this.app.use((err, req, res, next) => {
            console.error('Web interface error:', err);
            res.status(500).json({ 
                success: false, 
                error: 'Internal server error',
                message: err.message 
            });
        });
    }

    setupRoutes() {
        // Главная страница
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // API маршруты
        this.app.get('/api/status', this.getStatus.bind(this));
        this.app.get('/api/symbols', this.getSymbols.bind(this));
        this.app.post('/api/analyze', this.analyzeSymbol.bind(this));
        this.app.get('/api/reports', this.getReports.bind(this));
        this.app.get('/api/symbol/:symbol/price', this.getSymbolPrice.bind(this));
        this.app.get('/api/symbol/:symbol/indicators', this.getSymbolIndicators.bind(this));
        this.app.get('/api/symbol/:symbol/funding', this.getSymbolFunding.bind(this));

        // Дополнительные маршруты для расширенного функционала
        this.app.get('/api/strategies', this.getStrategies.bind(this));
        this.app.post('/api/strategy/:strategy', this.runStrategy.bind(this));
        this.app.get('/api/market/overview', this.getMarketOverview.bind(this));
        this.app.get('/api/portfolio/simulation', this.getPortfolioSimulation.bind(this));
    }

    async ensureDirectories() {
        try {
            await fs.mkdir(this.reportsDir, { recursive: true });
            console.log('Reports directory ensured');
        } catch (error) {
            console.error('Error creating reports directory:', error);
        }
    }

    // Получение статуса сервера
    async getStatus(req, res) {
        try {
            const status = {
                server: 'running',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                bybit: {
                    connected: true, // Bybit REST API всегда доступен
                    lastUpdate: new Date().toISOString()
                },
                features: {
                    technicalAnalysis: true,
                    candlestickPatterns: true,
                    fundingStrategy: true,
                    lstmPrediction: true,
                    htmlReports: true
                }
            };

            res.json({ success: true, data: status });
        } catch (error) {
            console.error('Status error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Получение популярных символов
    async getSymbols(req, res) {
        try {
            const popularSymbols = [
                'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT',
                'DOTUSDT', 'DOGEUSDT', 'AVAXUSDT', 'MATICUSDT', 'LINKUSDT',
                'UNIUSDT', 'LTCUSDT', 'BCHUSDT', 'XRPUSDT', 'ATOMUSDT',
                'NEARUSDT', 'FTMUSDT', 'ALGOUSDT', 'VETUSDT', 'ICPUSDT'
            ];

            // Получаем актуальные цены для символов
            const symbolsWithPrices = await Promise.all(
                popularSymbols.map(async (symbol) => {
                    try {
                        const ticker = await this.bybitAPI.getTicker(symbol);
                        return {
                            symbol,
                            price: ticker?.lastPrice || 0,
                            change24h: ticker?.priceChangePercent || 0,
                            volume: ticker?.volume || 0
                        };
                    } catch (error) {
                        return { symbol, price: 0, change24h: 0, volume: 0 };
                    }
                })
            );

            res.json(symbolsWithPrices);
        } catch (error) {
            console.error('Symbols error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Анализ символа
    async analyzeSymbol(req, res) {
        try {
            const { symbol, strategy = 'all' } = req.body;

            if (!symbol) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Symbol is required' 
                });
            }

            console.log(`Starting analysis for ${symbol} with strategy: ${strategy}`);

            // Собираем данные для анализа
            const analysisData = await this.collectAnalysisData(symbol, strategy);

            // Генерируем HTML отчет
            const reportPath = await this.generateReport(symbol, analysisData, strategy);

            // Формируем ответ
            const response = {
                success: true,
                data: analysisData,
                report: {
                    path: `/reports/${path.basename(reportPath)}`,
                    filename: path.basename(reportPath),
                    timestamp: new Date().toISOString()
                },
                message: `Analysis completed for ${symbol}`
            };

            res.json(response);

        } catch (error) {
            console.error('Analysis error:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message,
                details: error.stack 
            });
        }
    }

    // Сбор данных для анализа
    async collectAnalysisData(symbol, strategy) {
        const data = {};

        try {
            // Базовые данные
            data.ticker = await this.bybitAPI.getTicker(symbol);
            data.orderBook = await this.bybitAPI.getOrderBook(symbol);
            data.klines = await this.bybitAPI.getKlines(symbol, '1h', 100);

            // Технические индикаторы
            if (strategy === 'all' || strategy === 'technical') {
                data.technicalAnalysis = await this.calculateTechnicalIndicators(data.klines);
            }

            // Паттерны свечей
            if (strategy === 'all' || strategy === 'patterns') {
                data.candlestickPatterns = this.technicalIndicators.detectCandlestickPatterns(data.klines);
            }

            // Стратегия фандинга
            if (strategy === 'all' || strategy === 'funding') {
                const fundingRate = await this.bybitAPI.getFundingRate(symbol);
                const openInterest = await this.bybitAPI.getOpenInterest(symbol);
                data.fundingStrategy = this.technicalIndicators.analyzeFundingStrategy(
                    fundingRate, 
                    new Date(), 
                    data.ticker?.lastPrice, 
                    data.orderBook, 
                    openInterest
                );
            }

            // LSTM прогноз
            if (strategy === 'all' || strategy === 'lstm') {
                data.lstmPrediction = await this.lstm.quickPredict(data.klines);
            }

            // Дополнительные данные
            data.longShortRatio = await this.bybitAPI.getLongShortRatio(symbol);
            data.fundingRate = await this.bybitAPI.getFundingRate(symbol);
            data.openInterest = await this.bybitAPI.getOpenInterest(symbol);

            // Временные метки
            data.analysisTimestamp = new Date().toISOString();
            data.symbol = symbol;
            data.strategy = strategy;

        } catch (error) {
            console.error(`Error collecting data for ${symbol}:`, error);
            data.error = error.message;
        }

        return data;
    }

    // Расчет технических индикаторов
    async calculateTechnicalIndicators(klines) {
        try {
            const closes = klines.map(k => parseFloat(k.close));
            const highs = klines.map(k => parseFloat(k.high));
            const lows = klines.map(k => parseFloat(k.low));
            const volumes = klines.map(k => parseFloat(k.volume));

            return {
                sma: this.technicalIndicators.calculateSMA(closes, 20),
                ema: this.technicalIndicators.calculateEMA(closes, 20),
                rsi: this.technicalIndicators.calculateRSI(closes),
                macd: this.technicalIndicators.calculateMACD(closes),
                bollingerBands: this.technicalIndicators.calculateBollingerBands(closes),
                stochastic: this.technicalIndicators.calculateStochastic(highs, lows, closes),
                atr: this.technicalIndicators.calculateATR(highs, lows, closes),
                williamsR: this.technicalIndicators.calculateWilliamsR(highs, lows, closes),
                cci: this.technicalIndicators.calculateCCI(highs, lows, closes),
                mfi: this.technicalIndicators.calculateMFI(highs, lows, closes, volumes),
                obv: this.technicalIndicators.calculateOBV(closes, volumes),
                adx: this.technicalIndicators.calculateADX(highs, lows, closes),
                vwap: this.technicalIndicators.calculateVWAP(klines),
                volumeDelta: this.technicalIndicators.calculateVolumeDelta(klines)
            };
        } catch (error) {
            console.error('Error calculating technical indicators:', error);
            return { error: error.message };
        }
    }

    // Генерация HTML отчета
    async generateReport(symbol, data, strategy) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${symbol}_${strategy}_${timestamp}.html`;
            const filepath = path.join(this.reportsDir, filename);

            const htmlReportGenerator = new HTMLReportGenerator();
        const htmlContent = await htmlReportGenerator.generateHTMLReport(data, symbol, strategy);
            await fs.writeFile(filepath, htmlContent, 'utf8');

            console.log(`HTML report generated: ${filepath}`);
            return filepath;

        } catch (error) {
            console.error('Error generating HTML report:', error);
            throw error;
        }
    }

    // Получение отчетов
    async getReports(req, res) {
        try {
            const files = await fs.readdir(this.reportsDir);
            const reports = [];

            for (const file of files) {
                if (file.endsWith('.html')) {
                    const filepath = path.join(this.reportsDir, file);
                    const stats = await fs.stat(filepath);
                    
                    // Парсим имя файла для извлечения информации
                    const parts = file.replace('.html', '').split('_');
                    const symbol = parts[0];
                    const strategy = parts[1];
                    
                    reports.push({
                        filename: file,
                        symbol: symbol,
                        strategy: strategy,
                        timestamp: stats.mtime.toISOString(),
                        size: stats.size,
                        status: 'completed'
                    });
                }
            }

            // Сортируем по времени создания (новые сначала)
            reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            res.json(reports);

        } catch (error) {
            console.error('Reports error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Получение цены символа
    async getSymbolPrice(req, res) {
        try {
            const { symbol } = req.params;
            const ticker = await this.bybitAPI.getTicker(symbol);
            
            res.json({
                success: true,
                data: {
                    symbol,
                    price: ticker?.lastPrice,
                    change24h: ticker?.priceChangePercent,
                    volume: ticker?.volume,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Price error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Получение технических индикаторов
    async getSymbolIndicators(req, res) {
        try {
            const { symbol } = req.params;
            const klines = await this.bybitAPI.getKlines(symbol, '1h', 100);
            const indicators = await this.calculateTechnicalIndicators(klines);
            
            res.json({
                success: true,
                data: {
                    symbol,
                    indicators,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Indicators error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Получение данных фандинга
    async getSymbolFunding(req, res) {
        try {
            const { symbol } = req.params;
            const fundingRate = await this.bybitAPI.getFundingRate(symbol);
            const openInterest = await this.bybitAPI.getOpenInterest(symbol);
            const orderBook = await this.bybitAPI.getOrderBook(symbol);
            
            const fundingStrategy = this.technicalIndicators.analyzeFundingStrategy(
                fundingRate,
                new Date(),
                0, // currentPrice будет получен отдельно
                orderBook,
                openInterest
            );

            res.json({
                success: true,
                data: {
                    symbol,
                    fundingRate,
                    openInterest,
                    fundingStrategy,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Funding error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Получение доступных стратегий
    getStrategies(req, res) {
        const strategies = [
            {
                id: 'all',
                name: 'Все стратегии',
                description: 'Комплексный анализ всех доступных стратегий',
                icon: 'fas fa-cogs',
                color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            },
            {
                id: 'funding',
                name: 'Фандинг стратегия',
                description: 'Анализ на основе фандинг-ставок и открытого интереса',
                icon: 'fas fa-coins',
                color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
            },
            {
                id: 'technical',
                name: 'Технический анализ',
                description: '20+ технических индикаторов для анализа трендов',
                icon: 'fas fa-chart-line',
                color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
            },
            {
                id: 'patterns',
                name: 'Паттерны свечей',
                description: 'Обнаружение свечных паттернов для сигналов',
                icon: 'fas fa-chart-candlestick',
                color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
            },
            {
                id: 'lstm',
                name: 'ИИ прогноз',
                description: 'Машинное обучение для прогнозирования цен',
                icon: 'fas fa-brain',
                color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
            }
        ];

        res.json({ success: true, data: strategies });
    }

    // Запуск конкретной стратегии
    async runStrategy(req, res) {
        try {
            const { strategy } = req.params;
            const { symbol } = req.body;

            if (!symbol) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Symbol is required' 
                });
            }

            const analysisData = await this.collectAnalysisData(symbol, strategy);
            const reportPath = await this.generateReport(symbol, analysisData, strategy);

            res.json({
                success: true,
                data: analysisData,
                report: {
                    path: `/reports/${path.basename(reportPath)}`,
                    filename: path.basename(reportPath)
                },
                strategy,
                symbol
            });

        } catch (error) {
            console.error('Strategy error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Обзор рынка
    async getMarketOverview(req, res) {
        try {
            const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT'];
            const overview = [];

            for (const symbol of symbols) {
                try {
                    const ticker = await this.bybitAPI.getTicker(symbol);
                    overview.push({
                        symbol,
                        price: ticker?.lastPrice,
                        change24h: ticker?.priceChangePercent,
                        volume: ticker?.volume,
                        marketCap: ticker?.quoteVolume
                    });
                } catch (error) {
                    console.error(`Error getting data for ${symbol}:`, error);
                }
            }

            res.json({
                success: true,
                data: {
                    overview,
                    totalMarketCap: overview.reduce((sum, item) => sum + (item.marketCap || 0), 0),
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Market overview error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Симуляция портфеля
    getPortfolioSimulation(req, res) {
        try {
            const simulation = {
                initialCapital: 10000,
                strategies: [
                    { name: 'Conservative', allocation: 0.4, expectedReturn: 0.15, risk: 0.1 },
                    { name: 'Moderate', allocation: 0.4, expectedReturn: 0.25, risk: 0.2 },
                    { name: 'Aggressive', allocation: 0.2, expectedReturn: 0.4, risk: 0.35 }
                ],
                timeframes: ['1 month', '3 months', '6 months', '1 year'],
                riskMetrics: {
                    sharpeRatio: 1.2,
                    maxDrawdown: 0.15,
                    volatility: 0.22
                }
            };

            res.json({
                success: true,
                data: simulation
            });

        } catch (error) {
            console.error('Portfolio simulation error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Запуск сервера
    start() {
        this.app.listen(this.port, () => {
            console.log(`🚀 Web interface started on port ${this.port}`);
            console.log(`📱 Open http://localhost:${this.port} in your browser`);
            console.log(`📊 API available at http://localhost:${this.port}/api`);
        });
    }
}

module.exports = WebInterface;
