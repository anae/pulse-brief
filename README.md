# Pulse Brief

Pulse Brief transforme des notes de projet en point de situation exécutif clair et immédiatement partageable.

## Fonctionnalités

- structuration instantanée des avancées, prochaines étapes, risques et décisions ;
- actions nominatives avec responsable et échéance ;
- indicateur de santé du projet et synthèse exécutive ;
- copie du brief, export Markdown et mise en page d'impression PDF ;
- interface responsive et accessible.

## Syntaxe

```text
+ Avancée confirmée
> Prochaine étape
! Risque
× Blocage
? Décision attendue
@ Responsable | Action | Échéance
```

Les lignes sans préfixe sont classées automatiquement à partir de leur formulation.

## Lancer le projet

```bash
docker compose up -d --build
```

Puis ouvrir `http://127.0.0.1:8789`.

## Stack

HTML, CSS et JavaScript sans dépendance, servis par Nginx dans Docker.

Projet conçu par [Elliot Ananaba](https://ananaba.be).
