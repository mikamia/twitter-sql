'use strict';
var express = require('express');
var router = express.Router();
var tweetBank = require('../tweetBank');
var client=require('../db');

module.exports = function makeRouterWithSockets (io) {

  // a reusable function
  // function respondWithAllTweets (req, res, next){
  //   var allTheTweets = tweetBank.list();
  //   res.render('index', {
  //     title: 'Twitter.js',
  //     tweets: allTheTweets,
  //     showForm: true
  //   });
  // }

  function respondWithAllTweetsPOSTGRES (req,res,next){
    client.query('SELECT tweets.id as tweetID, users.id, tweets.content, users.name FROM tweets INNER JOIN users ON tweets.userid = users.id', function (err, result) {
      if (err) return next(err); // pass errors to Express
      var tweets = result.rows;
      for(var i=0;i<result.rows.length;i++){
        console.log(i,result.rows[i]);
      }
      console.log(tweets[0].tweetid);
      res.render('index', { title: 'Twitter.js', tweets: tweets, showForm: true });
    });
  }

  // here we basically treet the root view and tweets view as identical
  router.get('/', respondWithAllTweetsPOSTGRES);
  router.get('/tweets', respondWithAllTweetsPOSTGRES);

  // single-user page
  router.get('/users/:username', function(req, res, next){
    // var tweetsForName = tweetBank.find({ name: req.params.username });
    // res.render('index', {
    //   title: 'Twitter.js',
    //   tweets: tweetsForName,
    //   showForm: true,
    //   username: req.params.username
    // });

    var query = 'SELECT tweets.id as tweetID, users.id, tweets.content, users.name FROM tweets INNER JOIN users ON tweets.userid = users.id WHERE users.name = $1'

    client.query(query, [req.params.username],function (err, result) {
      if (err) return next(err); // pass errors to Express
      var tweetsForName = result.rows;
      res.render('index', { title: 'Twitter.js', tweets: tweetsForName, showForm: true, username: req.params.username });
    });

  });

  // single-tweet page
  router.get('/tweets/:id', function(req, res, next){
    // var tweetsWithThatId = tweetBank.find({ id: Number(req.params.id) });
    // res.render('index', {
    //   title: 'Twitter.js',
    //   tweets: tweetsWithThatId // an array of only one element ;-)
    // });

    var query = 'SELECT * FROM tweets INNER JOIN users ON tweets.userid = users.id WHERE tweets.id = $1'

    client.query(query, [req.params.id],function (err, result) {
      if (err) return next(err); // pass errors to Express
      var tweetsWithThatId = result.rows;
      res.render('index', { title: 'Twitter.js', tweets: tweetsWithThatId });
    });

  });

  // create a new tweet
  router.post('/tweets', function(req, res, next){
    // var newTweet = tweetBank.add(req.body.name, req.body.content);
    // io.sockets.emit('new_tweet', newTweet);
    // res.redirect('/');

    var query='SELECT (name) FROM users WHERE name=$1';
    client.query(query,[req.body.name],function (err, result) {
       //console.log('result',result.rows[0].name);
       if (err) return next(err); 
       if(!result.rows[0]){
          var query='INSERT INTO Users (name) VALUES ($1)';
          client.query(query,[req.body.name]);
       }
      var newTweet= 'INSERT INTO Tweets (userId, content) VALUES ((SELECT id from Users WHERE name=$1), $2);'
      client.query(newTweet, [req.body.name, req.body.content],function (err, result) {
        if (err) return next(err); // pass errors to Express
        console.log(result);
        var tweetGrabber='SELECT tweets.id as tweetID, tweets.content  FROM tweets';
        client.query(tweetGrabber,function(err,result){
          if (err) return next(err);
          var tweet=result.rows[result.rows.length-1];
          tweet.name=req.body.name;
          io.sockets.emit('new_tweet', tweet);
          res.redirect('/');
        });
        
      });
    });

    
  });

  // // replaced this hard-coded route with general static routing in app.js
  // router.get('/stylesheets/style.css', function(req, res, next){
  //   res.sendFile('/stylesheets/style.css', { root: __dirname + '/../public/' });
  // });

  return router;
}
