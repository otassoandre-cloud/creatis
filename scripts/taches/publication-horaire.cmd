@echo off
rem Lance par le planificateur de taches Windows, toutes les heures de 8h a 21h.
rem Le script decide lui-meme s il y a un creneau du : le lancer plus souvent
rem que necessaire est sans effet.
cd /d "C:\Users\Utilisateur\Desktop\creatis"
"C:\Program Files\nodejs\node.exe" scripts\planificateur.js >> social\journal\taches.log 2>&1
