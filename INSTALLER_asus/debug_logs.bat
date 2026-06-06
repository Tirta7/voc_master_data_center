@echo off
"C:\Program Files\Docker\Docker\resources\bin\docker.exe" logs --tail 100 voc_backend > backend_logs.txt
echo done
