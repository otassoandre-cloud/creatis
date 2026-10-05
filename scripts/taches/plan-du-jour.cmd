@echo off
rem 7h30 : ecrit le plan du jour a partir des pieces pretes en file d attente.
cd /d "C:\Users\Utilisateur\Desktop\creatis"
"C:\Program Files\nodejs\node.exe" scripts\plan-du-jour.js >> social\journal\taches.log 2>&1
