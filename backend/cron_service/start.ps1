$envFile = "D:\SETEC\Y4 S1\Spring Boot\Midterm\HR\Cron\Cron\.env"
Get-Content $envFile | Where-Object { $_ -match "^([^#\s]+)=(.*)$" } | ForEach-Object {
    $name = $matches[1].Trim()
    $value = $matches[2].Trim()
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
}
.\mvnw.cmd spring-boot:run
