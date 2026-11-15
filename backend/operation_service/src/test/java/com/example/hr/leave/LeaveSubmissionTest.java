package com.example.hr.leave;

import com.example.hr.employee.*;
import com.example.hr.leave.dto.LeaveSubmitRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class LeaveSubmissionTest {
    private final LeaveRequestRepository requests = mock(LeaveRequestRepository.class);
    private final EmployeeRepository employees = mock(EmployeeRepository.class);
    private final LeaveTypeRepository types = mock(LeaveTypeRepository.class);
    private final LeaveService service = new LeaveService(requests, employees, types);
    private final Employee employee = new Employee("Test", "Employee", LocalDate.of(1995, 1, 1),
            "test@example.test", EmployeeStatus.ACTIVE, null, null);
    private final LocalDate start = LocalDate.of(2026, 12, 1);

    LeaveSubmissionTest() {
        ReflectionTestUtils.setField(employee, "employeeId", 1);
        when(employees.findById(1)).thenReturn(Optional.of(employee));
        LeaveType annual = new LeaveType();
        ReflectionTestUtils.setField(annual, "code", "ANNUAL");
        ReflectionTestUtils.setField(annual, "active", true);
        when(types.findByCodeIgnoreCase("ANNUAL")).thenReturn(Optional.of(annual));
        when(requests.save(any())).thenAnswer(call -> call.getArgument(0));
    }

    @AfterEach void clearSecurityContext() { SecurityContextHolder.clearContext(); }

    @Test void mapsUiLabelAndPersistsCalculatedWorkingDays() {
        when(types.workingDays(start, start.plusDays(2))).thenReturn(3L);
        var response = service.submitLeave(1, new LeaveSubmitRequest("Annual Leave", start, start.plusDays(2), "Test"));
        assertThat(response.leaveType()).isEqualTo("ANNUAL");
        var saved = org.mockito.ArgumentCaptor.forClass(LeaveRequest.class);
        verify(requests).save(saved.capture());
        assertThat(ReflectionTestUtils.getField(saved.getValue(), "dayPortion")).isEqualTo(BigDecimal.valueOf(3));
    }

    @Test void rejectsRequestsWithoutWorkingDaysBeforeSaving() {
        when(types.workingDays(any(), any())).thenReturn(0L);
        assertThatThrownBy(() -> service.submitLeave(1, new LeaveSubmitRequest("Annual Leave", start, start, "Test")))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("working day");
        verify(requests, never()).save(any());
    }

    @Test void recordsAdminReviewerWithoutEmployeeLink() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("sysadmin", "unused"));
        when(requests.findById(7)).thenReturn(Optional.of(new LeaveRequest(employee, "ANNUAL", start, start, "Test")));
        var response = service.approveLeave(7, null);
        assertThat(response.status()).isEqualTo(LeaveStatus.APPROVED);
        assertThat(response.approvedByName()).isEqualTo("sysadmin");
        verifyNoInteractions(employees);
    }
}
