var fs = require('fs');
var url = require('url');
var TableEditor = require('table-editor');
var prettify = require('jsonpretty');
var elClass = require('element-class');
var on = require('component-delegate').bind;
var closest = require('component-closest');
var CSV = require('comma-separated-values');
var Handlebars = require('handlebars');
var request = require('xhr');
var domify = require('domify');
var dom = require('dom-tree');
var domquery = require('domquery');
var siblings = require('siblings');
var io = require('socket.io-client')();
var View = require('ractive');

var flatsheet = require('flatsheet')({ 
  host: 'http://' + window.location.host
});

var id = window.location.pathname.split('/')[3];
var usersEl = document.getElementById('user-list');

var templates = {
  table: fs.readFileSync(__dirname + '/views/table.html', 'utf8'),
  sheetDetails: fs.readFileSync(__dirname + '/views/sheet-details.html', 'utf8'),
  modal: Handlebars.compile(
    fs.readFileSync(__dirname + '/views/modal.html', 'utf8')
  ),
  userList: Handlebars.compile(
    fs.readFileSync(__dirname + '/views/user-list.html', 'utf8')
  ),
  editLongText: Handlebars.compile(
    fs.readFileSync(__dirname + '/views/editor-long-text.html', 'utf8')
  )
};

io.on('connect', function () {  
  io.emit('room', id);
  io.emit('user', user);
  var users = {};

  io.on('update-users', function (userlist) {
    usersEl.innerHTML = templates.userList({ users: userlist });
  });
});

var remoteChange;

io.on('change', function (change, rows, sort) {
  remoteChange = true;
  if (sort) editor.forceUpdate(rows);
  else editor.set(change);
  remoteChange = false;
});

io.on('cell-focus', function (id, color) {  
  var cell = document.querySelector('#' + id + ' textarea');
  if (cell) {
    cell.style.borderColor = color;
    cell.style.backgroundColor = '#fefefa';
  }
});

io.on('cell-blur', function (id) {  
  var cell = document.querySelector('#' + id + ' textarea');
  if (cell) {
    cell.style.borderColor = '#ccc';
    cell.style.backgroundColor = '#fff';
  }
});

io.on('disconnect', function () {
  //console.log('disconnection.');
});

/* create the table editor */
window.editor = new TableEditor({
  el: 'main-content',
  template: templates.table
});

var sheetDetails = new View({
  el: 'sheet-details',
  template: templates.sheetDetails,
  data: { name: '', description: '' }
});

sheetDetails.on('change', function (change) {
  if (remoteChange) return;
  io.emit('sheet-details', change);
});

io.on('sheet-details', function (change) {
  remoteChange = true;
  sheetDetails.set(change);
  remoteChange = false;
});



/* get the help message */
var hello = document.getElementById('hello-message');

/* request the sheet from the api */
flatsheet.sheet(id, function (err, sheet) {
  console.log(err, sheet)
  elClass(hello).add('hidden');
  editor.import(sheet.rows);
  sheetDetails.set(sheet);
});


/* listen for changes to the data and save the object to the db */
editor.on('change', function (change) {
  if (remoteChange) return;
  if (editor.data.rows) var rows = editor.getRows();
  if (!sorting) io.emit('change', change, rows);
});

var sorting;

editor.on('dragstart', function () {
  sorting = true;
});


editor.on('drop', function () {
  var rows = editor.getRows();
  io.emit('change', {}, rows, sorting);
  sorting = false;
});

/* listener for adding a row */
on(document.body, '#add-row', 'click', function (e) {
  editor.addRow();
});

/* listener for adding a column */
on(document.body, '#add-column', 'click', function (e) {
  if (editor.get('columns')) elClass(hello).add('hidden');
  var name = window.prompt('New column name');
  if (name) editor.addColumn({ name: name, type: 'string' });
});

/* listener for showing the data as json */
on(document.body, '#show-json', 'click', function (e) {  
  var json_output = editor.getRows();  
  startDownload('this-sheet', 'json', JSON.stringify(json_output));
});

