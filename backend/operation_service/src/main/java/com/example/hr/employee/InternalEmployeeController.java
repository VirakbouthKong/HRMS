package com.example.hr.employee;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/internal/employees")
public class InternalEmployeeController {

    private final EmployeeService employeeService;

    public InternalEmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @PostMapping("/check-contract-expiries")
    public ResponseEntity<Void> checkContractExpiries(
            @RequestParam(value = "daysAhead", defaultValue = "30") int daysAhead) {
        
        employeeService.checkContractExpiries(daysAhead);
        return ResponseEntity.ok().build();
    }
}
