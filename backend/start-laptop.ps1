# Requires Docker running and prebuilt hrms-* images. Never starts the QA stack.
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    $compose = @('--context', 'desktop-linux', 'compose', '-f', 'docker-compose.yml', '-f', 'docker-compose.laptop.yml')
    foreach ($service in @('config-server', 'mailpit', 'auth-service', 'operation-service', 'report-service', 'cron-service', 'api-gateway')) {
        Write-Host "Starting $service..."
        & docker @compose up -d --no-build --no-deps --force-recreate $service
        if ($LASTEXITCODE -ne 0) { throw "Could not start $service" }
        $container = "hrms-$service-1"
        $ready = $false
        for ($attempt = 0; $attempt -lt 90; $attempt++) {
            $running = & docker --context desktop-linux inspect --format '{{.State.Running}}' $container
            if ($running -ne 'true') { throw "$service stopped. Inspect its Docker logs before continuing." }
            if ($service -eq 'mailpit') { $ready = $true; break }
            # Docker also writes normal JVM startup messages to stderr.
            $ErrorActionPreference = 'Continue'
            $logs = & docker --context desktop-linux logs $container 2>&1
            $ErrorActionPreference = 'Stop'
            if ($logs -match 'Started .+ in [0-9]') { $ready = $true; break }
            Start-Sleep -Seconds 2
        }
        if (!$ready) { throw "$service did not become ready within three minutes." }
        Write-Host "$service ready."
    }
} finally { Pop-Location }
