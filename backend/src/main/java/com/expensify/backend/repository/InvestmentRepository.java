package com.expensify.backend.repository;

import com.expensify.backend.model.Investment;
import com.expensify.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InvestmentRepository extends JpaRepository<Investment, Long> {
    List<Investment> findByUser(User user);
    void deleteByUser(User user);
}
