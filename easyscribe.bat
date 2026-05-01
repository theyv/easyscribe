@echo off
setlocal EnableExtensions
chcp 65001 >nul

title EasyScribe

rem EasyScribe is a Python console app. This launcher supports:
rem - double-click: microphone transcription
rem - drag and drop: one or more audio/video files or folders, processed one by one

cd /d "%~dp0"

echo ============================================================
echo EasyScribe launcher
echo ============================================================
echo Katalog aplikacji: "%CD%"
echo.

if not exist "easyscribe.py" (
    echo BLAD: Nie znaleziono "easyscribe.py" obok tego pliku .bat.
    echo Oczekiwana lokalizacja: "%CD%\easyscribe.py"
    echo.
    pause
    exit /b 1
)

call :find_python
if errorlevel 1 (
    echo BLAD: Nie znaleziono Pythona.
    echo Zainstaluj Python 3 albo dodaj python.exe/py.exe do PATH.
    echo.
    pause
    exit /b 1
)

echo Python: %EASYSCRIBE_PYTHON%
echo Skrypt: "%CD%\easyscribe.py"
echo.

if "%~1"=="" goto microphone_mode
goto file_mode

:microphone_mode
echo Tryb: mikrofon
echo Uruchamiam nagrywanie/transkrypcje z mikrofonu.
echo Gdy skrypt zapyta o model lub format, wybierz opcje w konsoli.
echo.

%EASYSCRIBE_PYTHON% "%CD%\easyscribe.py"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
    echo EasyScribe zakonczyl sie kodem bledu: %EXIT_CODE%
) else (
    echo EasyScribe zakonczyl prace.
)
echo.
pause
exit /b %EXIT_CODE%

:file_mode
echo Tryb: pliki z drag and drop
echo Przekazane elementy: %*
echo.
echo Pliki i foldery beda transkrybowane po kolei przez jeden proces Pythona.
echo Foldery zostana przeskanowane rekurencyjnie.
echo Wyniki trafia do folderu "output".
echo Jezeli skrypt zapyta o model lub format, odpowiedz w konsoli.
echo.

set "ALL_INPUT_FILES=%*"
set /a TOTAL=0
set /a FAIL_COUNT=0

:file_loop
if "%~1"=="" goto files_checked
set /a TOTAL+=1

echo ------------------------------------------------------------
echo [%TOTAL%] Sprawdzam: "%~1"

if not exist "%~1" (
    echo BLAD: Plik nie istnieje albo sciezka jest niedostepna.
    set /a FAIL_COUNT+=1
    goto file_check_failed
)

shift
goto file_loop

:file_check_failed
choice /c TN /n /m "Kontynuowac mimo problemu z lista plikow? [T/N] "
if errorlevel 2 goto file_done
shift
goto file_loop

:files_checked
if "%FAIL_COUNT%"=="0" goto run_files
goto file_done

:run_files
echo.
echo Start transkrypcji przekazanych plikow/folderow: %TOTAL%
echo.

%EASYSCRIBE_PYTHON% "%CD%\easyscribe.py" %ALL_INPUT_FILES%
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" set /a FAIL_COUNT+=1
goto file_done

:file_done
echo ============================================================
echo Podsumowanie
echo ============================================================
echo Przekazano: %TOTAL%
echo Bledy:      %FAIL_COUNT%
echo Output:     "%CD%\output"
echo.
pause

if "%FAIL_COUNT%"=="0" exit /b 0
exit /b 1

:find_python
set "EASYSCRIBE_PYTHON="

where py >nul 2>nul
if "%ERRORLEVEL%"=="0" (
    set "EASYSCRIBE_PYTHON=py -3"
    exit /b 0
)

where python >nul 2>nul
if "%ERRORLEVEL%"=="0" (
    set "EASYSCRIBE_PYTHON=python"
    exit /b 0
)

exit /b 1
