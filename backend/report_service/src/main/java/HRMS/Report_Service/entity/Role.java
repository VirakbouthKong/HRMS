package HRMS.Report_Service.entity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "tbl_role")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "role_id")
    private Integer roleId;

    @Column(name = "role_name", nullable = false, length = 255)
    private String roleName;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "created_date")
    private LocalDateTime createdDate;
}
