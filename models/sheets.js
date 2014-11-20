var path = require('path');
var level = require('level');
var uuid = require('uuid').v1;
var extend = require('extend');
var dat = require('dat');

module.exports = Sheets;

function Sheets (db, opts) {
  if (!(this instanceof Sheets)) return new Sheets(db, opts);
  
  this.path = opts.path || './data/sheets';
    
  this.db = db || level('./data/db', {
    valueEncoding: 'json'
  });
}

Sheets.prototype.put = 
Sheets.prototype.new = 
Sheets.prototype.create = function (data, cb) {
  var self = this;
  var key = uuid();
  data.id = key;
  data.path = path.join(this.path, key);
  data.url = data.host + ':' + data.port;

  var rows = data.rows;
  delete data.rows;

  var db = dat(data.dir, data, function (err, wat) {
    self.db.put(key, data, function (err) {
      if (err) console.error(err);
      
      rows.forEach(function (row) {
        db.put(row);
      });
    });

  });
};

Sheets.prototype.get = 
Sheets.prototype.fetch = function (key, cb) {
  var self = this;
  this.db.get(key, function (err, res) {
    res.rows = [];
    var d = dat(res.path, function () {
      d.createReadStream()
        .on('data', function (data) {
          res.rows.push(data);
        })
        .on('end', function () {
          cb(null, res);
        });
    });

  });
};

Sheets.prototype.list = function (opts, cb) {
  var defaultOpts = { keys: false, values: true };

  if (typeof opts === 'function') {
    var cb = opts;
    var opts = defaultOpts;
  } else {
    var opts = extend(defaultOpts, opts);
  }
  
  if (!cb) return this.db.createReadStream(opts);

  var results = [];
  this.db.createReadStream(opts)
    .on('data', function (data) {
      results.push(data);
    })
    .on('error', function (err) {
      return cb(err);
    })
    .on('end', function () {
      return cb(null, results);
    });
};

/* TODO: dat stuff */
Sheets.prototype.update = function (key, data, cb) {
  var self = this;
  this.db.put(key, data, function (err) {
    if (err) return cb(err);
    self.db.get(key, cb);
  });
};

/* TODO: dat stuff */
Sheets.prototype.destroy = function (key, cb) {
  this.db.del(key, function (err) {
    
  });
};

Sheets.prototype.listen = function () {
  this.db.createValueStream()
    .on('data', function (repo) {
      repo.adminUser = 'pizza';
      repo.adminPass = 'wat';
      var db = dat(repo.path, repo, function (err, wat) {
        if (err) throw err;
        db.listen(repo.port, function (err) {
          if (err) console.error(err);
        });
      });
    }); 
};
