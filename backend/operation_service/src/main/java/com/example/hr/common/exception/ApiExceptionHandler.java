package com.example.hr.common.exception;

import com.example.hr.attendance.exception.AttendanceNotFoundException;
import com.example.hr.attendance.exception.DuplicateAttendanceException;
import com.example.hr.attendance.exception.InvalidAttendanceOperationException;
import com.example.hr.department.exception.DepartmentHasEmployeesException;
import com.example.hr.department.exception.DepartmentNotFoundException;
import com.example.hr.department.exception.DuplicateDepartmentException;
import com.example.hr.employee.exception.DuplicateEmployeeEmailException;
import com.example.hr.employee.exception.EmployeeNotFoundException;
import com.example.hr.leave.exception.InvalidLeaveStateException;
import com.example.hr.leave.exception.LeaveNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

@RestControllerAdvice
public class ApiExceptionHandler {


    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiError handleValidation(MethodArgumentNotValidException exception) {
        List<String> errors = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .toList();
        return new ApiError("Validation failed", errors);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiError handleIllegalArgument(IllegalArgumentException exception) {
        return new ApiError(exception.getMessage(), List.of());
    }


    @ExceptionHandler(DepartmentNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiError handleNotFound(DepartmentNotFoundException exception) {
        return new ApiError(exception.getMessage(), List.of());
    }

    @ExceptionHandler(EmployeeNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiError handleNotFound(EmployeeNotFoundException exception) {
        return new ApiError(exception.getMessage(), List.of());
    }

    @ExceptionHandler(LeaveNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiError handleNotFound(LeaveNotFoundException exception) {
        return new ApiError(exception.getMessage(), List.of());
    }

    @ExceptionHandler(AttendanceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiError handleNotFound(AttendanceNotFoundException exception) {
        return new ApiError(exception.getMessage(), List.of());
    }


    @ExceptionHandler(DuplicateDepartmentException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiError handleDuplicateDepartment(DuplicateDepartmentException exception) {
        return new ApiError(exception.getMessage(), List.of());
    }

    @ExceptionHandler(DepartmentHasEmployeesException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiError handleDepartmentHasEmployees(DepartmentHasEmployeesException exception) {
        return new ApiError(exception.getMessage(), List.of());
    }

    @ExceptionHandler(DuplicateEmployeeEmailException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiError handleDuplicateEmail(DuplicateEmployeeEmailException exception) {
        return new ApiError(exception.getMessage(), List.of());
    }

    @ExceptionHandler(DuplicateAttendanceException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiError handleDuplicateAttendance(DuplicateAttendanceException exception) {
        return new ApiError(exception.getMessage(), List.of());
    }


    @ExceptionHandler(InvalidLeaveStateException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiError handleInvalidLeaveState(InvalidLeaveStateException exception) {
        return new ApiError(exception.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidAttendanceOperationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiError handleInvalidAttendance(InvalidAttendanceOperationException exception) {
        return new ApiError(exception.getMessage(), List.of());
    }


    public record ApiError(String message, List<String> errors) {
    }
}
