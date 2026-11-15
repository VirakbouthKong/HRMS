package com.example.hr.payroll;
import com.example.hr.employee.*;
import com.example.hr.attendance.AttendanceRepository;
import com.example.hr.leave.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.assertj.core.api.Assertions.*;

class PayrollCalculationTest {
    final PayrollProfileRepository profiles=mock(PayrollProfileRepository.class);
    final PayrollRecordRepository records=mock(PayrollRecordRepository.class);
    final EmployeeRepository employees=mock(EmployeeRepository.class);
    final AttendanceRepository attendance=mock(AttendanceRepository.class);
    final LeaveRequestRepository leaves=mock(LeaveRequestRepository.class);
    final PayrollService service=new PayrollService(profiles,records,employees,attendance,leaves);
    final Employee employee=new Employee("QA","Employee",LocalDate.of(1995,1,1),"qa@example.test",EmployeeStatus.ACTIVE,null,null);
    PayrollCalculationTest() {
        ReflectionTestUtils.setField(employee,"employeeId",1);
        when(employees.findAll()).thenReturn(List.of(employee));
        when(profiles.findByEmployeeId(1)).thenReturn(Optional.of(PayrollProfile.create(employee,new BigDecimal("1500"),new BigDecimal("50"),BigDecimal.ONE)));
        when(records.findByEmployeeIdAndPeriod(anyInt(),any())).thenReturn(Optional.empty());
        when(attendance.findByEmployeeEmployeeIdAndAttendanceDateBetween(anyInt(),any(),any())).thenReturn(List.of());
    }
    @Test void deductsOnlyUnpaidLeave() {
        LeaveType annual=new LeaveType();ReflectionTestUtils.setField(annual,"paid",true);ReflectionTestUtils.setField(annual,"code","ANNUAL");
        LeaveType unpaid=new LeaveType();ReflectionTestUtils.setField(unpaid,"paid",false);ReflectionTestUtils.setField(unpaid,"code","UNPAID");
        LocalDate day=LocalDate.of(2026,11,16);
        LeaveRequest paidLeave=new LeaveRequest(employee,"ANNUAL",day,day,"test");paidLeave.setTypeDefinition(annual);
        LeaveRequest unpaidLeave=new LeaveRequest(employee,"UNPAID",day.plusDays(1),day.plusDays(1),"test");unpaidLeave.setTypeDefinition(unpaid);
        when(leaves.findByEmployeeEmployeeIdAndStatus(1,LeaveStatus.APPROVED)).thenReturn(List.of(paidLeave,unpaidLeave));
        var result=service.generatePayroll(YearMonth.of(2026,11)).getFirst();
        assertThat(result.unpaidLeaveDays()).isEqualTo(1);
        assertThat(result.netSalary()).isEqualByComparingTo("1450");
    }
    @Test void regenerationPreservesPaidPayslip() {
        PayrollRecord paid=PayrollRecord.create(employee,LocalDate.of(2026,11,1),LocalDate.of(2026,11,13),new BigDecimal("1500"),0,BigDecimal.ZERO,0,BigDecimal.ZERO,new BigDecimal("1500"));paid.markPaid();
        when(records.findByEmployeeIdAndPeriod(anyInt(),any())).thenReturn(Optional.of(paid));
        var result=service.generatePayroll(YearMonth.of(2026,11)).getFirst();
        assertThat(result.status()).isEqualTo("PAID");assertThat(result.netSalary()).isEqualByComparingTo("1500");
        verify(records,never()).delete(any());verify(records,never()).save(any());
    }
}
