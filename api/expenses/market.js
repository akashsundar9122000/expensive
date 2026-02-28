const { query } = require('../_lib/db');
const { getUserFromRequest, cors } = require('../_lib/auth');
const { instrumentRequest } = require('../_lib/perf');

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const SOURCE = 'Yahoo Finance';
const MARKET_HEADERS = {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
    'Accept-Language': 'en-US,en;q=0.9'
};

// Full Nifty 50 constituent list (as of 2025) with .NS suffix for Yahoo Finance
const NIFTY50_UNIVERSE = [
    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'BHARTIARTL.NS', 'ICICIBANK.NS',
    'INFOSYS.NS', 'SBIN.NS', 'HINDUNILVR.NS', 'ITC.NS', 'LT.NS',
    'KOTAKBANK.NS', 'AXISBANK.NS', 'BAJFINANCE.NS', 'HCLTECH.NS', 'ASIANPAINT.NS',
    'MARUTI.NS', 'SUNPHARMA.NS', 'TITAN.NS', 'WIPRO.NS', 'NTPC.NS',
    'POWERGRID.NS', 'ADANIENT.NS', 'TECHM.NS', 'TATASTEEL.NS', 'TATAMOTORS.NS',
    'BAJAJFINSV.NS', 'NESTLEIND.NS', 'DRREDDY.NS', 'ULTRACEMCO.NS', 'CIPLA.NS',
    'COALINDIA.NS', 'HEROMOTOCO.NS', 'HINDALCO.NS', 'DIVISLAB.NS', 'ONGC.NS',
    'EICHERMOT.NS', 'GRASIM.NS', 'JSWSTEEL.NS', 'INDUSINDBK.NS', 'TATACONSUM.NS',
    'APOLLOHOSP.NS', 'BPCL.NS', 'HDFCLIFE.NS', 'SBILIFE.NS', 'ADANIPORTS.NS',
    'BRITANNIA.NS', 'SHRIRAMFIN.NS', 'M&M.NS', 'BAJAJ-AUTO.NS', 'UPL.NS'
];

