# Script PowerShell para reiniciar el servidor Node.js
# Detiene cualquier proceso en el puerto 3000 y reinicia el servidor

Write-Host "🔍 Buscando procesos en el puerto 3000..." -ForegroundColor Yellow

try {
    $connections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    
    if ($connections) {
        Write-Host "✓ Proceso encontrado en puerto 3000" -ForegroundColor Green
        
        foreach ($conn in $connections) {
            $processId = $conn.OwningProcess
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            
            if ($process) {
                Write-Host "🛑 Deteniendo proceso: $($process.Name) (PID: $processId)" -ForegroundColor Red
                Stop-Process -Id $processId -Force
                Write-Host "✓ Proceso detenido" -ForegroundColor Green
            }
        }
        
        Start-Sleep -Seconds 2
    } else {
        Write-Host "ℹ No hay procesos en el puerto 3000" -ForegroundColor Cyan
    }
} catch {
    Write-Host "⚠ No se pudo verificar el puerto 3000" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Iniciando servidor..." -ForegroundColor Green
Write-Host ""

# Iniciar el servidor
node server.js
