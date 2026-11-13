package com.example.hr.job;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JobHistoryRepository extends JpaRepository<JobHistory, Integer> {

    /** The employee's current job period (no end date). */
    Optional<JobHistory> findFirstByEmployeeEmployeeIdAndEndDateIsNull(Integer employeeId);

    List<JobHistory> findByEmployeeEmployeeIdOrderByStartedDateDescJobHistoryIdDesc(Integer employeeId);

    boolean existsByJobJobId(Integer jobId);
}
