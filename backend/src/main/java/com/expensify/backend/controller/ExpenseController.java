package com.expensify.backend.controller;

import com.expensify.backend.model.BankAccount;
import com.expensify.backend.model.Budget;
import com.expensify.backend.model.Investment;
import com.expensify.backend.model.Transaction;
import com.expensify.backend.model.User;
import com.expensify.backend.repository.UserRepository;
import com.expensify.backend.service.ExpenseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
public class ExpenseController {
    private final ExpenseService expenseService;
    private final UserRepository userRepository;

    @GetMapping("/transactions")
    public ResponseEntity<List<Transaction>> getTransactions(Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        return ResponseEntity.ok(expenseService.getTransactions(user));
    }

    @PostMapping("/transactions")
    public ResponseEntity<Transaction> addTransaction(@RequestBody Transaction transaction,
            @RequestParam String bankName, Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        return ResponseEntity.ok(expenseService.addTransaction(user, transaction, bankName));
    }

    @GetMapping("/banks")
    public ResponseEntity<List<BankAccount>> getBanks(Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        return ResponseEntity.ok(expenseService.getBankAccounts(user));
    }

    @PostMapping("/banks")
    public ResponseEntity<BankAccount> addBank(
            @RequestParam String name,
            @RequestParam(required = false) String balance,
            Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        BigDecimal parsedBalance = parseBalance(balance);
        return ResponseEntity.ok(expenseService.addBank(user, name, parsedBalance));
    }

    @PutMapping("/banks")
    public ResponseEntity<BankAccount> updateBank(
            @RequestParam Long id,
            @RequestParam String name,
            @RequestParam(required = false) String balance,
            Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        BigDecimal parsedBalance = parseBalance(balance);
        return ResponseEntity.ok(expenseService.updateBank(user, id, name, parsedBalance));
    }

    private BigDecimal parseBalance(String balance) {
        if (balance == null || balance.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(balance);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    @DeleteMapping("/banks")
    public ResponseEntity<?> deleteBank(@RequestParam Long id, Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        try {
            expenseService.deleteBank(user, id);
            return ResponseEntity.ok().build();
        } catch (IllegalStateException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats(Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        var prefs = expenseService.getPreferences(user);
        var totalInvestment = expenseService.getTotalInvestmentAmount(user);

        return ResponseEntity.ok(Map.of(
                "balance", expenseService.getTotalBalance(user),
                "bankBalances", expenseService.getBankBalances(user),
                "goalName", prefs != null ? prefs.getGoalName() : "Savings Goal",
                "goalRequired", prefs != null ? prefs.getGoalRequired() : 0,
                "goalCollected", prefs != null ? prefs.getGoalCollected() : 0,
                "totalInvestment", totalInvestment,
                "investAmount", prefs != null && prefs.getInvestAmount() != null ? prefs.getInvestAmount() : 0,
                "monthlyExpenses", expenseService.getMonthlyExpenses(user)));
    }

    @GetMapping("/subscriptions")
    public ResponseEntity<List<com.expensify.backend.model.Subscription>> getSubscriptions(Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        return ResponseEntity.ok(expenseService.getSubscriptions(user));
    }

    @PostMapping("/subscriptions")
    public ResponseEntity<com.expensify.backend.model.Subscription> addSubscription(
            @RequestBody com.expensify.backend.model.Subscription sub, Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        return ResponseEntity.ok(expenseService.addSubscription(user, sub));
    }

    @PutMapping("/subscriptions/{id}")
    public ResponseEntity<com.expensify.backend.model.Subscription> updateSubscription(
            @PathVariable Long id,
            @RequestBody com.expensify.backend.model.Subscription sub,
            Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        return ResponseEntity.ok(expenseService.updateSubscription(user, id, sub));
    }

    @PutMapping("/subscriptions")
    public ResponseEntity<com.expensify.backend.model.Subscription> updateSubscriptionByQuery(
            @RequestParam Long id,
            @RequestBody com.expensify.backend.model.Subscription sub,
            Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        return ResponseEntity.ok(expenseService.updateSubscription(user, id, sub));
    }

    @PostMapping("/subscriptions/update")
    public ResponseEntity<com.expensify.backend.model.Subscription> updateSubscriptionByPost(
            @RequestParam Long id,
            @RequestBody com.expensify.backend.model.Subscription sub,
            Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        return ResponseEntity.ok(expenseService.updateSubscription(user, id, sub));
    }

    @DeleteMapping("/subscriptions/{id}")
    public ResponseEntity<Void> deleteSubscription(@PathVariable Long id) {
        expenseService.deleteSubscription(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/transactions/{id}")
    public ResponseEntity<Void> deleteTransaction(@PathVariable Long id) {
        expenseService.deleteTransaction(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/investments")
    public ResponseEntity<List<Investment>> getInvestments(Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        return ResponseEntity.ok(expenseService.getInvestments(user));
    }

    @PostMapping("/investments")
    public ResponseEntity<Investment> addInvestment(@RequestBody Investment investment, Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        return ResponseEntity.ok(expenseService.addInvestment(user, investment));
    }

    @DeleteMapping("/investments/{id}")
    public ResponseEntity<Void> deleteInvestment(@PathVariable Long id) {
        expenseService.deleteInvestment(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/preferences")
    public ResponseEntity<com.expensify.backend.model.UserPreference> updatePreferences(
            @RequestBody Map<String, Object> body, Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        com.expensify.backend.model.UserPreference prefs = new com.expensify.backend.model.UserPreference();
        if (body.get("goalName") != null) prefs.setGoalName(body.get("goalName").toString());
        if (body.get("goalRequired") != null) prefs.setGoalRequired(new BigDecimal(body.get("goalRequired").toString()));
        if (body.get("goalCollected") != null) prefs.setGoalCollected(new BigDecimal(body.get("goalCollected").toString()));
        if (body.get("totalInvestment") != null) prefs.setTotalInvestment(new BigDecimal(body.get("totalInvestment").toString()));
        if (body.get("investAmount") != null) prefs.setInvestAmount(new BigDecimal(body.get("investAmount").toString()));
        if (body.get("goalCollectedIncrement") != null) {
            prefs.setGoalCollectedIncrement(new BigDecimal(body.get("goalCollectedIncrement").toString()));
        }
        return ResponseEntity.ok(expenseService.updatePreferences(user, prefs));
    }

    @GetMapping("/budgets")
    public ResponseEntity<List<Budget>> getBudgets(Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        return ResponseEntity.ok(expenseService.getBudgets(user));
    }

    @PostMapping("/budgets")
    public ResponseEntity<Budget> saveBudget(@RequestBody Map<String, Object> body, Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        String category = (String) body.get("category");
        BigDecimal limitAmount = new BigDecimal(body.get("limitAmount").toString());
        return ResponseEntity.ok(expenseService.saveBudget(user, category, limitAmount));
    }

    @DeleteMapping("/budgets")
    public ResponseEntity<Void> deleteBudget(@RequestParam String category, Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        expenseService.deleteBudget(user, category);
        return ResponseEntity.ok().build();
    }
}
