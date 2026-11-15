package com.example.hr.employee.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Self-service contact details. Blank values clear a field. Phone: digits, spaces, + ( ) - only. */
public record ContactUpdateRequest(
        @Size(max = 30) @Pattern(regexp = "^$|^[+0-9 ()-]{6,30}$", message = "Enter a valid phone number") String phoneNumber,
        @Size(max = 255) String address,
        @Size(max = 120) String emergencyContactName,
        @Size(max = 30) @Pattern(regexp = "^$|^[+0-9 ()-]{6,30}$", message = "Enter a valid emergency contact phone number") String emergencyContactPhone,
        @Size(max = 40) String emergencyContactRelation
) {
}
