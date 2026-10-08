package com.example.hr.attendance;

import com.example.hr.attendance.dto.AttendanceResponse;
import com.example.hr.attendance.dto.CorrectionResponse;
import com.example.hr.attendance.dto.DailySummaryResponse;
import com.example.hr.attendance.dto.MarkAbsencesResponse;
import com.example.hr.attendance.exception.AttendanceNotFoundException;
import com.example.hr.attendance.exception.DuplicateAttendanceException;
import com.example.hr.attendance.exception.InvalidAttendanceOperationException;
import com.example.hr.config.AppProperties;
import com.example.hr.employee.Employee;
import com.example.hr.employee.EmployeeRepository;
import com.example.hr.employee.EmployeeStatus;
import com.example.hr.employee.exception.EmployeeNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final AttendanceCorrectionAuditRepository correctionAuditRepository;
    private final EmployeeRepository employeeRepository;
    private final AppProperties appProperties;

    public AttendanceService(AttendanceRepository attendanceRepository,
                             AttendanceCorrectionAuditRepository correctionAuditRepository,
                             EmployeeRepository employeeRepository,
                             AppProperties appProperties) {
        this.attendanceRepository = attendanceRepository;
        this.correctionAuditRepository = correctionAuditRepository;
        this.employeeRepository = employeeRepository;
        this.appProperties = appProperties;
    }

    private AttendanceResponse toResponse(Attendance a) {
        String employeeName = a.getEmployee().getFirstName() + " " + a.getEmployee().getLastName();
        return new AttendanceResponse(
                a.getAttendanceId(),
                a.getEmployee().getEmployeeId(),
                employeeName,
                a.getAttendanceDate(),
                a.getCheckIn(),
                a.getCheckOut(),
                a.getLateMinutes(),
                a.getStatus()
        );
    }

    private CorrectionResponse toCorrectionResponse(AttendanceCorrectionAudit a) {
        String correctedByName = a.getCorrectedBy().getFirstName() + " " + a.getCorrectedBy().getLastName();
        return new CorrectionResponse(
                a.getCorrectionAuditId(),
                a.getAttendance().getAttendanceId(),
                a.getCorrectedBy().getEmployeeId(),
                correctedByName,
                a.getCorrectionReason(),
                a.getPreviousCheckIn(),
                a.getPreviousCheckOut(),
                a.getPreviousLateMinutes(),
                a.getPreviousStatus(),
                a.getCorrectedAt()
        );
    }

    public AttendanceResponse checkIn(Integer employeeId) {
        ZoneId zone = ZoneId.of(appProperties.timeZone());
        LocalDate today = LocalDate.now(zone);
        LocalDateTime now = LocalDateTime.now(zone);

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new EmployeeNotFoundException(employeeId));

        attendanceRepository.findByEmployeeEmployeeIdAndAttendanceDate(employeeId, today)
                .ifPresent(a -> {
                    throw new DuplicateAttendanceException(employeeId, today.toString());
                });

        LocalTime checkInTimeOfDay = now.toLocalTime();
        LocalTime lateThreshold = appProperties.workdayStart().plusMinutes(appProperties.lateGraceMinutes());

        AttendanceStatus status;
        int lateMinutes = 0;

        if (checkInTimeOfDay.isAfter(lateThreshold)) {
            status = AttendanceStatus.LATE;
            long minutes = Duration.between(appProperties.workdayStart(), checkInTimeOfDay).toMinutes();
            lateMinutes = minutes > 0 ? (int) minutes : 0;
        } else {
            status = AttendanceStatus.PRESENT;
        }

        Attendance attendance = Attendance.checkIn(employee, today, now, status, lateMinutes);
        Attendance saved = attendanceRepository.save(attendance);
        return toResponse(saved);
    }

    public AttendanceResponse checkOut(Integer employeeId) {
        ZoneId zone = ZoneId.of(appProperties.timeZone());
        LocalDate today = LocalDate.now(zone);
        LocalDateTime now = LocalDateTime.now(zone);

        Attendance attendance = attendanceRepository.findByEmployeeEmployeeIdAndAttendanceDate(employeeId, today)
                .orElseThrow(() -> new InvalidAttendanceOperationException("No check-in found for today"));

        if (attendance.getCheckOut() != null) {
            throw new InvalidAttendanceOperationException("Already checked out today");
        }

        attendance.recordCheckOut(now);
        Attendance saved = attendanceRepository.save(attendance);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<AttendanceResponse> getAttendanceByDate(LocalDate date) {
        LocalDate effectiveDate = date != null ? date : LocalDate.now(ZoneId.of(appProperties.timeZone()));
        return attendanceRepository.findByAttendanceDate(effectiveDate)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AttendanceResponse getAttendanceRecord(Integer attendanceId) {
        return attendanceRepository.findById(attendanceId)
                .map(this::toResponse)
                .orElseThrow(() -> new AttendanceNotFoundException(attendanceId));
    }

    @Transactional(readOnly = true)
    public AttendanceResponse getEmployeeAttendance(Integer employeeId, LocalDate date) {
        LocalDate effectiveDate = date != null ? date : LocalDate.now(ZoneId.of(appProperties.timeZone()));
        return attendanceRepository.findByEmployeeEmployeeIdAndAttendanceDate(employeeId, effectiveDate)
                .map(this::toResponse)
                .orElseThrow(() -> new InvalidAttendanceOperationException("Attendance not found for employee on " + effectiveDate));
    }

    public AttendanceResponse correctAttendance(Integer attendanceId, Integer correctorId, LocalDateTime newCheckIn, LocalDateTime newCheckOut, AttendanceStatus newStatus, int newLateMinutes, String reason) {
        Attendance attendance = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new AttendanceNotFoundException(attendanceId));

        Employee corrector = employeeRepository.findById(correctorId)
                .orElseThrow(() -> new EmployeeNotFoundException(correctorId));

        AttendanceCorrectionAudit audit = attendance.applyCorrection(corrector, reason, newCheckIn, newCheckOut, newStatus, newLateMinutes);
        correctionAuditRepository.save(audit);
        Attendance saved = attendanceRepository.save(attendance);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<CorrectionResponse> getCorrectionHistory(Integer attendanceId) {
        attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new AttendanceNotFoundException(attendanceId));

        return correctionAuditRepository.findByAttendanceAttendanceIdOrderByCorrectedAtDesc(attendanceId).stream()
                .map(this::toCorrectionResponse)
                .collect(Collectors.toList());
    }

    public MarkAbsencesResponse markAbsences(LocalDate date) {
        List<Employee> activeEmployees = employeeRepository.findByStatus(EmployeeStatus.ACTIVE);
        int count = 0;
        for (Employee employee : activeEmployees) {
            Optional<Attendance> attendance = attendanceRepository.findByEmployeeEmployeeIdAndAttendanceDate(employee.getEmployeeId(), date);
            if (attendance.isEmpty()) {
                attendanceRepository.save(Attendance.markAbsent(employee, date));
                count++;
            }
        }
        return new MarkAbsencesResponse(date, count);
    }

    @Transactional(readOnly = true)
    public DailySummaryResponse getDailySummary(LocalDate date) {
        List<Attendance> attendances = attendanceRepository.findByAttendanceDate(date);
        long presentCount = attendances.stream().filter(a -> a.getStatus() == AttendanceStatus.PRESENT).count();
        long lateCount = attendances.stream().filter(a -> a.getStatus() == AttendanceStatus.LATE).count();
        long absentCount = attendances.stream().filter(a -> a.getStatus() == AttendanceStatus.ABSENT).count();
        return new DailySummaryResponse(date, presentCount, lateCount, absentCount);
    }
}
