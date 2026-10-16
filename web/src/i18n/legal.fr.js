// Conditions d'utilisation et Politique de confidentialité (français canadien). Affichées par web/src/pages/Legal.jsx.
// Blocs : chaîne = paragraphe, { h } = titre, { list: [...] } = liste à puces,
// tableau = paragraphe mêlant chaînes et { link, text }.
export default {
  updated: "Dernière mise à jour : 16 octobre 2026",

  privacy: {
    title: "Politique de confidentialité",
    body: [
      "ArticxAI est une application de clavardage avec IA. Son assistant s'appelle Maple. ArticxAI est exploitée par Articx Inc., établie à Toronto (Ontario), Canada (« nous »).",
      "Cette politique explique quels renseignements personnels nous recueillons, où nous les conservons, comment nous les utilisons et quels choix s'offrent à vous. Nous respectons la Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE) du Canada. Si vous habitez au Québec, vous avez aussi des droits en vertu de la loi québécoise sur la protection des renseignements personnels (Loi 25), et nous les respectons.",

      { h: "Ce que nous recueillons" },
      "Nous recueillons seulement ce dont nous avons besoin pour faire fonctionner ArticxAI :",
      {
        list: [
          "Renseignements du compte : votre adresse courriel, votre mot de passe (géré par notre fournisseur de connexion), votre prénom, votre date de naissance et votre pays. Nous demandons votre date de naissance pour confirmer que vous avez au moins 13 ans. Elle ne peut pas être modifiée après l'inscription.",
          "Codes de connexion : chaque fois que vous vous connectez, nous vous envoyons par courriel un code à 6 chiffres pour confirmer que c'est bien vous.",
          "Renseignements de profil facultatifs : une photo de profil et le nom indiqué dans « Comment Maple doit-il vous appeler? ». Votre photo n'est visible que par vous. Le nom est ajouté aux instructions de Maple pour qu'il puisse s'adresser à vous.",
          "Conversations : les messages que vous envoyez, les réponses de Maple et les titres de vos conversations.",
          "Compteurs d'utilisation : le nombre de messages envoyés par votre compte chaque jour, semaine et mois, pour appliquer les limites de votre forfait.",
          "Sessions actives : pour chaque connexion, une description de l'appareil (navigateur et système d'exploitation, tirés de l'agent utilisateur de votre navigateur), un emplacement approximatif selon le fuseau horaire de votre appareil (par exemple, « Toronto ») et les dates de création et de dernière activité de la session. Nous ne déterminons pas votre emplacement à partir de votre adresse IP.",
          "Commentaires : si vous donnez un pouce levé à une réponse, nous conservons seulement l'évaluation. Si vous donnez un pouce baissé, nous pouvons conserver votre question, la réponse de Maple et la note que vous ajoutez.",
          "Conversations partagées : si vous créez un lien de partage, nous conservons une copie de cette conversation pour le lien.",
          "Renseignements de facturation : quand vous achetez un forfait ou un bloc de messages, nous conservons votre identifiant client Stripe. Stripe traite votre carte. Nous ne voyons ni ne conservons jamais votre numéro de carte complet.",
          "Utilisation sans compte : si vous envoyez des messages sans compte, nous utilisons une session anonyme. Pour prévenir les abus, nous comptons les messages des invités par adresse IP et par jour à l'aide d'un hachage à sens unique de l'adresse IP, et non de l'adresse elle-même.",
        ],
      },
      "Nous tenons aussi des totaux anonymes. Chaque message ajoute 1 à un compte hebdomadaire pour son sujet général (par exemple, « Logement » ou « Impôts »), et nous comptons les langues dans lesquelles les messages sont écrits. Ces totaux ne contiennent jamais vos mots, votre compte ni votre adresse IP.",

      { h: "Où vos renseignements sont conservés" },
      "Vos conversations, votre profil, vos compteurs d'utilisation et votre liste de sessions sont conservés dans Google Cloud Firestore, dans la région de Toronto (northamerica-northeast2). Les réponses de Maple sont générées par nos modèles, qui fonctionnent sur des serveurs au Canada.",
      "Certains de nos fournisseurs de services peuvent traiter des renseignements à l'extérieur du Canada, notamment aux États-Unis. Dans ce cas, vos renseignements sont soumis aux lois de ce pays, et les autorités de ce pays pourraient y avoir accès. Voir « Avec qui nous les partageons » ci-dessous.",

      { h: "Comment nous les utilisons" },
      {
        list: [
          "Pour faire fonctionner ArticxAI : créer votre compte, vous connecter, répondre à vos messages et afficher votre historique de conversations.",
          "Pour assurer la sécurité du service : confirmer les connexions, vous montrer vos sessions actives et prévenir les abus.",
          "Pour appliquer les limites de messages de votre forfait et des invités.",
          "Pour traiter les paiements des forfaits payants et des blocs de messages.",
          "Pour améliorer Maple, à l'aide des commentaires que vous choisissez d'envoyer et, seulement si vous activez « Aider à améliorer Maple », de copies de vos conversations comme décrit ci-dessous.",
          "Pour comprendre quels sujets et quelles langues sont utilisés, uniquement à l'aide de totaux anonymes.",
        ],
      },
      "Nous n'utilisons pas vos conversations pour entraîner Maple, sauf si vous activez « Aider à améliorer Maple ». Nous ne vendons pas vos renseignements personnels et nous n'affichons pas de publicité.",

      { h: "Aider à améliorer Maple (facultatif)" },
      "L'option « Aider à améliorer Maple », dans Paramètres > Confidentialité, est désactivée par défaut. Si vous l'activez :",
      {
        list: [
          "Nous conservons une copie de chacun de vos messages et de la réponse de Maple, avec quelques messages précédents pour le contexte.",
          "Avant l'enregistrement, nous retirons automatiquement les renseignements personnels qui suivent un format connu : adresses courriel, numéros de téléphone, numéros d'assurance sociale, numéros de carte, codes postaux, adresses et numéros d'identification. Ce retrait automatique peut en manquer; évitez donc de partager des renseignements sensibles.",
          "La copie n'est pas liée à votre nom ni à votre courriel. Nous gardons seulement un code à sens unique pour pouvoir supprimer vos copies sur demande.",
          "Nous ne conservons jamais les messages liés à une urgence médicale ou à une crise, ni les réponses fondées sur la recherche Web en direct.",
          "Une personne de notre équipe révise les copies avant qu'elles servent à entraîner Maple. Les copies sont stockées à Toronto.",
          "Vous pouvez désactiver l'option en tout temps. Dans ce cas, ou si vous supprimez votre compte, les copies conservées sont supprimées. Un modèle déjà entraîné ne peut pas « désapprendre » une conversation, mais elle ne sera plus utilisée pour l'entraînement.",
        ],
      },

      { h: "Recherche sur le Web" },
      "Quand une question exige de l'information à jour, nous envoyons le texte de cette question à notre fournisseur de recherche Web, Tavily. Les questions sur la météo sont envoyées à Open-Meteo. Nous envoyons seulement la question, pas les renseignements de votre compte. Maple affiche ensuite les résultats avec des liens vers ses sources.",

      { h: "Avec qui nous les partageons" },
      "Nous partageons des renseignements personnels seulement avec les fournisseurs de services qui nous aident à faire fonctionner ArticxAI, et seulement ce dont ils ont besoin :",
      {
        list: [
          "Google Firebase Authentication (Google LLC), pour les comptes et la connexion. Ce service peut traiter des données à l'extérieur du Canada.",
          "Google Cloud Firestore, pour conserver vos données à Toronto.",
          "Zoho ZeptoMail, pour envoyer des courriels comme vos codes de connexion.",
          "Tavily et Open-Meteo, pour répondre aux questions qui exigent une recherche Web ou la météo (texte de la question seulement).",
          "Stripe, pour traiter les paiements. Ce service peut traiter des données à l'extérieur du Canada.",
        ],
      },
      "Nous pouvons aussi communiquer des renseignements lorsque la loi l'exige, par exemple pour répondre à une ordonnance d'un tribunal valide, ou lorsque c'est nécessaire pour protéger la sécurité d'une personne. Si vous créez un lien de partage, toute personne qui a le lien peut voir cette conversation.",

      { h: "Témoins et stockage dans le navigateur" },
      "ArticxAI utilise le stockage local de votre navigateur pour mémoriser vos préférences (thème, langue et modèle) et pour vous garder connecté. Nous n'utilisons aucun traceur publicitaire.",

      { h: "Durée de conservation" },
      {
        list: [
          "Les conversations sont conservées jusqu'à ce que vous les supprimiez. Supprimer une conversation supprime aussi son lien de partage.",
          "Un lien de partage fonctionne jusqu'à ce que vous cessiez de partager ou supprimiez la conversation.",
          "Les renseignements de votre compte sont conservés jusqu'à la suppression de votre compte.",
          "Les commentaires déjà envoyés et les totaux anonymes de sujets et de langues ne sont pas liés à votre compte. Ils sont donc conservés après la suppression de votre compte.",
        ],
      },

      { h: "Supprimer votre compte" },
      "Allez dans Paramètres > Compte > Supprimer le compte. Deux choix s'offrent à vous :",
      {
        list: [
          "Temporaire : votre compte est désactivé et vous êtes déconnecté partout. Reconnectez-vous dans les 30 jours pour le rétablir. Après 30 jours, il est supprimé définitivement.",
          "Définitive : votre compte, vos conversations, votre photo de profil, vos sessions et vos liens partagés sont supprimés immédiatement. Cette action est irréversible.",
        ],
      },
      "Vous pouvez aussi écrire à notre responsable de la protection des renseignements personnels à articxai@gmail.com pour demander la suppression de votre compte.",

      { h: "Comment nous les protégeons" },
      "Nous protégeons vos renseignements avec des mesures adaptées à leur sensibilité. Les données sont chiffrées en transit. Chaque connexion exige votre mot de passe et un code envoyé à votre adresse courriel. L'accès à nos systèmes est limité aux personnes et aux services qui en ont besoin. Vous pouvez voir vos sessions actives dans les Paramètres et déconnecter vos autres appareils en tout temps.",
      "Aucun système n'est parfaitement sûr. Si un incident de confidentialité présente un risque réel de préjudice grave pour vous, nous vous aviserons, ainsi que les autorités, comme l'exige la loi.",

      { h: "Vos droits" },
      "Vous avez le droit :",
      {
        list: [
          "De savoir quels renseignements personnels nous détenons à votre sujet et d'en obtenir une copie.",
          "De faire corriger des renseignements inexacts ou incomplets.",
          "De demander la suppression de vos renseignements.",
          "De retirer votre consentement en tout temps. Dans ce cas, il se peut que nous ne puissions plus vous offrir le service.",
        ],
      },
      "Les résidents du Québec ont aussi des droits en vertu de la Loi 25, dont le droit de recevoir leurs renseignements dans un format technologique structuré et couramment utilisé, et celui d'être informés des décisions fondées exclusivement sur un traitement automatisé.",
      "Pour faire une demande, écrivez à articxai@gmail.com. Nous répondrons dans le délai prévu par la loi (habituellement 30 jours). Nous pourrions d'abord vous demander de confirmer votre identité.",
      "Si notre réponse ne vous satisfait pas, vous pouvez porter plainte auprès du Commissariat à la protection de la vie privée du Canada (priv.gc.ca). Les résidents du Québec peuvent aussi s'adresser à la Commission d'accès à l'information du Québec (cai.gouv.qc.ca).",

      { h: "Enfants" },
      "Vous devez avoir au moins 13 ans pour utiliser ArticxAI. Nous ne recueillons pas sciemment de renseignements auprès de personnes de moins de 13 ans. Si vous n'avez pas atteint l'âge de la majorité dans votre province ou territoire, vous avez besoin de la permission d'un parent ou d'un tuteur. Si vous croyez qu'un enfant de moins de 13 ans a un compte, communiquez avec nous et nous le supprimerons.",

      { h: "Modifications de cette politique" },
      "Nous pouvons mettre à jour cette politique au fil de l'évolution d'ArticxAI. Nous publierons la nouvelle version ici et modifierons la date en haut de la page. Si nous apportons un changement important, nous vous en informerons dans l'application ou par courriel avant son entrée en vigueur.",

      { h: "Nous joindre" },
      "Responsable de la protection des renseignements personnels, Articx Inc.",
      "Toronto (Ontario), Canada",
      "Courriel : articxai@gmail.com",
      ["Voir aussi nos ", { link: "/terms", text: "Conditions d'utilisation" }, "."],
    ],
  },

  terms: {
    title: "Conditions d'utilisation",
    body: [
      "Bienvenue sur ArticxAI. Ces conditions constituent une entente entre vous et Articx Inc., établie à Toronto (Ontario), Canada (« nous »). Elles s'appliquent lorsque vous utilisez ArticxAI et son assistant, Maple. En utilisant ArticxAI, vous acceptez ces conditions.",

      { h: "1. Qui peut utiliser ArticxAI" },
      "Vous devez avoir au moins 13 ans. Si vous n'avez pas atteint l'âge de la majorité dans votre province ou territoire, vous avez besoin de la permission d'un parent ou d'un tuteur, qui accepte ces conditions en votre nom.",

      { h: "2. Votre compte" },
      "Donnez-nous des renseignements exacts lors de votre inscription. Votre date de naissance ne pourra pas être modifiée par la suite. Gardez votre mot de passe confidentiel et ne partagez pas votre compte. Chaque connexion exige un code envoyé par courriel : protégez donc aussi votre compte de courriel.",
      "Vous êtes responsable de ce qui se passe dans votre compte. Si vous croyez qu'une autre personne l'a utilisé, changez votre mot de passe, déconnectez vos autres appareils dans les Paramètres et avisez-nous.",

      { h: "3. Utiliser ArticxAI de façon équitable" },
      "N'utilisez pas ArticxAI pour :",
      {
        list: [
          "Enfreindre la loi ou aider quelqu'un d'autre à l'enfreindre.",
          "Harceler, menacer, intimider ou blesser qui que ce soit.",
          "Créer du contenu qui sexualise ou exploite des mineurs, de quelque façon que ce soit.",
          "Créer ou diffuser des logiciels malveillants, des pourriels ou des arnaques.",
          "Tenter de contourner, de tester ou de briser notre sécurité, notre système de connexion ou nos limites de messages.",
          "Extraire massivement des données, surcharger le service ou en automatiser l'accès, ou créer des comptes pour contourner les limites.",
          "Vous faire passer pour quelqu'un d'autre ou porter atteinte aux droits d'autrui, notamment en matière de vie privée et de propriété intellectuelle.",
          "Copier, revendre ou désosser ArticxAI ou Maple, sauf si la loi le permet.",
        ],
      },

      { h: "4. Les réponses de l'IA peuvent être erronées" },
      "Maple génère ses réponses automatiquement. Elles peuvent être erronées, incomplètes ou dépassées, même quand Maple fait une recherche sur le Web. Les liens vers les sources peuvent aussi être erronés ou mener à la mauvaise page. Vérifiez toujours l'information importante auprès d'une source fiable.",
      "Maple ne remplace pas les conseils d'un professionnel en matière médicale, juridique, financière ou de santé mentale. Consultez une personne qualifiée avant de prendre une décision importante.",
      "En cas d'urgence, composez le 911. Si vous pensez au suicide ou si vous vous inquiétez pour quelqu'un, appelez ou textez le 988 (Ligne d'aide en cas de crise de suicide), en tout temps.",

      { h: "5. Votre contenu" },
      ["Dans la mesure permise par la loi, vous êtes propriétaire de ce que vous écrivez dans ArticxAI et des réponses que Maple vous donne. Vous nous autorisez à conserver, traiter et afficher votre contenu uniquement pour vous offrir ArticxAI, comme le décrit notre ", { link: "/privacy", text: "Politique de confidentialité" }, ". Nous n'utilisons pas vos conversations pour entraîner Maple, sauf si vous activez « Aider à améliorer Maple » dans Paramètres > Confidentialité."],
      "Vous êtes responsable de ce que vous envoyez et de l'usage que vous faites des réponses de Maple. D'autres personnes peuvent recevoir des réponses semblables à des questions semblables.",
      "Si vous nous envoyez des commentaires, nous pouvons nous en servir pour améliorer Maple sans aucune obligation envers vous.",

      { h: "6. Partage de conversations" },
      "Vous pouvez créer un lien qui affiche une copie d'une conversation. Toute personne qui a le lien peut la voir, jusqu'à ce que vous cessiez de la partager ou que vous la supprimiez. Ne partagez que des conversations que vous acceptez de rendre publiques, et ne partagez pas les renseignements personnels d'autres personnes.",

      { h: "7. Forfaits, limites et paiements" },
      "Le forfait Gratuit comprend jusqu'à 200 messages par jour, 1 000 par semaine et 3 000 par mois. Les invités peuvent envoyer quelques messages gratuits sans compte. Nous pouvons modifier ces limites, et les limites en vigueur sont affichées dans l'application.",
      "Nous offrons aussi des forfaits payants et des blocs de messages. Les prix sont en dollars canadiens, taxes applicables en sus. Les paiements sont traités par Stripe.",
      {
        list: [
          "Les abonnements sont facturés à l'avance et se renouvellent automatiquement à la fin de chaque période jusqu'à leur annulation.",
          "Vous pouvez annuler en tout temps. Votre forfait reste actif jusqu'à la fin de la période payée.",
          "Nous n'accordons pas de remboursement pour les périodes partielles, sauf si la loi l'exige.",
          "Si nous modifions un prix, nous vous en aviserons avant qu'il s'applique, et vous pourrez annuler avant cette date.",
        ],
      },

      { h: "8. Modifications du service et suspension" },
      "Nous améliorons constamment ArticxAI : des fonctionnalités peuvent donc changer ou être retirées. Nous pouvons suspendre ou fermer un compte qui enfreint ces conditions ou qui met le service ou d'autres personnes en danger. Lorsque c'est raisonnable, nous vous en expliquerons la raison et vous donnerons l'occasion de répondre.",

      { h: "9. Fermer votre compte" },
      "Vous pouvez supprimer votre compte en tout temps dans Paramètres > Compte > Supprimer le compte. Une suppression temporaire peut être annulée en vous reconnectant dans les 30 jours. Une suppression définitive efface immédiatement votre compte, vos conversations et vos liens partagés, et elle est irréversible. Les forfaits payants ne sont pas remboursés pour la période restante, sauf si la loi l'exige.",

      { h: "10. Exclusions de garantie" },
      "Nous faisons tout pour qu'ArticxAI soit utile et disponible, mais nous l'offrons « tel quel » et « selon sa disponibilité ». Dans la mesure permise par la loi, nous ne garantissons pas qu'il sera toujours disponible ou exempt d'erreurs, ni que ses réponses seront exactes ou adaptées à un usage particulier.",

      { h: "11. Limitation de responsabilité" },
      "Dans la mesure permise par la loi, Articx Inc. n'est pas responsable des pertes indirectes, accessoires, spéciales ou consécutives, comme la perte de profits ou de données, découlant de votre utilisation d'ArticxAI. Dans la mesure permise par la loi, notre responsabilité totale envers vous pour toute réclamation est limitée au plus élevé des montants suivants : la somme que vous nous avez payée au cours des 12 mois précédant la réclamation, ou 100 $ CA.",
      "Rien dans ces conditions ne limite les droits que vous accordent les lois sur la protection du consommateur de votre province ou territoire, y compris la Loi sur la protection du consommateur du Québec. Si vous êtes un consommateur au Québec, les limites ci-dessus s'appliquent seulement dans la mesure permise par la loi québécoise.",

      { h: "12. Indemnisation" },
      "Si vous utilisez ArticxAI d'une façon qui enfreint ces conditions ou la loi, et qu'une personne présente une réclamation contre nous pour cette raison, vous acceptez de couvrir nos frais raisonnables liés à cette réclamation, dans la mesure permise par la loi. Cette clause ne s'applique pas aux consommateurs lorsque la loi locale l'interdit.",

      { h: "13. Droit applicable et différends" },
      "Ces conditions sont régies par les lois de l'Ontario et les lois fédérales du Canada qui s'y appliquent. En cas de désaccord, communiquez d'abord avec nous : la plupart des problèmes se règlent rapidement ainsi. Sinon, les tribunaux de l'Ontario trancheront. Si vous êtes un consommateur qui habite dans une autre province, y compris le Québec, vous pourriez aussi intenter un recours devant les tribunaux de votre lieu de résidence, et les lois sur la protection du consommateur de cette province continuent de s'appliquer à vous.",

      { h: "14. Modifications de ces conditions" },
      "Nous pouvons mettre à jour ces conditions. Nous publierons la nouvelle version ici et modifierons la date en haut de la page. Si nous apportons un changement important, nous vous en informerons dans l'application ou par courriel avant son entrée en vigueur. Si vous continuez d'utiliser ArticxAI par la suite, les nouvelles conditions s'appliquent. Si vous ne les acceptez pas, vous pouvez cesser d'utiliser ArticxAI et supprimer votre compte.",

      { h: "15. Dispositions générales" },
      "Si une partie de ces conditions ne peut pas être appliquée, le reste demeure en vigueur. Si nous n'exigeons pas immédiatement le respect d'une condition, nous pouvons toujours le faire plus tard. Ces conditions et notre Politique de confidentialité constituent l'entente complète entre vous et nous au sujet d'ArticxAI.",

      { h: "16. Nous joindre" },
      "Articx Inc., Toronto (Ontario), Canada",
      "Courriel : articxai@gmail.com",
    ],
  },
};
