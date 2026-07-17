using System;
using System.Diagnostics;
using System.IO;

class Program {
    static void Main() {
        string exePath = System.Reflection.Assembly.GetExecutingAssembly().Location;
        string exeDir = Path.GetDirectoryName(exePath);
        string exeName = Path.GetFileNameWithoutExtension(exePath);
        string batPath = Path.Combine(exeDir, exeName + ".bat");
        
        if (File.Exists(batPath)) {
            ProcessStartInfo startInfo = new ProcessStartInfo();
            startInfo.FileName = "cmd.exe";
            startInfo.Arguments = "/c \"" + batPath + "\"";
            startInfo.WorkingDirectory = exeDir;
            startInfo.UseShellExecute = false;
            
            try {
                using (Process process = Process.Start(startInfo)) {
                    process.WaitForExit();
                }
            } catch (Exception ex) {
                Console.WriteLine("Error launching batch file: " + ex.Message);
                Console.ReadLine();
            }
        } else {
            Console.WriteLine("Could not find corresponding batch file: " + batPath);
            Console.ReadLine();
        }
    }
}
