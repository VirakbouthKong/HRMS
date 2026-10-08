package HRMS.Auth_Service.repository;

import HRMS.Auth_Service.entity.Account;
import HRMS.Auth_Service.entity.OTPVerification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OTPRepository extends JpaRepository<OTPVerification, Integer> {

    Optional<OTPVerification> findTopByAccountOrderByCreatedDateDesc(Account account);

    Optional<OTPVerification> findByAccountAndOtpCode(Account account,
                                                      String otpCode);

}