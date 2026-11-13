package com.example.hr.job;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JobRepository extends JpaRepository<Job, Integer> {

    List<Job> findByDepartmentDepartmentIdOrderByJobTitle(Integer departmentId);

    List<Job> findAllByOrderByJobTitle();

    List<Job> findByDepartmentDepartmentId(Integer departmentId);
}
