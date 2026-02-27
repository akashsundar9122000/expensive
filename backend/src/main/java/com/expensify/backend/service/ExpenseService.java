package com.expensify.backend.service;

import com.expensify.backend.model.*;
import com.expensify.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
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

    public List<Budget> getBudgets(User user) {
        return budgetRepository.findByUser(user);
    }

    @Transactional
    public Budget saveBudget(User user, String category, BigDecimal limitAmount) {
        Budget budget = budgetRepository.findByUserAndCategory(user, category)
                .orElse(Budget.builder().user(user).category(category).build());
        budget.setLimitAmount(limitAmount);
        return budgetRepository.save(budget);
    }

    @Transactional
    public void deleteBudget(User user, String category) {
        budgetRepository.deleteByUserAndCategory(user, category);
    }
}
