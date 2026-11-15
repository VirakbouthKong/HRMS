package HRMS.Auth_Service.controller;
import HRMS.Auth_Service.dto.response.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import static org.assertj.core.api.Assertions.*;
class ActionRepliesTest {
    @Test void missingAccountAndRoleAre404() {
        assertThat(ActionReplies.from(new ApiResponse(false,"Account not found.")).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(ActionReplies.from(new ApiResponse(false,"Role not found.")).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
    @Test void duplicateIs409() { assertThat(ActionReplies.from(new ApiResponse(false,"Username already exists.")).getStatusCode()).isEqualTo(HttpStatus.CONFLICT); }
    @Test void successfulActionIs200() { assertThat(ActionReplies.from(new ApiResponse(true,"Saved")).getStatusCode()).isEqualTo(HttpStatus.OK); }
}
