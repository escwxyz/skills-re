---
question: Warum fehlen Dateien aus meinem Skill im Download?
order: 9
---

Skills.re schließt beim Import eines Skills aus GitHub absichtlich alle Dateien aus, die sich in einem Verzeichnis namens `dist` befinden. Das gilt auch dann, wenn diese Dateien im Repository eingecheckt sind. Sie erscheinen daher nicht im veröffentlichten Download-Archiv.

Lege erforderliche Laufzeitdateien, Skripte oder andere unverzichtbare Ressourcen nicht unter `dist` ab. Verschiebe sie in ein versionsverwaltetes Verzeichnis wie `scripts`, `assets` oder `runtime` und aktualisiere die Verweise in deinem Skill. Behandle `dist` als neu erzeugbare Ausgabe, die Nutzer nicht benötigen sollten, um den Skill auszuführen.
