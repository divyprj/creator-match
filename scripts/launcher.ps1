<#
    Creator Match launcher.

    One entry point behind six .bat/.exe shortcuts, so the shared concerns (locating the project
    root, finding the dev server, checking prerequisites) live in a single place.

    Written for Windows PowerShell 5.1: no pipeline chain operators, no ternary, no null-coalescing.
#>

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('run', 'stop', 'install', 'update', 'repair', 'uninstall')]
    [string]$Action
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Port = 3000
if ($env:PORT) { $Port = [int]$env:PORT }

function Write-Head($text) {
    Write-Host ''
    Write-Host "  $text" -ForegroundColor White
    Write-Host "  $('-' * $text.Length)" -ForegroundColor DarkGray
}

function Write-Step($text) { Write-Host "  $text" -ForegroundColor Gray }
function Write-Ok($text)   { Write-Host "  $text" -ForegroundColor Green }
function Write-Warn($text) { Write-Host "  $text" -ForegroundColor Yellow }
function Write-Bad($text)  { Write-Host "  $text" -ForegroundColor Red }

function Pause-Exit($code) {
    # Double-clicking an .exe in Explorer closes the console the instant the script ends, so the
    # pause is what makes the output readable. It is skipped when there is no interactive console,
    # or when CM_NO_PAUSE is set, so automated runs do not hang forever on a keypress.
    if ($env:CM_NO_PAUSE) { exit $code }
    Write-Host ''
    Write-Host '  Press any key to close.' -ForegroundColor DarkGray
    try {
        $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    } catch {
        # Non-interactive host, nothing to wait for.
    }
    exit $code
}

function Get-PackageManager {
    $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
    if ($pnpm) { return 'pnpm' }
    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if ($npm) { return 'npm' }
    return $null
}

function Assert-Node {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) {
        Write-Bad 'Node.js was not found on PATH.'
        Write-Step 'Install Node 20 or newer from https://nodejs.org and run install again.'
        Pause-Exit 1
    }
}

# Returns the PID listening on the dev port, or $null. Get-NetTCPConnection is not present on every
# edition, so netstat is kept as a fallback rather than assuming availability.
function Get-DevServerPid {
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
        if ($conn) { return ($conn | Select-Object -First 1).OwningProcess }
    } catch {
        $line = netstat -ano -p TCP | Select-String ":$Port\s" | Select-String 'LISTENING' | Select-Object -First 1
        if ($line) {
            $parts = ($line.ToString().Trim() -split '\s+')
            return [int]$parts[-1]
        }
    }
    return $null
}

