package com.example.hr.common.security;

import com.example.hr.employee.exception.EmployeeNotLinkedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * The employee behind the current request, from the JWT's "employeeId" claim.
 * Never uses the token subject: that is the ACCOUNT id, a different number (sysadmin is account 4 but no employee).
 */
public final class CurrentEmployee {

    private CurrentEmployee() {
    }

    /** @throws EmployeeNotLinkedException (404) when the account has no employee */
    public static Integer id() {
        Integer id = idOrNull();
        if (id == null) {
            throw new EmployeeNotLinkedException();
        }
        return id;
    }

    public static Integer idOrNull() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            String employeeId = jwt.getClaimAsString("employeeId");
            if (employeeId != null && employeeId.matches("\\d+")) {
                return Integer.valueOf(employeeId);
            }
        }
        return null;
    }
}