// Map of company names/common shortforms to NSE ticker symbols
const COMPANY_TO_SYMBOL = {
    'RELIANCE INDUSTRIES': 'RELIANCE.NS',
    RELIANCE: 'RELIANCE.NS',
    TCS: 'TCS.NS',
    'TATA CONSULTANCY': 'TCS.NS',
    INFOSYS: 'INFOSYS.NS',
    INFY: 'INFOSYS.NS',
    HDFCBANK: 'HDFCBANK.NS',
    'HDFC BANK': 'HDFCBANK.NS',
    ICICIBANK: 'ICICIBANK.NS',
    'ICICI BANK': 'ICICIBANK.NS',
    SBIN: 'SBIN.NS',
    'STATE BANK OF INDIA': 'SBIN.NS',
    SBI: 'SBIN.NS',
    ITC: 'ITC.NS',
    LT: 'LT.NS',
    'L&T': 'LT.NS',
    'LARSEN': 'LT.NS',
    HINDUNILVR: 'HINDUNILVR.NS',
    'HINDUSTAN UNILEVER': 'HINDUNILVR.NS',
    KOTAKBANK: 'KOTAKBANK.NS',
    'KOTAK BANK': 'KOTAKBANK.NS',
    BHARTIARTL: 'BHARTIARTL.NS',
    AIRTEL: 'BHARTIARTL.NS',
    'BHARTI AIRTEL': 'BHARTIARTL.NS',
    ASIANPAINT: 'ASIANPAINT.NS',
    'ASIAN PAINTS': 'ASIANPAINT.NS',
    AXISBANK: 'AXISBANK.NS',
    'AXIS BANK': 'AXISBANK.NS',
    BAJFINANCE: 'BAJFINANCE.NS',
    'BAJAJ FINANCE': 'BAJFINANCE.NS',
    HCLTECH: 'HCLTECH.NS',
    'HCL TECH': 'HCLTECH.NS',
    WIPRO: 'WIPRO.NS',
    SUNPHARMA: 'SUNPHARMA.NS',
    'SUN PHARMA': 'SUNPHARMA.NS',
    TITAN: 'TITAN.NS',
    NTPC: 'NTPC.NS',
    POWERGRID: 'POWERGRID.NS',
    ADANIENT: 'ADANIENT.NS',
    'ADANI ENTERPRISES': 'ADANIENT.NS',
    TECHM: 'TECHM.NS',
    'TECH MAHINDRA': 'TECHM.NS',
    TATASTEEL: 'TATASTEEL.NS',
    'TATA STEEL': 'TATASTEEL.NS',
    TATAMOTORS: 'TATAMOTORS.NS',
    'TATA MOTORS': 'TATAMOTORS.NS',
    BAJAJFINSV: 'BAJAJFINSV.NS',
    'BAJAJ FINSERV': 'BAJAJFINSV.NS',
    NESTLEIND: 'NESTLEIND.NS',
    NESTLE: 'NESTLEIND.NS',
    DRREDDY: 'DRREDDY.NS',
    'DR REDDY': 'DRREDDY.NS',
    ULTRACEMCO: 'ULTRACEMCO.NS',
    'ULTRATECH CEMENT': 'ULTRACEMCO.NS',
    CIPLA: 'CIPLA.NS',
    COALINDIA: 'COALINDIA.NS',
    'COAL INDIA': 'COALINDIA.NS',
    HEROMOTOCO: 'HEROMOTOCO.NS',
    'HERO MOTOCORP': 'HEROMOTOCO.NS',
    HINDALCO: 'HINDALCO.NS',
    DIVISLAB: 'DIVISLAB.NS',
    'DIVIS LAB': 'DIVISLAB.NS',
    ONGC: 'ONGC.NS',
    EICHERMOT: 'EICHERMOT.NS',
    'EICHER MOTORS': 'EICHERMOT.NS',
    GRASIM: 'GRASIM.NS',
    JSWSTEEL: 'JSWSTEEL.NS',
    'JSW STEEL': 'JSWSTEEL.NS',
    INDUSINDBK: 'INDUSINDBK.NS',
    'INDUSIND BANK': 'INDUSINDBK.NS',
    TATACONSUM: 'TATACONSUM.NS',
    'TATA CONSUMER': 'TATACONSUM.NS',
    APOLLOHOSP: 'APOLLOHOSP.NS',
    'APOLLO HOSPITALS': 'APOLLOHOSP.NS',
    BPCL: 'BPCL.NS',
    HDFCLIFE: 'HDFCLIFE.NS',
    'HDFC LIFE': 'HDFCLIFE.NS',
    SBILIFE: 'SBILIFE.NS',
    'SBI LIFE': 'SBILIFE.NS',
    ADANIPORTS: 'ADANIPORTS.NS',
    'ADANI PORTS': 'ADANIPORTS.NS',
    BRITANNIA: 'BRITANNIA.NS',
    SHRIRAMFIN: 'SHRIRAMFIN.NS',
    'SHRIRAM FINANCE': 'SHRIRAMFIN.NS',
    'M&M': 'M&M.NS',
    MAHINDRA: 'M&M.NS',
    'MAHINDRA AND MAHINDRA': 'M&M.NS',
    'BAJAJ AUTO': 'BAJAJ-AUTO.NS',
    UPL: 'UPL.NS',
    MARUTI: 'MARUTI.NS',
    'MARUTI SUZUKI': 'MARUTI.NS'
};

// In-memory cache for market universe quotes (5 minutes)
let cachedUniverseQuotes = null;
let universeQuotesCachedAt = 0;
const UNIVERSE_CACHE_TTL_MS = 5 * 60 * 1000;

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeSymbol = (symbol) => {
    const raw = String(symbol || '').trim().toUpperCase();
    if (!raw) return '';
    if (raw.endsWith('.NS') || raw.endsWith('.BO') || raw.startsWith('^')) {
        return raw;
    }
    return /^[A-Z0-9&-]{2,15}$/.test(raw) ? `${raw}.NS` : raw;
};

