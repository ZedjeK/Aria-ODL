# Composants tiers

Les fichiers des moteurs sont copiés sans modification. Seuls les modèles de traduction sont recompressés en gzip ; leur empreinte SHA-256 d'origine est vérifiée après décompression.

| Composant | Version | Licence | Dossier |
|---|---|---|---|
| Grammalecte (moteur + dictionnaire) | 2.3.0 | GPL-3.0 | `engines/grammalecte/` |
| Harper (harper.js, binaire slim) | 2.10.0 | Apache-2.0 (voir `engines/harper/LICENSE`) | `engines/harper/` |
| Bergamot Translator | 0.4.9 | MPL-2.0 | `engines/bergamot/` |
| Modèles de traduction fr→en et en→fr | 2.0 | MPL-2.0 | `models/` |

Provenance, empreintes et textes complets des licences : `LICENCES-TIERS.txt` à la racine du dépôt Aria-ODL.
Comme l'extension embarque Grammalecte, l'extension prise comme un tout est diffusée selon les termes de la GPL-3.0.
