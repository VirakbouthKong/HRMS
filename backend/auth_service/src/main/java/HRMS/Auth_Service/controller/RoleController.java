package HRMS.Auth_Service.controller;

import HRMS.Auth_Service.dto.request.CreateRoleRequest;
import HRMS.Auth_Service.dto.request.UpdateRoleRequest;
import HRMS.Auth_Service.dto.response.ApiResponse;
import HRMS.Auth_Service.dto.response.RoleResponse;
import HRMS.Auth_Service.service.RoleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse> createRole(@Valid @RequestBody CreateRoleRequest request) {
        return ActionReplies.from(roleService.createRole(request));
    }

    @GetMapping
    public List<RoleResponse> getAllRoles() {
        return roleService.getAllRoles();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getRoleById(@PathVariable Integer id) {
        try {
            return ResponseEntity.ok(roleService.getRoleById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse> updateRole(@PathVariable Integer id,
                                  @Valid @RequestBody UpdateRoleRequest request) {
        return ActionReplies.from(roleService.updateRole(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse> deleteRole(@PathVariable Integer id) {
        return ActionReplies.from(roleService.deleteRole(id));
    }
}
