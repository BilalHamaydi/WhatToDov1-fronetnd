# WhatToDov1 – ToDo App (Frontend + Backend)

Eine kleine ToDo-Anwendung mit Kategorien, Kalender-Ansicht (Dots) und Suchfilter.

## Tech Stack
- **Frontend:** Vue 3 + Vite + TypeScript
- **Backend:** Spring Boot + JPA
- **DB (Tests):** H2 In-Memory
- **Tests Frontend:** Vitest + @testing-library/vue
- **Tests Backend:** JUnit + Spring Boot Test
- **CI/CD:** GitHub Actions (automatisierte Tests bei Push/PR)

---

## Features
- Tasks anzeigen / erstellen / löschen
- „Done“ toggeln (PATCH)
- Kategorien laden / erstellen / löschen
- Kalender-Ansicht mit Dots für Tasks mit Datum
- Suchleiste filtert Tasks nach Namen

---

## Lokales Starten

### Backend
```bash
./gradlew bootRun
