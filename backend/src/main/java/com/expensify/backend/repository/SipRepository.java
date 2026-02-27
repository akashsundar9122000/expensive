package com.expensify.backend.repository;

import com.expensify.backend.model.Sip;
import com.expensify.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SipRepository extends JpaRepository<Sip, Long> {
    List<Sip> findByUser(User user);
    Optional<Sip> findByIdAndUser(Long id, User user);
    void deleteByUser(User user);
}
