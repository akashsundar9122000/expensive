package com.expensify.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "investments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Investment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String type; // Mutual Fund, Stock, Gold, FD, Crypto, Real Estate, PPF

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private BigDecimal amount;

    private BigDecimal returnPct; // optional return percentage
}
