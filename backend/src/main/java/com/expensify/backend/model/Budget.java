package com.expensify.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "budgets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class Budget {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private BigDecimal limitAmount;

    @Column
    private Integer month;

    @Column
    private Integer year;

    @PrePersist
    public void applyDefaultMonthYear() {
        LocalDate now = LocalDate.now();
        if (month == null || month < 1 || month > 12) {
            month = now.getMonthValue();
        }
        if (year == null || year < 2000 || year > 3000) {
            year = now.getYear();
        }
    }
}
