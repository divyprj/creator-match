$currentDir = (Get-Item -Path "$PSScriptRoot\..").FullName
$desktopPath = [System.IO.Path]::Combine([Environment]::GetFolderPath("Desktop"), "")
$iconPath = Join-Path $currentDir "public\icon.ico"

$shortcuts = @(
    @{ Name = "Install Creator Match"; Target = "install.bat" },
    @{ Name = "Run Creator Match"; Target = "run.bat" },
    @{ Name = "Stop Creator Match"; Target = "stop.bat" },
    @{ Name = "Uninstall Creator Match"; Target = "uninstall.bat" },
    @{ Name = "Repair Creator Match"; Target = "repair.bat" }
)

$WshShell = New-Object -ComObject WScript.Shell
foreach ($s in $shortcuts) {
    $shortcutPath = Join-Path $desktopPath "$($s.Name).lnk"
    $targetPath = Join-Path $currentDir $s.Target
    
    $Shortcut = $WshShell.CreateShortcut($shortcutPath)
    $Shortcut.TargetPath = $targetPath
    $Shortcut.WorkingDirectory = $currentDir
    $Shortcut.IconLocation = "$iconPath, 0"
    $Shortcut.Save()
    Write-Host "Created shortcut: $($s.Name) on Desktop"
}