/* listener for showing the data as csv */
on(document.body, '#show-csv', 'click', function (e) {  
  var csv_file = new CSV(editor.getRows(), { header: true }).encode();
  startDownload('this-sheet','csv', csv_file);
});

/* listener for closing the codebox */
on(document.body, '#close', 'click', function (e) {
  textarea.value = '';
  elClass(codeBox).add('hidden');
});

/* listener for clearing the db */
on(document.body, '#destroy', 'click', function (e) {
  var msg = 'Are you sure you want to destroy the data in this project? You will start over with an empty workspace.';
  if (window.confirm(msg)) {
    editor.clear();
    elClass(hello).remove('hidden');
  };
});

/* listener for the delete column button */
on(document.body, 'thead .destroy', 'click', function (e) {
  var id;

  if (elClass(e.target).has('destroy')) id = e.target.id;
  else if (elClass(e.target).has('destroy-icon')) id = closest(e.target, '.destroy').id;

  var msg = 'Sure you want to delete this column and its contents?';
  if (window.confirm(msg)) editor.destroyColumn(id);
  var data = editor.get('rows');
  editor.set('rows', data);
});

/* listener for delete-row button */
on(document.body, '.delete-row', 'click', function (e) {
  var btn;

  if (elClass(e.target).has('delete-row')) btn = e.target;
  else if (elClass(e.target).has('destroy-icon')) btn = closest(e.target, '.delete-row');

  var row = closest(btn, 'tr');
  var msg = 'Sure you want to delete this row and its contents?';
  
  if (window.confirm(msg)) {
    editor.destroyRow(row.id);
    editor.forceUpdate();
    editor.update();
  }
});

/* listener for the table body */
on(document.body, '#table-editor textarea', 'click', cellFocus);

/* listener for tabbing through cells */
on(document.body, 'tbody', 'keyup', function (e) {
  if (elClass(e.target).has('cell') && e.keyCode === 9) {
    cellFocus(e);
  }
});

/* listener for expand-editor button */
on(document.body, '.expand-editor', 'click', function (e) {
  e.preventDefault();
  cellFocus(e);

  var id = closest(e.target, 'td').id;
  var link = closest(e.target, 'a');
  var cell = siblings(link, 'textarea')[0];
  var text = cell.value;

  var modal = templates.modal({
    content: templates.editLongText({ text: text, id: id })
  });

  dom.add(document.body, domify(modal));
});

/* listener for saving the long text editor */
on(document.body, '#save-long-text-editor', 'click', function (e) {
  var expandedCell = siblings(e.target, 'textarea')[0];
  var id = siblings(e.target, 'input')[0].value;
  var cell = domquery('#' + id + ' textarea');
  cell.value(expandedCell.value);
  dom.remove('#modal');
  editor.updateModel();
  io.emit('cell-blur', id);
});

/* listener for closing a modal */
on(document.body, '#close-modal', 'click', function (e) {
  var id = document.querySelector('.expanded-cell-id').value;
  dom.remove('#modal');
  io.emit('cell-blur', id);
});

function cellFocus (e) {
  var id = closest(e.target, 'td').id;
  io.emit('cell-focus', id, user.color);
  
  var row = closest(e.target, 'tr');
  row.setAttribute('draggable', false);

  e.target.onblur = function () {
    io.emit('cell-blur', id);
    row.setAttribute('draggable', true);
  };
}





function startDownload (name, extension, content, attachment_type) {  
  if (!name || !extension || !content) return false;
  if (!attachment_type) attachment_type = extension;

  var body = document.body;
  var anchor_tag = document.createElement('a');
  
  anchor_tag.href = 'data:attachment/' + attachment_type + ',' + encodeURIComponent(content);
  anchor_tag.target = '_blank';
  anchor_tag.download = name + '.' + extension;

  body.appendChild(anchor_tag);
  anchor_tag.click();

  body.removeChild(anchor_tag);
}
