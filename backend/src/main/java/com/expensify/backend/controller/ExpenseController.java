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
    public ResponseEntity<BankAccount> addBank(@RequestParam String name, Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
        return ResponseEntity.ok(expenseService.addBank(user, name));
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
            @RequestBody com.expensify.backend.model.UserPreference prefs, Principal principal) {
        User user = userRepository.findByEmail(principal.getName()).orElseThrow();
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
