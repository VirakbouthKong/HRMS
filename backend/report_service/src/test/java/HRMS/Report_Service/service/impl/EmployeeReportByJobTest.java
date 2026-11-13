package HRMS.Report_Service.service.impl;

import HRMS.Report_Service.dto.response.EmployeeReportResponse;
import HRMS.Report_Service.entity.Employee;
import HRMS.Report_Service.entity.Job;
import HRMS.Report_Service.repository.EmployeeRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** The repository (database) is mocked; the mapping is real. */
class EmployeeReportByJobTest {

    @Test
    void returnsEmployeesOfThatJobWithTheirTitle() {
        Job worker = new Job();
        worker.setJobId(18);
        worker.setJobTitle("Worker");
        Employee a = new Employee();
        a.setEmployeeId(1);
        a.setFirstName("Dara");
        a.setJob(worker);
        Employee b = new Employee();
        b.setEmployeeId(2);
        b.setFirstName("Sokha");
        b.setJob(worker);

        EmployeeRepository repository = mock(EmployeeRepository.class);
        when(repository.findByJob_JobId(18)).thenReturn(List.of(a, b));

        List<EmployeeReportResponse> result = new EmployeeReportServiceImpl(repository).getEmployeesByJob(18);

        assertThat(result).extracting(EmployeeReportResponse::getEmployeeId).containsExactly(1, 2);
        assertThat(result).extracting(EmployeeReportResponse::getJobTitle).containsOnly("Worker");
    }

    @Test
    void unknownJobGivesEmptyList() {
        EmployeeRepository repository = mock(EmployeeRepository.class);
        when(repository.findByJob_JobId(999)).thenReturn(List.of());

        assertThat(new EmployeeReportServiceImpl(repository).getEmployeesByJob(999)).isEmpty();
    }
}
