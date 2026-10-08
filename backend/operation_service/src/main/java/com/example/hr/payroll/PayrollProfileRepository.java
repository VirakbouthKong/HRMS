package com.example.hr.payroll;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PayrollProfileRepository extends JpaRepository<PayrollProfile, Integer> {

    @Query("SELECT p FROM PayrollProfile p JOIN FETCH p.employee e JOIN FETCH e.department WHERE e.employeeId = :employeeId")
    Optional<PayrollProfile> findByEmployeeId(@Param("employeeId") Integer employeeId);
}
