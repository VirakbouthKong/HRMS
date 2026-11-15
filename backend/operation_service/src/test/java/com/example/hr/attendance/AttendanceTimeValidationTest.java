package com.example.hr.attendance;
import org.junit.jupiter.api.Test;
import java.time.*;
import static org.assertj.core.api.Assertions.*;
class AttendanceTimeValidationTest {
    private final LocalDate date=LocalDate.of(2026,11,13);
    @Test void rejectsCheckoutBeforeCheckin() {
        assertThatThrownBy(()->AttendanceService.validateTimes(date,date.atTime(8,0),date.atTime(7,0))).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void rejectsDifferentDate() {
        assertThatThrownBy(()->AttendanceService.validateTimes(date,date.plusDays(1).atTime(8,0),null)).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void acceptsOpenAndCompletedWorkday() {
        assertThatCode(()->AttendanceService.validateTimes(date,date.atTime(8,0),null)).doesNotThrowAnyException();
        assertThatCode(()->AttendanceService.validateTimes(date,date.atTime(8,0),date.atTime(17,0))).doesNotThrowAnyException();
    }
}
