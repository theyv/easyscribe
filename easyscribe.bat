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
echo Application directory: "%CD%"
echo.

if not exist "easyscribe.py" (
    echo ERROR: "easyscribe.py" was not found next to this .bat file.
    echo Expected location: "%CD%\easyscribe.py"
    echo.
    pause
    exit /b 1
)

call :find_python
if errorlevel 1 (
    echo ERROR: Python was not found.
    echo Install Python 3 or add python.exe/py.exe to PATH.
    echo.
    pause
    exit /b 1
)

echo Python: %EASYSCRIBE_PYTHON%
echo Script: "%CD%\easyscribe.py"
echo.

if "%~1"=="" goto microphone_mode
goto file_mode

:microphone_mode
echo Mode: microphone
echo Starting microphone recording/transcription.
echo When the script asks about the model or format, choose options in the console.
echo.

%EASYSCRIBE_PYTHON% "%CD%\easyscribe.py"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
    echo EasyScribe exited with error code: %EXIT_CODE%
) else (
    echo EasyScribe finished.
)
echo.
pause
exit /b %EXIT_CODE%

:file_mode
echo Mode: drag and drop files
echo Passed items: %*
echo.
echo Files and folders will be transcribed one by one by a single Python process.
echo Folders will be scanned recursively.
echo Results will be saved to the "output" folder.
echo If the script asks about the model or format, answer in the console.
echo.

set "ALL_INPUT_FILES=%*"
set /a TOTAL=0
set /a FAIL_COUNT=0

:file_loop
if "%~1"=="" goto files_checked
set /a TOTAL+=1

echo ------------------------------------------------------------
echo [%TOTAL%] Checking: "%~1"

if not exist "%~1" (
    echo ERROR: The file does not exist or the path is unavailable.
    set /a FAIL_COUNT+=1
    goto file_check_failed
)

shift
goto file_loop

:file_check_failed
choice /c YN /n /m "Continue despite the file list problem? [Y/N] "
if errorlevel 2 goto file_done
shift
goto file_loop

:files_checked
if "%FAIL_COUNT%"=="0" goto run_files
goto file_done

:run_files
echo.
echo Starting transcription for passed files/folders: %TOTAL%
echo.

%EASYSCRIBE_PYTHON% "%CD%\easyscribe.py" %ALL_INPUT_FILES%
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" set /a FAIL_COUNT+=1
goto file_done

:file_done
echo ============================================================
echo Summary
echo ============================================================
echo Passed:     %TOTAL%
echo Errors:     %FAIL_COUNT%
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
