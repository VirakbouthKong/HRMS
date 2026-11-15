package com.example.hr.leave;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface LeaveTypeRepository extends JpaRepository<LeaveType, Integer> {
    Optional<LeaveType> findByCodeIgnoreCase(String code);
    @org.springframework.data.jpa.repository.Query(value = """
        SELECT count(*) FROM generate_series(CAST(:start AS date), CAST(:end AS date), interval '1 day') AS d(day)
        WHERE extract(isodow FROM d.day) < 6 AND NOT EXISTS (
            SELECT 1 FROM public.tbl_holiday h WHERE h.holiday_date = CAST(d.day AS date)
            OR (h.recurring_yearly AND extract(month FROM h.holiday_date)=extract(month FROM d.day)
                AND extract(day FROM h.holiday_date)=extract(day FROM d.day)))
        """, nativeQuery = true)
    long workingDays(@org.springframework.data.repository.query.Param("start") java.time.LocalDate start,
                     @org.springframework.data.repository.query.Param("end") java.time.LocalDate end);
}
