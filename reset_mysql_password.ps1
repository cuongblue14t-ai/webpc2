$mysqlBin = "C:\Program Files\MySQL\MySQL Server 8.0\bin"
$logFile = "c:\Users\admin\webpc\mysql_reset_result.txt"

try {
    "=== Dang reset password MySQL root ===" | Out-File $logFile
    
    # Step 1: Stop MySQL
    "Step 1: Dung MySQL..." | Out-File $logFile -Append
    net stop MySQL80 2>&1 | Out-File $logFile -Append
    Start-Sleep 3

    # Step 2: Start MySQL in skip-grant-tables mode
    "Step 2: Khoi dong MySQL skip-grant-tables..." | Out-File $logFile -Append
    $process = Start-Process -FilePath "$mysqlBin\mysqld.exe" -ArgumentList '--defaults-file="C:\ProgramData\MySQL\MySQL Server 8.0\my.ini"', '--skip-grant-tables', '--shared-memory' -PassThru -WindowStyle Hidden
    Start-Sleep 5

    # Step 3: Change password
    "Step 3: Doi password root thanh 123456..." | Out-File $logFile -Append
    $result = & "$mysqlBin\mysql.exe" -u root -e "FLUSH PRIVILEGES; ALTER USER 'root'@'localhost' IDENTIFIED BY '123456';" 2>&1
    $result | Out-File $logFile -Append

    # Step 4: Kill mysqld and restart service
    "Step 4: Khoi dong lai MySQL service..." | Out-File $logFile -Append
    taskkill /F /IM mysqld.exe 2>&1 | Out-File $logFile -Append
    Start-Sleep 3
    net start MySQL80 2>&1 | Out-File $logFile -Append

    # Step 5: Test connection
    "Step 5: Test ket noi..." | Out-File $logFile -Append
    $test = & "$mysqlBin\mysql.exe" -u root -p123456 -e "SELECT 'SUCCESS: Ket noi thanh cong!' AS Result;" 2>&1
    $test | Out-File $logFile -Append

    "=== HOAN TAT ===" | Out-File $logFile -Append
} catch {
    "LOI: $_" | Out-File $logFile -Append
}
