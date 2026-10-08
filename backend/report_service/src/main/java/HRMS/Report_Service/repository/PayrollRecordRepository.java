package HRMS.Report_Service.repository;

import HRMS.Report_Service.entity.PayrollRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface PayrollRecordRepository extends JpaRepository<PayrollRecord, Integer> {

    List<PayrollRecord> findByEmployee_EmployeeId(Integer employeeId);

    List<PayrollRecord> findByPeriod(LocalDate period);

    List<PayrollRecord> findByPeriodBetween(
            LocalDate startDate,
            LocalDate endDate
    );
}
