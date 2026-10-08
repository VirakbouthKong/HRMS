package com.example.hr.leave.dto;

import com.example.hr.leave.LeaveStatus;

import java.time.LocalDate;

public record LeaveResponse(
        Integer leaveId,
        Integer employeeId,
        String employeeName,
        String leaveType,
        LocalDate startDate,
        LocalDate endDate,
        String reason,
        LeaveStatus status,
        Integer approvedById,
        String approvedByName
) {
}
