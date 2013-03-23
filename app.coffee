# Module Dependencies
express = require 'express'
sanitize = require('validator').sanitize
http = require 'http'
app = module.exports = express.createServer()
cfg = null
nano = null
db = null

# Configuration
app.configure ->
  app.set 'views', __dirname + '/views'
  app.set 'view engine', 'jade'
  app.use express.bodyParser()
  app.use express.methodOverride()
  app.use express.cookieParser()
  app.use express.session
    secret: 'your secret here'
  app.use express.compiler
    src: __dirname + '/public'
    enable: ['sass']
  app.use app.router
  app.use express.static __dirname + '/public'
  app.use express.errorHandler
    dumpExceptions: true
    showStack: true
  
app.configure 'development', ->
  cfg = require './cfg.js'

app.configure 'production', ->
  cfg = require './cfgserver.js'
  
app.configure ->  
  nano = require('nano')(cfg)
  db = nano.use 'english'
  
# Custom Http IncomingMessage
http.IncomingMessage.prototype.entityEncodeRequestBody = (key) ->
  @body[key] = sanitize(@body[key]).entityEncode()

# Routes
app.get '/', (req, res, next) ->
  db.view 'posts', 'posts', descending: true, (e, r, h) ->
    if h['status-code'] is 500 then return next new Error "Database connection error"
    res.render 'index',
      posts: r.rows
      
app.post '/post/add', (req, res) ->
  req.entityEncodeRequestBody 'post'
  if req.body.post.length > 0
    db.insert req.body, ->
      res.redirect '/'
  else
    res.redirect '/'
    
app.post '/post/edit/:postId', (req, res) ->
  db.get req.params.postId, (e, r, h) ->
    req.entityEncodeRequestBody 'post'
    req.body._rev = r._rev
    db.insert req.body, r._id, ->
      res.send req.body.post
    
app.get '/post/delete/:postId', (req, res) ->
  db.get req.params.postId, (e, r, h) ->
    db.destroy r._id, r._rev, ->
    res.redirect '/'

# Starting the app ..
port = process.env.PORT || 3000
app.listen port, ->
  console.log 'Started on %d', app.address().port