package com.example.hr.department;

import com.example.hr.common.exception.ApiExceptionHandler;
import com.example.hr.department.dto.DepartmentRequest;
import com.example.hr.department.dto.DepartmentResponse;
import com.example.hr.department.exception.DepartmentHasEmployeesException;
import com.example.hr.department.exception.DepartmentNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = DepartmentController.class,
        properties = "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=https://auth.example.test/.well-known/jwks.json"
)
@Import({DepartmentControllerTestSecurityConfig.class, ApiExceptionHandler.class})
class DepartmentControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DepartmentService departmentService;

    @Test
    void hrManagerCreatesDepartment() throws Exception {
        when(departmentService.createDepartment(any(DepartmentRequest.class)))
                .thenReturn(new DepartmentResponse(1, "Human Resources", "People operations"));

        mockMvc.perform(post("/api/departments")
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .authorities(() -> "ROLE_HR_MANAGER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "departmentName": "Human Resources",
                                  "description": "People operations"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.departmentId").value(1))
                .andExpect(jsonPath("$.departmentName").value("Human Resources"));
    }

    @Test
    void employeeCannotCreateDepartment() throws Exception {
        mockMvc.perform(post("/api/departments")
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .authorities(() -> "ROLE_EMPLOYEE"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "departmentName": "Human Resources"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void rejectsBlankDepartmentName() throws Exception {
        mockMvc.perform(post("/api/departments")
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .authorities(() -> "ROLE_ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "departmentName": " "
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"));
    }

    @Test
    void listsDepartments() throws Exception {
        when(departmentService.getDepartments())
                .thenReturn(List.of(new DepartmentResponse(1, "Human Resources", "People operations")));

        mockMvc.perform(get("/api/departments")
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .authorities(() -> "ROLE_HR_MANAGER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].departmentId").value(1));
    }

    @Test
    void viewsDepartment() throws Exception {
        when(departmentService.getDepartment(1))
                .thenReturn(new DepartmentResponse(1, "Human Resources", "People operations"));

        mockMvc.perform(get("/api/departments/1")
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .authorities(() -> "ROLE_ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.departmentName").value("Human Resources"));
    }

    @Test
    void updatesDepartment() throws Exception {
        when(departmentService.updateDepartment(any(Integer.class), any(DepartmentRequest.class)))
                .thenReturn(new DepartmentResponse(1, "HR", "People operations"));

        mockMvc.perform(patch("/api/departments/1")
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .authorities(() -> "ROLE_HR_MANAGER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "departmentName": "HR",
                                  "description": "People operations"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.departmentName").value("HR"));
    }

    @Test
    void deletesDepartment() throws Exception {
        mockMvc.perform(delete("/api/departments/1")
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .authorities(() -> "ROLE_ADMIN")))
                .andExpect(status().isNoContent());
    }

    @Test
    void returnsNotFoundForMissingDepartment() throws Exception {
        when(departmentService.getDepartment(99)).thenThrow(new DepartmentNotFoundException(99));

        mockMvc.perform(get("/api/departments/99")
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .authorities(() -> "ROLE_ADMIN")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Department not found: 99"));
    }

    @Test
    void rejectsDeletingDepartmentWithEmployees() throws Exception {
        doThrow(new DepartmentHasEmployeesException(1)).when(departmentService).deleteDepartment(1);

        mockMvc.perform(delete("/api/departments/1")
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .authorities(() -> "ROLE_ADMIN")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Department has employees: 1"));
    }
}
