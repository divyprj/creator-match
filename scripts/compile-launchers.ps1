<#
    Compiles one .exe per launcher action, each embedding its own icon.

    The .exe is only a shim around the matching .bat. It exists because Windows will not show a
    custom icon for a .bat file, and an unlabelled batch file in Explorer gives no clue what it does.

    Requires the .NET Framework C# compiler, which ships with Windows. Run icon generation first:
        python scripts/generate-icons.py
        powershell -ExecutionPolicy Bypass -File scripts/compile-launchers.ps1
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'scripts\wrapper.cs'
$iconDir = Join-Path $root 'launchers\icons'
$outDir = Join-Path $root 'launchers'

$csc = Get-ChildItem 'C:\Windows\Microsoft.NET\Framework64\v4*\csc.exe' -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
if (-not $csc) {
    $csc = Get-ChildItem 'C:\Windows\Microsoft.NET\Framework\v4*\csc.exe' -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty FullName
}
if (-not $csc) {
    Write-Host 'Could not find csc.exe. The .bat launchers still work without the .exe wrappers.' -ForegroundColor Yellow
    exit 1
}

$actions = @('run', 'stop', 'install', 'update', 'repair', 'uninstall')

foreach ($action in $actions) {
    $icon = Join-Path $iconDir "$action.ico"
    $out = Join-Path $outDir "$action.exe"

    if (-not (Test-Path $icon)) {
        Write-Host "Missing icon for $action. Run scripts/generate-icons.py first." -ForegroundColor Yellow
        continue
    }

    & $csc /nologo /target:exe "/out:$out" "/win32icon:$icon" $source | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  built launchers/$action.exe" -ForegroundColor Green
    } else {
        Write-Host "  failed to build $action.exe" -ForegroundColor Red
    }
}
