var level = require('level');
var Sheets = require('../models/sheets');

var db = level('./data/db', {
  valueEncoding: 'json'
});

var sheets = new Sheets(db, {
  path: __dirname + 'data/sheets'
});

sheets.list(function (err, list) {
  list.forEach(function (item) {
    sheets.get(item.id, function (e, sheet) {
      console.log(sheet);
    });
  });
});