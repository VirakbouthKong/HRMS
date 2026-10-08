package com.example.hr.employee;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmployeeRepository extends JpaRepository<Employee, Integer> {

    boolean existsByEmailIgnoreCase(String email);

    List<Employee> findByStatus(EmployeeStatus status);

    boolean existsByDepartmentDepartmentId(Integer departmentId);

    List<Employee> findByContractEndDateBetween(java.time.LocalDate start, java.time.LocalDate end);
}
