' Запускает start-finance.cmd без окна консоли.
' Используется задачей планировщика "Finance server" при входе в систему.
' Ждём завершения cmd и возвращаем его код, чтобы планировщик мог
' перезапустить задачу, если сервер упал.
Dim fso, shell, scriptDirectory, exitCode

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

scriptDirectory = fso.GetParentFolderName(WScript.ScriptFullName)
exitCode = shell.Run("""" & scriptDirectory & "\start-finance.cmd""", 0, True)

WScript.Quit exitCode
