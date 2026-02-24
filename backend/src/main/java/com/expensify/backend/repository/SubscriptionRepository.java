package com.expensify.backend.repository;

import com.expensify.backend.model.Subscription;
import com.expensify.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    List<Subscription> findByUser(User user);
    Optional<Subscription> findByIdAndUser(Long id, User user);
}
