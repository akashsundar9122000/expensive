package com.expensify.backend.repository;

import com.expensify.backend.model.BankAccount;
import com.expensify.backend.model.Transaction;
import com.expensify.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByUserOrderByDateDesc(User user);
    List<Transaction> findByUserAndBankAccount(User user, BankAccount bankAccount);
    void deleteByUser(User user);
}
