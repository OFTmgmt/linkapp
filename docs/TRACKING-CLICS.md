# Journal de bord — Comptage des clics

_Dernière analyse : 5 juillet 2026_

## Résumé pour les managers

**Tous les clics sont bien comptés depuis le 24 juin 2026.** Chaque clic sur un
bouton d'une page passe par notre serveur qui l'enregistre AVANT de rediriger le
visiteur vers la destination. Ce système fonctionne à 100 % dans le navigateur
interne d'Instagram, contrairement à l'ancien système.

---

## Comment un clic est compté (étape par étape)

1. Un visiteur ouvre une page (ex : `my-links-page.com/aliyah59`).
2. Il tape sur un bouton de lien.
3. Son navigateur va sur `my-links-page.com/l/<id-du-lien>` — **notre serveur**.
4. Le serveur vérifie si c'est un robot (aperçu Instagram/Facebook, Google, etc.).
   - **Robot** → aucun clic enregistré, aucune redirection révélée.
   - **Vrai visiteur** → on continue.
5. Le serveur **enregistre une ligne** dans la table `clicks` avec :
   - `link_id` — quel lien
   - `clicked_at` — date/heure exacte du clic
   - `device` — mobile / tablette / desktop (lu dans le User-Agent)
   - `country` / `city` — pays et ville (headers géo de Vercel)
   - `referrer` — source (voir limite plus bas)
6. Le serveur renvoie une page de chargement qui redirige en JavaScript vers la
   destination (OnlyFans, etc.).

L'enregistrement se fait **avant** la redirection : même si le visiteur ferme
tout de suite, le clic est déjà compté.

## Comment le total est calculé sur le dashboard

- Le classement additionne les clics de toutes les pages d'un dossier.
- La fonction SQL `count_clicks_per_page` compte **une ligne = un clic**, filtrée
  par période (`clicked_at` entre deux dates).
- Le classement "aujourd'hui" repart de zéro à minuit, heure de Paris.
- Le calendrier permet de voir n'importe quelle période passée (hier, semaine…).

---

## Pourquoi l'écart avec GetMySocial ?

C'est la question du manager. Trois explications, mesurées sur les vraies données :

### 1. L'ancien système ne captait presque rien (avant le 24 juin)

| Date | Clics enregistrés |
|------|-------------------|
| 10 juin | 0 |
| 15 juin | 0 |
| 18 juin | 5 |
| 20 juin | 0 |
| 22 juin | 4 |
| **29 juin** | **293** |
| **2 juillet** | **404** |
| **4 juillet** | **315** |

Avant le 24 juin, le clic était envoyé en JavaScript **après** la redirection.
Le navigateur interne d'Instagram coupe le JavaScript au moment où il quitte la
page → le clic était perdu. **C'est réglé** : on enregistre maintenant côté
serveur, avant de rediriger. Si le manager compare à cette période, c'est normal
que ça paraisse cassé — ça l'était, et ça ne l'est plus.

### 2. Clics ≠ Vues

- **Vues de page** (quelqu'un ouvre la page) : 6 417 au total
- **Clics sur un lien** (quelqu'un tape un bouton) : 3 383 au total

Si GetMySocial affichait des **vues** et qu'on les compare à nos **clics**, le
nôtre est forcément ~2× plus bas. Ce sont deux choses différentes. On mesure les
deux séparément.

### 3. GetMySocial comptait peut-être les aperçus (robots)

Quand un lien est posté sur Instagram, le robot `facebookexternalhit` de Meta
ouvre l'URL pour générer l'aperçu. Notre système **ne compte pas** ces robots
(c'est aussi ce qui protège le nom de domaine). Un outil qui les compterait
afficherait des chiffres gonflés.

---

## Filtre anti-spam : état actuel

**Il n'y a aucun filtre anti-spam pour le moment.**

- L'adresse IP n'est **pas** enregistrée.
- Chaque tap = 1 clic. 100 taps de la même personne = 100 clics.
- Un VA (ou n'importe qui) qui cliquerait 50 fois **gonflerait** le compteur.

Autrement dit, aujourd'hui on compte **généreusement** — dans le sens de PLUS de
clics, jamais moins. Ça ne peut donc pas expliquer un manque de clics.

### Option possible (à décider)

On pourrait enregistrer une empreinte d'IP (hachée, pour la vie privée) et
ajouter un second chiffre **"clics uniques"** = 1 par personne par lien par 24 h,
à côté du chiffre brut. Ça permettrait de repérer un gonflage artificiel **sans**
changer le paiement. À décider ensemble car ça touche la rémunération des
managers.

---

## Limite connue : attribution de la source

95 % des clics sont étiquetés `direct` au lieu d'`instagram`. Ce n'est **pas** une
perte de clics — le clic est bien compté — mais l'étiquette de provenance est
fausse. Cause : la balise `no-referrer` posée pour l'anti-détection Instagram
supprime l'info de provenance.

Correctif possible sans affaiblir l'anti-détection : détecter Instagram via le
User-Agent du navigateur interne (passif, invisible) plutôt que via le referrer.
