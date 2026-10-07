# Bandeau de navigation « Suivi des projets »

Ce dossier a été généré par le générateur de menu. Il contient tout ce qu'il faut pour afficher le bandeau dans un widget Grist : il suffit de le publier sur GitHub Pages, puis d'ajouter **une seule ligne** dans le widget.

## Contenu du dossier

- `suivi-des-projets.js`
- `suivi-des-projets.css`
- `suivi-des-projets.json`
- `logo/logo.png`
- `logo/icone-test-manager.png`
- `README.md` (ce fichier)

`suivi-des-projets.js`, `suivi-des-projets.css` et `suivi-des-projets.json` doivent rester **dans le même dossier**. Les images sont dans `logo/`.

## 1. Publier sur GitHub Pages

1. Créez un dépôt GitHub. Il doit être **public** : GitHub Pages ne sert pas les dépôts privés avec un compte gratuit.
2. Déposez **tout le contenu de ce dossier à la racine du dépôt** (pas dans un sous-dossier) : les trois fichiers, le dossier `logo/` et ce README. Sur le site GitHub : *Add file > Upload files*, ou avec git (`git add .`, `git commit`, `git push`).
3. Activez Pages : *Settings > Pages > Build and deployment*. Source : **Deploy from a branch**. Branche : **main**, dossier : **/ (root)**. Cliquez sur **Save**.
4. Patientez. La première mise en ligne prend quelques minutes ; l'avancement se suit dans l'onglet **Actions** du dépôt, et l'adresse du site s'affiche en haut de *Settings > Pages*.
5. Vérifiez : ouvrez dans un navigateur ces adresses, elles doivent s'afficher (et non une erreur 404).

```
https://nicolasschena-aucarre.github.io/generate-menu/suivi-des-projets.js
https://nicolasschena-aucarre.github.io/generate-menu/suivi-des-projets.css
https://nicolasschena-aucarre.github.io/generate-menu/suivi-des-projets.json
https://nicolasschena-aucarre.github.io/generate-menu/logo/logo.png
https://nicolasschena-aucarre.github.io/generate-menu/logo/icone-test-manager.png
```

Dans les adresses, le nom du dépôt est **sensible à la majuscule et à la minuscule**.

## 2. Ajouter le bandeau à un widget

Copiez cette ligne dans le `<head>` du widget :

```html
<script src="https://nicolasschena-aucarre.github.io/generate-menu/suivi-des-projets.js" data-titre="Nom du widget"></script>
```

- Utilisez une balise `<script src=« … »>` ordinaire, écrite dans le HTML du widget. Le bandeau déduit l'emplacement de son `.css` et de son `.json` de l'adresse de son propre script : il faut donc le charger par son adresse complète, sans le recopier ni le renommer.
- `data-titre` est facultatif : c'est le nom propre à ce widget, ajouté au titre du menu (« Suivi des projets - Nom du widget »). Remplacez « Nom du widget » par le vrai nom, ou supprimez l'attribut.
- Une seule balise par widget. Si le fichier est indisponible, le widget fonctionne simplement sans bandeau.

## 3. Personne connectée et menu filtré par rôle

Le bandeau **lit lui-même** la table « Utilisateurs » du document : il n'y a rien à ajouter dans le widget pour afficher le nom, l'avatar et filtrer le menu. Cela suppose :

- Le widget charge l'API Grist (`<script src="https://docs.getgrist.com/grist-plugin-api.js"></script>`) et appelle `grist.ready({ requiredAccess: "full" })`, avec le niveau d'accès **« Accès complet au document »**. Le bandeau réessaie pendant une quinzaine de secondes si le widget appelle `grist.ready()` tardivement.
- Une table nommée **`Utilisateurs`**, avec les colonnes `Email`, `Role`, et au choix `Nom_Complet` ou `Prenom` + `Nom` (ce sont les **identifiants** de colonne qui comptent, pas les libellés). Pour une table portant un autre nom, ajoutez `data-table="NomDeLaTable"` à la balise.
- Une règle d'accès Grist qui **masque l'`Email` de toutes les lignes sauf la sienne** : la personne connectée est la seule ligne dont l'`Email` est lisible. S'il y en a plusieurs ou aucune, le bandeau affiche « Non identifié·e » plutôt que de deviner.

