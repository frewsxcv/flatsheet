var level = require('level');
var Sheets = require('../models/sheets');

var db = level('./data/db', {
  valueEncoding: 'json'
});

var sheets = new Sheets(db, {
  path: __dirname + '/data/sheets'
});

var example1 = {
  name: 'example',
  description: 'this is an example deal with it',
  publisher: 'wat',
  host: 'http://127.0.0.1',
  port: '3000',
  rows: [
    { example: '1', wat: 'a' },
    { example: '2', wat: 'b' },
    { example: '3', wat: 'c' }
  ]
}

var example2 = {
  name: 'example too',
  description: 'this is another example deal with it',
  publisher: 'wat',
  host: 'http://127.0.0.1',
  port: '3001',
  rows: [
    { example: '-1', wat: 'x' },
    { example: '-2', wat: 'y' },
    { example: '-3', wat: 'z' }
  ]
}

sheets.create(example1);
sheets.create(example2);