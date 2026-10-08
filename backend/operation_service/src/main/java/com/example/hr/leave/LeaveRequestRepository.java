package com.example.hr.leave;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Integer> {

    List<LeaveRequest> findByEmployeeEmployeeId(Integer employeeId);
    
    List<LeaveRequest> findByEmployeeEmployeeIdAndStatus(Integer employeeId, LeaveStatus status);
}