Les liens qui ont des `roles` ne s'affichent que si l'un des rôles de la personne correspond (majuscules et accents ignorés). Sans rôle connu, seuls les liens sans `roles` s'affichent.

**Ce filtre n'est pas une sécurité** : le fichier `.json` est public. La vraie protection d'un widget reste dans les règles d'accès de Grist.

**Exception** : pour un widget sans accès complet, qui ne peut donc pas lire la table, le widget peut transmettre la personne lui-même. Cet appel est prioritaire sur la lecture automatique :

```js
if (window.BandeauMenu) {
  window.BandeauMenu.utilisateur({ nomComplet: "Paul Durand", role: "Manager" });
}
```

## 4. Modifier le menu plus tard

**Ajouter, retirer ou modifier un lien** : éditez directement `suivi-des-projets.json` sur GitHub. Le `.js` n'a pas à être régénéré.

```json
[
  { "nom": "Suivi du temps", "url": "https://exemple.fr/temps" },
  { "nom": "Projets", "url": "https://exemple.fr/projets", "roles": ["Direction"], "nouvelOnglet": true, "icone": "logo/icone-projets.png" }
]
```

Seuls `nom` et `url` sont obligatoires (adresse en `http` ou `https`). Une entrée sans nom ou à l'adresse invalide est ignorée. Attention aux virgules : un JSON mal formé donne « Liste indisponible. » dans le menu.

**Changer le logo, les couleurs, le titre** : modifiez les tables dans Grist, régénérez le zip, puis remplacez les fichiers du dépôt par ceux du nouveau zip.

- Régénérer le zip **remplace** le `.json` par le contenu de la table `Widget` de Grist : une modification faite à la main sur GitHub serait perdue. Reportez-la dans la table, ou ne remplacez pas le `.json`.
- Remplacer des fichiers ne supprime pas les anciens : une image qui n'est plus utilisée reste dans `logo/` tant que vous ne la supprimez pas.
- Si le **titre du menu** change, les fichiers changent de nom : mettez à jour la balise dans chaque widget et supprimez les anciens fichiers du dépôt.

## 5. Délai de mise à jour (cache)

Après un changement, **la nouvelle version n'est pas visible tout de suite** : GitHub Pages doit redéployer le site, puis il conserve les fichiers en cache environ **10 minutes** (le navigateur aussi).

- Surveillez l'onglet **Actions** du dépôt : le déploiement est terminé quand il est vert.
- Rechargez le widget en forçant le rechargement (**Ctrl + F5**).
- Pour forcer le rechargement du script, ajoutez un numéro de version dans la balise : `src="https://nicolasschena-aucarre.github.io/generate-menu/suivi-des-projets.js?v=2"`. Cela ne concerne que le `.js` ; le `.css` et le `.json` se mettent à jour une fois le cache expiré.
- Pour savoir quelle version tourne, tapez `BandeauMenu.version` dans la console du widget.

## 6. En cas de problème

| Constat | Vérification |
|---|---|
| Aucun bandeau | Ouvrez l'adresse du `.js` dans le navigateur : une erreur 404 signifie que Pages n'est pas encore déployé ou que l'adresse est inexacte (majuscules du dépôt, dossier). Vérifiez aussi que la balise est dans le `<head>`. |
| Bandeau sans mise en forme | Le `.css` est introuvable : il doit porter le même nom que le `.js` et se trouver dans le même dossier. |
| « Liste indisponible. » | Le `.json` est absent, ou mal formé (virgule oubliée, guillemets). |
| Images absentes | Vérifiez que `logo/` est publié et que `UrlRepo` correspond bien à l'adresse du site. Les images doivent être en `https`. |
| Nom et avatar absents | Le widget n'a pas l'accès complet, n'a pas appelé `grist.ready()`, ou la table « Utilisateurs » est absente. Dans la console du widget, `BandeauMenu.etat()` indique la table cherchée et d'où vient la personne. |
| Lien absent du menu | Il est filtré par rôle, ou son adresse n'est pas en `http(s)`. `BandeauMenu.etat()` dans la console du widget indique, pour chaque lien, s'il est visible. |
