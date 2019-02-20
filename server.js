"use strict";

var express = require("express");
var mongo = require("mongodb");
var parser = require("body-parser");
var mongoose = require("mongoose");
const dns = require("dns");
var cors = require("cors");
//Init .env file
require("dotenv").config();
var Schema = mongoose.Schema;

var app = express();

// Basic Configuration
var port = process.env.PORT || 3000;

//Connecting to database
mongoose.connect(process.env.MONGOLAB_URI, { useMongoClient: true });
//Allowing cross-origin-resource-sharing

app.use("/public", express.static(process.cwd() + "/public"));
app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});
//Body-parser
app.use(parser.urlencoded({ extended: false }));
app.use(parser.json());
app.use(cors());
// Url schema
var urlSchema = new Schema({
  org_url: { type: String, required: true },
  short_url: { type: String }
});

//Url database
var Url = mongoose.model("urls", urlSchema);

//Function that returns a rand number in range 1-100'000
var getRand = () => {
  return Math.floor(Math.random() * 100000 + 1);
};

//Function checks if a given domain is real
//Returns a PROMISE
function isUrl(domain) {
  return new Promise((resolve, reject) => {
    dns.lookup(domain, null, (err, address, family) => {
      resolve(!err);
      reject(err);
    });
  });
}

app.post("/api/shorturl/", (req, res) => {
  //domain regex, finds url domain
  var re = /[http://.||https://.]*[www.]*(.+\.\w+)/;
  var domain = re.exec(req.body.url)[1];
  var address = req.body.url;
  //checks domain is real in dns lookup
  isUrl(domain)
    //On success
    .then(function(result) {
      if (result) {
        var surl = getRand();
        var url = new Url({ org_url: address, short_url: surl });
        url
          .save()
          .then(doc => {
            res.json({ org_address: doc.org_url, short_url: surl });
          })
          .catch(err => {
            console.error(err);
          });
      }
      //invalid Url
      else {
        res.json({ error: "Invalid URL" });
      }
    })
    .catch(error => console.log(error));
});

//Url shortener API
app.route("/api/shorturl/:url").get(function(req, res) {
  console.log(req.params.url);
  // Looking for the short url in the database
  Url.findOne({ short_url: req.params.url }, (err, data) => {
    //error if not found
    if (err) {
      res.json({ error: "URL doesn't exist" });
    }
    //else redirect to the found url
    else {
      res.redirect(data.org_url);
    }
  });
});

app.listen(port, function() {
  console.log(`Node.js listening on port ${port}`);
});
