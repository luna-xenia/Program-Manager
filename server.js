const express = require('express');
const bodyParser = require('body-parser');
const execSync = require('child_process').execSync;
const fs = require('fs');
const rimraf = require('rimraf');
const app = express();

var error = "";
var errorRender = "";

var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/projectDB";


function addObject(projectName, projectType) {
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    console.log("Connected to DB!");
    var dbo = db.db("projectDB");

    var myobj = { name: projectName, type: projectType };
    dbo.collection("projects").insertOne(myobj, function(err, res) {
      if (err) throw err;
      console.log("1 document inserted");
      db.close();
    });
  });
}

function allObjects(callback) {
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    console.log("Connected to DB!");
    var dbo = db.db("projectDB");

    dbo.collection("projects").find({}).toArray(function(err, result) {
      if (err) throw err;
      db.close();
      callback(result);
    });
  });
}

function findType(projectName, callback) {
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    console.log("Connected to DB!");
    var dbo = db.db("projectDB");
    var query = { name: projectName };

    dbo.collection("projects").find(query, { projection: { _id: 0, type: 1 } }).toArray(function(err, result) {
      if (err) throw err;
      db.close();
      callback(result);
    });``
  });
}

function deleteProject(projectName) {
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("projectDB");
    var myquery = { name: projectName };

    dbo.collection("projects").deleteOne(myquery, function(err, obj) {
      if (err) throw err;
      console.log("1 document deleted");
      db.close();
    });
  });
  rimraf.sync("Projects/" + projectName);
}

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.use(express.static('views'));

app.get('/', function(req, res) {
  try {
    // execSync('docker run -d --init -p 3000:3000 -v "/environment/Testing/Project-Manager-master/Projects/" theiaide/theia:next');
  }
  catch (err) {
    console.log("Docker already running.")
  }

  var i;
  var projectResult;

  allObjects(function(result) {
    var URL = req.get('host');
    URL = URL.substring(0, 12);
    projectResult = result;
    var projectDict = {};

    if (!projectResult.length == 0) {
      var projectKey = "";
      var projectValue = "";

      for (i = 0; i < projectResult.length; i++) {
        projectKey = projectResult[i]["name"];

        projectValue = projectResult[i]["type"];

        projectDict[projectKey] = projectValue;
      }
    }
    else {
      projectDict = { "You have no projects.": "Make one and you will see it here." };
    }

    res.render('index', { error: null, projectdict: projectDict, url: URL });
  });

});

app.post('/newproject', function(req, res) {
  var errorMsg = "";

  if (req.body.projectName === "") {
    errorMsg = "One or more of the values were undefined. Please try again.";
  }

  if (req.body.projectType === undefined) {
    errorMsg = "One or more of the values were undefined. Please try again.";
  }

  if (req.body.projectName.indexOf(' ') >= 0) {
    errorMsg = "Project Name contains spaces. Please remove them.";
  }

  if (errorMsg !== "") {
    errorRender = errorMsg;
  }
  else {
    errorRender = null;
    addObject(req.body.projectName, req.body.projectType);
    fs.mkdirSync("Projects/" + req.body.projectName);

    if (req.body.projectType == "nodeWebApp") {
      execSync('cp -a Templates/nodeWebApp/. Projects/' + req.body.projectName);
      execSync('cd Projects/' + req.body.projectName + '&& sudo npm install');
    }

    if (req.body.projectType == "staticWebPage") {
      execSync('cp -a Templates/staticWebPage/. Projects/' + req.body.projectName);
      execSync('cd Projects/' + req.body.projectName + '&& sudo npm install');
    }
  }

  var projectResult;
  var i;

  allObjects(function(result) {
    projectResult = result;
    var projectDict = {};

    if (!projectResult.length == 0) {
      var projectKey = "";
      var projectValue = "";

      for (i = 0; i < projectResult.length; i++) {
        projectKey = projectResult[i]["name"];

        projectValue = projectResult[i]["type"];

        projectDict[projectKey] = projectValue;
      }
    }
    else {
      projectDict = { "You have no projects.": "Make one and you will see it here." };
    }

    var URL = req.get('host');
    URL = URL.substring(0, 11);

    res.render('index', { error: errorRender, projectdict: projectDict, url: URL });
  });

});

app.post('/delete/:projectname', function(req, res) {
  var URLName = req.originalUrl;
  var projectName = URLName.substr(8);
  deleteProject(projectName);
  res.redirect("/");
});

app.get("/project-view/You%20have%20no%20projects.", function(req, res) {
  res.redirect("/");
});

app.get('/project-view/:projectname', function(req, res) {
  var URLName = req.originalUrl;
  var projectName = URLName.substr(14);
  if (projectName.indexOf('/') != -1) {
    projectName = projectName.slice(0, -1);
    console.log(projectName);
  }
  var fileNames = fs.readdirSync("Projects/" + projectName);

  findType(projectName, function(result) {
    var projectType = result;
    projectType = projectType[0]["type"];
    console.log(projectType);
    res.render('projectView', { name: projectName, filelist: fileNames, type: projectType, url: URLName });
  });
});

app.get('/file-view/*', function(req, res) {
  var URLName = req.originalUrl;
  var projectName = URLName.substr(11);
  var fileNames = fs.readdirSync("Projects/" + projectName);
  res.render('fileView', { name: projectName, filelist: fileNames, url: URLName });
});

app.get("/info-view/:projectname/", function(req, res) {
  var URLName = req.originalUrl;
  var projectName = URLName.substr(11);
  if (projectName.indexOf('/') != -1) {
    projectName = projectName.slice(0, -1);
    console.log(projectName);
  }
  console.log(projectName);

  findType(projectName, function(result) {
    var projectType = result;
    projectType = projectType[0]["type"];
    console.log(projectType);
    res.render('infoView', { name: projectName, type: projectType, url: URLName });
  });
});

app.listen(8081, function() {
  console.log('Listening on port 8081!');
});
