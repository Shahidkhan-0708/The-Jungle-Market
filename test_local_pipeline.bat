@echo off
echo Running CircleCI configurations validation...
circleci config validate

echo.
echo Executing backend core test job locally...
circleci local execute --job test_backend_core
