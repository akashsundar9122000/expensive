package com.expensify.backend.repository;

import com.expensify.backend.model.BankAccount;
import com.expensify.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BankAccountRepository extends JpaRepository<BankAccount, Long> {
    List<BankAccount> findByUser(User user);
    Optional<BankAccount> findByIdAndUser(Long id, User user);
    void deleteByUser(User user);
}
