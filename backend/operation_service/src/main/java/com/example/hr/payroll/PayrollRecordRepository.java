package com.example.hr.payroll;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PayrollRecordRepository extends JpaRepository<PayrollRecord, Integer> {

    @Query("SELECT r FROM PayrollRecord r JOIN FETCH r.employee e JOIN FETCH e.department WHERE r.period = :period")
    List<PayrollRecord> findByPeriodWithEmployee(@Param("period") LocalDate period);

    @Query("SELECT r FROM PayrollRecord r JOIN FETCH r.employee e JOIN FETCH e.department WHERE e.employeeId = :employeeId ORDER BY r.period DESC")
    List<PayrollRecord> findByEmployeeId(@Param("employeeId") Integer employeeId);
    
    @Query("SELECT r FROM PayrollRecord r WHERE r.employee.employeeId = :employeeId AND r.period = :period")
    Optional<PayrollRecord> findByEmployeeIdAndPeriod(@Param("employeeId") Integer employeeId, @Param("period") LocalDate period);
}
