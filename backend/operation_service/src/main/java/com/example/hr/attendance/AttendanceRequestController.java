package com.example.hr.attendance;

import com.example.hr.common.security.CurrentEmployee;
import com.example.hr.config.AppProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.List;

@RestController
@RequestMapping("/api/attendance-requests")
@Transactional
public class AttendanceRequestController {
    private final AttendanceRequestRepository requests;
    private final AttendanceRepository attendance;
    private final AttendanceService service;
    private final AppProperties properties;
    public AttendanceRequestController(AttendanceRequestRepository requests,AttendanceRepository attendance,AttendanceService service,AppProperties properties) {
        this.requests=requests; this.attendance=attendance; this.service=service; this.properties=properties;
    }
    private boolean manager() {
        return SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(a -> List.of("ROLE_ADMIN","ROLE_HR_MANAGER","ROLE_HR_STAFF").contains(a.getAuthority()));
    }
    private LocalDateTime now() { return LocalDateTime.now(ZoneId.of(properties.timeZone())); }
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR_MANAGER','HR_STAFF','EMPLOYEE')")
    @Transactional(readOnly=true)
    public List<Response> list() {
        return (manager() ? requests.findAllByOrderByRequestedAtDesc() : requests.findByEmployeeEmployeeIdOrderByRequestedAtDesc(CurrentEmployee.id()))
                .stream().map(this::response).toList();
    }
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','HR_MANAGER','HR_STAFF','EMPLOYEE')")
    public Response submit(@Valid @RequestBody Submit input) {
        Attendance record=attendance.findById(input.attendanceId()).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Attendance not found"));
        if (!manager() && !record.getEmployee().getEmployeeId().equals(CurrentEmployee.id()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"You may only request changes to your own attendance");
        AttendanceService.validateTimes(record.getAttendanceDate(),input.checkIn(),input.checkOut());
        if(requests.existsByAttendanceAttendanceIdAndStatus(record.getAttendanceId(),"PENDING"))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"A correction is already pending for this attendance record");
        AttendanceRequest request=new AttendanceRequest();
        request.attendance=record;request.employee=record.getEmployee();request.reason=input.reason().trim();
        request.requestedCheckIn=input.checkIn();request.requestedCheckOut=input.checkOut();
        request.originalCheckIn=record.getCheckIn();request.originalCheckOut=record.getCheckOut();request.requestedAt=now();
        return response(requests.saveAndFlush(request));
    }
    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR_MANAGER','HR_STAFF')")
    public Response review(@PathVariable Integer id,@Valid @RequestBody Review input) {
        AttendanceRequest request=requests.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Correction request not found"));
        if(!"PENDING".equals(request.status)) throw new ResponseStatusException(HttpStatus.CONFLICT,"This correction was already reviewed");
        if("APPROVED".equals(input.status())) {
            // Do not silently overwrite a punch/correction that happened after this request was submitted.
            if(!java.util.Objects.equals(request.originalCheckIn,request.attendance.getCheckIn()) || !java.util.Objects.equals(request.originalCheckOut,request.attendance.getCheckOut()))
                throw new ResponseStatusException(HttpStatus.CONFLICT,"Attendance changed since this request. Reject it and submit a new request.");
            boolean late=request.requestedCheckIn.toLocalTime().isAfter(properties.workdayStart().plusMinutes(properties.lateGraceMinutes()));
            int minutes=late?(int)Duration.between(properties.workdayStart(),request.requestedCheckIn.toLocalTime()).toMinutes():0;
            service.correctAttendance(request.attendance.getAttendanceId(),CurrentEmployee.idOrNull(),request.requestedCheckIn,request.requestedCheckOut,
                    late?AttendanceStatus.LATE:AttendanceStatus.PRESENT,minutes,request.reason);
        }
        request.status=input.status();request.reviewedAt=now();request.reviewedBy=CurrentEmployee.idOrNull();
        var auth=SecurityContextHolder.getContext().getAuthentication();
        request.reviewedByName=auth.getPrincipal() instanceof Jwt jwt?jwt.getClaimAsString("username"):auth.getName();
        return response(requests.saveAndFlush(request));
    }
    private String time(LocalDateTime value) { return value==null?null:value.toLocalTime().toString(); }
    private Response response(AttendanceRequest r) {
        return new Response(r.correctionId,r.attendance.getAttendanceId(),r.employee.getEmployeeId(),r.employee.getFirstName()+" "+r.employee.getLastName(),r.attendance.getAttendanceDate(),
                time(r.originalCheckIn),time(r.originalCheckOut),time(r.requestedCheckIn),time(r.requestedCheckOut),r.reason,r.status,r.requestedAt,r.reviewedByName,r.reviewedAt);
    }
    public record Submit(@NotNull Integer attendanceId,@NotNull LocalDateTime checkIn,LocalDateTime checkOut,@NotBlank @Size(max=500) String reason) {}
    public record Review(@NotBlank @Pattern(regexp="APPROVED|REJECTED") String status) {}
    public record Response(Integer correctionId,Integer attendanceId,Integer employeeId,String employeeName,LocalDate attendanceDate,String originalCheckIn,String originalCheckOut,String requestedCheckIn,String requestedCheckOut,String reason,String status,LocalDateTime requestedAt,String reviewedBy,LocalDateTime reviewedAt) {}
}
