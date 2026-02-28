const { getUserFromRequest, cors } = require('../../_lib/auth');
const { instrumentRequest } = require('../../_lib/perf');

const NSE_EQUITY_CSV_URL = 'https://archives.nseindia.com/content/equities/EQUITY_L.csv';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

let cachedStocks = [];
let cachedAt = 0;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

const splitCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const ch = line[index];

    if (ch === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  values.push(current.trim());
  return values;
};

const fetchIndianStocks = async () => {
  const now = Date.now();
  if (cachedStocks.length > 0 && now - cachedAt < CACHE_TTL_MS) {
    return cachedStocks;
  }

  const response = await fetch(NSE_EQUITY_CSV_URL, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/csv,*/*'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch NSE list: ${response.status}`);
  }

  const csv = await response.text();
  const lines = String(csv || '').split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) {
    return cachedStocks;
  }

  const parsed = [];
  for (let index = 1; index < lines.length; index++) {
    const columns = splitCsvLine(lines[index]);
    if (columns.length < 2) continue;

    const symbol = String(columns[0] || '').trim().toUpperCase();
    const name = String(columns[1] || '').trim();
    if (!symbol || !name) continue;

    parsed.push({
      symbol,
      name,
      display: `${symbol} - ${name}`
    });
  }

  parsed.sort((a, b) => a.symbol.localeCompare(b.symbol));
  cachedStocks = parsed;
  cachedAt = now;
  return cachedStocks;
};

module.exports = async (req, res) => {
  instrumentRequest(req, res, 'expenses.stocks.indian');
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const stocks = await fetchIndianStocks();
    return res.status(200).json(stocks);
  } catch (err) {
    console.error('Indian stocks fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch Indian stocks list' });
  }
};
