// Thin launcher shim. Each compiled .exe carries its own icon and runs the .bat sitting beside it
// with the same base name, so run.exe runs run.bat. Windows shows the embedded icon in Explorer,
// which a .bat file cannot have on its own.
using System;
using System.Diagnostics;
using System.IO;

class Program
{
    static int Main()
    {
        string exePath = System.Reflection.Assembly.GetExecutingAssembly().Location;
        string exeDir = Path.GetDirectoryName(exePath);
        string batPath = Path.Combine(exeDir, Path.GetFileNameWithoutExtension(exePath) + ".bat");

        if (!File.Exists(batPath))
        {
            Console.WriteLine("Could not find " + batPath);
            Console.WriteLine("The .exe files expect their matching .bat to sit alongside them.");
            Console.ReadLine();
            return 1;
        }

        var startInfo = new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = "/c \"" + batPath + "\"",
            WorkingDirectory = exeDir,
            UseShellExecute = false,
        };

        try
        {
            using (Process process = Process.Start(startInfo))
            {
                process.WaitForExit();
                return process.ExitCode;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("Failed to launch: " + ex.Message);
            Console.ReadLine();
            return 1;
        }
    }
}