const extractSymbolFromName = (name) => {
    const rawName = String(name || '').trim();
    if (!rawName) return '';

    // Match "SYMBOL - Company Name" format (from our stock picker)
    const dashMatch = rawName.match(/^([A-Za-z0-9&-]{2,15})\s*-\s*/);
    if (dashMatch && dashMatch[1]) {
        return normalizeSymbol(dashMatch[1]);
    }

    // Match symbols in brackets: [RELIANCE] or (RELIANCE)
    const bracketMatch = rawName.match(/[\[(]([A-Za-z0-9.^&-]{2,20}(?:\.(?:NS|BO))?)[\])]/);
    if (bracketMatch && bracketMatch[1]) {
        return normalizeSymbol(bracketMatch[1]);
    }

    // Try exact company name match
    const uppercaseName = rawName.toUpperCase();
    if (COMPANY_TO_SYMBOL[uppercaseName]) {
        return COMPANY_TO_SYMBOL[uppercaseName];
    }

    // Partial company name match
    for (const [key, val] of Object.entries(COMPANY_TO_SYMBOL)) {
        if (uppercaseName.startsWith(key) || key.startsWith(uppercaseName)) {
            return val;
        }
    }

    // Try ticker-like word
    const tickerLike = rawName.match(/\b([A-Z0-9]{2,15}(?:\.(?:NS|BO))?)\b/);
    if (tickerLike && tickerLike[1]) {
        return normalizeSymbol(tickerLike[1]);
    }

    return '';
};

/**
 * Determine if NSE is currently open based on IST time.
 * NSE trading hours: Mon-Fri, 9:15 AM to 3:30 PM IST (UTC+5:30)
 */
const getMarketStatus = () => {
    const nowUtc = new Date();
    // Convert to IST (UTC+5:30)
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(nowUtc.getTime() + istOffsetMs);
    const dayOfWeek = istTime.getUTCDay(); // 0=Sun, 6=Sat
    const hours = istTime.getUTCHours();
    const minutes = istTime.getUTCMinutes();
    const timeInMinutes = hours * 60 + minutes;
    const marketOpen = 9 * 60 + 15;  // 9:15 AM
    const marketClose = 15 * 60 + 30; // 3:30 PM
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isDuringTradingHours = timeInMinutes >= marketOpen && timeInMinutes <= marketClose;
    return isWeekday && isDuringTradingHours;
};

const fetchJson = async (url) => {
    const response = await fetch(url, { headers: MARKET_HEADERS });
    if (!response.ok) {
        throw new Error(`Request failed ${response.status}: ${url}`);
    }
    return response.json();
};

const fetchChartQuote = async (symbol) => {
    const safeSymbol = encodeURIComponent(symbol);
    const data = await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${safeSymbol}?interval=1d&range=1d`);

    const result = data?.chart?.result?.[0];
    const meta = result?.meta || {};
    const previousClose = toNumber(meta.chartPreviousClose, 0);
    const price = toNumber(meta.regularMarketPrice, 0);
    const change = price - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    return {
        symbol: String(meta.symbol || symbol),
        name: String(meta.longName || meta.shortName || symbol),
        exchange: String(meta.fullExchangeName || meta.exchangeName || ''),
        currency: String(meta.currency || 'INR'),
        price,
        previousClose,
        change,
        changePercent,
        marketTime: Number(meta.regularMarketTime || 0)
    };
};

const historicalPriceCache = new Map();

const fetchHistoricalCloseOnOrBefore = async (symbol, targetDate) => {
    const safeDate = targetDate instanceof Date && !Number.isNaN(targetDate.getTime())
        ? targetDate
        : new Date();

    const dayKey = safeDate.toISOString().slice(0, 10);
    const cacheKey = `${symbol}|${dayKey}`;
    if (historicalPriceCache.has(cacheKey)) {
        return historicalPriceCache.get(cacheKey);
    }

    const end = new Date(safeDate);
    end.setUTCDate(end.getUTCDate() + 1);
    const start = new Date(safeDate);
    start.setUTCDate(start.getUTCDate() - 14);

    const period1 = Math.floor(start.getTime() / 1000);
    const period2 = Math.floor(end.getTime() / 1000);
    const safeSymbol = encodeURIComponent(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${safeSymbol}?interval=1d&period1=${period1}&period2=${period2}`;

    try {
        const data = await fetchJson(url);
        const result = data?.chart?.result?.[0];
        const timestamps = result?.timestamp || [];
        const closes = result?.indicators?.quote?.[0]?.close || [];

        let selectedClose = null;
        let selectedDay = '';
        const targetDay = dayKey;

        for (let i = 0; i < timestamps.length; i++) {
            const ts = Number(timestamps[i] || 0) * 1000;
            const close = Number(closes[i]);
            if (!Number.isFinite(ts) || !Number.isFinite(close) || close <= 0) continue;
            const quoteDay = new Date(ts).toISOString().slice(0, 10);
            if (quoteDay <= targetDay && quoteDay >= selectedDay) {
                selectedDay = quoteDay;
                selectedClose = close;
            }
        }

        if (!Number.isFinite(selectedClose) || selectedClose <= 0) {
            selectedClose = null;
        }

        historicalPriceCache.set(cacheKey, selectedClose);
        return selectedClose;
    } catch {
        historicalPriceCache.set(cacheKey, null);
        return null;
    }
};

