function ready(fn) {
  if (document.readyState !== 'loading'){
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

/**
 * Demo is only shown when the row has no Issued or Due date.
 */
function addDemo(row) {
  if (!('Date' in row)) {
    for (const key of ['ID', 'Projet', 'Date']) {
      if (!(key in row)) { row[key] = key; }
    }
    for (const key of ['TotalHT', 'TVA', 'Total']) {
      if (!(key in row)) { row[key] = key; }
    }
  }
  if (!row.Prestataire) {
    row.Prestataire = {
      Nom: 'Prestataire.Nom',
      Rue1: 'Prestataire.Rue1',
      Rue2: 'Prestataire.Rue2',
      Ville: 'Prestataire.Ville',
      CP: 'Prestataire.CP',
      Email: 'Prestataire.Email',
      Tel: 'Prestataire.Tel'
    }
  }
  if (!row.Utilisateur) {
    row.Utilisateur = {
      Nom: 'Utilisateur.Nom',
      Institut: 'Utilisateur.Institut',
      Rue: 'Utilisateur.Rue',
      Ville: 'Utilisateur.Ville',
      CP: 'Utilisateur.CP',
      Email: 'Utilisateur.Email',
      Tel: 'Utilisateur.Tel'
    }
  }
  if (!row.Unités) {
    row.Unités = [
      {
        Description: 'Unités[0].Description',
        Quantité: '.Quantité',
        Unité: '.Unité',
        Total: '.Total',
        Coût: '.Coût'
      },
      {
        Description: 'Unités[1].Description',
        Quantité: '.Quantité',
        Unité: '.Unité',
        Total: '.Total',
        Coût: '.Coût'
      },
    ];
  }
  return row;
}

const data = {
  count: 0,
  invoice: '',
  status: 'waiting',
  tableConnected: false,
  rowConnected: false,
  haveRows: false,
};
let app = undefined;

Vue.filter('currency', formatNumberAsUSD)
function formatNumberAsUSD(value) {
  if (typeof value !== "number") {
    return value || '—';      // falsy value would be shown as a dash.
  }
  value = Math.round(value * 100) / 100;    // Round to nearest cent.
  value = (value === -0 ? 0 : value);       // Avoid negative zero.

  const result = value.toLocaleString('fr', {
    style: 'currency', currency: 'EUR'
  })
  if (result.includes('NaN')) {
    return value;
  }
  return result;
}

Vue.filter('fallback', function(value, str) {
  if (!value) {
    throw new Error("Please provide column " + str);
  }
  return value;
});

Vue.filter('asDate', function(value) {
  if (typeof(value) === 'number') {
    value = new Date(value * 1000);
  }
  const date = moment.utc(value)
  return date.isValid() ? date.format('MMMM DD, YYYY') : value;
});

function tweakUrl(url) {
  if (!url) { return url; }
  if (url.toLowerCase().startsWith('http')) {
    return url;
  }
  return 'https://' + url;
};

function handleError(err) {
  console.error(err);
  const target = app || data;
  target.invoice = '';
  target.status = String(err).replace(/^Error: /, '');
  console.log(data);
}

function prepareList(lst, order) {
  if (order) {
    let orderedLst = [];
    const remaining = new Set(lst);
    for (const key of order) {
      if (remaining.has(key)) {
        remaining.delete(key);
        orderedLst.push(key);
      }
    }
    lst = [...orderedLst].concat([...remaining].sort());
  } else {
    lst = [...lst].sort();
  }
  return lst;
}

function updateInvoice(row) {
  try {
    data.status = '';
    if (row === null) {
      throw new Error("(No data - not on row - please add or select a row)");
    }
    console.log("GOT...", JSON.stringify(row));
    if (row.References) {
      try {
        Object.assign(row, row.References);
      } catch (err) {
        throw new Error('Could not understand References column. ' + err);
      }
    }

    // Add some guidance about columns.
    const want = new Set(Object.keys(addDemo({})));
    const accepted = new Set(['References']);
    const importance = ['ID', 'Utilisateurs', 'Unités', 'Total', 'Prestataire', 'Date', 
                        'TotalHT', 'TVA'];
    if (!('Date' in row)) {
      const seen = new Set(Object.keys(row).filter(k => k !== 'id' && k !== '_error_'));
      const help = row.Help = {};
      help.seen = prepareList(seen);
      const missing = [...want].filter(k => !seen.has(k));
      const ignoring = [...seen].filter(k => !want.has(k) && !accepted.has(k));
      const recognized = [...seen].filter(k => want.has(k) || accepted.has(k));
      if (missing.length > 0) {
        help.expected = prepareList(missing, importance);
      }
      if (ignoring.length > 0) {
        help.ignored = prepareList(ignoring);
      }
      if (recognized.length > 0) {
        help.recognized = prepareList(recognized);
      }
      if (!seen.has('References') && !(row.Issued || row.Due)) {
        row.SuggestReferencesColumn = true;
      }
    }
    addDemo(row);
    if (!row.TotalHT && !row.Total && row.Unités && Array.isArray(row.Unités)) {
      try {
        row.TotalHT = row.Unités.reduce((a, b) => a + b.Coût * b.Quantité, 0);
        row.TVA = row.TotalHT * row.TVA
        row.Total = row.TotalHT + (row.TVA || 0);
      } catch (e) {
        console.error(e);
      }
    }

    // Fiddle around with updating Vue (I'm not an expert).
    for (const key of want) {
      Vue.delete(data.invoice, key);
    }
    for (const key of ['Help', 'SuggestReferencesColumn', 'References']) {
      Vue.delete(data.invoice, key);
    }
    data.invoice = Object.assign({}, data.invoice, row);

    // Make invoice information available for debugging.
    window.invoice = row;
  } catch (err) {
    handleError(err);
  }
}

ready(function() {
  // Update the invoice anytime the document data changes.
  grist.ready();
  grist.onRecord(updateInvoice);

  // Monitor status so we can give user advice.
  grist.on('message', msg => {
    // If we are told about a table but not which row to access, check the
    // number of rows.  Currently if the table is empty, and "select by" is
    // not set, onRecord() will never be called.
    if (msg.tableId && !app.rowConnected) {
      grist.docApi.fetchSelectedTable().then(table => {
        if (table.id && table.id.length >= 1) {
          app.haveRows = true;
        }
      }).catch(e => console.log(e));
    }
    if (msg.tableId) { app.tableConnected = true; }
    if (msg.tableId && !msg.dataChange) { app.RowConnected = true; }
  });

  Vue.config.errorHandler = function (err, vm, info)  {
    handleError(err);
  };

  app = new Vue({
    el: '#app',
    data: data
  });

  if (document.location.search.includes('demo')) {
    updateInvoice(exampleData);
  }
  if (document.location.search.includes('labels')) {
    updateInvoice({});
  }
});
