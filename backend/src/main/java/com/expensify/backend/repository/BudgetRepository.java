package com.expensify.backend.repository;

import com.expensify.backend.model.Budget;
import com.expensify.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BudgetRepository extends JpaRepository<Budget, Long> {
    List<Budget> findByUser(User user);

    Optional<Budget> findByUserAndCategory(User user, String category);

    void deleteByUserAndCategory(User user, String category);
}
