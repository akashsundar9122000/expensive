package com.expensify.backend.service;

import com.expensify.backend.model.*;
import com.expensify.backend.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.math.BigDecimal;
import java.time.Duration;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExpenseService {
    private final TransactionRepository transactionRepository;
    private final BankAccountRepository bankAccountRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    private final InvestmentRepository investmentRepository;
    private final SipRepository sipRepository;
    private final BudgetRepository budgetRepository;
    private final PasswordEncoder passwordEncoder;
        private final ObjectMapper objectMapper;

        private static final String MARKET_SOURCE = "Yahoo Finance";
        private static final HttpClient MARKET_HTTP = HttpClient.newHttpClient();
        private static final String NSE_EQUITY_CSV_URL = "https://archives.nseindia.com/content/equities/EQUITY_L.csv";
        private static final Duration INDIAN_STOCKS_CACHE_TTL = Duration.ofHours(12);
        private static final Pattern BRACKET_SYMBOL_PATTERN = Pattern.compile("[\\[(]([A-Za-z0-9.^-]{2,20}(?:\\.(?:NS|BO))?)[\\])]", Pattern.CASE_INSENSITIVE);
        private static final Pattern TICKER_PATTERN = Pattern.compile("\\b[A-Z0-9]{2,15}(?:\\.(?:NS|BO))?\\b");
        private static final Set<String> COMMON_NON_TICKER_WORDS = Set.of("STOCK", "LTD", "LIMITED", "INDUSTRIES", "COMPANY", "INC", "PLC", "ETF", "FUND");
        private static final Map<String, String> COMPANY_TO_SYMBOL = Map.ofEntries(
            Map.entry("RELIANCE", "RELIANCE.NS"),
            Map.entry("RELIANCE INDUSTRIES", "RELIANCE.NS"),
            Map.entry("TCS", "TCS.NS"),
            Map.entry("INFOSYS", "INFY.NS"),
            Map.entry("HDFC BANK", "HDFCBANK.NS"),
            Map.entry("HDFCBANK", "HDFCBANK.NS"),
            Map.entry("ICICI BANK", "ICICIBANK.NS"),
            Map.entry("ICICIBANK", "ICICIBANK.NS"),
            Map.entry("SBI", "SBIN.NS"),
            Map.entry("STATE BANK OF INDIA", "SBIN.NS"),
            Map.entry("ITC", "ITC.NS"),
            Map.entry("LT", "LT.NS"),
            Map.entry("L&T", "LT.NS"),
            Map.entry("HINDUNILVR", "HINDUNILVR.NS"),
            Map.entry("BHARTIARTL", "BHARTIARTL.NS"),
            Map.entry("KOTAKBANK", "KOTAKBANK.NS")
        );
            private static final List<String> INDIAN_MARKET_UNIVERSE = List.of(
                "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS",
                "SBIN.NS", "LT.NS", "ITC.NS", "BHARTIARTL.NS", "HINDUNILVR.NS",
                "KOTAKBANK.NS", "AXISBANK.NS", "BAJFINANCE.NS", "MARUTI.NS", "ASIANPAINT.NS",
                "ADANIENT.NS", "TITAN.NS", "WIPRO.NS", "NTPC.NS", "POWERGRID.NS"
            );
                private volatile Instant indianStocksCachedAt = Instant.EPOCH;
                private volatile List<Map<String, String>> indianStocksCache = List.of();

    public List<Transaction> getTransactions(User user) {
        return transactionRepository.findByUserOrderByDateDesc(user);
    }

    @Transactional
    public Transaction addTransaction(User user, Transaction transaction, String bankName) {
        transaction.setUser(user);

        BankAccount account = bankAccountRepository.findByUser(user).stream()
                .filter(a -> a.getName().equals(bankName))
                .findFirst()
                .orElseGet(() -> {
                    BankAccount newAcc = BankAccount.builder()
                            .user(user)
                            .name(bankName)
                            .balance(BigDecimal.ZERO)
                            .build();
                    return bankAccountRepository.save(newAcc);
                });

        transaction.setBankAccount(account);
        account.setBalance(account.getBalance().subtract(transaction.getAmount()));
        bankAccountRepository.save(account);

        return transactionRepository.save(transaction);
    }

    public List<BankAccount> getBankAccounts(User user) {
        return bankAccountRepository.findByUser(user);
    }

    @Transactional
    public BankAccount addBank(User user, String bankName, BigDecimal balance) {
        BigDecimal initialBalance = balance != null ? balance : BigDecimal.ZERO;
        BankAccount bank = BankAccount.builder()
                .user(user)
                .name(bankName)
                .balance(initialBalance)
                .build();
        return bankAccountRepository.save(bank);
    }

    @Transactional
    public BankAccount updateBank(User user, Long bankId, String bankName, BigDecimal balance) {
        BankAccount bank = bankAccountRepository.findByIdAndUser(bankId, user)
                .orElseThrow();
        bank.setName(bankName);
        if (balance != null) {
            bank.setBalance(balance);
        }
        return bankAccountRepository.save(bank);
    }

    @Transactional
    public void deleteBank(User user, Long bankId) {
        List<BankAccount> banks = bankAccountRepository.findByUser(user);
        if (banks.size() <= 1) {
            throw new IllegalStateException("At least one bank account is required");
        }

        BankAccount bank = bankAccountRepository.findByIdAndUser(bankId, user)
                .orElseThrow();

        List<Transaction> transactions = transactionRepository.findByUserAndBankAccount(user, bank);
        if (!transactions.isEmpty()) {
            transactions.forEach(transaction -> transaction.setBankAccount(null));
            transactionRepository.saveAll(transactions);
        }

        bankAccountRepository.delete(bank);
    }

    public UserPreference getPreferences(User user) {
        return userPreferenceRepository.findById(user.getId()).orElse(null);
    }

    public List<Subscription> getSubscriptions(User user) {
        return subscriptionRepository.findByUser(user);
    }

    @Transactional
    public Subscription addSubscription(User user, Subscription sub) {
        sub.setUser(user);
        return subscriptionRepository.save(sub);
    }

    @Transactional
    public Subscription updateSubscription(User user, Long id, Subscription updates) {
        Subscription existing = subscriptionRepository.findByIdAndUser(id, user)
                .orElseThrow();

        existing.setName(updates.getName());
        existing.setAmount(updates.getAmount());
        existing.setIcon(updates.getIcon());
        existing.setColor(updates.getColor());
        existing.setDate(updates.getDate());
        existing.setBankName(updates.getBankName());

        return subscriptionRepository.save(existing);
    }

    @Transactional
    public void deleteSubscription(Long id) {
        subscriptionRepository.deleteById(id);
    }

    @Transactional
    public void deleteTransaction(Long id) {
        transactionRepository.deleteById(id);
    }

    @Transactional
    public UserPreference updatePreferences(User user, UserPreference updates) {
        UserPreference prefs = userPreferenceRepository.findById(user.getId())
                .orElse(UserPreference.builder().user(user).userId(user.getId()).build());

        if (updates.getGoalName() != null)
            prefs.setGoalName(updates.getGoalName());
        if (updates.getGoalRequired() != null)
            prefs.setGoalRequired(updates.getGoalRequired());
        if (updates.getGoalCollectedIncrement() != null) {
            BigDecimal current = prefs.getGoalCollected() != null ? prefs.getGoalCollected() : BigDecimal.ZERO;
            prefs.setGoalCollected(current.add(updates.getGoalCollectedIncrement()));
        } else if (updates.getGoalCollected() != null) {
            prefs.setGoalCollected(updates.getGoalCollected());
        }
        if (updates.getTotalInvestment() != null)
            prefs.setTotalInvestment(updates.getTotalInvestment());
        if (updates.getInvestAmount() != null)
            prefs.setInvestAmount(updates.getInvestAmount());

        return userPreferenceRepository.save(prefs);
    }

    public Map<String, BigDecimal> getBankBalances(User user) {
        return bankAccountRepository.findByUser(user).stream()
                .collect(Collectors.toMap(BankAccount::getName, BankAccount::getBalance));
    }

    public BigDecimal getTotalBalance(User user) {
        return bankAccountRepository.findByUser(user).stream()
                .map(BankAccount::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public List<Investment> getInvestments(User user) {
        return investmentRepository.findByUser(user);
    }

    public List<Sip> getSips(User user) {
        return sipRepository.findByUser(user);
    }

    @Transactional
    public Investment addInvestment(User user, Investment investment) {
        investment.setUser(user);
        return investmentRepository.save(investment);
    }

    @Transactional
    public Sip addSip(User user, Sip sip) {
        sip.setUser(user);
        return sipRepository.save(sip);
    }

    @Transactional
    public Sip updateSip(User user, Long id, Sip updates) {
        Sip existing = sipRepository.findByIdAndUser(id, user)
                .orElseThrow();

        existing.setType(updates.getType());
        existing.setInvestmentName(updates.getInvestmentName());
        existing.setMonthlyAmount(updates.getMonthlyAmount());
        existing.setSipDay(updates.getSipDay());
        existing.setBankName(updates.getBankName());

        return sipRepository.save(existing);
    }

    @Transactional
    public void deleteInvestment(User user, Long id, String password) {
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("Password is required");
        }

        String storedPassword = user.getPassword();
        boolean passwordMatches = isBcryptHash(storedPassword)
                ? passwordEncoder.matches(password, storedPassword)
                : storedPassword != null && storedPassword.equals(password);

        if (!passwordMatches) {
            throw new IllegalArgumentException("Incorrect password");
        }

        Investment investment = investmentRepository.findById(id)
                .orElseThrow();

        if (investment.getUser() == null || !investment.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Investment not found");
        }

        investmentRepository.delete(investment);
    }

    @Transactional
    public void deleteSip(User user, Long id, String password) {
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("Password is required");
        }

        String storedPassword = user.getPassword();
        boolean passwordMatches = isBcryptHash(storedPassword)
                ? passwordEncoder.matches(password, storedPassword)
                : storedPassword != null && storedPassword.equals(password);

        if (!passwordMatches) {
            throw new IllegalArgumentException("Incorrect password");
        }

        Sip existing = sipRepository.findByIdAndUser(id, user)
                .orElseThrow();
        sipRepository.delete(existing);
    }

    private boolean isBcryptHash(String password) {
        return password != null && password.matches("^\\$2[aby]?\\$\\d{2}\\$.*");
    }

    public BigDecimal getTotalInvestmentAmount(User user) {
        return investmentRepository.findByUser(user).stream()
                .map(Investment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal getMonthlyExpenses(User user) {
        LocalDate now = LocalDate.now();
        return transactionRepository.findByUserOrderByDateDesc(user).stream()
                .filter(t -> t.getDate() != null
                        && t.getDate().getYear() == now.getYear()
                        && t.getDate().getMonthValue() == now.getMonthValue())
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public Map<String, Object> getMarketData(User user) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("source", MARKET_SOURCE);
        response.put("asOf", Instant.now().toString());

        List<Map<String, Object>> indices = new ArrayList<>();
        List<Map<String, Object>> topGainers = new ArrayList<>();
        List<Map<String, Object>> topLosers = new ArrayList<>();
        List<Map<String, Object>> investedStocks = new ArrayList<>();
        List<Map<String, Object>> unresolvedStocks = new ArrayList<>();

        try {
            indices.add(fetchChartQuote("^NSEI"));
        } catch (Exception ignored) {
        }

        try {
            indices.add(fetchChartQuote("^BSESN"));
        } catch (Exception ignored) {
        }

        List<Map<String, Object>> indianMovers = fetchIndianMarketMovers();
        topGainers = indianMovers.stream()
            .sorted((a, b) -> Double.compare(toDouble(b.get("changePercent")), toDouble(a.get("changePercent"))))
            .limit(5)
            .collect(Collectors.toList());
        topLosers = indianMovers.stream()
            .sorted(Comparator.comparingDouble(a -> toDouble(a.get("changePercent"))))
            .limit(5)
            .collect(Collectors.toList());

        List<Investment> stocks = investmentRepository.findByUser(user).stream()
                .filter(inv -> inv.getType() != null && "stock".equalsIgnoreCase(inv.getType().trim()))
                .sorted(Comparator.comparing(Investment::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        Map<String, List<Investment>> lotsBySymbol = new LinkedHashMap<>();
        for (Investment stock : stocks) {
            String symbol = resolveSymbol(stock.getName());
            if (symbol == null || symbol.isBlank()) {
                unresolvedStocks.add(Map.of(
                        "investmentId", stock.getId(),
                        "name", stock.getName() == null ? "" : stock.getName()
                ));
                continue;
            }

            String normalizedSymbol = normalizeSymbol(symbol);
            lotsBySymbol.computeIfAbsent(normalizedSymbol, key -> new ArrayList<>()).add(stock);
        }

        int processedSymbols = 0;
        for (Map.Entry<String, List<Investment>> entry : lotsBySymbol.entrySet()) {
            String symbol = entry.getKey();
            List<Investment> lots = entry.getValue();

            try {
                Map<String, Object> quote = fetchChartQuote(symbol);
                double currentPrice = toDouble(quote.get("price"));

                double totalInvested = 0.0;
                double sharesHeld = 0.0;

                for (Investment lot : lots) {
                    double investedAmount = lot.getAmount() != null ? lot.getAmount().doubleValue() : 0.0;
                    if (investedAmount <= 0) {
                        continue;
                    }

                    totalInvested += investedAmount;

                    Instant lotCreatedAt = lot.getCreatedAt() != null ? lot.getCreatedAt() : Instant.now();
                    double buyPrice = fetchHistoricalCloseOnOrBefore(symbol, lotCreatedAt);
                    if (buyPrice <= 0) {
                        buyPrice = currentPrice;
                    }
                    if (buyPrice > 0) {
                        sharesHeld += investedAmount / buyPrice;
                    }
                }

                double currentValue = sharesHeld * currentPrice;
                double pnl = currentValue - totalInvested;
                double pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100.0 : 0.0;

                Investment representativeLot = lots.get(0);
                quote.put("investmentId", representativeLot.getId());
                quote.put("investmentName", representativeLot.getName() == null ? "" : representativeLot.getName());
                quote.put("totalInvested", totalInvested);
                quote.put("sharesHeld", sharesHeld);
                quote.put("currentValue", currentValue);
                quote.put("pnl", pnl);
                quote.put("pnlPercent", pnlPercent);
                quote.put("lotsCount", lots.size());
                investedStocks.add(quote);
            } catch (Exception ignored) {
                Investment representativeLot = lots.get(0);
                unresolvedStocks.add(Map.of(
                        "investmentId", representativeLot.getId(),
                        "name", representativeLot.getName() == null ? "" : representativeLot.getName()
                ));
            }

            processedSymbols++;
            if (processedSymbols >= 20) {
                break;
            }
        }

        response.put("indices", indices);
        response.put("topGainers", topGainers);
        response.put("topLosers", topLosers);
        response.put("investedStocks", investedStocks);
        response.put("unresolvedStocks", unresolvedStocks);
        return response;
    }

    public List<Map<String, String>> getIndianStocks() {
        Instant now = Instant.now();
        if (!indianStocksCache.isEmpty() && Duration.between(indianStocksCachedAt, now).compareTo(INDIAN_STOCKS_CACHE_TTL) < 0) {
            return indianStocksCache;
        }

        synchronized (this) {
            now = Instant.now();
            if (!indianStocksCache.isEmpty() && Duration.between(indianStocksCachedAt, now).compareTo(INDIAN_STOCKS_CACHE_TTL) < 0) {
                return indianStocksCache;
            }

            try {
                HttpRequest request = HttpRequest.newBuilder(URI.create(NSE_EQUITY_CSV_URL))
                        .header("User-Agent", "Mozilla/5.0")
                        .header("Accept", "text/csv,*/*")
                        .GET()
                        .build();

                HttpResponse<String> response = MARKET_HTTP.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() < 200 || response.statusCode() >= 300) {
                    return indianStocksCache;
                }

                String body = response.body() == null ? "" : response.body();
                String[] lines = body.split("\\r?\\n");
                if (lines.length <= 1) {
                    return indianStocksCache;
                }

                List<Map<String, String>> parsed = new ArrayList<>();
                for (int i = 1; i < lines.length; i++) {
                    String line = lines[i].trim();
                    if (line.isEmpty()) {
                        continue;
                    }

                    List<String> cols = splitCsvLine(line);
                    if (cols.size() < 2) {
                        continue;
                    }

                    String symbol = stringValue(cols.get(0), "").toUpperCase(Locale.ROOT);
                    String name = stringValue(cols.get(1), "");

                    if (symbol.isBlank() || name.isBlank()) {
                        continue;
                    }

                    Map<String, String> stock = new LinkedHashMap<>();
                    stock.put("symbol", symbol);
                    stock.put("name", name);
                    stock.put("display", symbol + " - " + name);
                    parsed.add(stock);
                }

                parsed.sort(Comparator.comparing(item -> item.getOrDefault("symbol", "")));
                indianStocksCache = parsed;
                indianStocksCachedAt = Instant.now();
                return indianStocksCache;
            } catch (Exception ignored) {
                return indianStocksCache;
            }
        }
    }

    private List<String> splitCsvLine(String line) {
        List<String> values = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (ch == ',' && !inQuotes) {
                values.add(current.toString().trim());
                current.setLength(0);
                continue;
            }

            current.append(ch);
        }

        values.add(current.toString().trim());
        return values;
    }

    private List<Map<String, Object>> fetchIndianMarketMovers() {
        List<Map<String, Object>> quotes = new ArrayList<>();
        for (String symbol : INDIAN_MARKET_UNIVERSE) {
            try {
                Map<String, Object> quote = fetchChartQuote(symbol);
                String exchange = stringValue(quote.get("exchange"), "").toUpperCase(Locale.ROOT);
                String resolvedSymbol = stringValue(quote.get("symbol"), "").toUpperCase(Locale.ROOT);
                if (resolvedSymbol.endsWith(".NS") || resolvedSymbol.endsWith(".BO") || exchange.contains("NSE") || exchange.contains("BSE")) {
                    quotes.add(quote);
                }
            } catch (Exception ignored) {
            }
        }
        return quotes;
    }

    private Map<String, Object> fetchChartQuote(String symbol) throws Exception {
        String safeSymbol = URLEncoder.encode(symbol, StandardCharsets.UTF_8);
        Map<String, Object> root = fetchJson("https://query1.finance.yahoo.com/v8/finance/chart/" + safeSymbol + "?interval=1d&range=1d");

        Map<String, Object> chart = asMap(root.get("chart"));
        List<?> resultList = asList(chart.get("result"));
        Map<String, Object> result = resultList.isEmpty() ? Map.of() : asMap(resultList.get(0));
        Map<String, Object> meta = asMap(result.get("meta"));

        double price = toDouble(meta.get("regularMarketPrice"));
        double previousClose = toDouble(meta.get("chartPreviousClose"));
        double change = price - previousClose;
        double changePercent = previousClose > 0 ? (change / previousClose) * 100.0 : 0.0;

        Map<String, Object> quote = new LinkedHashMap<>();
        quote.put("symbol", stringValue(meta.get("symbol"), symbol));
        quote.put("name", stringValue(meta.get("longName"), stringValue(meta.get("shortName"), symbol)));
        quote.put("exchange", stringValue(meta.get("fullExchangeName"), stringValue(meta.get("exchangeName"), "")));
        quote.put("currency", stringValue(meta.get("currency"), "INR"));
        quote.put("price", price);
        quote.put("previousClose", previousClose);
        quote.put("change", change);
        quote.put("changePercent", changePercent);
        quote.put("marketTime", toLong(meta.get("regularMarketTime")));
        return quote;
    }

    private String resolveSymbol(String investmentName) {
        String direct = extractSymbolFromName(investmentName);
        if (direct != null && !direct.isBlank()) {
            return direct;
        }

        String mapped = COMPANY_TO_SYMBOL.getOrDefault(normalizeName(investmentName), "");
        if (!mapped.isBlank()) {
            return mapped;
        }

        try {
            return searchYahooSymbol(investmentName);
        } catch (Exception ignored) {
            return "";
        }
    }

    private String searchYahooSymbol(String investmentName) throws Exception {
        String query = stringValue(investmentName, "").trim();
        if (query.isBlank()) {
            return "";
        }

        String url = "https://query1.finance.yahoo.com/v1/finance/search?q="
                + URLEncoder.encode(query, StandardCharsets.UTF_8)
                + "&quotesCount=8&newsCount=0";

        Map<String, Object> root = fetchJson(url);
        List<?> quotes = asList(root.get("quotes"));
        for (Object rawQuote : quotes) {
            Map<String, Object> quote = asMap(rawQuote);
            String symbol = normalizeSymbol(stringValue(quote.get("symbol"), ""));
            String quoteType = stringValue(quote.get("quoteType"), "").toUpperCase(Locale.ROOT);
            String exchange = stringValue(quote.get("exchange"), "").toUpperCase(Locale.ROOT);

            if (symbol.isBlank()) {
                continue;
            }

            boolean indiaExchange = exchange.contains("NSE") || exchange.contains("BSE") || symbol.endsWith(".NS") || symbol.endsWith(".BO");
            boolean validType = quoteType.isBlank() || "EQUITY".equals(quoteType);
            if (indiaExchange && validType) {
                return symbol;
            }
        }

        return "";
    }

    private String extractSymbolFromName(String investmentName) {
        String name = stringValue(investmentName, "").trim();
        if (name.isBlank()) {
            return "";
        }

        Matcher bracketMatcher = BRACKET_SYMBOL_PATTERN.matcher(name);
        if (bracketMatcher.find()) {
            return normalizeSymbol(bracketMatcher.group(1));
        }

        Matcher tickerMatcher = TICKER_PATTERN.matcher(name.toUpperCase(Locale.ROOT));
        if (tickerMatcher.find()) {
            String candidate = tickerMatcher.group(0);
            if (!COMMON_NON_TICKER_WORDS.contains(candidate)) {
                return normalizeSymbol(candidate);
            }
        }

        return "";
    }

    private String normalizeName(String value) {
        return stringValue(value, "")
                .replaceAll("[^A-Za-z0-9& ]", " ")
                .replaceAll("\\s+", " ")
                .trim()
                .toUpperCase(Locale.ROOT);
    }

    private String normalizeSymbol(String symbol) {
        String raw = stringValue(symbol, "").trim().toUpperCase(Locale.ROOT);
        if (raw.isBlank()) {
            return "";
        }

        if (raw.startsWith("^") || raw.endsWith(".NS") || raw.endsWith(".BO")) {
            return raw;
        }

        return raw.matches("^[A-Z0-9]{2,15}$") ? raw + ".NS" : raw;
    }

    private double fetchHistoricalCloseOnOrBefore(String symbol, Instant targetInstant) {
        try {
            String safeSymbol = URLEncoder.encode(symbol, StandardCharsets.UTF_8);
            LocalDate targetDate = targetInstant.atZone(ZoneOffset.UTC).toLocalDate();

            long period1 = targetDate.minusDays(14).atStartOfDay(ZoneOffset.UTC).toEpochSecond();
            long period2 = targetDate.plusDays(1).atStartOfDay(ZoneOffset.UTC).toEpochSecond();

            Map<String, Object> root = fetchJson(
                    "https://query1.finance.yahoo.com/v8/finance/chart/" + safeSymbol
                            + "?interval=1d&period1=" + period1
                            + "&period2=" + period2);

            Map<String, Object> chart = asMap(root.get("chart"));
            List<?> resultList = asList(chart.get("result"));
            Map<String, Object> result = resultList.isEmpty() ? Map.of() : asMap(resultList.get(0));

            List<?> timestamps = asList(result.get("timestamp"));
            Map<String, Object> indicators = asMap(result.get("indicators"));
            List<?> quoteList = asList(indicators.get("quote"));
            Map<String, Object> quote = quoteList.isEmpty() ? Map.of() : asMap(quoteList.get(0));
            List<?> closes = asList(quote.get("close"));

            double selectedClose = 0.0;
            LocalDate selectedDate = null;

            int maxLen = Math.min(timestamps.size(), closes.size());
            for (int i = 0; i < maxLen; i++) {
                long epochSec = toLong(timestamps.get(i));
                if (epochSec <= 0) {
                    continue;
                }

                double close = toDouble(closes.get(i));
                if (close <= 0) {
                    continue;
                }

                LocalDate quoteDate = Instant.ofEpochSecond(epochSec).atZone(ZoneOffset.UTC).toLocalDate();
                if (quoteDate.isAfter(targetDate)) {
                    continue;
                }

                if (selectedDate == null || quoteDate.isAfter(selectedDate)) {
                    selectedDate = quoteDate;
                    selectedClose = close;
                }
            }

            return selectedClose;
        } catch (Exception ignored) {
            return 0.0;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchJson(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .header("User-Agent", "Mozilla/5.0")
                .header("Accept", "application/json,text/plain,*/*")
                .GET()
                .build();
        HttpResponse<String> response = MARKET_HTTP.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("Market request failed: " + response.statusCode());
        }
        return objectMapper.readValue(response.body(), Map.class);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> casted = new HashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (entry.getKey() != null) {
                    casted.put(String.valueOf(entry.getKey()), entry.getValue());
                }
            }
            return casted;
        }
        return Map.of();
    }

    private List<?> asList(Object value) {
        if (value instanceof List<?> list) {
            return list;
        }
        return List.of();
    }

    private String stringValue(Object value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String parsed = String.valueOf(value).trim();
        return parsed.isEmpty() ? fallback : parsed;
    }

    private double toDouble(Object value) {
        if (value == null) {
            return 0.0;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return 0.0;
        }
    }

    private long toLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return 0L;
        }
    }

    @Transactional
    public List<Budget> getBudgets(User user) {
        List<Budget> budgets = budgetRepository.findByUser(user);
        if (budgets == null || budgets.isEmpty()) {
            return budgets;
        }

        LocalDate now = LocalDate.now();
        int currentMonth = now.getMonthValue();
        int currentYear = now.getYear();
        boolean hasUpdates = false;

        for (Budget budget : budgets) {
            Integer month = budget.getMonth();
            Integer year = budget.getYear();

            if (month == null || month < 1 || month > 12) {
                budget.setMonth(currentMonth);
                hasUpdates = true;
            }
            if (year == null || year < 2000 || year > 3000) {
                budget.setYear(currentYear);
                hasUpdates = true;
            }
        }

        if (hasUpdates) {
            try {
                return budgetRepository.saveAll(budgets);
            } catch (RuntimeException ex) {
                return budgets;
            }
        }

        return budgets;
    }

    @Transactional
    public Budget saveBudget(User user, String category, BigDecimal limitAmount, Integer month, Integer year) {
        int normalizedMonth = month != null ? month : LocalDate.now().getMonthValue();
        int normalizedYear = year != null ? year : LocalDate.now().getYear();

        if (normalizedMonth < 1 || normalizedMonth > 12) {
            throw new IllegalArgumentException("Month must be between 1 and 12");
        }
        if (normalizedYear < 2000 || normalizedYear > 3000) {
            throw new IllegalArgumentException("Year must be between 2000 and 3000");
        }

        Budget budget = budgetRepository.findByUserAndCategoryAndMonthAndYear(user, category, normalizedMonth, normalizedYear)
                .orElse(Budget.builder().user(user).category(category).month(normalizedMonth).year(normalizedYear).build());
        budget.setLimitAmount(limitAmount);
        budget.setMonth(normalizedMonth);
        budget.setYear(normalizedYear);
        return budgetRepository.save(budget);
    }

    @Transactional
    public void deleteBudget(User user, String category, Integer month, Integer year) {
        int normalizedMonth = month != null ? month : LocalDate.now().getMonthValue();
        int normalizedYear = year != null ? year : LocalDate.now().getYear();
        budgetRepository.deleteByUserAndCategoryAndMonthAndYear(user, category, normalizedMonth, normalizedYear);
    }
}
