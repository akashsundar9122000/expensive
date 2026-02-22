package com.expensify.backend.repository;

import com.expensify.backend.model.UserPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface UserPreferenceRepository extends JpaRepository<UserPreference, UUID> {
}
