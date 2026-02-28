package com.expensify.backend.repository;

import com.expensify.backend.model.Budget;
import com.expensify.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BudgetRepository extends JpaRepository<Budget, Long> {
    List<Budget> findByUser(User user);

    Optional<Budget> findByUserAndCategoryAndMonthAndYear(User user, String category, Integer month, Integer year);

    void deleteByUserAndCategoryAndMonthAndYear(User user, String category, Integer month, Integer year);

    void deleteByUser(User user);
}
