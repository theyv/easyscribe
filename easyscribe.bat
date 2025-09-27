@echo off
chcp 65001 >nul
REM EASYSCRIBE - z obsługą drag & drop i wyborem modelu

REM Przejdź do katalogu gdzie jest bat
cd /d "%~dp0"

REM Sprawdź czy easyscribe.py istnieje w tym katalogu
if not exist "easyscribe.py" (
    echo BŁĄD: Nie znaleziono pliku easyscribe.py w katalogu:
    echo %~dp0
    echo.
    echo Upewnij się że easyscribe.py jest w tym samym katalogu co ten .bat
    pause
    exit /b 1
)

REM Sprawdź czy przekazano plik przez drag & drop
if "%~1"=="" (
    REM Brak parametru - tryb mikrofonu
    echo Uruchamianie trybu nagrywania z mikrofonu...
    echo.
    echo NOWOŚĆ: Możesz wybrać między modelami:
    echo - Faster Whisper (wybierz rozmiar: tiny/base/small/medium/large-v3)
    echo - NVIDIA Parakeet v3 (nowoczesny, wielojęzyczny)
    echo.
    python easyscribe.py
) else (
    REM Jest parametr - tryb transkrypcji pliku
    echo Transkrybowanie pliku: %~nx1
    echo Pełna ścieżka: %~1
    echo.
    echo NOWOŚĆ: Możesz wybrać między modelami:
    echo - Faster Whisper (wybierz rozmiar: tiny/base/small/medium/large-v3)
    echo - NVIDIA Parakeet v3 (nowoczesny, wielojęzyczny)
    echo.
    
    REM Sprawdź czy plik audio istnieje
    if not exist "%~1" (
        echo BŁĄD: Nie znaleziono pliku: %~1
        pause
        exit /b 1
    )
    
    python easyscribe.py "%~1"
)

pause