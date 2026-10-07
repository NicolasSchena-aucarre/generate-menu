/* ==========================================================
   suivi-des-projets.js — bandeau de navigation entre widgets. Fichier GÉNÉRÉ : ne pas
   modifier à la main, régénérer depuis le générateur de menu.

   UTILISATION (dans le <head> du widget, une seule ligne) :

     <script src="https://VOTRE-HEBERGEMENT/suivi-des-projets.js" data-titre="Nom du widget"></script>

   suivi-des-projets.css doit se trouver dans le MÊME dossier que ce fichier ; les images sont
   dans le dossier logo/.

   Le titre affiché est « titre du menu - data-titre » (data-titre est facultatif).
   Le bandeau ne demande aucun accès à Grist.

   LIENS DU MENU : ils sont dans suivi-des-projets.json (même dossier), lu une seule fois à la
   première ouverture du menu. Pour ajouter, retirer ou modifier un lien, éditez ce fichier
   directement sur GitHub : ce script n'a pas besoin d'être régénéré. Attention : générer de
   nouveau le dossier depuis Grist remplace ce fichier par le contenu de la table Widget.

   PERSONNE CONNECTÉE : le bandeau la cherche lui-même dans la table « Utilisateurs » du
   document (colonnes Email, Role, et Nom_Complet ou Prenom + Nom). C'est la seule ligne dont
   l'Email n'est pas masqué par une règle d'accès Grist. Il faut que le widget ait chargé l'API
   Grist et appelé  grist.ready({ requiredAccess: "full" }). Autre nom de table : ajouter
   data-table="NomDeLaTable" à la balise. Sans accès complet, le nom reste masqué.

   Un widget peut aussi la transmettre lui-même (prioritaire sur la lecture automatique) :

     if (window.BandeauMenu) window.BandeauMenu.utilisateur({ nomComplet: "Paul Durand", role: "Manager" });
     window.BandeauMenu.utilisateur(null);   // « Non identifié·e »

   Un lien réservé à des rôles n'est affiché que si l'un des rôles de la personne
   correspond (casse et accents ignorés). Rôle inconnu : seuls les liens sans rôle
   s'affichent. ATTENTION : ce fichier est public, ce tri ne protège rien — la vraie
   protection d'un widget reste dans les droits d'accès Grist.
   ========================================================== */
