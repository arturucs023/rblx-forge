# Flujo de proyecto

Un juego nuevo recorre estas etapas en orden. Cada etapa cita su doc/skill.

1. **Concepto → PRD** (`roblox-to-prd`): brief construible de una página.
   Si el concepto no cabe en una página, se parte (vertical slices).
2. **Arquitectura** (`roblox-project-architect`, `docs/ARCHITECTURE.md`):
   requisitos, skills, módulos, contratos de remotes, esquema de datos, plan QA.
3. **Dirección artística** (`roblox-art-direction`, `docs/ART_DIRECTION.md`):
   mood, paleta, luz, materiales, tipo + referencias de `references/`.
4. **Construcción** (skills especialistas + toolchain `docs/TOOLCHAIN.md`):
   Rojo/src, `stylua`/`selene` en cada cambio, commits pequeños y verificados.
5. **QA continua** (`docs/QUALITY_STANDARDS.md`, `docs/TESTING_GUIDE.md`):
   matriz mínima por sistema; nada se declara funcional sin evidencia.
6. **Auditorías** (`roblox-security-audit`, `roblox-performance-audit`,
   `roblox-visual-quality-audit`): antes de publicar, las tres.
7. **Release** (`roblox-release-operations`): checklist, smoke tests, notas,
   rollback planificado. **Nada se publica en Roblox sin autorización explícita.**
8. **LiveOps** (`roblox-analytics-liveops`, `roblox-liveops-roadmap`):
   instrumentar, medir, eventos y temporadas.
