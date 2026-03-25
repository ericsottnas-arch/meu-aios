schtasks /create /tn "Synkra-Push-Noturno" /tr "\"C:\Program Files\Git\bin\bash.exe\" -l -c \"/c/Users/Victor/meu-aios/scripts/sync-vitor.sh\"" /sc daily /st 00:00 /f
schtasks /create /tn "Synkra-Morning-Check" /tr "\"C:\Program Files\Git\bin\bash.exe\" -l -c \"/c/Users/Victor/meu-aios/scripts/morning-check-vitor.sh\"" /sc daily /st 08:00 /f
Write-Output "Tasks criadas com sucesso!"
schtasks /query /tn "Synkra-Push-Noturno"
schtasks /query /tn "Synkra-Morning-Check"
