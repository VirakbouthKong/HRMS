package HRMS.Auth_Service.config;

import HRMS.Auth_Service.entity.Account;
import HRMS.Auth_Service.entity.Role;
import HRMS.Auth_Service.repository.AccountRepository;
import HRMS.Auth_Service.repository.RoleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Runs once at startup:
 * 1. Makes sure the 4 system roles exist (the gateway and Operation service check these names).
 * 2. Optionally creates the first ADMIN account, so someone can log in and create the other accounts.
 */
@Component
public class DataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private static final Map<String, String> SYSTEM_ROLES = new LinkedHashMap<>();
    static {
        SYSTEM_ROLES.put("ADMIN", "Full system access, including accounts and roles");
        SYSTEM_ROLES.put("HR_MANAGER", "Manage all HR activities");
        SYSTEM_ROLES.put("HR_STAFF", "Manage some HR activities");
        SYSTEM_ROLES.put("EMPLOYEE", "Access to own attendance, leave and payroll");
    }

    private final RoleRepository roleRepository;
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminUsername;
    private final String adminPassword;
    private final String adminEmail;

    public DataInitializer(RoleRepository roleRepository,
                           AccountRepository accountRepository,
                           PasswordEncoder passwordEncoder,
                           @Value("${app.bootstrap-admin.username:}") String adminUsername,
                           @Value("${app.bootstrap-admin.password:}") String adminPassword,
                           @Value("${app.bootstrap-admin.email:}") String adminEmail) {
        this.roleRepository = roleRepository;
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
        this.adminEmail = adminEmail;
    }

    @Override
    public void run(ApplicationArguments args) {
        SYSTEM_ROLES.forEach((name, description) -> {
            if (roleRepository.findByRoleName(name).isEmpty()) {
                roleRepository.save(Role.builder()
                        .roleName(name)
                        .description(description)
                        .createdDate(LocalDateTime.now())
                        .build());
                log.info("Created missing role {}", name);
            }
        });

        if (adminUsername.isBlank()) {
            return;
        }
        if (adminPassword.isBlank() || adminEmail.isBlank()) {
            log.warn("BOOTSTRAP_ADMIN_USERNAME is set but password or email is missing; skipping admin creation");
            return;
        }
        if (accountRepository.existsByUserName(adminUsername)) {
            log.info("Bootstrap admin '{}' already exists; leaving it unchanged", adminUsername);
            return;
        }
        if (accountRepository.existsByEmail(adminEmail)) {
            log.warn("Cannot create bootstrap admin: email {} is already used by another account", adminEmail);
            return;
        }

        Role adminRole = roleRepository.findByRoleName("ADMIN").orElseThrow();
        accountRepository.save(Account.builder()
                .userName(adminUsername)
                .userPwd(passwordEncoder.encode(adminPassword))
                .email(adminEmail)
                .status("ACTIVE")
                .isFirstLogin(false)
                .role(adminRole)
                .build());
        log.info("Created bootstrap ADMIN account '{}'", adminUsername);
    }
}
