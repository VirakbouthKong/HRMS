package HRMS.Auth_Service.mapper;

import HRMS.Auth_Service.dto.request.CreateAccountRequest;
import HRMS.Auth_Service.dto.response.AccountResponse;
import HRMS.Auth_Service.entity.Account;
import HRMS.Auth_Service.entity.Role;
import org.springframework.stereotype.Component;

@Component
public class AccountMapper {

    /**
     * Convert CreateAccountRequest -> Account Entity
     */
    public Account toEntity(CreateAccountRequest request) {

        Account account = new Account();

        account.setUserName(request.getUserName());
        account.setUserPwd(request.getUserPwd()); // BCrypt later in Service
        account.setEmail(request.getEmail());
        account.setStatus(request.getStatus());

        account.setEmployeeId(request.getEmployeeId());

        account.setIsFirstLogin(true);

        Role role = new Role();
        role.setRoleId(request.getRoleId());
        account.setRole(role);

        return account;
    }

    /**
     * Convert Account Entity -> AccountResponse
     */
    public AccountResponse toResponse(Account account) {

        AccountResponse response = new AccountResponse();

        response.setAccountId(account.getAccountId());
        response.setUserName(account.getUserName());
        response.setEmail(account.getEmail());
        response.setStatus(account.getStatus());
        response.setIsFirstLogin(account.getIsFirstLogin());
        response.setEmployeeId(account.getEmployeeId());

        if (account.getRole() != null) {
            response.setRoleName(account.getRole().getRoleName());
        }

        response.setCreatedDate(account.getCreatedDate());
        response.setUpdatedDate(account.getUpdatedDate());

        return response;
    }
}
