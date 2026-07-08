const exampleData = {
  ID: 14999,
  Projet: "Beau Projet",
  Date: Date.parse('2020-10-12') / 1000,
  adresse_fournisseur_bc: "Beau fournisseur",
  adresse_envoi_bc: "Belle adresse envoi du bc",

  Prestataire: {
    Nom: 'Superbe entreprise',
    Rue1: '60 chemin de rue1',
    Rue2: 'Précision rue 2',
    Ville: 'Paris',
    CP: '75000',
    Email: 'liste@mail.fr',
    Tel: '00 00 00 00 00'
  },

  Utilisateur: {
    Nom: 'John Doe',
    Equipe: 'Nice Team',
    Institut: 'Wonderfull Institute',
    Rue: 'Bananaberg',
    Ville: 'City',
    CP: '07048',
    Email: 'personne.bla@mail.fr',
    Tel: '00 00 00'
  },

  Unites: [
    {
      Description: 'Prestation chouette',
      Prix: 35,
      Quantite: 3,
      Unite: "fun",
      Total: 105,
    },
    {
      Description: 'Prestation incroyable',
      Prix: 30,
      Quantite: 17,
      Unite: "joie",
      Total: 510,
    },
  ],

  TotalHT: 615,
  TVA: 12,
  Total: 627,
};
