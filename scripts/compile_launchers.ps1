$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$icon = "public\icon.ico"
$source = "scripts\wrapper.cs"

$launchers = @("run", "install", "stop", "uninstall", "repair", "create_shortcuts")

New-Item -ItemType Directory -Force -Path "launchers"

foreach ($l in $launchers) {
    $out = "launchers\$l.exe"
    & $csc "/out:$out" "/win32icon:$icon" $source
    Write-Host "Compiled launcher: $out with icon $icon"
}
