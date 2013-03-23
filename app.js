(function() {
  var app, cfg, db, express, http, nano, port, sanitize;
  express = require('express');
  sanitize = require('validator').sanitize;
  http = require('http');
  app = module.exports = express.createServer();
  cfg = null;
  nano = null;
  db = null;
  app.configure(function() {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser());
    app.use(express.session({
      secret: 'your secret here'
    }));
    app.use(express.compiler({
      src: __dirname + '/public',
      enable: ['sass']
    }));
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
    return app.use(express.errorHandler({
      dumpExceptions: true,
      showStack: true
    }));
  });
  app.configure('development', function() {
    return cfg = require('./cfg.js');
  });
  app.configure('production', function() {
    return cfg = require('./cfgserver.js');
  });
  app.configure(function() {
    nano = require('nano')(cfg);
    return db = nano.use('english');
  });
  http.IncomingMessage.prototype.entityEncodeRequestBody = function(key) {
    return this.body[key] = sanitize(this.body[key]).entityEncode();
  };
  app.get('/', function(req, res, next) {
    return db.view('posts', 'posts', {
      descending: true
    }, function(e, r, h) {
      if (h['status-code'] === 500) {
        return next(new Error("Database connection error"));
      }
      return res.render('index', {
        posts: r.rows
      });
    });
  });
  app.post('/post/add', function(req, res) {
    req.entityEncodeRequestBody('post');
    if (req.body.post.length > 0) {
      return db.insert(req.body, function() {
        return res.redirect('/');
      });
    } else {
      return res.redirect('/');
    }
  });
  app.post('/post/edit/:postId', function(req, res) {
    return db.get(req.params.postId, function(e, r, h) {
      req.entityEncodeRequestBody('post');
      req.body._rev = r._rev;
      return db.insert(req.body, r._id, function() {
        return res.send(req.body.post);
      });
    });
  });
  app.get('/post/delete/:postId', function(req, res) {
    return db.get(req.params.postId, function(e, r, h) {
      db.destroy(r._id, r._rev, function() {});
      return res.redirect('/');
    });
  });
  port = process.env.PORT || 3000;
  app.listen(port, function() {
    return console.log('Started on %d', app.address().port);
  });
}).call(this);
