var level = require('level');
var Sheets = require('../models/sheets');

var db = level('./data/db', {
  valueEncoding: 'json'
});

var sheets = new Sheets(db, {
  dir: __dirname + 'data/sheets'
});

sheets.listen(function () {

});