function Test-EnvReady {
    $envPath = Join-Path $Root '.env.local'
    if (-not (Test-Path $envPath)) { return $false }
    $required = @('NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'TAVILY_API_KEY', 'YOUTUBE_API_KEY', 'GEMINI_API_KEY')
    $content = Get-Content $envPath -Raw
    foreach ($key in $required) {
        $match = [regex]::Match($content, "(?m)^$key=(.*)$")
        if (-not $match.Success) { return $false }
        if ([string]::IsNullOrWhiteSpace($match.Groups[1].Value)) { return $false }
    }
    return $true
}

function Invoke-EnvSetup {
    Write-Step 'Launching credential setup.'
    Push-Location $Root
    try { & node 'scripts/setup-env.mjs' } finally { Pop-Location }
}

function Assert-GitRepo {
    if (-not (Test-Path (Join-Path $Root '.git'))) {
        Write-Bad 'This is not a git checkout, so version control actions are unavailable.'
        Write-Step 'Clone the repository with git instead of downloading a zip to use update and repair.'
        Pause-Exit 1
    }
}

Set-Location $Root

switch ($Action) {

    'install' {
        Write-Head 'Install'
        Assert-Node
        $pm = Get-PackageManager
        if (-not $pm) {
            Write-Bad 'Neither pnpm nor npm was found on PATH.'
            Pause-Exit 1
        }
        Write-Step "Installing dependencies with $pm."
        if ($pm -eq 'pnpm') { & pnpm install } else { & npm install }
        if ($LASTEXITCODE -ne 0) {
            Write-Bad 'Dependency installation failed.'
            Pause-Exit $LASTEXITCODE
        }
        Write-Ok 'Dependencies installed.'

        if (-not (Test-EnvReady)) {
            Write-Host ''
            Write-Warn 'No usable .env.local found. This project ships no credentials of its own.'
            Invoke-EnvSetup
        } else {
            Write-Ok 'Credentials already configured.'
        }
        Write-Host ''
        Write-Ok 'Install complete. Use run to start the app.'
        Pause-Exit 0
    }

    'run' {
        Write-Head 'Run'
        Assert-Node

        if (-not (Test-Path (Join-Path $Root 'node_modules'))) {
            Write-Warn 'Dependencies are missing. Run install first.'
            Pause-Exit 1
        }
        if (-not (Test-EnvReady)) {
            Write-Warn 'Credentials are missing or incomplete.'
            Invoke-EnvSetup
            if (-not (Test-EnvReady)) {
                Write-Bad 'Setup did not complete, so the app would fail on every request.'
                Pause-Exit 1
            }
        }

        $existing = Get-DevServerPid
        if ($existing) {
            Write-Warn "A server is already listening on port $Port (PID $existing)."
            Write-Step 'Opening the existing instance instead of starting a second one.'
            Start-Process "http://localhost:$Port"
            Pause-Exit 0
        }

        $pm = Get-PackageManager
        Write-Step "Starting the dev server on port $Port."
        Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "$pm run dev" -WorkingDirectory $Root

        Write-Step 'Waiting for the server to accept connections.'
        $ready = $false
        for ($i = 0; $i -lt 90; $i++) {
            Start-Sleep -Milliseconds 1000
            try {
                $probe = Invoke-WebRequest -Uri "http://localhost:$Port" -UseBasicParsing -TimeoutSec 3
                if ($probe.StatusCode -ge 200) { $ready = $true; break }
            } catch {
                # Connection refused while the server compiles. Keep waiting.
            }
        }

        if (-not $ready) {
            Write-Bad 'The server did not become reachable within 90 seconds.'
            Write-Step 'Check the dev server window for build errors.'
            Pause-Exit 1
        }

        Write-Ok "Server ready at http://localhost:$Port"
        Start-Process "http://localhost:$Port"
        Write-Step 'Opened in your default browser. Use stop to shut the server down.'
        Pause-Exit 0
    }

    'stop' {
        Write-Head 'Stop'
        $serverPid = Get-DevServerPid
        if (-not $serverPid) {
            Write-Warn "Nothing is listening on port $Port."
            Pause-Exit 0
        }
        Write-Step "Stopping the dev server (PID $serverPid) and its child processes."
        # /T so the Next.js worker children go with the parent rather than being orphaned.
        & taskkill /PID $serverPid /T /F | Out-Null
        Start-Sleep -Milliseconds 700
        if (Get-DevServerPid) {
            Write-Bad 'The port is still in use. Close the dev server window manually.'
            Pause-Exit 1
        }
        Write-Ok 'Dev server stopped.'
        Write-Step 'Your browser tab was left open on purpose, so nothing unrelated is closed.'
        Pause-Exit 0
    }

    'update' {
        Write-Head 'Update'
        Assert-GitRepo
        Write-Step 'Fetching from GitHub.'
        & git fetch --all --tags --prune
        if ($LASTEXITCODE -ne 0) { Write-Bad 'Fetch failed.'; Pause-Exit $LASTEXITCODE }

        $branch = (& git rev-parse --abbrev-ref HEAD).Trim()
        $dirty = & git status --porcelain
        if ($dirty) {
            Write-Warn 'You have local changes. Stashing them before updating.'
            & git stash push -u -m "launcher-update-$(Get-Date -Format yyyyMMdd-HHmmss)" | Out-Null
            Write-Step 'Recover them later with: git stash pop'
        }

        Write-Step "Pulling the latest commit on $branch."
        & git pull --ff-only origin $branch
        if ($LASTEXITCODE -ne 0) {
            Write-Bad 'Fast-forward pull failed, which means local history has diverged.'
            Write-Step 'Use repair to reset to the latest release, or resolve the divergence by hand.'
            Pause-Exit $LASTEXITCODE
        }

        Write-Step 'Reinstalling dependencies in case the lockfile changed.'
        $pm = Get-PackageManager
        if ($pm -eq 'pnpm') { & pnpm install } else { & npm install }

        Write-Ok "Updated to $((& git rev-parse --short HEAD).Trim()) on $branch."
        Pause-Exit 0
    }

    'repair' {
        Write-Head 'Repair'
        Assert-GitRepo
        Write-Step 'Fetching tags to find the latest release.'
        & git fetch --all --tags --prune | Out-Null

        $tag = (& git describe --tags (& git rev-list --tags --max-count=1) 2>$null)
        if (-not $tag) {
            Write-Bad 'No release tag was found, so there is no known good point to return to.'
            Pause-Exit 1
        }
        $tag = $tag.Trim()

        $dirty = & git status --porcelain
        if ($dirty) {
            $stamp = Get-Date -Format yyyyMMdd-HHmmss
            Write-Warn 'You have local changes. Stashing rather than discarding them.'
            & git stash push -u -m "launcher-repair-$stamp" | Out-Null
            Write-Step "Saved as stash 'launcher-repair-$stamp'. Recover with: git stash pop"
        }

        Write-Step "Resetting to the latest release, $tag."
        & git checkout --force $tag
        if ($LASTEXITCODE -ne 0) { Write-Bad 'Checkout failed.'; Pause-Exit $LASTEXITCODE }

        Write-Step 'Clearing build output and reinstalling dependencies.'
        foreach ($dir in @('.next', 'node_modules')) {
            $path = Join-Path $Root $dir
            if (Test-Path $path) { Remove-Item -Recurse -Force $path }
        }
        $pm = Get-PackageManager
        if ($pm -eq 'pnpm') { & pnpm install } else { & npm install }
        if ($LASTEXITCODE -ne 0) { Write-Bad 'Reinstall failed.'; Pause-Exit $LASTEXITCODE }

        Write-Ok "Repaired to release $tag with a clean dependency tree."
        Write-Step 'Your .env.local was not touched.'
        Pause-Exit 0
    }

    'uninstall' {
        Write-Head 'Uninstall'
        Write-Bad 'This permanently deletes the entire project directory.'
        Write-Step "Target: $Root"
        Write-Step 'Files are removed outright, not moved to the Recycle Bin. There is no undo.'
        Write-Host ''
        Write-Step 'Your .env.local, and any uncommitted work, will be destroyed with it.'
        Write-Host ''
        $expected = Split-Path -Leaf $Root
        Write-Host "  Type the folder name '$expected' to confirm, or anything else to cancel: " -ForegroundColor Yellow -NoNewline
        $typed = Read-Host

        if ($typed -ne $expected) {
            Write-Ok 'Cancelled. Nothing was deleted.'
            Pause-Exit 0
        }

        $serverPid = Get-DevServerPid
        if ($serverPid) {
            Write-Step 'Stopping the running dev server first.'
            & taskkill /PID $serverPid /T /F | Out-Null
            Start-Sleep -Milliseconds 700
        }

        # The directory cannot delete itself while this shell has it open, so hand the work to a
        # detached cmd that waits for this process to exit before removing anything.
        Write-Step 'Deleting. This window will close.'
        $parent = Split-Path -Parent $Root
        $cmd = "timeout /t 3 /nobreak > nul & rmdir /s /q `"$Root`""
        Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', $cmd -WorkingDirectory $parent -WindowStyle Hidden
        exit 0
    }
}
