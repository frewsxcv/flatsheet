var path = require('path');
var level = require('level');
var Sheets = require('../../models/sheets');

var db = level('./data/db', {
  valueEncoding: 'json'
});

var sheets = new Sheets(db, {
  path: path.join(process.cwd(), 'data', 'sheets')
});

sheets.get('2fb62110-71d7-11e4-905f-81a4808d60d6', function (err, res) {
  console.log(res);
});