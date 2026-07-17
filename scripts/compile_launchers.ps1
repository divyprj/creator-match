$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$icon = "public\icon.ico"
$source = "scripts\wrapper.cs"

$launchers = @("run", "install", "stop", "uninstall", "repair", "create_shortcuts")

foreach ($l in $launchers) {
    $out = "$l.exe"
    & $csc "/out:$out" "/win32icon:$icon" $source
    Write-Host "Compiled launcher: $out with icon $icon"
}
