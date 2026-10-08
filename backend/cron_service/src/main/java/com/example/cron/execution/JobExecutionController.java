package com.example.cron.execution;

import com.example.cron.job.CronJob;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/jobs")
public class JobExecutionController {

    private final JobExecutionService executionService;
    private final Map<String, CronJob> cronJobs;

    public JobExecutionController(JobExecutionService executionService, List<CronJob> jobs) {
        this.executionService = executionService;
        this.cronJobs = jobs.stream().collect(Collectors.toMap(CronJob::getJobName, Function.identity()));
    }

    @GetMapping("/history")
    public ResponseEntity<List<JobExecution>> getHistory() {
        return ResponseEntity.ok(executionService.getRecentHistory());
    }

    @PostMapping("/{jobName}/trigger")
    public ResponseEntity<String> triggerJob(@PathVariable String jobName) {
        CronJob job = cronJobs.get(jobName);
        if (job == null) {
            return ResponseEntity.badRequest().body("Job not found: " + jobName);
        }
        
        // Run job asynchronously to avoid blocking HTTP thread
        java.util.concurrent.CompletableFuture.runAsync(job::execute);
        
        return ResponseEntity.accepted().body("Job " + jobName + " triggered asynchronously.");
    }
}
