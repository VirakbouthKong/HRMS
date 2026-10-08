package com.example.hr.leave.exception;

public class LeaveNotFoundException extends RuntimeException {

    public LeaveNotFoundException(Integer leaveId) {
        super("Leave request not found: " + leaveId);
    }
}