/**
 * Batch-fetch quotes for multiple symbols using Yahoo Finance v7 quote API.
 * Falls back to individual v8 chart fetches if batch fails.
 */
const fetchBatchQuotes = async (symbols) => {
    if (!symbols || symbols.length === 0) return [];

    try {
        const symbolList = symbols.map(s => encodeURIComponent(s)).join(',');
        const fields = [
            'regularMarketPrice', 'regularMarketChange', 'regularMarketChangePercent',
            'regularMarketPreviousClose', 'shortName', 'longName',
            'fullExchangeName', 'currency', 'regularMarketTime'
        ].join(',');

        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolList}&fields=${fields}&lang=en-US&region=IN`;
        const data = await fetchJson(url);
        const resultList = data?.quoteResponse?.result || [];

        if (resultList.length === 0) {
            throw new Error('Empty batch response');
        }

        return resultList.map((quote) => {
            const price = toNumber(quote.regularMarketPrice, 0);
            const previousClose = toNumber(quote.regularMarketPreviousClose, 0);
            const change = toNumber(quote.regularMarketChange, price - previousClose);
            const changePercent = toNumber(quote.regularMarketChangePercent, 0);

            return {
                symbol: String(quote.symbol || ''),
                name: String(quote.shortName || quote.longName || quote.symbol || ''),
                exchange: String(quote.fullExchangeName || quote.exchange || 'NSE'),
                currency: String(quote.currency || 'INR'),
                price,
                previousClose,
                change,
                changePercent,
                marketTime: Number(quote.regularMarketTime || 0)
            };
        });
    } catch {
        // Batch fetch failed — fall back to individual v8 chart fetches in parallel (capped)
        const cap = Math.min(symbols.length, 30);
        const results = await Promise.all(
            symbols.slice(0, cap).map(async (symbol) => {
                try {
                    return await fetchChartQuote(symbol);
                } catch {
                    return null;
                }
            })
        );
        return results.filter(Boolean);
    }
};

/**
 * Fetch all Nifty 50 quotes with caching to avoid rate-limiting.
 */
const fetchNifty50Quotes = async () => {
    const now = Date.now();
    if (cachedUniverseQuotes && now - universeQuotesCachedAt < UNIVERSE_CACHE_TTL_MS) {
        return cachedUniverseQuotes;
    }

    const quotes = await fetchBatchQuotes(NIFTY50_UNIVERSE);
    const validQuotes = quotes.filter((q) => {
        if (!q) return false;
        const sym = String(q.symbol || '').toUpperCase();
        const exch = String(q.exchange || '').toUpperCase();
        return sym.endsWith('.NS') || sym.endsWith('.BO') || exch.includes('NSE') || exch.includes('BSE');
    });

    if (validQuotes.length > 0) {
        cachedUniverseQuotes = validQuotes;
        universeQuotesCachedAt = now;
    }

    return validQuotes;
};

module.exports = async (req, res) => {
    instrumentRequest(req, res, 'expenses.market');
    cors(req, res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const [nifty, sensex, nifty50Quotes] = await Promise.all([
            fetchChartQuote('^NSEI'),
            fetchChartQuote('^BSESN'),
            fetchNifty50Quotes()
        ]);

        const gainers = [...nifty50Quotes]
            .sort((a, b) => Number(b.changePercent || 0) - Number(a.changePercent || 0))
            .slice(0, 5);
        const losers = [...nifty50Quotes]
            .sort((a, b) => Number(a.changePercent || 0) - Number(b.changePercent || 0))
            .slice(0, 5);

        const investmentRows = await query(
            `SELECT id, name, amount, created_at
             FROM investments
             WHERE user_id = $1
               AND LOWER(type) = 'stock'
             ORDER BY created_at DESC, id DESC
             LIMIT 50`,
            [user.id]
        );

        const resolvedLots = [];
        const unresolved = [];

        investmentRows.rows.forEach((row) => {
            const symbol = extractSymbolFromName(row.name);
            if (!symbol) {
                unresolved.push({ investmentId: row.id, name: row.name });
                return;
            }
            resolvedLots.push({
                investmentId: row.id,
                name: row.name,
                symbol,
                amount: toNumber(row.amount, 0),
                createdAt: row.created_at ? new Date(row.created_at) : new Date()
            });
        });

        const groupedBySymbol = new Map();
        resolvedLots.forEach((lot) => {
            const normalized = normalizeSymbol(lot.symbol);
            if (!groupedBySymbol.has(normalized)) {
                groupedBySymbol.set(normalized, {
                    symbol: normalized,
                    investmentName: lot.name,
                    lots: []
                });
            }
            groupedBySymbol.get(normalized).lots.push(lot);
        });

        const resolvedSymbols = Array.from(groupedBySymbol.keys()).slice(0, 20);
        const resolved = resolvedSymbols.map((symbol) => groupedBySymbol.get(symbol));

        // Try to satisfy stock quotes from the already-fetched Nifty 50 universe cache first
        const nifty50Map = new Map(nifty50Quotes.map(q => [q.symbol.toUpperCase(), q]));
        const needsExternalFetch = [];
        const stockQuoteResults = resolved.map((stockGroup) => {
            const normalSymbol = normalizeSymbol(stockGroup.symbol);
            const cached = nifty50Map.get(normalSymbol.toUpperCase());
            if (cached) {
                return {
                    ...cached,
                    symbol: normalSymbol,
                    stockGroup
                };
            }
            needsExternalFetch.push(stockGroup);
            return null;
        });

        // Fetch remaining stocks not in the Nifty 50 universe
        if (needsExternalFetch.length > 0) {
            const extraSymbols = needsExternalFetch.map(s => s.symbol);
            const extraQuotes = await fetchBatchQuotes(extraSymbols);
            const extraMap = new Map(extraQuotes.map(q => [q.symbol.toUpperCase(), q]));

            for (let i = 0; i < stockQuoteResults.length; i++) {
                if (stockQuoteResults[i] === null) {
                    const stockGroup = resolved[i];
                    if (stockGroup) {
                        const normalSymbol = normalizeSymbol(stockGroup.symbol).toUpperCase();
                        const q = extraMap.get(normalSymbol);
                        if (q) {
                            stockQuoteResults[i] = {
                                ...q,
                                symbol: normalizeSymbol(stockGroup.symbol),
                                stockGroup
                            };
                        }
                    }
                }
            }
        }

        const investedStocksRaw = stockQuoteResults.filter(Boolean);
        const investedStocks = [];

        for (const stock of investedStocksRaw) {
            const lots = stock.stockGroup?.lots || [];
            let totalInvested = 0;
            let totalShares = 0;

            for (const lot of lots) {
                const invested = toNumber(lot.amount, 0);
                if (invested <= 0) continue;
                totalInvested += invested;

                const buyPrice = await fetchHistoricalCloseOnOrBefore(stock.symbol, lot.createdAt);
                if (!Number.isFinite(buyPrice) || buyPrice <= 0) continue;

                const shares = invested / buyPrice;
                totalShares += shares;
            }

            const currentPrice = toNumber(stock.price, 0);
            const currentValue = totalShares > 0 && currentPrice > 0 ? totalShares * currentPrice : 0;
            const pnl = currentValue - totalInvested;
            const pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

            investedStocks.push({
                investmentId: lots[0]?.investmentId || 0,
                investmentName: stock.stockGroup?.investmentName || stock.name || stock.symbol,
                symbol: stock.symbol,
                name: stock.name,
                exchange: stock.exchange,
                currency: stock.currency,
                price: currentPrice,
                previousClose: toNumber(stock.previousClose, 0),
                change: toNumber(stock.change, 0),
                changePercent: toNumber(stock.changePercent, 0),
                marketTime: Number(stock.marketTime || 0),
                totalInvested,
                sharesHeld: totalShares,
                currentValue,
                pnl,
                pnlPercent,
                lotsCount: lots.length
            });
        }

        return res.status(200).json({
            source: SOURCE,
            asOf: new Date().toISOString(),
            marketOpen: getMarketStatus(),
            indices: [nifty, sensex],
            topGainers: gainers,
            topLosers: losers,
            investedStocks,
            unresolvedStocks: unresolved
        });
    } catch (err) {
        console.error('Market data error:', err);
        return res.status(500).json({ error: 'Failed to fetch market data' });
    }
};