(function () {
  "use strict";

  var NOM = "BandeauMenu";
  if (window[NOM]) return; // fichier chargé deux fois : une seule instance

  var VERSION = "bandeau-202610071427";
  var CONFIG = {"titre":"Suivi des projets","logo":"https://nicolasschena-aucarre.github.io/generate-menu/logo/logo.png","icone":null,"tableUtilisateur":"Utilisateurs","police":"https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800&display=swap"};

  var script = document.currentScript;
  var adresse = script && script.src ? script.src.split(/[?#]/)[0] : "";
  var dossier = adresse.replace(/[^\/]*$/, "");
  var urlCss = (script && script.getAttribute("data-css")) || (adresse ? adresse.replace(/\.js$/i, ".css") : "");
  var urlJson = (script && script.getAttribute("data-json")) || (adresse ? adresse.replace(/\.js$/i, ".json") : "");
  var tableUtilisateur = (script && script.getAttribute("data-table")) || CONFIG.tableUtilisateur || "Utilisateurs";
  var titreWidget = ((script && script.getAttribute("data-titre")) || "").trim();
  var titre = [CONFIG.titre, titreWidget].filter(Boolean).join(" - ");

  var ui = null;            // éléments du bandeau, une fois construit
  var moi;                  // undefined : non transmis ; null : non identifié
  var rolesMoi = [];        // rôles de la personne, normalisés
  var derniereCle;          // dernière personne appliquée
  var manuel = false;       // le widget a appelé utilisateur() : la lecture automatique s'arrête
  var source = "(aucune)";  // d'où vient la personne : "table" ou "widget"
  var identifie = false;    // la lecture automatique a abouti
  var apiVue = false;       // l'API Grist (docApi) a été aperçue
  var cleMenu;              // contenu actuellement affiché dans le menu
  var liens = null;         // liens du menu : null tant que le fichier .json n'est pas lu
  var etatListe = "";       // "" | "chargement" | "erreur"

  // Mise en page de la PAGE (hors Shadow DOM) pour les widgets x-dc : le bandeau et
  // le contenu s'empilent sans faire défiler la page. Une autre page n'est pas touchée.
  var CSS_PAGE = [
    "html body:has(> #bm-bandeau):has(> #dc-root){display:flex;flex-direction:column;height:auto;min-height:100%}",
    "html body > #dc-root{flex:1 0 auto;height:auto}",
    "html body > #dc-root > .sc-host{height:auto}"
  ].join("");

  // ---------- Utilitaires ----------
  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    for (var k in (attrs || {})) n.setAttribute(k, attrs[k]);
    return n;
  }
  function urlSure(u) { // seuls http(s) sont acceptés comme cible de lien
    return typeof u === "string" && /^https?:\/\//i.test(u.trim()) ? u.trim() : null;
  }
  // Image : adresse https complète, ou chemin relatif (logo/logo.png) cherché à côté de ce script.
  function imageSure(u) {
    if (typeof u !== "string" || !u) return null;
    if (/^(data:image\/|https:\/\/)/i.test(u)) return u;
    return dossier && !/^[a-z][a-z0-9+.-]*:/i.test(u) && u.indexOf("..") === -1 ? dossier + u : null;
  }
  function normaliser(s) {
    return String(s == null ? "" : s).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function rolesDeLaPersonne(v) { // texte ou liste de choix Grist (["L", "Manager"])
    if (typeof v === "string") v = [v];
    if (!Array.isArray(v)) return [];
    if (v[0] === "L") v = v.slice(1);
    return v.map(normaliser).filter(Boolean);
  }
  function visible(lien) {
    var exiges = (lien.roles || []).map(normaliser).filter(Boolean);
    if (!exiges.length) return true;
    return rolesMoi.some(function (r) { return exiges.indexOf(r) !== -1; });
  }
  function identite(m) {
    if (!m) return { label: "Non identifié·e", initiales: "?" };
    var complet = String(m.nomComplet || "").trim();
    var prenom = String(m.prenom || ""), nom = String(m.nom || "");
    var initiales = prenom.charAt(0) + nom.charAt(0);
    if (complet) {
      var mots = complet.split(/\s+/);
      initiales = mots[0].charAt(0) + (mots.length > 1 ? mots[mots.length - 1].charAt(0) : "");
    }
    return { label: complet || (prenom + " " + nom).trim(), initiales: initiales.toUpperCase() };
  }

  // Police du titre : une feuille de style dans le <head> de la page (les polices
  // web ne se chargent pas depuis un Shadow DOM).
  function chargerPolice() {
    var url = CONFIG.police;
    if (!url || !/^https:\/\//i.test(url)) return;
    var liens = document.getElementsByTagName("link");
    for (var i = 0; i < liens.length; i++) if (liens[i].href === url) return;
    document.head.appendChild(el("link", null, { rel: "stylesheet", href: url }));
  }

  // ---------- Construction ----------
  function construire() {
    if (document.getElementById("bm-bandeau")) return;

    var host = el("div", null, { id: "bm-bandeau" });
    var root = host.attachShadow({ mode: "open" });
    if (urlCss) {
      // Bandeau masqué le temps que bandeau.css arrive, pour éviter un flash sans style.
      var feuille = el("link", null, { rel: "stylesheet", href: urlCss });
      feuille.onload = feuille.onerror = function () { host.style.visibility = ""; };
      host.style.visibility = "hidden";
      root.appendChild(feuille);
    } else {
      console.warn("[bandeau] feuille de style introuvable : chargez le script avec une balise <script src=…> statique.");
    }

    var header = el("header", "bm-header");
    var inner = el("div", "bm-inner");

    var brand = el("div", "bm-brand");
    if (imageSure(CONFIG.logo)) brand.appendChild(el("img", "bm-logo", { src: imageSure(CONFIG.logo), alt: "Logo" }));
    var zoneTitre = el("div", "bm-titre");
    zoneTitre.textContent = titre;

    var droite = el("div", "bm-droite");
    var user = el("div", "bm-user");
    user.hidden = true; // tant que le widget n'a pas transmis la personne
    var userNom = el("span", "bm-user-nom");
    var avatar = el("span", "bm-avatar", { "aria-hidden": "true" });
    user.appendChild(userNom);
    user.appendChild(avatar);

    var wrap = el("div", "bm-burger-wrap");
    var btn = el("button", "bm-burger", {
      type: "button", "aria-label": "Ouvrir le menu", "aria-expanded": "false", "aria-controls": "bm-menu"
    });
    if (imageSure(CONFIG.icone)) {
      btn.appendChild(el("img", "bm-burger-icone", { src: imageSure(CONFIG.icone), alt: "" }));
    } else {
      for (var i = 0; i < 3; i++) btn.appendChild(el("span", "bm-burger-barre"));
    }
    var menu = el("nav", "bm-menu", { id: "bm-menu", "aria-label": "Menu" });
    menu.hidden = true;
    wrap.appendChild(btn);
    wrap.appendChild(menu);

    droite.appendChild(user);
    droite.appendChild(wrap);
    inner.appendChild(brand);
    inner.appendChild(zoneTitre);
    inner.appendChild(droite);
    header.appendChild(inner);
    root.appendChild(header);

    ui = { host: host, user: user, userNom: userNom, avatar: avatar, btn: btn, menu: menu, wrap: wrap };

    btn.addEventListener("click", function (e) { e.stopPropagation(); basculer(menu.hidden); });
    document.addEventListener("click", function (e) { // un clic ailleurs ferme le menu, pas un clic dedans
      if (e.composedPath().indexOf(wrap) === -1) basculer(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.hidden) { basculer(false); btn.focus(); }
    });

    var stylePage = el("style");
    stylePage.textContent = CSS_PAGE;
    document.head.appendChild(stylePage);
    document.body.insertBefore(host, document.body.firstChild);

    chargerPolice();
    if (moi !== undefined) rendreUtilisateur();
    rendreMenu();
    identifierAutomatiquement(0);
  }

  // ---------- Personne connectée ----------
  function rendreUtilisateur() {
    if (!ui) return;
    var id = identite(moi);
    ui.userNom.textContent = id.label;
    ui.avatar.textContent = id.initiales;
    ui.user.hidden = false;
  }

  // ---------- Menu ----------
  // Lecture du .json : une seule fois, à la première ouverture. Un échec est retenté à l'ouverture suivante.
  function chargerListe() {
    if (liens !== null || etatListe === "chargement") return;
    if (!urlJson) { etatListe = "erreur"; rendreMenu(); return; }
    etatListe = "chargement";
    rendreMenu();
    fetch(urlJson).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (liste) {
      if (!Array.isArray(liste)) throw new Error("le fichier n'est pas une liste");
      // Une entrée sans nom, ou dont l'adresse n'est pas en http(s), est ignorée.
      liens = liste.filter(function (l) { return l && typeof l.nom === "string" && l.nom.trim() && urlSure(l.url); });
      etatListe = "";
      rendreMenu();
    }).catch(function (e) {
      liens = null;
      etatListe = "erreur";
      console.warn("[bandeau] liste des liens indisponible (" + urlJson + ") :", e && e.message ? e.message : e);
      rendreMenu();
    });
  }

  // Reconstruit seulement si ce qui est affiché change (le lien focalisé garde son focus).
  function rendreMenu() {
    if (!ui) return;
    var visibles = liens === null ? null : liens.filter(visible);
    var cle = visibles === null ? "#" + etatListe : visibles.map(function (l) { return l.nom + "|" + l.url; }).join("\n");
    if (cle === cleMenu) return;
    cleMenu = cle;
    ui.menu.textContent = "";
    if (visibles === null || !visibles.length) {
      var p = el("p", "bm-vide", { role: "status" });
      p.textContent = visibles === null ? (etatListe === "erreur" ? "Liste indisponible." : "Chargement…") : "Aucun lien disponible.";
      ui.menu.appendChild(p);
      return;
    }
    visibles.forEach(function (l) {
      var a = el("a", null, { href: urlSure(l.url), target: l.nouvelOnglet ? "_blank" : "_top", rel: "noopener" });
      if (imageSure(l.icone)) a.appendChild(el("img", "bm-lien-icone", { src: imageSure(l.icone), alt: "" }));
      var t = el("span");
      t.textContent = l.nom.trim();
      a.appendChild(t);
      ui.menu.appendChild(a);
    });
  }

  function basculer(ouvrir) {
    ui.menu.hidden = !ouvrir;
    ui.btn.setAttribute("aria-expanded", ouvrir ? "true" : "false");
    if (ouvrir) chargerListe();
  }

  // ---------- Personne connectée : lecture automatique de la table ----------
  var DELAIS = [0, 400, 1000, 2000, 4000, 8000];   // le widget peut appeler grist.ready() après le chargement du bandeau
  var DELAI_MAX = 5000;                            // une lecture sans réponse est abandonnée puis retentée

  function appliquer(m) {
    // Rappelable à chaque relecture : un appel identique au précédent est ignoré.
    var cle = JSON.stringify(m || null);
    if (cle === derniereCle) return;
    derniereCle = cle;
    moi = m || null;
    rolesMoi = rolesDeLaPersonne(moi && moi.role);
    rendreUtilisateur();
    rendreMenu();
  }

  // La personne connectée est LA seule ligne dont l'Email est lisible (les autres sont
  // masqués par une règle d'accès). S'il y en a plusieurs ou aucune, on ne devine pas.
  function personneDepuisTable(tab) {
    if (!tab || !tab.id || !tab.Email) return null;
    var visibles = [];
    for (var i = 0; i < tab.id.length; i++) {
      if (typeof tab.Email[i] === "string" && tab.Email[i].indexOf("@") > 0) visibles.push(i);
    }
    if (visibles.length !== 1) return null;
    var k = visibles[0];
    return {
      nomComplet: tab.Nom_Complet ? tab.Nom_Complet[k] : "",
      prenom: tab.Prenom ? tab.Prenom[k] : "",
      nom: tab.Nom ? tab.Nom[k] : "",
      role: tab.Role ? tab.Role[k] : ""
    };
  }

  function identifierAutomatiquement(essai) {
    if (manuel || identifie) return;
    var fini = false, minuterie;
    function suite() {
      if (essai + 1 < DELAIS.length) {
        setTimeout(function () { identifierAutomatiquement(essai + 1); }, DELAIS[essai + 1]);
      } else if (apiVue) {
        console.warn("[bandeau] table « " + tableUtilisateur + " » illisible : personne non identifiée.");
        appliquer(null);
      } else {
        console.info("[bandeau] API Grist introuvable ou sans accès complet : le widget peut appeler " + NOM + ".utilisateur(...).");
      }
    }
    var g = window.grist;
    if (g && g.docApi && typeof g.docApi.fetchTable === "function") {
      apiVue = true;
      minuterie = setTimeout(function () { if (!fini) { fini = true; suite(); } }, DELAI_MAX);
      g.docApi.fetchTable(tableUtilisateur).then(function (tab) {
        if (fini) return;
        fini = true; clearTimeout(minuterie);
        if (manuel) return;
        identifie = true; source = "table";
        appliquer(personneDepuisTable(tab));
      }, function () {
        if (fini) return;
        fini = true; clearTimeout(minuterie);
        suite();
      });
    } else {
      suite();
    }
  }

  // ---------- API pour le widget hôte ----------
  window[NOM] = {
    version: VERSION,
    // Transmission explicite par le widget : prioritaire sur la lecture automatique.
    utilisateur: function (m) {
      manuel = true; source = "widget";
      appliquer(m);
    },
    // Aide au diagnostic : dans la console du widget, taper  BandeauMenu.etat()
    etat: function () {
      return {
        version: VERSION,
        titre: titre,
        css: urlCss || "(introuvable)",
        personne: moi === undefined ? "(pas encore identifiée)" : moi,
        sourcePersonne: source,
        tableUtilisateur: tableUtilisateur,
        rolesReconnus: rolesMoi.slice(),
        liste: urlJson || "(introuvable)",
        liens: liens === null ? "(pas encore chargés : " + (etatListe || "menu jamais ouvert") + ")"
          : liens.map(function (l) { return { nom: l.nom, roles: l.roles, visible: visible(l) }; })
      };
    }
  };

  if (document.body) construire();
  else document.addEventListener("DOMContentLoaded", construire);
})();
