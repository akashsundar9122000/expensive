package com.expensify.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "user_preferences")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPreference {
    @Id
    private UUID userId;

    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    private String goalName;
    private BigDecimal goalRequired;
    private BigDecimal goalCollected;
    private BigDecimal totalInvestment;
    private BigDecimal investAmount;
}
