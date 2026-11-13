package HRMS.Auth_Service.repository;

import HRMS.Auth_Service.entity.Account;
import HRMS.Auth_Service.entity.OTPVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OTPRepository extends JpaRepository<OTPVerification, Integer> {

    Optional<OTPVerification> findTopByAccountOrderByCreatedDateDesc(Account account);

    @Query("select o from OTPVerification o where o.account = :account and (o.isUsed = false or o.isUsed is null)")
    List<OTPVerification> findUnusedByAccount(@Param("account") Account account);

}
