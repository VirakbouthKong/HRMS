package com.example.hr.attendance.dto;

import java.time.LocalDate;

public record MarkAbsencesResponse(LocalDate date, int absencesMarked) {
}
