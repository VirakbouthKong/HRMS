package HRMS.Auth_Service.repository;

import HRMS.Auth_Service.entity.Account;
import HRMS.Auth_Service.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Integer> {

    Optional<Account> findByUserName(String userName);

    Optional<Account> findByEmail(String email);

    boolean existsByUserName(String userName);

    boolean existsByEmail(String email);

    boolean existsByRole(Role role);

}