package com.example.hr.leave;

import jakarta.persistence.*;

@Entity
@Table(name = "tbl_leave_type")
public class LeaveType {
    @Id @Column(name = "leave_type_id") private Integer id;
    private String code;
    private boolean paid;
    private boolean active;
    public Integer getId() { return id; }
    public String getCode() { return code; }
    public boolean isPaid() { return paid; }
    public boolean isActive() { return active; }
}
