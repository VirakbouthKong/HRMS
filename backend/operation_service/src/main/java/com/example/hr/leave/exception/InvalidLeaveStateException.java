package com.example.hr.leave.exception;

import com.example.hr.leave.LeaveStatus;

public class InvalidLeaveStateException extends RuntimeException {

    public InvalidLeaveStateException(Integer leaveId, LeaveStatus currentStatus) {
        super("Leave " + leaveId + " cannot be modified in status: " + currentStatus);
    }
}
