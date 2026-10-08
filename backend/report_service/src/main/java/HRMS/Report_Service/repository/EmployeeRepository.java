package HRMS.Report_Service.repository;

import HRMS.Report_Service.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmployeeRepository extends JpaRepository<Employee, Integer> {

    long countByStatus(String status);

    List<Employee> findByStatus(String status);

    List<Employee> findByDepartment_DepartmentId(Integer departmentId);

}
