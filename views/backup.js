function allObjects() {
  return new Promise(resolve => {
    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      console.log("Connected to DB!");
      var dbo = db.db("projectDB");

      dbo.collection("projects").find({}).toArray(function(err, result) {
        if (err) throw err;
        db.close();
        resolve(result);
      });
    });
  });
}

allObjects().then(output => { projectResult = output });
res.render('index', { error: errorRender });
