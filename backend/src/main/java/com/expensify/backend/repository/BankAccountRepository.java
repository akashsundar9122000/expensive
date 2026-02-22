package com.expensify.backend.repository;

import com.expensify.backend.model.BankAccount;
import com.expensify.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BankAccountRepository extends JpaRepository<BankAccount, Long> {
    List<BankAccount> findByUser(User user);
}
